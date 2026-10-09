from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.dns_rules import SUPPORTED_TYPES, DnsValidationError, record_fqdn
from ...core.errors import invalid
from ..zones.models import HostedZone
from .models import RecordSet
from .schemas import DnsAnswer, DnsTestResult

MAX_CNAME_HOPS = 8


def _records_at(db: Session, zone: HostedZone, name: str) -> list[RecordSet]:
    return list(db.scalars(select(RecordSet).where(RecordSet.zone_id == zone.id, RecordSet.name == name)))


def _lookup(db: Session, zone: HostedZone, name: str) -> list[RecordSet]:
    found = _records_at(db, zone, name)
    if found:
        return found
    labels = name.rstrip(".").split(".")
    zone_labels = zone.name.rstrip(".").split(".")
    for i in range(1, len(labels) - len(zone_labels) + 1):
        wildcard = "*." + ".".join(labels[i:]) + "."
        found = _records_at(db, zone, wildcard)
        if found:
            return found
    return []


def _answers(records: list[RecordSet], owner: str) -> list[DnsAnswer]:
    return [DnsAnswer(name=owner, type=r.type, ttl=r.ttl, value=v.value) for r in records for v in r.values]


def resolve(db: Session, zone: HostedZone, name: str, qtype: str) -> DnsTestResult:
    qtype = qtype.upper()
    if qtype not in SUPPORTED_TYPES:
        raise invalid(f"Record type {qtype} is not supported.")
    try:
        qname = record_fqdn(name, zone.name)
    except DnsValidationError as exc:
        raise invalid(str(exc)) from None

    answers: list[DnsAnswer] = []
    current = qname
    for _ in range(MAX_CNAME_HOPS):
        records = _lookup(db, zone, current)
        if not records:
            code = "NXDOMAIN" if current == qname else "NOERROR"
            return DnsTestResult(query_name=qname, query_type=qtype, response_code=code, answers=answers)
        matching = [r for r in records if r.type == qtype]
        if matching:
            answers += _answers(matching, current)
            break
        cname = next((r for r in records if r.type == "CNAME"), None)
        if not cname:
            break
        answers += _answers([cname], current)
        target = cname.values[0].value
        if target != zone.name and not target.endswith("." + zone.name):
            break
        current = target
    return DnsTestResult(query_name=qname, query_type=qtype, response_code="NOERROR", answers=answers)
