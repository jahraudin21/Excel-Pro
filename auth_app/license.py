"""License Key Generator and Validator.

Cryptographically signed license keys using HMAC-SHA256:
Format:
    PAYLOAD.SIGNATURE
Where PAYLOAD is base64url-encoded JSON:
    {
        "key_id": "LK-XXXX-XXXX-XXXX",
        "licensee": "Acme Corp / user@example.com",
        "tier": "pro" | "enterprise" | "standard",
        "issued_at": "YYYY-MM-DD",
        "expires_at": "YYYY-MM-DD",
        "features": ["drive_sync", "bulk_export", "api_access"]
    }
The SIGNATURE is an HMAC-SHA256 signature over the payload string using a secret master key.
A clean, printable license key string is generated and can be validated without external network calls.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

# In production, set LICENSE_SECRET_KEY via environment variable
LICENSE_SECRET = os.environ.get("LICENSE_SECRET_KEY", "mini-excel-auth-secret-key-prod-2026-v1").encode("utf-8")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + padding)


def generate_license(
    licensee: str,
    expires_at: str,  # format "YYYY-MM-DD"
    tier: str = "pro",
    features: Optional[List[str]] = None,
    secret_key: bytes = LICENSE_SECRET,
) -> str:
    """Generate a tamper-proof cryptographically signed license key string."""
    # Validate expiration date format
    datetime.strptime(expires_at, "%Y-%m-%d")

    payload: Dict[str, Any] = {
        "kid": f"LK-{uuid.uuid4().hex[:8].upper()}-{uuid.uuid4().hex[:8].upper()}",
        "lic": licensee.strip(),
        "tier": tier.lower(),
        "exp": expires_at,
        "iat": date.today().isoformat(),
        "feat": features or ["all"],
    }

    raw_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(raw_json)

    # Compute HMAC-SHA256 signature
    sig = hmac.new(secret_key, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{payload_b64}.{sig_b64}"


def validate_license(
    license_key: str,
    secret_key: bytes = LICENSE_SECRET,
    reference_date: Optional[date] = None,
) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Validate a license key string.

    Returns:
        (is_valid: bool, status_message: str, license_info: Optional[dict])
    """
    if not license_key or not isinstance(license_key, str):
        return False, "License key is missing or empty.", None

    parts = license_key.strip().split(".")
    if len(parts) != 2:
        return False, "Invalid license key format. Expected PAYLOAD.SIGNATURE.", None

    payload_b64, sig_b64 = parts[0], parts[1]

    # Verify signature in constant time
    expected_sig = hmac.new(secret_key, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    try:
        given_sig = _b64url_decode(sig_b64)
    except Exception:
        return False, "License signature decoding failed.", None

    if not hmac.compare_digest(expected_sig, given_sig):
        return False, "Cryptographic signature mismatch. The license key has been tampered with.", None

    # Decode payload
    try:
        raw_json = _b64url_decode(payload_b64)
        payload = json.loads(raw_json.decode("utf-8"))
    except Exception:
        return False, "Malformed license payload.", None

    # Validate required fields
    for req in ("kid", "lic", "tier", "exp", "iat"):
        if req not in payload:
            return False, f"Missing required license field: {req}.", None

    try:
        exp_date = datetime.strptime(payload["exp"], "%Y-%m-%d").date()
    except Exception:
        return False, "Invalid expiration date format in license.", None

    today = reference_date or date.today()
    days_left = (exp_date - today).days

    info = {
        "key_id": payload["kid"],
        "licensee": payload["lic"],
        "tier": payload["tier"],
        "issued_at": payload["iat"],
        "expires_at": payload["exp"],
        "features": payload.get("feat", []),
        "days_remaining": days_left,
        "is_expired": days_left < 0,
    }

    if days_left < 0:
        return (
            False,
            f"License key has expired on {payload['exp']} ({abs(days_left)} days ago).",
            info,
        )

    return True, f"License is valid. {days_left} days remaining (Expires: {payload['exp']}).", info


if __name__ == "__main__":
    # Self-test / quick generator CLI
    sample = generate_license("Acme Corp", "2027-12-31", tier="enterprise", features=["sync", "export"])
    print("Generated sample license:\n", sample)
    valid, msg, data = validate_license(sample)
    print("\nValidation result:", valid)
    print("Message:", msg)
    print("Data:", json.dumps(data, indent=2))
