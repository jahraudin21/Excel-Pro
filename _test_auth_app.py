"""End-to-end API test for the auth backend (Flask test client).

Covers: signup -> OTP verify -> session, login, storage preference,
password reset via OTP, license validate/activate/status/trial, OAuth config,
and OAuth callback state protection.

Run: python _test_auth_app.py
"""

import os
import sys
import uuid
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# Isolate this test run from any real data / credentials.
TEST_DB = ROOT / "auth_app" / "_test_auth.db"
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["AUTH_DB_PATH"] = str(TEST_DB)
os.environ["AUTH_SECRET"] = "test-secret-key-123"
os.environ["OTP_PEPPER"] = "test-pepper"
for var in ("SMTP_HOST", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
            "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
            "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"):
    os.environ.pop(var, None)

import auth_app.app as app_module  # noqa: E402
import auth_app.mailer as mailer  # noqa: E402

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


def read_last_otp(email, purpose):
    """Read the most recent OTP for ``email`` from the dev outbox."""
    if not mailer.OUTBOX_PATH.exists():
        return None
    matches = []
    for line in mailer.OUTBOX_PATH.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) == 4 and parts[1] == email and parts[2] == purpose:
            matches.append(parts[3])
    return matches[-1] if matches else None



def main():
    print("=== auth backend end-to-end test ===")
    app_module.app.config["TESTING"] = True
    client = app_module.app.test_client()

    email = f"e2e-{uuid.uuid4().hex[:8]}@example.com"
    password = "Sup3rSecret"

    print("\n--- health, config, page ---")
    r = client.get("/api/health")
    check("health endpoint", r.status_code == 200 and r.get_json()["ok"] is True)

    r = client.get("/api/config")
    cfg = r.get_json()
    check("config lists 3 providers", len(cfg["providers"]) == 3)
    check("providers unconfigured by default", all(not p["enabled"] for p in cfg["providers"]))
    check("config exposes storage options", cfg["storage_preferences"] == ["browser", "cloud", "drive"])
    check("config reports console mail transport", cfg["email_transport"] == "console")

    r = client.get("/")
    check("index page renders", r.status_code == 200)
    check("index includes OAuth buttons", all(p in r.data for p in (b"google", b"github", b"microsoft")))
    check("index includes storage preference cards", b"Google Drive" in r.data)

    print("\n--- signup validation ---")
    r = client.post("/api/signup", json={"email": "bad-email", "name": "X", "password": password})
    check("signup rejects bad email", r.status_code == 422)

    r = client.post("/api/signup", json={"email": email, "name": "X", "password": "short"})
    check("signup enforces password length", r.status_code == 422 and "8 characters" in r.get_json()["error"])

    r = client.post("/api/signup", json={"email": email, "name": "E2E User", "password": "alllettersnodigit"})
    check("signup requires a digit", r.status_code == 422)

    r = client.post("/api/signup", json={"email": email, "name": "", "password": password})
    check("signup requires a name", r.status_code == 422)

    print("\n--- signup happy path + OTP ---")
    r = client.post("/api/signup", json={"email": email, "name": "E2E User", "password": password})
    body = r.get_json()
    check("signup accepted", r.status_code == 201 and body["ok"] is True)
    check("signup returns user record", body["user"]["email"] == email)
    check("new user is unverified", body["user"]["email_verified"] is False)
    check("signup reports OTP delivery", body.get("otp_sent") is True)

    code = read_last_otp(email, "signup")
    check("signup OTP written to outbox", bool(code) and len(code) == 6)

    r = client.post("/api/signup", json={"email": email, "name": "E2E User", "password": password})
    check("duplicate signup handled", r.status_code == 409)
    check("duplicate signup flags unverified", r.get_json().get("code") == "unverified_exists")

    # The duplicate attempt re-issued a code, so always read the newest one.
    code = read_last_otp(email, "signup")
    check("resend issued a fresh code", bool(code) and len(code) == 6)

    r = client.post("/api/otp/verify", json={"email": email, "code": "000000", "purpose": "signup"})
    check("wrong OTP rejected", r.status_code == 400)

    r = client.post("/api/otp/verify", json={"email": email, "code": code, "purpose": "signup"})
    check("correct OTP accepted", r.status_code == 200)
    check("verify marks email verified", r.get_json()["user"]["email_verified"] is True)

    r = client.get("/api/session")
    sess = r.get_json()
    check("session established after OTP", sess["authenticated"] is True)
    check("session user matches", sess["user"]["email"] == email)
    check("session reports no license yet", sess["license"] is None)

    r = client.post("/api/otp/verify", json={"email": email, "code": code, "purpose": "signup"})
    check("OTP cannot be replayed", r.status_code == 400)


    print("\n--- password login ---")
    fresh = app_module.app.test_client()
    r = fresh.post("/api/login", json={"email": email, "password": "WrongPass1"})
    check("wrong password rejected", r.status_code == 401)

    r = fresh.post("/api/login", json={"email": email, "password": password})
    check("correct password accepted", r.status_code == 200)
    check("login returns user", r.get_json()["user"]["email"] == email)

    r = fresh.get("/api/session")
    check("login established a session", r.get_json()["authenticated"] is True)

    r = app_module.app.test_client().post("/api/login", json={"email": email.upper(), "password": password})
    check("login is case-insensitive on email", r.status_code == 200)

    print("\n--- storage preference ---")
    r = fresh.post("/api/storage-preference", json={"storage_pref": "drive"})
    check("storage preference updates", r.status_code == 200 and r.get_json()["storage_pref"] == "drive")

    r = fresh.post("/api/storage-preference", json={"storage_pref": "floppy"})
    check("invalid storage preference rejected", r.status_code == 422)

    r = fresh.get("/api/session")
    check("session reflects stored preference", r.get_json()["user"]["storage_pref"] == "drive")

    r = app_module.app.test_client().post("/api/storage-preference", json={"storage_pref": "cloud"})
    check("storage preference requires login", r.status_code == 401)

    print("\n--- password reset via OTP ---")
    r = fresh.post("/api/password/reset", json={"email": email, "password": "NewPass123"})
    check("reset blocked without OTP proof", r.status_code == 403)

    r = fresh.post("/api/otp/send", json={"email": email, "purpose": "reset"})
    check("reset code sent", r.status_code == 200)
    reset_code = read_last_otp(email, "reset")
    check("reset OTP in outbox", bool(reset_code))

    r = fresh.post("/api/otp/send", json={"email": "ghost@example.com", "purpose": "reset"})
    check("reset for unknown email rejected", r.status_code == 404)

    r = fresh.post("/api/otp/send", json={"email": email, "purpose": "nonsense"})
    check("unknown OTP purpose rejected", r.status_code == 422)

    r = fresh.post("/api/otp/verify", json={"email": email, "code": reset_code, "purpose": "reset"})
    check("reset OTP verified", r.status_code == 200)

    r = fresh.post("/api/password/reset", json={"email": email, "password": "weak"})
    check("reset enforces password policy", r.status_code == 422)

    r = fresh.post("/api/password/reset", json={"email": email, "password": "NewPass123"})
    check("password reset succeeds", r.status_code == 200)

    r = app_module.app.test_client().post("/api/login", json={"email": email, "password": "NewPass123"})
    check("login works with new password", r.status_code == 200)

    r = app_module.app.test_client().post("/api/login", json={"email": email, "password": password})
    check("old password no longer works", r.status_code == 401)


    print("\n--- license keys (local, offline) ---")
    r = fresh.post("/api/license/validate", json={"license_key": "not-a-real-key"})
    check("garbage license rejected", r.status_code == 403 and r.get_json()["valid"] is False)

    r = fresh.post("/api/license/validate", json={})
    check("empty license rejected", r.status_code == 422)

    r = fresh.post("/api/license/trial", json={"days": 14})
    trial = r.get_json()
    check("trial license issued", r.status_code == 200 and trial["valid"] is True)
    check("trial license tier", trial["license"]["tier"] == "trial")
    check("trial license days_remaining", trial["license"]["days_remaining"] == 14)

    key = trial["license_key"]
    tampered = key[:-4] + ("aaaa" if not key.endswith("aaaa") else "bbbb")
    r = fresh.post("/api/license/validate", json={"license_key": tampered})
    check("tampered license rejected", r.status_code == 403)
    check("tamper message mentions signature", "signature" in r.get_json()["message"].lower())

    r = fresh.post("/api/license/activate", json={"license_key": tampered})
    check("tampered license cannot activate", r.status_code == 403)

    r = fresh.post("/api/license/activate", json={"license_key": key})
    check("license activation succeeds", r.status_code == 200)

    r = fresh.get("/api/license/status")
    status = r.get_json()
    check("license status licensed", status["licensed"] is True)
    check("license status tier", status["tier"] == "trial")
    check("license status has key_id", bool(status["key_id"]))

    r = fresh.get("/api/session")
    check("session surfaces active license", r.get_json()["license"]["valid"] is True)
    check("session license has expiry", bool(r.get_json()["license"]["expires_at"]))

    r = fresh.post("/api/license/validate", json={"license_key": key, "reference_date": "2020-01-01"})
    check("license valid relative to earlier date", r.status_code == 200)

    expired_probe = fresh.post(
        "/api/license/validate",
        json={"license_key": key, "reference_date": "2099-01-01"},
    )
    check("expiry enforced against reference date", expired_probe.status_code == 403)
    check("expiry message mentions expiry", "expired" in expired_probe.get_json()["message"].lower())

    r = app_module.app.test_client().get("/api/license/status")
    check("license status requires login", r.status_code == 401)

    print("\n--- OAuth wiring ---")
    r = fresh.get("/auth/start/google")
    check("unconfigured provider returns 503", r.status_code == 503)
    check("503 explains missing env", "GOOGLE_CLIENT_ID" in r.get_json()["error"])

    r = fresh.get("/auth/start/facebook")
    check("unknown provider 404", r.status_code == 404)

    r = fresh.get("/auth/callback/google?code=abc&state=wrong")
    check("state mismatch blocked", r.status_code == 200 and b"State check failed" in r.data)

    r = fresh.get("/auth/callback/github?error=access_denied&error_description=Nope")
    check("provider error surfaced", b"Nope" in r.data)

    r = fresh.get("/auth/callback/google")
    check("missing code handled", b"Missing authorization code" in r.data)

    os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
    os.environ["GOOGLE_CLIENT_SECRET"] = "test-client-secret"
    r = fresh.get("/auth/start/google")
    location = r.headers.get("Location", "")
    check("configured provider redirects", r.status_code == 302)
    check("redirect targets Google", location.startswith("https://accounts.google.com/o/oauth2/v2/auth?"))
    check("redirect carries client_id", "client_id=test-client-id" in location)
    check("redirect carries PKCE challenge",
          "code_challenge=" in location and "code_challenge_method=S256" in location)
    check("redirect carries state", "state=" in location)
    parsed_query = parse_qs(urlparse(location).query)
    redirect_target = parsed_query.get("redirect_uri", [""])[0]
    check("redirect_uri points at callback route", redirect_target.endswith("/auth/callback/google"))
    check("redirect requests offline access", parsed_query.get("access_type", [""])[0] == "offline")
    check("redirect scope includes email", "email" in parsed_query.get("scope", [""])[0])
    check("config now reports Google enabled",
          any(p["enabled"] for p in fresh.get("/api/config").get_json()["providers"]))

    r = fresh.get("/auth/start/microsoft")
    check("Microsoft still unconfigured", r.status_code == 503)

    os.environ.pop("GOOGLE_CLIENT_ID")
    os.environ.pop("GOOGLE_CLIENT_SECRET")

    print("\n--- logout + errors ---")
    r = fresh.post("/api/logout")
    check("logout succeeds", r.status_code == 200)
    r = fresh.get("/api/session")
    check("session cleared after logout", r.get_json()["authenticated"] is False)

    r = app_module.app.test_client().get("/api/does-not-exist")
    check("unknown API route returns JSON 404", r.status_code == 404 and r.get_json()["ok"] is False)

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")

    if TEST_DB.exists():
        TEST_DB.unlink()
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
