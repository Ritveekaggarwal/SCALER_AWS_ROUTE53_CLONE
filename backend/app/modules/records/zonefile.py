import dns.exception
import dns.name
import dns.rdatatype
import dns.zone

from ...core.dns_rules import CREATABLE_TYPES, DnsValidationError, validate_values


class ParsedRecord:
    def __init__(self, name: str, rtype: str, ttl: int, values: list[str]):
        self.name, self.type, self.ttl, self.values = name, rtype, ttl, values


def parse_bind(text: str, zone_name: str) -> list[tuple[ParsedRecord, str | None]]:
    try:
        parsed = dns.zone.from_text(text, origin=zone_name, relativize=False, check_origin=False)
    except (dns.exception.DNSException, ValueError) as exc:
        raise DnsValidationError(f"Could not parse zone file: {exc}") from None

    out: list[tuple[ParsedRecord, str | None]] = []
    origin = dns.name.from_text(zone_name)
    for name, rdataset in parsed.iterate_rdatasets():
        fqdn = name.to_text().lower()
        rtype = dns.rdatatype.to_text(rdataset.rdtype)
        raw_values = [rd.to_text() for rd in rdataset]
        record = ParsedRecord(fqdn, rtype, rdataset.ttl, raw_values)

        if not name.is_subdomain(origin):
            out.append((record, "Name is outside this hosted zone."))
            continue
        if rtype in ("SOA", "NS") and name == origin:
            out.append((record, "Route 53 manages the apex SOA and NS records."))
            continue
        if rtype not in CREATABLE_TYPES:
            out.append((record, f"Record type {rtype} is not supported."))
            continue
        try:
            record.values = validate_values(rtype, raw_values)
        except DnsValidationError as exc:
            out.append((record, str(exc)))
            continue
        out.append((record, None))
    return out
