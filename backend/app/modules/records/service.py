from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ...core.dns_rules import DEFAULT_TYPES, DnsValidationError, record_fqdn, validate_values
from ...core.errors import AppError, conflict, invalid, not_found
from ...core.schemas import BulkDeleteResult
from ...core.timeutil import utc
from ..activity.service import log
from ..auth.models import User
from ..healthchecks.models import HealthCheck
from ..zones.models import HostedZone
from .models import RecordSet, RecordValue
from .schemas import ImportedRecord, ImportRequest, ImportResult, RecordOut
from .zonefile import parse_bind

_UNSET = object()


def _dns(fn, *args):
    try:
        return fn(*args)
    except DnsValidationError as exc:
        raise invalid(str(exc)) from None


def set_values(record: RecordSet, values: list[str]) -> None:
    record.values = [RecordValue(value=v, position=i) for i, v in enumerate(values)]


def is_protected(record: RecordSet) -> bool:
    return record.type in DEFAULT_TYPES and record.name == record.zone.name


def record_out(record: RecordSet) -> RecordOut:
    return RecordOut(
        id=record.id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        routing_policy=record.routing_policy,
        values=[v.value for v in record.values],
        health_check_id=record.health_check_id,
        protected=is_protected(record),
        created_at=utc(record.created_at),
        updated_at=utc(record.updated_at),
    )


def get_record(db: Session, zone: HostedZone, record_id: int) -> RecordSet:
    record = db.get(RecordSet, record_id)
    if not record or record.zone_id != zone.id:
        raise not_found("Record not found.", "NoSuchRecord")
    return record


def find_record(db: Session, zone: HostedZone, name: str, rtype: str) -> RecordSet | None:
    return db.scalar(select(RecordSet).where(RecordSet.zone_id == zone.id, RecordSet.name == name,
                                             RecordSet.type == rtype))


def list_records(db: Session, zone: HostedZone, search: str, rtype: str | None, page: int,
                 page_size: int) -> tuple[list[RecordSet], int]:
    q = select(RecordSet).where(RecordSet.zone_id == zone.id)
    if search:
        like = f"%{search.strip().lower()}%"
        value_match = select(RecordValue.record_set_id).where(RecordValue.value.ilike(like))
        q = q.where(or_(RecordSet.name.ilike(like), RecordSet.type.ilike(like), RecordSet.id.in_(value_match)))
    if rtype:
        q = q.where(RecordSet.type.in_([t.strip().upper() for t in rtype.split(",") if t.strip()]))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    q = q.order_by((RecordSet.name != zone.name), RecordSet.name, RecordSet.type)
    records = list(db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all())
    return records, total


def _check_health_check(db: Session, user: User, health_check_id: str | None) -> str | None:
    if not health_check_id:
        return None
    hc = db.get(HealthCheck, health_check_id)
    if not hc or hc.owner_id != user.id:
        raise invalid(f"No health check found with ID: {health_check_id}", "NoSuchHealthCheck")
    return hc.id


def _check_conflicts(db: Session, zone: HostedZone, name: str, rtype: str) -> None:
    existing = db.scalars(select(RecordSet.type).where(RecordSet.zone_id == zone.id, RecordSet.name == name)).all()
    if rtype in existing:
        raise conflict(
            f"Tried to create resource record set [name='{name}', type='{rtype}'] but it already exists.",
            "InvalidChangeBatch",
        )
    if rtype == "CNAME" and name == zone.name:
        raise invalid("A CNAME record can't be created at the zone apex.", "InvalidChangeBatch")
    if rtype == "CNAME" and existing:
        raise invalid(f"RRSet of type CNAME with DNS name {name} is not permitted because a conflicting RRSet exists.",
                      "InvalidChangeBatch")
    if "CNAME" in existing:
        raise invalid(f"RRSet of type {rtype} with DNS name {name} is not permitted because a CNAME record exists.",
                      "InvalidChangeBatch")


def create_record(db: Session, user: User, zone: HostedZone, name: str, rtype: str, ttl: int, values: list[str],
                  health_check_id: str | None = None) -> RecordSet:
    rtype = rtype.upper()
    if rtype == "SOA":
        raise invalid("Route 53 creates the SOA record for you; it can't be added manually.", "InvalidChangeBatch")
    fqdn = _dns(record_fqdn, name, zone.name)
    cleaned = _dns(validate_values, rtype, values)
    if not 0 <= ttl <= 2147483647:
        raise invalid("TTL must be between 0 and 2147483647.")
    _check_conflicts(db, zone, fqdn, rtype)
    record = RecordSet(zone_id=zone.id, name=fqdn, type=rtype, ttl=ttl,
                       health_check_id=_check_health_check(db, user, health_check_id))
    set_values(record, cleaned)
    db.add(record)
    db.flush()
    log(db, user.id, "create", "record", record.id, f"Created {rtype} record {fqdn.rstrip('.')}")
    return record


def update_record(db: Session, user: User, record: RecordSet, ttl: int | None = None,
                  values: list[str] | None = None, health_check_id=_UNSET) -> RecordSet:
    if values is not None:
        set_values(record, _dns(validate_values, record.type, values))
    if ttl is not None:
        if not 0 <= ttl <= 2147483647:
            raise invalid("TTL must be between 0 and 2147483647.")
        record.ttl = ttl
    if health_check_id is not _UNSET:
        record.health_check_id = _check_health_check(db, user, health_check_id)
    log(db, user.id, "update", "record", record.id, f"Updated {record.type} record {record.name.rstrip('.')}")
    return record


def delete_record(db: Session, user: User, record: RecordSet) -> None:
    if is_protected(record):
        raise conflict(f"The default {record.type} record for the zone apex can't be deleted.", "InvalidChangeBatch")
    log(db, user.id, "delete", "record", record.id, f"Deleted {record.type} record {record.name.rstrip('.')}")
    db.delete(record)


def upsert_record(db: Session, user: User, zone: HostedZone, name: str, rtype: str, ttl: int,
                  values: list[str]) -> RecordSet:
    fqdn = _dns(record_fqdn, name, zone.name)
    existing = find_record(db, zone, fqdn, rtype.upper())
    if existing:
        return update_record(db, user, existing, ttl=ttl, values=values)
    return create_record(db, user, zone, name, rtype, ttl, values)


def patch_record(db: Session, user: User, record: RecordSet, ttl: int | None, values: list[str] | None,
                 health_check_id: str | None) -> RecordSet:
    kwargs = {}
    if health_check_id is not None:
        kwargs["health_check_id"] = health_check_id or None
    return update_record(db, user, record, ttl=ttl, values=values, **kwargs)


def bulk_delete_records(db: Session, user: User, zone: HostedZone, ids: list[str | int]) -> BulkDeleteResult:
    deleted, failed = [], []
    for rid in ids:
        try:
            if not str(rid).isdigit():
                raise invalid("Not found")
            delete_record(db, user, get_record(db, zone, int(rid)))
            deleted.append(rid)
        except AppError as exc:
            failed.append({"id": rid, "reason": exc.message})
    return BulkDeleteResult(deleted=deleted, failed=failed)


def import_zone_file(db: Session, user: User, zone: HostedZone, body: ImportRequest) -> ImportResult:
    try:
        parsed = parse_bind(body.zone_file, zone.name)
    except DnsValidationError as exc:
        raise invalid(str(exc)) from None

    existing = {(r.name, r.type) for r in zone.record_sets}
    names_with_cname = {n for n, t in existing if t == "CNAME"}
    taken_names = {n for n, _ in existing}
    results: list[ImportedRecord] = []
    to_create: list[RecordSet] = []
    for rec, skip in parsed:
        if skip:
            status_, reason = "skipped", skip
        elif (rec.name, rec.type) in existing:
            status_, reason = "conflict", "A record with this name and type already exists."
        elif rec.name in names_with_cname or (rec.type == "CNAME" and rec.name in taken_names):
            status_, reason = "conflict", "Conflicts with an existing CNAME record."
        else:
            status_, reason = "new", ""
            existing.add((rec.name, rec.type))
            taken_names.add(rec.name)
            if rec.type == "CNAME":
                names_with_cname.add(rec.name)
            record = RecordSet(zone_id=zone.id, name=rec.name, type=rec.type, ttl=rec.ttl)
            set_values(record, rec.values)
            to_create.append(record)
        results.append(ImportedRecord(name=rec.name, type=rec.type, ttl=rec.ttl, values=rec.values,
                                      status=status_, reason=reason))

    if not body.dry_run:
        db.add_all(to_create)
        if to_create:
            log(db, user.id, "import", "hosted_zone", zone.id,
                f"Imported {len(to_create)} records into {zone.name.rstrip('.')}")
    return ImportResult(records=results, created=0 if body.dry_run else len(to_create), dry_run=body.dry_run)
