import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from ...core.timeutil import utc
from .models import HealthCheck
from .probe import probe
from .service import apply_result

logger = logging.getLogger("route53.healthchecks")


async def run_checker(session_factory, stop: asyncio.Event, tick: float = 5.0) -> None:
    while not stop.is_set():
        try:
            await check_due(session_factory)
        except Exception:
            logger.exception("health checker round failed")
        try:
            await asyncio.wait_for(stop.wait(), tick)
        except asyncio.TimeoutError:
            pass


async def check_due(session_factory) -> int:
    now = datetime.now(timezone.utc)
    with session_factory() as db:
        checks = db.scalars(select(HealthCheck).where(HealthCheck.disabled.is_(False))).all()
        due = [hc for hc in checks
               if hc.last_checked_at is None or utc(hc.last_checked_at) + timedelta(seconds=hc.request_interval) <= now]
        if not due:
            return 0
        sem = asyncio.Semaphore(20)

        async def one(hc):
            async with sem:
                return hc, await probe(hc)

        for hc, result in await asyncio.gather(*(one(hc) for hc in due)):
            apply_result(db, hc, result)
        db.commit()
        return len(due)
