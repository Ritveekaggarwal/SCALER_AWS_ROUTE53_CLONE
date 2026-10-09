from datetime import datetime, timezone

from .models import HostedZone


def export_bind(zone: HostedZone) -> str:
    lines = [
        f"; Zone file for {zone.name}",
        f"; Hosted zone ID: {zone.id}",
        f"; Exported {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"$ORIGIN {zone.name}",
        "",
    ]
    order = {"SOA": 0, "NS": 1}
    for record in sorted(zone.record_sets, key=lambda r: (r.name != zone.name, order.get(r.type, 2), r.name, r.type)):
        for v in record.values:
            lines.append(f"{record.name}\t{record.ttl}\tIN\t{record.type}\t{v.value}")
    return "\n".join(lines) + "\n"


def export_json(zone: HostedZone) -> dict:
    return {
        "HostedZone": {
            "Id": f"/hostedzone/{zone.id}",
            "Name": zone.name,
            "CallerReference": zone.caller_reference,
            "Config": {"Comment": zone.comment, "PrivateZone": zone.is_private},
            "ResourceRecordSetCount": len(zone.record_sets),
        },
        "ResourceRecordSets": [
            {
                "Name": r.name,
                "Type": r.type,
                "TTL": r.ttl,
                "ResourceRecords": [{"Value": v.value} for v in r.values],
            }
            for r in zone.record_sets
        ],
    }
