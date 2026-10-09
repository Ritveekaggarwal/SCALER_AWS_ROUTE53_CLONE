import ipaddress
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from ...core.dns_rules import is_hostname
from ...core.errors import AppError, invalid, not_found
from ...core.schemas import BulkDeleteResult
from ...core.timeutil import utc
from ..activity.service import log
from ..auth.models import User
from ..records.models import RecordSet
from .models import HealthCheck, HealthCheckResult
from .probe import DEFAULT_PORTS, ProbeResult, check_public
from .schemas import HealthCheckOut, HealthCheckResultOut, HealthCheckUpdate

KEEP_RESULTS = 500


def endpoint_of(hc: HealthCheck) -> str:
    host = hc.domain_name or hc.ip_address or ""
    if hc.protocol == "TCP":
        return f"{host}:{hc.port}"
    default = DEFAULT_PORTS[hc.protocol]
    port = "" if hc.port == default else f":{hc.port}"
    return f"{hc.protocol.lower()}://{host}{port}{hc.resource_path}"


def health_out(hc: HealthCheck, record_count: int = 0) -> HealthCheckOut:
    return HealthCheckOut(
        id=hc.id, name=hc.name, protocol=hc.protocol, ip_address=hc.ip_address, domain_name=hc.domain_name,
        port=hc.port, resource_path=hc.resource_path, search_string=hc.search_string,
        request_interval=hc.request_interval, failure_threshold=hc.failure_threshold, inverted=hc.inverted,
        disabled=hc.disabled, status=hc.status, last_checked_at=utc(hc.last_checked_at),
        last_latency_ms=hc.last_latency_ms, last_message=hc.last_message, endpoint=endpoint_of(hc),
        record_count=record_count, created_at=utc(hc.created_at),
    )


def record_counts(db: Session, ids: list[str]) -> dict[str, int]:
    if not ids:
        return {}
    rows = db.execute(select(RecordSet.health_check_id, func.count(RecordSet.id))
                      .where(RecordSet.health_check_id.in_(ids)).group_by(RecordSet.health_check_id))
    return dict(rows.all())


def output_for(db: Session, hc: HealthCheck) -> HealthCheckOut:
    return health_out(hc, record_counts(db, [hc.id]).get(hc.id, 0))


def get_owned(db: Session, user: User, hc_id: str) -> HealthCheck:
    hc = db.get(HealthCheck, hc_id)
    if not hc or hc.owner_id != user.id:
        raise not_found(f"No health check found with ID: {hc_id}", "NoSuchHealthCheck")
    return hc


def validate_target(protocol: str, ip_address: str | None, domain_name: str | None, port: int | None,
                    resource_path: str) -> tuple[str | None, str | None, int, str]:
    ip_address = (ip_address or "").strip() or None
    domain_name = (domain_name or "").strip().lower().rstrip(".") or None
    if not ip_address and not domain_name:
        raise invalid("Specify an IP address or a domain name to monitor.")
    if ip_address:
        try:
            ip_address = str(ipaddress.ip_address(ip_address))
        except ValueError:
            raise invalid(f"'{ip_address}' is not a valid IP address.") from None
        check_public(ip_address)
    if domain_name and not is_hostname(domain_name):
        raise invalid(f"'{domain_name}' is not a valid domain name.")
    if protocol == "TCP" and port is None:
        raise invalid("TCP health checks need a port.")
    path = resource_path.strip() or "/"
    if not path.startswith("/"):
        path = "/" + path
    return ip_address, domain_name, port or DEFAULT_PORTS[protocol], path


def apply_result(db: Session, hc: HealthCheck, result: ProbeResult) -> None:
    now = datetime.now(timezone.utc)
    healthy_signal = result.success != hc.inverted
    if healthy_signal:
        hc.consecutive_successes += 1
        hc.consecutive_failures = 0
    else:
        hc.consecutive_failures += 1
        hc.consecutive_successes = 0

    previous = hc.status
    if hc.status == "Unknown":
        hc.status = "Healthy" if healthy_signal else "Unhealthy"
    elif hc.status == "Healthy" and hc.consecutive_failures >= hc.failure_threshold:
        hc.status = "Unhealthy"
    elif hc.status == "Unhealthy" and hc.consecutive_successes >= hc.failure_threshold:
        hc.status = "Healthy"

    hc.last_checked_at = now
    hc.last_latency_ms = result.latency_ms
    hc.last_message = result.message
    db.add(HealthCheckResult(health_check_id=hc.id, checked_at=now, success=result.success,
                             latency_ms=result.latency_ms, status_code=result.status_code, message=result.message))
    if previous != hc.status and previous != "Unknown":
        log(db, hc.owner_id, "status", "health_check", hc.id, f"Health check {hc.name} is now {hc.status}")

    db.flush()
    cutoff = db.scalar(select(HealthCheckResult.id).where(HealthCheckResult.health_check_id == hc.id)
                       .order_by(HealthCheckResult.id.desc()).offset(KEEP_RESULTS).limit(1))
    if cutoff:
        db.execute(delete(HealthCheckResult).where(HealthCheckResult.health_check_id == hc.id,
                                                   HealthCheckResult.id <= cutoff))


def new_health_check_id() -> str:
    return str(uuid.uuid4())


def create_health_check(db: Session, owner_id: int, *, name: str, protocol: str, ip_address: str | None,
                        domain_name: str | None, port: int | None, resource_path: str = "/",
                        search_string: str = "", request_interval: int = 30, failure_threshold: int = 3,
                        inverted: bool = False, disabled: bool = False) -> HealthCheck:
    if protocol not in DEFAULT_PORTS:
        raise invalid("Protocol must be HTTP, HTTPS or TCP.")
    if request_interval not in (10, 30):
        raise invalid("Request interval must be 10 or 30 seconds.")
    if not 1 <= failure_threshold <= 10:
        raise invalid("Failure threshold must be between 1 and 10.")
    if not name.strip():
        raise invalid("Name is required.")
    ip, domain, port_, path = validate_target(protocol, ip_address, domain_name, port, resource_path)
    hc = HealthCheck(
        id=new_health_check_id(), owner_id=owner_id, name=name.strip(), protocol=protocol, ip_address=ip,
        domain_name=domain, port=port_, resource_path=path, search_string=search_string if protocol != "TCP" else "",
        request_interval=request_interval, failure_threshold=failure_threshold, inverted=inverted,
        disabled=disabled, status="Healthy" if disabled else "Unknown",
    )
    db.add(hc)
    log(db, owner_id, "create", "health_check", hc.id, f"Created health check {hc.name}")
    db.flush()
    return hc


def list_health_checks(db: Session, user: User, search: str, status_filter: str | None, page: int,
                       page_size: int) -> tuple[list[HealthCheck], int]:
    q = select(HealthCheck).where(HealthCheck.owner_id == user.id)
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.where(or_(HealthCheck.name.ilike(like), HealthCheck.id.ilike(like), HealthCheck.ip_address.ilike(like),
                        HealthCheck.domain_name.ilike(like)))
    if status_filter == "Disabled":
        q = q.where(HealthCheck.disabled.is_(True))
    elif status_filter:
        q = q.where(HealthCheck.status == status_filter, HealthCheck.disabled.is_(False))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    items = list(db.scalars(q.order_by(HealthCheck.created_at.desc()).offset((page - 1) * page_size)
                            .limit(page_size)).all())
    return items, total


def update_health_check(db: Session, user: User, hc: HealthCheck, body: HealthCheckUpdate) -> HealthCheck:
    fields = body.model_dump(exclude_unset=True)
    target_keys = {"ip_address", "domain_name", "port", "resource_path"}
    if target_keys & fields.keys():
        ip, domain, port, path = validate_target(
            hc.protocol,
            fields.get("ip_address", hc.ip_address),
            fields.get("domain_name", hc.domain_name),
            fields.get("port", hc.port),
            fields.get("resource_path", hc.resource_path) or "/",
        )
        hc.ip_address, hc.domain_name, hc.port, hc.resource_path = ip, domain, port, path
    was_disabled = hc.disabled
    for key in ("name", "search_string", "failure_threshold", "inverted", "disabled"):
        if key in fields and fields[key] is not None:
            setattr(hc, key, fields[key])
    if hc.disabled != was_disabled:
        hc.status = "Healthy" if hc.disabled else "Unknown"
        hc.consecutive_failures = hc.consecutive_successes = 0
        hc.last_checked_at = None
    log(db, user.id, "update", "health_check", hc.id, f"Updated health check {hc.name}")
    return hc


def delete_health_check(db: Session, user: User, hc: HealthCheck) -> None:
    log(db, user.id, "delete", "health_check", hc.id, f"Deleted health check {hc.name}")
    db.delete(hc)


def bulk_delete_health_checks(db: Session, user: User, ids: list[str | int]) -> BulkDeleteResult:
    deleted, failed = [], []
    for hid in ids:
        try:
            delete_health_check(db, user, get_owned(db, user, str(hid)))
            deleted.append(hid)
        except AppError as exc:
            failed.append({"id": hid, "reason": exc.message})
    return BulkDeleteResult(deleted=deleted, failed=failed)


def recent_results(db: Session, hc: HealthCheck, limit: int) -> list[HealthCheckResultOut]:
    rows = db.scalars(select(HealthCheckResult).where(HealthCheckResult.health_check_id == hc.id)
                      .order_by(HealthCheckResult.id.desc()).limit(limit)).all()
    return [HealthCheckResultOut(checked_at=utc(r.checked_at), success=r.success, latency_ms=r.latency_ms,
                                 status_code=r.status_code, message=r.message) for r in rows]
