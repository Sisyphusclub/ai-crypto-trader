import re
from app.core.settings import settings

DEFAULT_PATTERNS = [
    re.compile(r"^change-me", re.I),
    re.compile(r"^password$", re.I),
    re.compile(r"^secret$", re.I),
    re.compile(r"^admin$", re.I),
]

def _looks_default(value: str) -> bool:
    if not value or len(value) < 24:
        return True
    return any(p.search(value) for p in DEFAULT_PATTERNS)

def verify_startup_secrets() -> None:
    # Refuse to start with weak/default secrets.
    if _looks_default(settings.JWT_SECRET):
        raise RuntimeError("Refusing to start: JWT_SECRET is missing/weak/default. Update .env")
    if _looks_default(settings.MASTER_KEY):
        raise RuntimeError("Refusing to start: MASTER_KEY is missing/weak/default. Update .env")
