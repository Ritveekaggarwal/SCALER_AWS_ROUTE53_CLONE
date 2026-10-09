from fastapi import Depends, Query
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.schemas import BulkDelete, BulkDeleteResult, Page
from ..auth.models import User
from ..auth.security import current_user
from . import service
from .probe import probe
from .schemas import HealthCheckIn, HealthCheckOut, HealthCheckResultOut, HealthCheckUpdate


def list_health_checks(
    search: str = "",
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    items, total = service.list_health_checks(db, user, search, status_filter, page, page_size)
    counts = service.record_counts(db, [h.id for h in items])
    return Page(items=[service.health_out(h, counts.get(h.id, 0)) for h in items], total=total, page=page,
                page_size=page_size)


async def create(body: HealthCheckIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    hc = service.create_health_check(db, user.id, **body.model_dump())
    if not hc.disabled:
        service.apply_result(db, hc, await probe(hc))
    db.commit()
    return service.output_for(db, hc)


def bulk_delete(body: BulkDelete, db: Session = Depends(get_db),
                user: User = Depends(current_user)) -> BulkDeleteResult:
    result = service.bulk_delete_health_checks(db, user, body.ids)
    db.commit()
    return result


def get(hc_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> HealthCheckOut:
    return service.output_for(db, service.get_owned(db, user, hc_id))


def update(hc_id: str, body: HealthCheckUpdate, db: Session = Depends(get_db),
           user: User = Depends(current_user)) -> HealthCheckOut:
    hc = service.update_health_check(db, user, service.get_owned(db, user, hc_id), body)
    db.commit()
    return service.output_for(db, hc)


def delete(hc_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    service.delete_health_check(db, user, service.get_owned(db, user, hc_id))
    db.commit()


async def check_now(hc_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> HealthCheckOut:
    hc = service.get_owned(db, user, hc_id)
    service.apply_result(db, hc, await probe(hc))
    db.commit()
    return service.output_for(db, hc)


def results(hc_id: str, limit: int = Query(100, ge=1, le=500), db: Session = Depends(get_db),
            user: User = Depends(current_user)) -> list[HealthCheckResultOut]:
    return service.recent_results(db, service.get_owned(db, user, hc_id), limit)
