"""Password hashing, OTP generation and session token helpers.

Uses only the Python standard library so the auth service stays dependency
light. Password hashes are PBKDF2-HMAC-SHA256 with a per-user random salt,
stored in the ``pbkdf2_sha256$iterations$salt$hash`` format.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time
from typing import Optional, Tuple

PBKDF2_ITERATIONS = 260_000
PBKDF2_SALT_BYTES = 16
OTP_DIGITS = 6
OTP_TTL_SECONDS = 10 * 60
SESSION_TTL_SECONDS = 7 * 24 * 60 * 60


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _unb64(value: str) -> bytes:
    padding = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + padding)


# --------------------------------------------------------------------------- #
# Passwords
# --------------------------------------------------------------------------- #
def hash_password(password: str, iterations: int = PBKDF2_ITERATIONS) -> str:
    """Return a salted PBKDF2-SHA256 hash string for ``password``."""
    if not isinstance(password, str) or not password:
        raise ValueError("Password must be a non-empty string.")

    salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: Optional[str]) -> bool:
    """Constant-time verification of ``password`` against ``stored_hash``."""
    if not password or not stored_hash:
        return False

    try:
        algorithm, iterations_raw, salt_raw, digest_raw = stored_hash.split("$")
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    try:
        iterations = int(iterations_raw)
        salt = _unb64(salt_raw)
        expected = _unb64(digest_raw)
    except Exception:
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(candidate, expected)


def password_problems(password: str, minimum_length: int = 8) -> list[str]:
    """Return a list of human readable password policy violations."""
    problems: list[str] = []
    if not isinstance(password, str):
        return ["Password must be a string."]
    if len(password) < minimum_length:
        problems.append(f"Password must be at least {minimum_length} characters long.")
    if not any(ch.isalpha() for ch in password):
        problems.append("Password must contain at least one letter.")
    if not any(ch.isdigit() for ch in password):
        problems.append("Password must contain at least one number.")
    return problems


# --------------------------------------------------------------------------- #
# OTP codes
# --------------------------------------------------------------------------- #
def generate_otp(digits: int = OTP_DIGITS) -> str:
    """Return a cryptographically secure numeric OTP, zero padded."""
    upper_bound = 10 ** digits
    return str(secrets.randbelow(upper_bound)).zfill(digits)


def hash_otp(code: str, salt: str = "") -> str:
    """Hash an OTP for storage. Ties the code to a per-request salt."""
    payload = f"{salt}:{code}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def otp_expiry_iso(now: Optional[float] = None, ttl: int = OTP_TTL_SECONDS) -> str:
    """Return an ISO-8601 UTC expiry timestamp string for a fresh OTP."""
    from datetime import datetime, timedelta, timezone

    moment = datetime.fromtimestamp(now if now is not None else time.time(), tz=timezone.utc)
    return (moment + timedelta(seconds=ttl)).isoformat()


# --------------------------------------------------------------------------- #
# Session tokens
# --------------------------------------------------------------------------- #
def create_session_token(user_id: str, secret: str, ttl: int = SESSION_TTL_SECONDS) -> str:
    """Create an HMAC signed, expiring session token ``user_id.expiry.signature``."""
    expires_at = int(time.time()) + ttl
    body = f"{user_id}.{expires_at}"
    signature = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"


def read_session_token(token: str, secret: str) -> Tuple[bool, Optional[str], str]:
    """Validate ``token``; return ``(is_valid, user_id, reason)``."""
    if not token or token.count(".") != 2:
        return False, None, "Malformed token."

    user_id, expires_raw, signature = token.split(".")
    body = f"{user_id}.{expires_raw}"
    expected = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return False, None, "Invalid token signature."

    try:
        expires_at = int(expires_raw)
    except ValueError:
        return False, None, "Invalid token expiry."

    if expires_at < int(time.time()):
        return False, None, "Token expired."

    return True, user_id, "ok"
