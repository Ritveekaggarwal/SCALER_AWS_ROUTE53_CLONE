import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from app.modules.healthchecks import probe as hc_service


def _zone_id(client, name="example.com."):
    items = client.get("/api/hostedzones", params={"search": name.rstrip(".")}).json()["items"]
    return next(z["id"] for z in items if z["name"] == name)


def test_register_profile_password_sessions(client):
    r = client.post("/api/auth/register", json={"username": "alice", "password": "s3cret-pass",
                                                "account_alias": "alice-co", "display_name": "Alice"})
    assert r.status_code == 201, r.text
    me = r.json()
    assert len(me["account_id"]) == 12 and me["display_name"] == "Alice"
    assert client.get("/api/hostedzones").json()["total"] == 0

    assert client.post("/api/auth/register", json={"username": "alice", "password": "another-pass",
                                                   "account_alias": "other"}).status_code == 409

    assert client.patch("/api/auth/me", json={"email": "a@example.com", "account_alias": "alice-inc"}).json()[
        "account_alias"] == "alice-inc"
    assert client.post("/api/auth/change-password", json={"current_password": "wrong",
                                                          "new_password": "new-pass-123"}).status_code == 422
    assert client.post("/api/auth/change-password", json={"current_password": "s3cret-pass",
                                                          "new_password": "new-pass-123"}).status_code == 204
    sessions = client.get("/api/auth/sessions").json()
    assert len(sessions) == 1 and sessions[0]["current"]

    client.post("/api/auth/logout")
    assert client.post("/api/auth/login", json={"account_id": "alice-inc", "username": "alice",
                                                "password": "new-pass-123"}).status_code == 200


def test_accounts_are_isolated(authed):
    zid = _zone_id(authed)
    authed.post("/api/auth/logout")
    authed.post("/api/auth/register", json={"username": "bob", "password": "bob-password",
                                            "account_alias": "bob-co"})
    assert authed.get(f"/api/hostedzones/{zid}").status_code == 404
    assert all(h["kind"] == "page" for h in authed.get("/api/search", params={"q": "example"}).json())


def test_dns_resolver(authed):
    zid = _zone_id(authed)
    url = f"/api/hostedzones/{zid}/records"
    authed.post(url, json={"name": "*.apps", "type": "A", "values": ["203.0.113.9"]})
    authed.post(url, json={"name": "alias", "type": "CNAME", "values": ["api.example.com"]})

    t = lambda name, typ: authed.get(f"/api/hostedzones/{zid}/test-dns", params={"name": name, "type": typ}).json()
    assert [a["value"] for a in t("", "A")["answers"]] == ["192.0.2.10", "192.0.2.11"]
    assert t("foo.apps", "A")["answers"][0]["value"] == "203.0.113.9"
    chased = t("alias", "A")
    assert [a["type"] for a in chased["answers"]] == ["CNAME", "A"]
    assert t("nope", "A")["response_code"] == "NXDOMAIN"
    nodata = t("api", "MX")
    assert nodata["response_code"] == "NOERROR" and nodata["answers"] == []


def test_dashboard_activity_search(authed):
    zid = _zone_id(authed)
    authed.post(f"/api/hostedzones/{zid}/records", json={"name": "new", "type": "TXT", "values": ["hi"]})
    d = authed.get("/api/dashboard").json()
    assert d["hosted_zones"] == 3 and d["records_by_type"]["TXT"] == 2
    assert d["recent_activity"][0]["message"] == "Created TXT record new.example.com"
    assert authed.get("/api/activity").json()[0]["resource_type"] == "record"
    kinds = {h["kind"] for h in authed.get("/api/search", params={"q": "example"}).json()}
    assert {"hosted_zone", "record"} <= kinds
    assert authed.post("/api/feedback", json={"message": "Looks great", "rating": "positive"}).status_code == 204


def cli(client, command):
    r = client.post("/api/cli", json={"command": command}).json()
    return r["output"], r["exit_code"]


def test_cli_end_to_end(authed):
    out, code = cli(authed, "aws route53 create-hosted-zone --name cli-test.com --caller-reference r1 "
                            "--hosted-zone-config Comment=from-cli")
    assert code == 0, out
    zid = json.loads(out)["HostedZone"]["Id"].split("/")[-1]

    batch = json.dumps({"Changes": [
        {"Action": "CREATE", "ResourceRecordSet": {"Name": "www.cli-test.com", "Type": "A", "TTL": 60,
                                                   "ResourceRecords": [{"Value": "192.0.2.50"}]}},
        {"Action": "UPSERT", "ResourceRecordSet": {"Name": "cli-test.com", "Type": "TXT", "TTL": 300,
                                                   "ResourceRecords": [{"Value": "\"hello\""}]}},
    ]})
    out, code = cli(authed, f"aws route53 change-resource-record-sets --hosted-zone-id {zid} --change-batch '{batch}'")
    assert code == 0 and json.loads(out)["ChangeInfo"]["Status"] == "INSYNC"

    out, _ = cli(authed, f"aws route53 list-resource-record-sets --hosted-zone-id {zid}")
    names = {(r["Name"], r["Type"]) for r in json.loads(out)["ResourceRecordSets"]}
    assert ("www.cli-test.com.", "A") in names and ("cli-test.com.", "TXT") in names

    out, _ = cli(authed, f"aws route53 test-dns-answer --hosted-zone-id {zid} --record-name www --record-type A")
    assert json.loads(out)["RecordData"] == ["192.0.2.50"]

    bad = json.dumps({"Changes": [
        {"Action": "CREATE", "ResourceRecordSet": {"Name": "ok.cli-test.com", "Type": "A",
                                                   "ResourceRecords": [{"Value": "192.0.2.1"}]}},
        {"Action": "CREATE", "ResourceRecordSet": {"Name": "bad.cli-test.com", "Type": "A",
                                                   "ResourceRecords": [{"Value": "not-an-ip"}]}},
    ]})
    out, code = cli(authed, f"aws route53 change-resource-record-sets --hosted-zone-id {zid} --change-batch '{bad}'")
    assert code == 254 and "InvalidInput" in out
    out, _ = cli(authed, f"aws route53 list-resource-record-sets --hosted-zone-id {zid}")
    assert "ok.cli-test.com." not in out

    out, code = cli(authed, f"aws route53 delete-hosted-zone --id {zid}")
    assert code == 254 and "HostedZoneNotEmpty" in out
    out, code = cli(authed, "aws route53 get-hosted-zone --id ZNOPE")
    assert code == 254 and "NoSuchHostedZone" in out
    assert cli(authed, "aws sts get-caller-identity")[1] == 0
    assert cli(authed, "aws route53 bogus-op")[1] == 252
    assert cli(authed, "ls")[1] == 127
    assert "list-hosted-zones" in cli(authed, "help")[0]


class _Handler(BaseHTTPRequestHandler):
    status = 200

    def do_GET(self):
        self.send_response(_Handler.status)
        self.end_headers()
        self.wfile.write(b"service is UP")

    def log_message(self, *args):
        pass


@pytest.fixture()
def local_server(monkeypatch):
    monkeypatch.setattr(hc_service, "ALLOW_PRIVATE_HEALTH_CHECK_TARGETS", True)
    server = HTTPServer(("127.0.0.1", 0), _Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    _Handler.status = 200
    yield server.server_address[1]
    server.shutdown()


def test_health_check_lifecycle(authed, local_server):
    body = {"name": "local web", "protocol": "HTTP", "ip_address": "127.0.0.1", "port": local_server,
            "resource_path": "/status", "search_string": "UP", "failure_threshold": 2}
    r = authed.post("/api/healthchecks", json=body)
    assert r.status_code == 201, r.text
    hc = r.json()
    assert hc["status"] == "Healthy" and hc["last_latency_ms"] is not None

    _Handler.status = 503
    assert authed.post(f"/api/healthchecks/{hc['id']}/check").json()["status"] == "Healthy"
    assert authed.post(f"/api/healthchecks/{hc['id']}/check").json()["status"] == "Unhealthy"
    results = authed.get(f"/api/healthchecks/{hc['id']}/results").json()
    assert [r["success"] for r in results[:3]] == [False, False, True]
    assert any("Unhealthy" in a["message"] for a in authed.get("/api/activity").json())

    zid = _zone_id(authed)
    rec = authed.post(f"/api/hostedzones/{zid}/records", json={"name": "hc", "type": "A", "values": ["192.0.2.7"],
                                                                "health_check_id": hc["id"]}).json()
    assert rec["health_check_id"] == hc["id"]
    assert authed.get(f"/api/healthchecks/{hc['id']}").json()["record_count"] == 1
    assert authed.delete(f"/api/healthchecks/{hc['id']}").status_code == 204
    assert authed.get(f"/api/hostedzones/{zid}/records/{rec['id']}").json()["health_check_id"] is None


def test_health_check_tcp_and_validation(authed, local_server, monkeypatch):
    r = authed.post("/api/healthchecks", json={"name": "tcp", "protocol": "TCP", "ip_address": "127.0.0.1",
                                               "port": local_server})
    assert r.json()["status"] == "Healthy"
    r = authed.post("/api/healthchecks", json={"name": "closed", "protocol": "TCP", "ip_address": "127.0.0.1",
                                               "port": 1, "failure_threshold": 1})
    assert r.json()["status"] == "Unhealthy"
    assert authed.post("/api/healthchecks", json={"name": "x", "protocol": "TCP",
                                                  "ip_address": "127.0.0.1"}).status_code == 422

    monkeypatch.setattr(hc_service, "ALLOW_PRIVATE_HEALTH_CHECK_TARGETS", False)
    r = authed.post("/api/healthchecks", json={"name": "meta", "protocol": "HTTP", "ip_address": "169.254.169.254"})
    assert r.status_code == 422 and "private" in r.json()["detail"]
    page = authed.get("/api/healthchecks", params={"status": "Healthy"}).json()
    assert page["total"] == 1


def test_old_database_gets_new_columns(tmp_path):
    from sqlalchemy import inspect, text

    from app.core.db import Base, add_missing_columns, make_engine

    engine = make_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(64), password_hash "
                          "VARCHAR(256), account_id VARCHAR(12), account_alias VARCHAR(64), created_at DATETIME)"))
    Base.metadata.create_all(engine)
    added = add_missing_columns(engine)
    assert {"users.display_name", "users.email"} <= set(added)
    assert {"display_name", "email"} <= {c["name"] for c in inspect(engine).get_columns("users")}
    assert add_missing_columns(engine) == []
