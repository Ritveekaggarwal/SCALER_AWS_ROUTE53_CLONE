import secrets
from datetime import datetime, timezone

from ..healthchecks.models import HealthCheck
from ..zones.models import HostedZone


def zone_json(zone: HostedZone, count: int | None = None) -> dict:
    return {
        "Id": f"/hostedzone/{zone.id}",
        "Name": zone.name,
        "CallerReference": zone.caller_reference,
        "Config": {"Comment": zone.comment, "PrivateZone": zone.is_private},
        "ResourceRecordSetCount": count if count is not None else len(zone.record_sets),
    }


def hc_json(hc: HealthCheck) -> dict:
    cfg = {"Type": hc.protocol, "Port": hc.port, "RequestInterval": hc.request_interval,
           "FailureThreshold": hc.failure_threshold, "Inverted": hc.inverted, "Disabled": hc.disabled}
    if hc.ip_address:
        cfg["IPAddress"] = hc.ip_address
    if hc.domain_name:
        cfg["FullyQualifiedDomainName"] = hc.domain_name
    if hc.protocol != "TCP":
        cfg["ResourcePath"] = hc.resource_path
    if hc.search_string:
        cfg["SearchString"] = hc.search_string
    return {"Id": hc.id, "CallerReference": hc.name, "HealthCheckConfig": cfg, "HealthCheckVersion": 1}


def change_info(comment: str = "") -> dict:
    change_id = "C" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789") for _ in range(20))
    info = {"Id": f"/change/{change_id}",
            "Status": "INSYNC", "SubmittedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")}
    if comment:
        info["Comment"] = comment
    return info
