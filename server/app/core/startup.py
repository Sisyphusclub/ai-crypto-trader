import re
import math
from app.core.settings import settings

DEFAULT_PATTERNS = [
    re.compile(r"^change-me", re.I),
    re.compile(r"^password$", re.I),
    re.compile(r"^secret$", re.I),
    re.compile(r"^admin$", re.I),
]


def _calculate_entropy(value: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not value:
        return 0.0
    freq = {}
    for char in value:
        freq[char] = freq.get(char, 0) + 1
    length = len(value)
    entropy = 0.0
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def _looks_default(value: str) -> bool:
    if not value or len(value) < 24:
        return True
    # Check entropy - good secrets should have high entropy
    if _calculate_entropy(value) < 3.5:
        return True
    return any(p.search(value) for p in DEFAULT_PATTERNS)


def _verify_live_mode_confirmation() -> None:
    """Verify LIVE mode is properly confirmed."""
    if not settings.PAPER_TRADING:
        # LIVE mode requires explicit confirmation
        if settings.LIVE_TRADING_CONFIRMATION != "I_UNDERSTAND":
            raise RuntimeError(
                "Refusing to start in LIVE mode: "
                "Set LIVE_TRADING_CONFIRMATION=I_UNDERSTAND in .env to confirm you understand real funds will be used."
            )


def verify_startup_secrets() -> None:
    # Refuse to start with weak/default secrets.
    if _looks_default(settings.JWT_SECRET):
        raise RuntimeError("Refusing to start: JWT_SECRET is missing/weak/default. Update .env")
    if _looks_default(settings.MASTER_KEY):
        raise RuntimeError("Refusing to start: MASTER_KEY is missing/weak/default. Update .env")

    # Verify LIVE mode confirmation
    _verify_live_mode_confirmation()
