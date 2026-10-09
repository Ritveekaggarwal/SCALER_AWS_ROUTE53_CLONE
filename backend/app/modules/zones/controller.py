import json
from typing import Literal

from fastapi import Depends, Query, Response
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.schemas import BulkDelete, BulkDeleteResult, Page
from ..auth.models import User
from ..auth.security import current_user
from . import service
from .exporter import export_bind, export_json
from .models import HostedZone
from .schemas import HostedZoneCreate, HostedZoneOut, HostedZoneUpdate


def get_owned_zone(zone_id: str, db: Session, user: User) -> HostedZone:
    return service.get_zone(db, user, zone_id)


def list_zones(
    search: str = "",
    type: Literal["public", "private"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: Literal["name", "-name", "created_at", "-created_at"] = "name",
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    zones, total = service.list_zones(db, user, search, type, page, page_size, sort)
    counts = service.record_counts(db, [z.id for z in zones])
    return Page(items=[service.zone_out(z, counts.get(z.id, 0)) for z in zones], total=total, page=page,
                page_size=page_size)


def create(body: HostedZoneCreate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    zone = service.create_hosted_zone(db, user, body.name, body.comment, body.is_private, body.vpc_region,
                                      body.vpc_id)
    db.commit()
    return service.zone_out(zone, len(zone.record_sets))


def bulk_delete(body: BulkDelete, db: Session = Depends(get_db),
                user: User = Depends(current_user)) -> BulkDeleteResult:
    result = service.bulk_delete_zones(db, user, body.ids)
    db.commit()
    return result


def get(zone_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> HostedZoneOut:
    zone = get_owned_zone(zone_id, db, user)
    return service.zone_out(zone, service.record_counts(db, [zone.id]).get(zone.id, 0))


def update(zone_id: str, body: HostedZoneUpdate, db: Session = Depends(get_db),
           user: User = Depends(current_user)) -> HostedZoneOut:
    zone = service.update_hosted_zone(db, user, get_owned_zone(zone_id, db, user), body.comment)
    db.commit()
    return service.zone_out(zone, service.record_counts(db, [zone.id]).get(zone.id, 0))


def delete(zone_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    service.delete_hosted_zone(db, user, get_owned_zone(zone_id, db, user))
    db.commit()


def export(zone_id: str, format: Literal["json", "bind"] = "bind",
           db: Session = Depends(get_db), user: User = Depends(current_user)):
    zone = get_owned_zone(zone_id, db, user)
    filename = zone.name.rstrip(".")
    if format == "json":
        return Response(
            json.dumps(export_json(zone), indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}.json"'},
        )
    return Response(
        export_bind(zone),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}.zone"'},
    )
