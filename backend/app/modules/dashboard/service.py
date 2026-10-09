from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..activity.service import activity_out, recent_activity
from ..auth.models import User
from ..healthchecks.models import HealthCheck
from ..records.models import RecordSet
from ..zones.models import HostedZone
from .schemas import Dashboard


def build_dashboard(db: Session, user: User) -> Dashboard:
    zone_rows = db.execute(select(HostedZone.is_private, func.count()).where(HostedZone.owner_id == user.id)
                           .group_by(HostedZone.is_private)).all()
    by_private = {bool(p): n for p, n in zone_rows}
    type_rows = db.execute(
        select(RecordSet.type, func.count()).join(HostedZone, RecordSet.zone_id == HostedZone.id)
        .where(HostedZone.owner_id == user.id).group_by(RecordSet.type)
    ).all()
    health_rows = db.execute(select(HealthCheck.status, func.count()).where(HealthCheck.owner_id == user.id)
                             .group_by(HealthCheck.status)).all()
    recent = recent_activity(db, user, 8)
    return Dashboard(
        hosted_zones=sum(by_private.values()),
        public_zones=by_private.get(False, 0),
        private_zones=by_private.get(True, 0),
        records=sum(n for _, n in type_rows),
        records_by_type=dict(sorted(type_rows)),
        health_checks=sum(n for _, n in health_rows),
        health_by_status=dict(health_rows),
        recent_activity=[activity_out(a) for a in recent],
    )
