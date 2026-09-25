"""Database layer smoke test for auth_app/db.py."""

import hashlib
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import auth_app.db as db  # noqa: E402

PASSED = 0
FAILED = 0


def check(label, condition):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  PASS {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label}")


def main():
    print("=== database layer smoke test ===")
    db.init_db()

    email = f"user-{uuid.uuid4().hex[:8]}@example.com"
    user = db.create_user(
        user_id=str(uuid.uuid4()),
        email=email,
        name="Test User",
        password_hash="scrypt$fake",
        email_verified=False,
    )
    check("create_user returns a record", bool(user))
    check("email stored lowercase", user["email"] == email.lower())
    check("email_verified defaults to 0", user["email_verified"] == 0)
    check("storage_pref defaults to browser", user["storage_pref"] == "browser")

    check("get_user_by_email finds user", db.get_user_by_email(email)["id"] == user["id"])
    check("get_user_by_email is case-insensitive", db.get_user_by_email(email.upper())["id"] == user["id"])
    check("get_user_by_id finds user", db.get_user_by_id(user["id"])["id"] == user["id"])
    check("get_user_by_id missing returns None", db.get_user_by_id("nope") is None)

    db.mark_email_verified(user["id"])
    check("mark_email_verified flips flag", db.get_user_by_id(user["id"])["email_verified"] == 1)

    db.update_user_storage_pref(user["id"], "drive")
    check("update_user_storage_pref persists", db.get_user_by_id(user["id"])["storage_pref"] == "drive")

    # OAuth linking
    db.link_oauth_account(user["id"], "google", "google-123", email, "Test User", "https://x/y.png")
    found = db.get_user_by_oauth("google", "google-123")
    check("get_user_by_oauth joins correctly", bool(found) and found["id"] == user["id"])
    check("get_user_by_oauth unknown provider returns None", db.get_user_by_oauth("github", "zzz") is None)
    links = db.get_user_oauth_links(user["id"])
    check("get_user_oauth_links returns provider row", len(links) == 1 and links[0]["provider"] == "google")

    # Relinking the same provider identity must not duplicate rows
    db.link_oauth_account(user["id"], "google", "google-123", email, "Test User", "https://x/y.png")
    check("relinking does not duplicate", len(db.get_user_oauth_links(user["id"])) == 1)

    # OTP lifecycle
    code_hash = hashlib.sha256(b"123456").hexdigest()
    future = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    db.save_otp(email, code_hash, "signup", future)

    ok, msg = db.verify_and_consume_otp(email, hashlib.sha256(b"000000").hexdigest(), "signup")
    check("wrong OTP rejected", ok is False)
    check("wrong OTP reports remaining attempts", "remaining" in msg)

    ok, msg = db.verify_and_consume_otp(email, code_hash, "signup")
    check("correct OTP accepted", ok is True)

    ok, msg = db.verify_and_consume_otp(email, code_hash, "signup")
    check("consumed OTP cannot be replayed", ok is False)

    # Expired OTP
    past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    db.save_otp(email, code_hash, "reset", past)
    ok, msg = db.verify_and_consume_otp(email, code_hash, "reset")
    check("expired OTP rejected", ok is False and "expired" in msg.lower())

    # Attempt exhaustion
    soon = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    db.save_otp(email, code_hash, "login", soon)
    for _ in range(3):
        db.verify_and_consume_otp(email, hashlib.sha256(b"999999").hexdigest(), "login")
    ok, msg = db.verify_and_consume_otp(email, code_hash, "login")
    check("exhausted OTP locks out", ok is False and "maximum" in msg.lower())

    check("purge_expired_otps runs", isinstance(db.purge_expired_otps(), int))

    # License persistence
    db.save_user_license(
        user["id"],
        "payload.signature",
        "LK-TEST-0001",
        "Test User",
        "pro",
        "2026-01-01",
        "2027-01-01",
        ["drive_sync"],
    )
    lic = db.get_active_license_for_user(user["id"])
    check("license saved and fetched", bool(lic) and lic["tier"] == "pro")
    check("license features decoded from JSON", lic["features"] == ["drive_sync"])

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
