import ipaddress
import re

SUPPORTED_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA")
CREATABLE_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA")
CAA_TAGS = ("issue", "issuewild", "iodef")
DEFAULT_TYPES = ("NS", "SOA")

_LABEL = re.compile(r"^(?!-)[a-z0-9_-]{1,63}(?<!-)$")


class DnsValidationError(ValueError):
    pass


def normalize_name(name: str) -> str:
    name = name.strip().lower()
    if not name:
        raise DnsValidationError("Name is required.")
    if not name.endswith("."):
        name += "."
    return name


def is_hostname(name: str, allow_wildcard: bool = False) -> bool:
    name = name.rstrip(".").lower()
    if not name or len(name) > 253:
        return False
    labels = name.split(".")
    for i, label in enumerate(labels):
        if allow_wildcard and i == 0 and label == "*":
            continue
        if not _LABEL.match(label):
            return False
    return True


def validate_zone_name(name: str) -> str:
    fqdn = normalize_name(name)
    if not is_hostname(fqdn) or "." not in fqdn.rstrip("."):
        raise DnsValidationError(f"'{name}' is not a valid domain name. Enter a name like example.com.")
    return fqdn


def record_fqdn(name: str, zone_name: str) -> str:
    name = name.strip().lower()
    if name in ("", "@"):
        return zone_name
    fqdn = name if name.endswith(".") else f"{name}."
    if fqdn != zone_name and not fqdn.endswith("." + zone_name):
        fqdn = f"{name.rstrip('.')}.{zone_name}"
    if not is_hostname(fqdn, allow_wildcard=True):
        raise DnsValidationError(f"Record name '{name}' contains invalid characters.")
    return fqdn


def _hostname_value(v: str, what: str) -> str:
    v = v.strip().lower()
    if not is_hostname(v):
        raise DnsValidationError(f"'{v}' is not a valid {what}.")
    return v if v.endswith(".") else v + "."


def _int_in(raw: str, lo: int, hi: int, what: str) -> int:
    if not raw.isdigit() or not lo <= int(raw) <= hi:
        raise DnsValidationError(f"{what} must be an integer between {lo} and {hi}.")
    return int(raw)


def _quote_txt(v: str) -> str:
    v = v.strip()
    if v.startswith('"') and v.endswith('"') and len(v) >= 2:
        return v
    return '"' + v.replace('"', '\\"') + '"'


def validate_value(rtype: str, value: str) -> str:
    value = value.strip()
    if not value:
        raise DnsValidationError("Value cannot be empty.")

    if rtype == "A":
        try:
            return str(ipaddress.IPv4Address(value))
        except ValueError:
            raise DnsValidationError(f"'{value}' is not a valid IPv4 address.") from None
    if rtype == "AAAA":
        try:
            return str(ipaddress.IPv6Address(value))
        except ValueError:
            raise DnsValidationError(f"'{value}' is not a valid IPv6 address.") from None
    if rtype in ("CNAME", "NS", "PTR"):
        return _hostname_value(value, "domain name")
    if rtype == "TXT":
        quoted = _quote_txt(value)
        if any(len(chunk) > 255 for chunk in re.findall(r'"((?:[^"\\]|\\.)*)"', quoted)):
            raise DnsValidationError("Each TXT string must be 255 characters or fewer.")
        return quoted
    if rtype == "MX":
        parts = value.split()
        if len(parts) != 2:
            raise DnsValidationError("MX values must look like: 10 mail.example.com")
        prio = _int_in(parts[0], 0, 65535, "MX priority")
        return f"{prio} {_hostname_value(parts[1], 'mail server name')}"
    if rtype == "SRV":
        parts = value.split()
        if len(parts) != 4:
            raise DnsValidationError("SRV values must look like: 1 10 5269 xmpp-server.example.com")
        prio = _int_in(parts[0], 0, 65535, "SRV priority")
        weight = _int_in(parts[1], 0, 65535, "SRV weight")
        port = _int_in(parts[2], 0, 65535, "SRV port")
        return f"{prio} {weight} {port} {_hostname_value(parts[3], 'target')}"
    if rtype == "CAA":
        m = re.match(r'^(\d+)\s+([a-zA-Z0-9]+)\s+(.+)$', value)
        if not m:
            raise DnsValidationError('CAA values must look like: 0 issue "amazon.com"')
        flags = _int_in(m.group(1), 0, 255, "CAA flags")
        tag = m.group(2).lower()
        if tag not in CAA_TAGS:
            raise DnsValidationError(f"CAA tag must be one of: {', '.join(CAA_TAGS)}.")
        return f"{flags} {tag} {_quote_txt(m.group(3))}"
    if rtype == "SOA":
        parts = value.split()
        if len(parts) != 7 or not all(p.isdigit() for p in parts[2:]):
            raise DnsValidationError("SOA values need 7 fields: mname rname serial refresh retry expire minimum.")
        return " ".join([_hostname_value(parts[0], "name server"), _hostname_value(parts[1], "email"), *parts[2:]])
    raise DnsValidationError(f"Record type {rtype} is not supported.")


def validate_values(rtype: str, values: list[str]) -> list[str]:
    cleaned = [validate_value(rtype, v) for v in values if v.strip()]
    if not cleaned:
        raise DnsValidationError("Enter at least one value.")
    if rtype == "CNAME" and len(cleaned) > 1:
        raise DnsValidationError("A CNAME record can have only one value.")
    if len(set(cleaned)) != len(cleaned):
        raise DnsValidationError("Duplicate values are not allowed.")
    return cleaned
