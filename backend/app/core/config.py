import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'route53.db'}")
SESSION_COOKIE = "r53_session"
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "72"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
SEED_ON_STARTUP = os.getenv("SEED_ON_STARTUP", "true").lower() == "true"
ALLOW_SIGNUP = os.getenv("ALLOW_SIGNUP", "true").lower() == "true"
HEALTH_CHECKER_ENABLED = os.getenv("HEALTH_CHECKER_ENABLED", "true").lower() == "true"
ALLOW_PRIVATE_HEALTH_CHECK_TARGETS = os.getenv("ALLOW_PRIVATE_HEALTH_CHECK_TARGETS", "false").lower() == "true"
