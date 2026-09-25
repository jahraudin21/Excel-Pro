"""Focused tests for offline license key validation + security helpers."""

import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import auth_app.license as lic  # noqa: E402
import auth_app.security as sec  # noqa: E402

PASSED = 0
FAILED = 0


def check(label, condition, extra=""):
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  PASS {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label} {extra}")


def main():
    print("=== license + security unit test ===")

    print("\n--- license generation ---")
    key = lic.generate_license("Acme Corp", "2027-12-31", tier="enterprise", features=["sync", "export"])
    check("key has two dot-separated segments", key.count(".") == 1)
    check("key is URL safe", all(c.isalnum() or c in "-_." for c in key))

    valid, message, info = lic.validate_license(key)
    check("fresh key validates", valid is True)
    check("licensee round-trips", info["licensee"] == "Acme Corp")
    check("tier round-trips", info["tier"] == "enterprise")
    check("features round-trip", info["features"] == ["sync", "export"])
    check("expiry round-trips", info["expires_at"] == "2027-12-31")
    check("key id generated", info["key_id"].startswith("LK-"))

    print("\n--- tamper detection ---")
    payload, signature = key.split(".")
    flipped = list(signature)
    flipped[0] = "A" if flipped[0] != "A" else "B"
    bad_sig = ".".join([payload, "".join(flipped)])
    valid, message, info = lic.validate_license(bad_sig)
    check("flipped signature rejected", valid is False)
    check("signature message clear", "signature" in message.lower())

    valid, message, _ = lic.validate_license(payload + ".not-base64!!!")
    check("undecodable signature rejected", valid is False)

    valid, message, info = lic.validate_license("garbage")
    check("malformed key rejected", valid is False and info is None)

    valid, message, _ = lic.validate_license("")
    check("empty key rejected", valid is False)

    swapped = ".".join([bad_sig.split(".")[0], "AAAA"])
    valid, message, _ = lic.validate_license(swapped)
    check("wrong-length signature rejected", valid is False)


    print("\n--- expiry window ---")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    expired_key = lic.generate_license("Old Timer", yesterday)
    valid, message, info = lic.validate_license(expired_key)
    check("yesterday's key is expired", valid is False)
    check("expiry info retained", info["is_expired"] is True and info["days_remaining"] == -1)
    check("expiry message names the date", yesterday in message)

    today_key = lic.generate_license("Today", date.today().isoformat())
    valid, message, info = lic.validate_license(today_key)
    check("key expiring today is still valid", valid is True and info["days_remaining"] == 0)

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    valid, message, info = lic.validate_license(lic.generate_license("Later", tomorrow))
    check("key expiring tomorrow valid", valid is True and info["days_remaining"] == 1)

    valid, _, info = lic.validate_license(
        lic.generate_license("Probe", "2030-06-30"),
        reference_date=date(2030, 6, 29),
    )
    check("reference_date one day before expiry passes", valid is True)

    valid, _, info = lic.validate_license(
        lic.generate_license("Probe", "2030-06-30"),
        reference_date=date(2030, 7, 1),
    )
    check("reference_date after expiry fails", valid is False)

    print("\n--- signing secret isolation ---")
    foreign = lic.generate_license("Intruder", "2030-01-01", secret_key=b"a-different-secret")
    valid, message, _ = lic.validate_license(foreign)
    check("key signed with another secret rejected", valid is False)

    valid, _, _ = lic.validate_license(foreign, secret_key=b"a-different-secret")
    check("same secret validates the key", valid is True)

    print("\n--- bad input handling ---")
    try:
        lic.generate_license("X", "31-12-2027")
        check("bad date format raises", False)
    except ValueError:
        check("bad date format raises", True)

    print("\n--- password hashing ---")
    stored = sec.hash_password("Sup3rSecret")
    check("hash uses pbkdf2_sha256", stored.startswith("pbkdf2_sha256$"))
    check("hash embeds iterations", "260000" in stored)
    check("correct password verifies", sec.verify_password("Sup3rSecret", stored) is True)
    check("wrong password fails", sec.verify_password("sup3rsecret", stored) is False)
    check("empty password fails", sec.verify_password("", stored) is False)
    check("missing hash fails", sec.verify_password("x", None) is False)
    check("garbage hash fails", sec.verify_password("x", "not-a-hash") is False)

    second = sec.hash_password("Sup3rSecret")
    check("same password yields different hashes (salted)",
          second != stored and sec.verify_password("Sup3rSecret", second))

    check("policy rejects short password", bool(sec.password_problems("Ab1")))
    check("policy rejects digits-only", bool(sec.password_problems("123456789")))
    check("policy accepts strong password", sec.password_problems("Str0ngPass") == [])

    print("\n--- OTP helpers ---")
    codes = {sec.generate_otp() for _ in range(50)}
    check("OTP is 6 digits", all(len(c) == 6 and c.isdigit() for c in codes))
    check("OTP has entropy", len(codes) > 40)
    check("OTP hashing is salted", sec.hash_otp("123456", "a") != sec.hash_otp("123456", "b"))
    check("OTP hashing is deterministic", sec.hash_otp("123456", "a") == sec.hash_otp("123456", "a"))

    print("\n--- session tokens ---")
    token = sec.create_session_token("user-1", "server-secret")
    valid, user_id, reason = sec.read_session_token(token, "server-secret")
    check("valid token accepted", valid is True and user_id == "user-1")

    valid, user_id, reason = sec.read_session_token(token, "other-secret")
    check("token with wrong secret rejected", valid is False and "signature" in reason.lower())

    valid, _, reason = sec.read_session_token("abc.def", "server-secret")
    check("malformed token rejected", valid is False)

    valid, _, reason = sec.read_session_token("a.b.c", "server-secret")
    check("bad signature shape rejected", valid is False)

    valid, _, reason = sec.read_session_token("user-1.notanumber.deadbeef", "server-secret")
    check("non-numeric expiry rejected", valid is False)

    short = sec.create_session_token("user-1", "server-secret", ttl=-10)
    valid, _, reason = sec.read_session_token(short, "server-secret")
    check("expired token rejected", valid is False and "expired" in reason.lower())

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
