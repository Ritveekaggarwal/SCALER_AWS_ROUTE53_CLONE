from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..auth.models import User
from ..healthchecks.models import HealthCheck
from ..records.models import RecordSet, RecordValue
from ..zones.models import HostedZone
from .schemas import SearchHit

PAGES = [
    ("Route 53 dashboard", "dashboard overview home", "/dashboard"),
    ("Hosted zones", "dns zones domains records", "/hostedzones"),
    ("Create hosted zone", "new zone domain", "/hostedzones/create"),
    ("Health checks", "monitoring availability endpoints", "/healthchecks"),
    ("Create health check", "new monitor endpoint", "/healthchecks/create"),
    ("Profile", "account user password sessions settings", "/profile"),
    ("Route 53 home", "landing getting started introduction", "/"),
]


def search_console(db: Session, user: User, q: str) -> list[SearchHit]:
    term = q.strip().lower()
    like = f"%{term}%"
    hits: list[SearchHit] = [
        SearchHit(kind="page", title=title, subtitle="Route 53 console", href=href)
        for title, words, href in PAGES
        if term in title.lower() or term in words
    ]
    zones = db.scalars(select(HostedZone).where(HostedZone.owner_id == user.id,
                                                or_(HostedZone.name.ilike(like), HostedZone.id.ilike(like),
                                                    HostedZone.comment.ilike(like))).limit(5))
    hits += [SearchHit(kind="hosted_zone", title=z.name.rstrip("."),
                       subtitle=f"Hosted zone · {z.id}", href=f"/hostedzones/{z.id}") for z in zones]
    value_match = select(RecordValue.record_set_id).where(RecordValue.value.ilike(like))
    records = db.execute(
        select(RecordSet, HostedZone).join(HostedZone, RecordSet.zone_id == HostedZone.id)
        .where(HostedZone.owner_id == user.id, or_(RecordSet.name.ilike(like), RecordSet.id.in_(value_match)))
        .limit(8)
    ).all()
    hits += [SearchHit(kind="record", title=f"{r.name.rstrip('.')} ({r.type})",
                       subtitle=f"Record in {z.name.rstrip('.')}", href=f"/hostedzones/{z.id}?record={r.id}")
             for r, z in records]
    checks = db.scalars(select(HealthCheck).where(HealthCheck.owner_id == user.id,
                                                  or_(HealthCheck.name.ilike(like), HealthCheck.id.ilike(like),
                                                      HealthCheck.domain_name.ilike(like),
                                                      HealthCheck.ip_address.ilike(like))).limit(5))
    hits += [SearchHit(kind="health_check", title=h.name, subtitle=f"Health check · {h.status}",
                       href=f"/healthchecks/{h.id}") for h in checks]
    return hits
