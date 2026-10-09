import hashlib
import secrets
import string
import uuid
from typing import Literal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ...core.dns_rules import DEFAULT_TYPES, DnsValidationError, validate_zone_name
from ...core.errors import AppError, conflict, invalid, not_found
from ...core.schemas import BulkDeleteResult
from ...core.timeutil import utc
from ..activity.service import log
from ..auth.models import User
from ..records.models import RecordSet, RecordValue
from .models import HostedZone
from .schemas import HostedZoneOut


def new_zone_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "Z" + "".join(secrets.choice(alphabet) for _ in range(20))


def name_servers_for(zone_id: str) -> list[str]:
    h = int(hashlib.sha256(zone_id.encode()).hexdigest(), 16)
    tlds = ("com", "net", "org", "co.uk")
    return [f"ns-{(h >> (i * 10)) % 2048}.awsdns-{(h >> (i * 7)) % 64:02d}.{tld}." for i, tld in enumerate(tlds)]


def soa_value(zone_id: str) -> str:
    return f"{name_servers_for(zone_id)[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"


def create_zone(db: Session, owner_id: int, name: str, comment: str = "", is_private: bool = False,
                vpc_region: str | None = None, vpc_id: str | None = None) -> HostedZone:
    zone = HostedZone(
        id=new_zone_id(),
        owner_id=owner_id,
        name=name,
        comment=comment,
        is_private=is_private,
        vpc_region=vpc_region if is_private else None,
        vpc_id=vpc_id if is_private else None,
        caller_reference=str(uuid.uuid4()),
    )
    zone.record_sets = [
        RecordSet(name=name, type="NS", ttl=172800,
                  values=[RecordValue(value=v, position=i) for i, v in enumerate(name_servers_for(zone.id))]),
        RecordSet(name=name, type="SOA", ttl=900, values=[RecordValue(value=soa_value(zone.id), position=0)]),
    ]
    db.add(zone)
    return zone


def record_counts(db: Session, zone_ids: list[str]) -> dict[str, int]:
    if not zone_ids:
        return {}
    rows = db.execute(
        select(RecordSet.zone_id, func.count(RecordSet.id)).where(RecordSet.zone_id.in_(zone_ids)).group_by(RecordSet.zone_id)
    )
    return dict(rows.all())


def zone_out(zone: HostedZone, record_count: int) -> HostedZoneOut:
    return HostedZoneOut(
        id=zone.id,
        name=zone.name,
        is_private=zone.is_private,
        comment=zone.comment,
        record_count=record_count,
        caller_reference=zone.caller_reference,
        vpc_region=zone.vpc_region,
        vpc_id=zone.vpc_id,
        name_servers=name_servers_for(zone.id),
        created_at=utc(zone.created_at),
        updated_at=utc(zone.updated_at),
    )


def get_zone(db: Session, user: User, zone_id: str) -> HostedZone:
    zone_id = zone_id.removeprefix("/hostedzone/")
    zone = db.get(HostedZone, zone_id)
    if not zone or zone.owner_id != user.id:
        raise not_found(f"No hosted zone found with ID: {zone_id}", "NoSuchHostedZone")
    return zone


def custom_record_count(db: Session, zone: HostedZone) -> int:
    return db.scalar(
        select(func.count(RecordSet.id)).where(
            RecordSet.zone_id == zone.id,
            or_(RecordSet.name != zone.name, RecordSet.type.not_in(DEFAULT_TYPES)),
        )
    ) or 0


def list_zones(db: Session, user: User, search: str, zone_type: Literal["public", "private"] | None, page: int,
               page_size: int, sort: str) -> tuple[list[HostedZone], int]:
    q = select(HostedZone).where(HostedZone.owner_id == user.id)
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.where(or_(HostedZone.name.ilike(like), HostedZone.comment.ilike(like), HostedZone.id.ilike(like)))
    if zone_type:
        q = q.where(HostedZone.is_private == (zone_type == "private"))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    col = HostedZone.name if sort.lstrip("-") == "name" else HostedZone.created_at
    q = q.order_by(col.desc() if sort.startswith("-") else col.asc())
    zones = list(db.scalars(q.offset((page - 1) * page_size).limit(page_size)).all())
    return zones, total


def create_hosted_zone(db: Session, user: User, name: str, comment: str = "", is_private: bool = False,
                       vpc_region: str | None = None, vpc_id: str | None = None) -> HostedZone:
    try:
        fqdn = validate_zone_name(name)
    except DnsValidationError as exc:
        raise invalid(str(exc)) from None
    if is_private and not (vpc_region and vpc_id):
        raise invalid("Private hosted zones need a VPC region and VPC ID.", "InvalidVPCId")
    if len(comment) > 256:
        raise invalid("The description can have up to 256 characters.")
    zone = create_zone(db, user.id, fqdn, comment, is_private, vpc_region, vpc_id)
    db.flush()
    log(db, user.id, "create", "hosted_zone", zone.id, f"Created hosted zone {fqdn.rstrip('.')}")
    return zone


def update_hosted_zone(db: Session, user: User, zone: HostedZone, comment: str) -> HostedZone:
    zone.comment = comment
    log(db, user.id, "update", "hosted_zone", zone.id, f"Updated hosted zone {zone.name.rstrip('.')}")
    return zone


def delete_hosted_zone(db: Session, user: User, zone: HostedZone) -> None:
    if custom_record_count(db, zone):
        raise conflict(
            "The hosted zone contains records other than the default NS and SOA records. Delete them first.",
            "HostedZoneNotEmpty",
        )
    log(db, user.id, "delete", "hosted_zone", zone.id, f"Deleted hosted zone {zone.name.rstrip('.')}")
    db.delete(zone)


def bulk_delete_zones(db: Session, user: User, ids: list[str | int]) -> BulkDeleteResult:
    deleted, failed = [], []
    for zid in ids:
        try:
            delete_hosted_zone(db, user, get_zone(db, user, str(zid)))
            deleted.append(zid)
        except AppError as exc:
            failed.append({"id": zid, "reason": exc.message})
    return BulkDeleteResult(deleted=deleted, failed=failed)
