from fastapi import Depends, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.schemas import BulkDelete, BulkDeleteResult, Page
from ..auth.models import User
from ..auth.security import current_user
from ..zones import service as zones
from . import service
from .resolver import resolve
from .schemas import DnsTestResult, ImportRequest, ImportResult, RecordCreate, RecordOut, RecordUpdate


def list_records(
    zone_id: str,
    search: str = "",
    type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=300),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    zone = zones.get_zone(db, user, zone_id)
    records, total = service.list_records(db, zone, search, type, page, page_size)
    return Page(items=[service.record_out(r) for r in records], total=total, page=page, page_size=page_size)


def create(zone_id: str, body: RecordCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    zone = zones.get_zone(db, user, zone_id)
    record = service.create_record(db, user, zone, body.name, body.type, body.ttl, body.values, body.health_check_id)
    db.commit()
    db.refresh(record)
    return service.record_out(record)


def bulk_delete(zone_id: str, body: BulkDelete, db: Session = Depends(get_db),
                user: User = Depends(current_user)) -> BulkDeleteResult:
    zone = zones.get_zone(db, user, zone_id)
    result = service.bulk_delete_records(db, user, zone, body.ids)
    db.commit()
    return result


def import_zone_file(zone_id: str, body: ImportRequest, db: Session = Depends(get_db),
                     user: User = Depends(current_user)) -> ImportResult:
    zone = zones.get_zone(db, user, zone_id)
    result = service.import_zone_file(db, user, zone, body)
    if not body.dry_run:
        db.commit()
    return result


def get(zone_id: str, record_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    zone = zones.get_zone(db, user, zone_id)
    return service.record_out(service.get_record(db, zone, record_id))


def update(zone_id: str, record_id: int, body: RecordUpdate, db: Session = Depends(get_db),
           user: User = Depends(current_user)):
    zone = zones.get_zone(db, user, zone_id)
    record = service.get_record(db, zone, record_id)
    service.patch_record(db, user, record, body.ttl, body.values, body.health_check_id)
    db.commit()
    db.refresh(record)
    return service.record_out(record)


def delete(zone_id: str, record_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    zone = zones.get_zone(db, user, zone_id)
    service.delete_record(db, user, service.get_record(db, zone, record_id))
    db.commit()


def test_dns(zone_id: str, name: str = "", type: str = "A", db: Session = Depends(get_db),
             user: User = Depends(current_user)) -> DnsTestResult:
    return resolve(db, zones.get_zone(db, user, zone_id), name, type)
