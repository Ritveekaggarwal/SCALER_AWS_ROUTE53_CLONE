from collections.abc import Callable

from sqlalchemy import select

from ...core.dns_rules import record_fqdn
from ...core.errors import AppError, invalid
from ...core.timeutil import utc
from ..activity.service import log
from ..healthchecks import service as healthchecks
from ..healthchecks.models import HealthCheck
from ..records import service as records
from ..records.resolver import resolve
from ..zones import service as zones
from ..zones.models import HostedZone
from .parser import CliUsageError, need, parse_args, shorthand, to_bool
from .serializers import change_info, hc_json, zone_json


def list_hosted_zones(db, user, args):
    zones = db.scalars(select(HostedZone).where(HostedZone.owner_id == user.id).order_by(HostedZone.name)).all()
    return {"HostedZones": [zone_json(z) for z in zones]}


def list_hosted_zones_by_name(db, user, args):
    zones = db.scalars(select(HostedZone).where(HostedZone.owner_id == user.id).order_by(HostedZone.name)).all()
    if args.get("dns-name"):
        start = args["dns-name"].lower().rstrip(".") + "."
        zones = [z for z in zones if z.name >= start]
    return {"HostedZones": [zone_json(z) for z in zones], "IsTruncated": False, "MaxItems": "100"}


def get_hosted_zone(db, user, args):
    (zid,) = need(args, "id")
    zone = zones.get_zone(db, user, zid)
    return {"HostedZone": zone_json(zone),
            "DelegationSet": {"NameServers": [ns.rstrip(".") for ns in zones.name_servers_for(zone.id)]}}


def create_hosted_zone(db, user, args):
    name, _ = need(args, "name", "caller-reference")
    cfg = shorthand(args.get("hosted-zone-config", ""))
    vpc = shorthand(args.get("vpc", ""))
    zone = zones.create_hosted_zone(db, user, name, cfg.get("Comment", ""), to_bool(cfg.get("PrivateZone", False)),
                                  vpc.get("VPCRegion"), vpc.get("VPCId"))
    zone.caller_reference = args["caller-reference"]
    db.commit()
    return {"Location": f"https://route53.amazonaws.com/2013-04-01/hostedzone/{zone.id}",
            "HostedZone": zone_json(zone), "ChangeInfo": change_info(),
            "DelegationSet": {"NameServers": [ns.rstrip(".") for ns in zones.name_servers_for(zone.id)]}}


def update_hosted_zone_comment(db, user, args):
    zid, comment = need(args, "id", "comment")
    zone = zones.update_hosted_zone(db, user, zones.get_zone(db, user, zid), comment)
    db.commit()
    return {"HostedZone": zone_json(zone)}


def delete_hosted_zone(db, user, args):
    (zid,) = need(args, "id")
    zones.delete_hosted_zone(db, user, zones.get_zone(db, user, zid))
    db.commit()
    return {"ChangeInfo": change_info()}


def list_resource_record_sets(db, user, args):
    (zid,) = need(args, "hosted-zone-id")
    zone = zones.get_zone(db, user, zid)
    sets = sorted(zone.record_sets, key=lambda r: (r.name != zone.name, r.name, r.type))
    out = []
    for r in sets:
        item = {"Name": r.name, "Type": r.type, "TTL": r.ttl, "ResourceRecords": [{"Value": v.value} for v in r.values]}
        if r.health_check_id:
            item["HealthCheckId"] = r.health_check_id
        out.append(item)
    return {"ResourceRecordSets": out, "IsTruncated": False, "MaxItems": "300"}


def change_resource_record_sets(db, user, args):
    zid, batch_text = need(args, "hosted-zone-id", "change-batch")
    zone = zones.get_zone(db, user, zid)
    batch = shorthand(batch_text)
    changes = batch.get("Changes")
    if not isinstance(changes, list) or not changes:
        raise CliUsageError("Error parsing parameter '--change-batch': Changes must be a non-empty list")
    try:
        for ch in changes:
            action = str(ch.get("Action", "")).upper()
            rrs = ch.get("ResourceRecordSet") or {}
            name, rtype = rrs.get("Name", ""), str(rrs.get("Type", "")).upper()
            values = [str(r.get("Value", "")) for r in rrs.get("ResourceRecords", [])]
            ttl = int(rrs.get("TTL", 300))
            if action == "CREATE":
                records.create_record(db, user, zone, name, rtype, ttl, values, rrs.get("HealthCheckId"))
            elif action == "UPSERT":
                records.upsert_record(db, user, zone, name, rtype, ttl, values)
            elif action == "DELETE":
                record = records.find_record(db, zone, record_fqdn(name, zone.name), rtype)
                if not record:
                    raise invalid(f"Tried to delete resource record set [name='{name}', type='{rtype}'] but it was "
                                  "not found", "InvalidChangeBatch")
                records.delete_record(db, user, record)
            else:
                raise invalid(f"Invalid action '{action}'. Use CREATE, DELETE or UPSERT.", "InvalidChangeBatch")
    except Exception:
        db.rollback()
        raise
    db.commit()
    return {"ChangeInfo": change_info(batch.get("Comment", ""))}


def test_dns_answer(db, user, args):
    zid, name, rtype = need(args, "hosted-zone-id", "record-name", "record-type")
    zone = zones.get_zone(db, user, zid)
    res = resolve(db, zone, name, rtype)
    return {"Nameserver": zones.name_servers_for(zone.id)[0].rstrip("."),
            "RecordName": res.query_name, "RecordType": res.query_type,
            "RecordData": [a.value for a in res.answers], "ResponseCode": res.response_code, "Protocol": "UDP"}


def list_health_checks(db, user, args):
    checks = db.scalars(select(HealthCheck).where(HealthCheck.owner_id == user.id)
                        .order_by(HealthCheck.created_at)).all()
    return {"HealthChecks": [hc_json(h) for h in checks], "IsTruncated": False, "MaxItems": "100"}


def _get_hc(db, user, hc_id) -> HealthCheck:
    hc = db.get(HealthCheck, hc_id)
    if not hc or hc.owner_id != user.id:
        raise AppError(404, f"No health check found with ID: {hc_id}", "NoSuchHealthCheck")
    return hc


def get_health_check(db, user, args):
    (hid,) = need(args, "health-check-id")
    return {"HealthCheck": hc_json(_get_hc(db, user, hid))}


def get_health_check_status(db, user, args):
    (hid,) = need(args, "health-check-id")
    hc = _get_hc(db, user, hid)
    checked = utc(hc.last_checked_at)
    report = "Not checked yet" if not checked else f"{'Success' if hc.status == 'Healthy' else 'Failure'}: {hc.last_message}"
    return {"HealthCheckObservations": [{
        "Region": "global", "IPAddress": "route53-clone",
        "StatusReport": {"Status": report,
                         "CheckedTime": checked.strftime("%Y-%m-%dT%H:%M:%S.000Z") if checked else None},
    }]}


def create_health_check_cmd(db, user, args):
    ref, cfg_text = need(args, "caller-reference", "health-check-config")
    cfg = shorthand(cfg_text)
    proto = str(cfg.get("Type", "HTTP")).upper()
    hc = healthchecks.create_health_check(
        db, user.id, name=ref, protocol=proto, ip_address=cfg.get("IPAddress"),
        domain_name=cfg.get("FullyQualifiedDomainName"),
        port=int(cfg["Port"]) if cfg.get("Port") else None, resource_path=cfg.get("ResourcePath", "/"),
        search_string=cfg.get("SearchString", ""), request_interval=int(cfg.get("RequestInterval", 30)),
        failure_threshold=int(cfg.get("FailureThreshold", 3)), inverted=to_bool(cfg.get("Inverted", False)),
        disabled=to_bool(cfg.get("Disabled", False)),
    )
    db.commit()
    return {"Location": f"https://route53.amazonaws.com/2013-04-01/healthcheck/{hc.id}", "HealthCheck": hc_json(hc)}


def delete_health_check(db, user, args):
    (hid,) = need(args, "health-check-id")
    hc = _get_hc(db, user, hid)
    log(db, user.id, "delete", "health_check", hc.id, f"Deleted health check {hc.name}")
    db.delete(hc)
    db.commit()
    return {}


ROUTE53: dict[str, tuple[str, Callable]] = {
    "list-hosted-zones": ("ListHostedZones", list_hosted_zones),
    "list-hosted-zones-by-name": ("ListHostedZonesByName", list_hosted_zones_by_name),
    "get-hosted-zone": ("GetHostedZone", get_hosted_zone),
    "create-hosted-zone": ("CreateHostedZone", create_hosted_zone),
    "update-hosted-zone-comment": ("UpdateHostedZoneComment", update_hosted_zone_comment),
    "delete-hosted-zone": ("DeleteHostedZone", delete_hosted_zone),
    "list-resource-record-sets": ("ListResourceRecordSets", list_resource_record_sets),
    "change-resource-record-sets": ("ChangeResourceRecordSets", change_resource_record_sets),
    "test-dns-answer": ("TestDNSAnswer", test_dns_answer),
    "list-health-checks": ("ListHealthChecks", list_health_checks),
    "get-health-check": ("GetHealthCheck", get_health_check),
    "get-health-check-status": ("GetHealthCheckStatus", get_health_check_status),
    "create-health-check": ("CreateHealthCheck", create_health_check_cmd),
    "delete-health-check": ("DeleteHealthCheck", delete_health_check),
}
