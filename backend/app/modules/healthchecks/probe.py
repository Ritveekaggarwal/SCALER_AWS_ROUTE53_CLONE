import asyncio
import ipaddress
import socket
import time
from dataclasses import dataclass

import httpx

from ...core.config import ALLOW_PRIVATE_HEALTH_CHECK_TARGETS
from ...core.errors import invalid
from .models import HealthCheck

CONNECT_TIMEOUT = 4.0
READ_TIMEOUT = 2.0
BODY_SEARCH_BYTES = 5120
DEFAULT_PORTS = {"HTTP": 80, "HTTPS": 443, "TCP": 80}


@dataclass
class ProbeResult:
    success: bool
    latency_ms: int | None
    status_code: int | None
    message: str


def check_public(ip: str) -> None:
    if ALLOW_PRIVATE_HEALTH_CHECK_TARGETS:
        return
    addr = ipaddress.ip_address(ip)
    if not addr.is_global:
        raise invalid(f"{ip} is a private, loopback or reserved address. Health checks need a public endpoint.",
                      "InvalidInput")


async def _resolve_public(host: str) -> str:
    loop = asyncio.get_running_loop()
    infos = await loop.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    addrs = [info[4][0] for info in infos]
    if not addrs:
        raise OSError(f"Could not resolve {host}")
    for a in addrs:
        check_public(a)
    return addrs[0]


async def probe(hc: HealthCheck) -> ProbeResult:
    start = time.perf_counter()
    elapsed = lambda: int((time.perf_counter() - start) * 1000)
    try:
        connect_ip = hc.ip_address or await _resolve_public(hc.domain_name)
        if hc.protocol == "TCP":
            _, writer = await asyncio.wait_for(asyncio.open_connection(connect_ip, hc.port), CONNECT_TIMEOUT)
            writer.close()
            return ProbeResult(True, elapsed(), None, f"TCP connection to port {hc.port} succeeded")

        host = hc.domain_name or hc.ip_address
        url_host = f"[{host}]" if ":" in host else host
        url = f"{hc.protocol.lower()}://{url_host}:{hc.port}{hc.resource_path}"
        timeout = httpx.Timeout(READ_TIMEOUT, connect=CONNECT_TIMEOUT)
        async with httpx.AsyncClient(timeout=timeout, verify=False, follow_redirects=False) as client:
            async with client.stream("GET", url, headers={"User-Agent": "Route53-Clone-Health-Check"}) as resp:
                body = b""
                if hc.search_string:
                    async for chunk in resp.aiter_bytes():
                        body += chunk
                        if len(body) >= BODY_SEARCH_BYTES:
                            break
                ok = 200 <= resp.status_code < 400
                msg = f"HTTP {resp.status_code}"
                if ok and hc.search_string and hc.search_string.encode() not in body[:BODY_SEARCH_BYTES]:
                    ok, msg = False, f"HTTP {resp.status_code}, but the search string was not found"
                return ProbeResult(ok, elapsed(), resp.status_code, msg)
    except asyncio.TimeoutError:
        return ProbeResult(False, None, None, "Connection timed out")
    except httpx.TimeoutException:
        return ProbeResult(False, None, None, "Request timed out")
    except Exception as exc:
        detail = getattr(exc, "message", None) or str(exc) or exc.__class__.__name__
        return ProbeResult(False, None, None, f"Failure: {detail}"[:300])
