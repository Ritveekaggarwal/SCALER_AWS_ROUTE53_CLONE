def _zone_id(client, name="example.com."):
    items = client.get("/api/hostedzones", params={"search": name.rstrip(".")}).json()["items"]
    return next(z["id"] for z in items if z["name"] == name)


def test_requires_login(client):
    assert client.get("/api/hostedzones").status_code == 401


def test_login_logout_session(client):
    assert client.post("/api/auth/login", json={"username": "demo", "password": "nope"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "demo", "password": "demo1234"}).status_code == 200
    assert client.get("/api/auth/me").json()["account_id"] == "123456789012"
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_login_with_wrong_account(client):
    r = client.post("/api/auth/login", json={"account_id": "999", "username": "demo", "password": "demo1234"})
    assert r.status_code == 401


def test_zone_crud(authed):
    r = authed.post("/api/hostedzones", json={"name": "New-Site.dev", "comment": "hello"})
    assert r.status_code == 201
    zone = r.json()
    assert zone["name"] == "new-site.dev."
    assert zone["record_count"] == 2
    assert len(zone["name_servers"]) == 4

    assert authed.patch(f"/api/hostedzones/{zone['id']}", json={"comment": "updated"}).json()["comment"] == "updated"
    assert authed.get("/api/hostedzones", params={"search": "new-site"}).json()["total"] == 1
    assert authed.delete(f"/api/hostedzones/{zone['id']}").status_code == 204
    assert authed.get(f"/api/hostedzones/{zone['id']}").status_code == 404


def test_zone_validation_and_pagination(authed):
    assert authed.post("/api/hostedzones", json={"name": "bad_name!"}).status_code == 422
    assert authed.post("/api/hostedzones", json={"name": "x.com", "is_private": True}).status_code == 422
    page = authed.get("/api/hostedzones", params={"page_size": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 2
    assert authed.get("/api/hostedzones", params={"type": "private"}).json()["total"] == 0


def test_zone_with_records_cannot_be_deleted(authed):
    assert authed.delete(f"/api/hostedzones/{_zone_id(authed)}").status_code == 409


def test_record_crud(authed):
    zid = _zone_id(authed)
    r = authed.post(f"/api/hostedzones/{zid}/records", json={"name": "blog", "type": "A", "ttl": 60, "values": ["10.0.0.1"]})
    assert r.status_code == 201, r.text
    rec = r.json()
    assert rec["name"] == "blog.example.com."

    r = authed.patch(f"/api/hostedzones/{zid}/records/{rec['id']}", json={"values": ["10.0.0.2", "10.0.0.3"], "ttl": 120})
    assert r.json()["values"] == ["10.0.0.2", "10.0.0.3"] and r.json()["ttl"] == 120

    found = authed.get(f"/api/hostedzones/{zid}/records", params={"search": "10.0.0.3"}).json()
    assert [x["id"] for x in found["items"]] == [rec["id"]]

    assert authed.delete(f"/api/hostedzones/{zid}/records/{rec['id']}").status_code == 204


def test_all_record_types_validate(authed):
    zid = _zone_id(authed)
    good = {
        "AAAA": "2001:db8::1",
        "TXT": "hello world",
        "MX": "5 mx.example.com",
        "NS": "ns1.other.net",
        "PTR": "host.example.com",
        "SRV": "0 5 443 svc.example.com",
        "CAA": '0 issuewild "letsencrypt.org"',
        "CNAME": "target.example.net",
    }
    for i, (t, v) in enumerate(good.items()):
        r = authed.post(f"/api/hostedzones/{zid}/records", json={"name": f"t{i}", "type": t, "values": [v]})
        assert r.status_code == 201, (t, r.text)
    bad = {"A": "999.1.1.1", "AAAA": "nope", "MX": "mx.example.com", "SRV": "1 2 mail", "CAA": "0 foo bar"}
    for t, v in bad.items():
        r = authed.post(f"/api/hostedzones/{zid}/records", json={"name": "bad", "type": t, "values": [v]})
        assert r.status_code == 422, (t, r.text)


def test_record_conflicts(authed):
    zid = _zone_id(authed)
    url = f"/api/hostedzones/{zid}/records"
    assert authed.post(url, json={"name": "api", "type": "A", "values": ["1.1.1.1"]}).status_code == 409
    assert authed.post(url, json={"name": "api", "type": "CNAME", "values": ["x.com"]}).status_code == 422
    assert authed.post(url, json={"name": "", "type": "CNAME", "values": ["x.com"]}).status_code == 422
    assert authed.post(url, json={"name": "www", "type": "TXT", "values": ["x"]}).status_code == 422


def test_default_records_protected_and_bulk_delete(authed):
    zid = _zone_id(authed)
    recs = authed.get(f"/api/hostedzones/{zid}/records").json()["items"]
    ids = [r["id"] for r in recs]
    result = authed.post(f"/api/hostedzones/{zid}/records/bulk-delete", json={"ids": ids}).json()
    assert len(result["failed"]) == 2
    assert authed.get(f"/api/hostedzones/{zid}/records").json()["total"] == 2
    assert authed.delete(f"/api/hostedzones/{zid}").status_code == 204


def test_export_and_import_roundtrip(authed):
    src = _zone_id(authed)
    bind = authed.get(f"/api/hostedzones/{src}/export", params={"format": "bind"}).text
    assert "www.example.com.\t300\tIN\tCNAME\texample.com." in bind
    js = authed.get(f"/api/hostedzones/{src}/export", params={"format": "json"}).json()
    assert js["HostedZone"]["Name"] == "example.com."

    dst = authed.post("/api/hostedzones", json={"name": "example.com"}).json()["id"]
    preview = authed.post(f"/api/hostedzones/{dst}/records/import", json={"zone_file": bind, "dry_run": True}).json()
    statuses = {(r["name"], r["type"]): r["status"] for r in preview["records"]}
    assert statuses[("example.com.", "SOA")] == "skipped"
    assert statuses[("www.example.com.", "CNAME")] == "new"
    assert preview["created"] == 0

    done = authed.post(f"/api/hostedzones/{dst}/records/import", json={"zone_file": bind, "dry_run": False}).json()
    assert done["created"] == 8
    assert authed.get(f"/api/hostedzones/{dst}").json()["record_count"] == 10


def test_import_rejects_garbage(authed):
    zid = _zone_id(authed)
    r = authed.post(f"/api/hostedzones/{zid}/records/import", json={"zone_file": "this is not a zone", "dry_run": True})
    assert r.status_code == 422
