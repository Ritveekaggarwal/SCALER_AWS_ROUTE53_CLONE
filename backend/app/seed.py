from sqlalchemy import select
from sqlalchemy.orm import Session

from .modules.auth.models import User
from .modules.auth.security import hash_password
from .modules.records.models import RecordSet
from .modules.records.service import set_values
from .modules.zones.service import create_zone

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo1234"
DEMO_ACCOUNT_ID = "123456789012"
DEMO_ACCOUNT_ALIAS = "scaler-demo"

SAMPLE_ZONES = {
    "example.com.": (
        "Primary marketing site",
        [
            ("example.com.", "A", 300, ["192.0.2.10", "192.0.2.11"]),
            ("www.example.com.", "CNAME", 300, ["example.com."]),
            ("example.com.", "MX", 3600, ["10 mail1.example.com.", "20 mail2.example.com."]),
            ("example.com.", "TXT", 300, ['"v=spf1 include:amazonses.com ~all"']),
            ("example.com.", "CAA", 3600, ['0 issue "amazon.com"']),
            ("api.example.com.", "A", 60, ["198.51.100.20"]),
            ("api.example.com.", "AAAA", 60, ["2001:db8::20"]),
            ("_sip._tcp.example.com.", "SRV", 300, ["1 10 5060 sip.example.com."]),
        ],
    ),
    "scaler-demo.io.": ("Staging environment", [("app.scaler-demo.io.", "A", 300, ["203.0.113.5"])]),
    "2.0.192.in-addr.arpa.": ("Reverse lookup zone", [("10.2.0.192.in-addr.arpa.", "PTR", 300, ["example.com."])]),
}


def seed(db: Session) -> None:
    if db.scalar(select(User).where(User.username == DEMO_USERNAME)):
        return
    user = User(
        username=DEMO_USERNAME,
        password_hash=hash_password(DEMO_PASSWORD),
        account_id=DEMO_ACCOUNT_ID,
        account_alias=DEMO_ACCOUNT_ALIAS,
        display_name="Demo User",
    )
    db.add(user)
    db.flush()
    for name, (comment, records) in SAMPLE_ZONES.items():
        zone = create_zone(db, user.id, name, comment)
        for rname, rtype, ttl, values in records:
            record = RecordSet(name=rname, type=rtype, ttl=ttl)
            set_values(record, values)
            zone.record_sets.append(record)
    db.commit()
