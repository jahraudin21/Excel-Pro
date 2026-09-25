"""Live server smoke test: boots the real Flask app over HTTP and exercises it.

Run: python _test_live_server.py
"""

import os
import subprocess
import sys
import time
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
PORT = 5063
BASE = f"http://127.0.0.1:{PORT}"

TEST_DB = ROOT / "auth_app" / "_live_auth.db"
if TEST_DB.exists():
    TEST_DB.unlink()

env = dict(os.environ)
env["AUTH_DB_PATH"] = str(TEST_DB)
env["AUTH_SECRET"] = "live-test-secret"
env["OTP_PEPPER"] = "live-test-pepper"
env.pop("SMTP_HOST", None)
env["PYTHONUNBUFFERED"] = "1"

BOOT = (
    "import sys; sys.path.insert(0, r'%s');"
    "import auth_app.app as a;"
    "a.app.run(host='127.0.0.1', port=%d, debug=False, use_reloader=False)"
) % (ROOT, PORT)

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


def latest_otp(email):
    outbox = ROOT / "auth_app" / "outbox.log"
    if not outbox.exists():
        return None
    found = None
    for line in outbox.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) == 4 and parts[1] == email:
            found = parts[3]
    return found


def main():
    print("=== live server smoke test ===")
    proc = subprocess.Popen(
        [sys.executable, "-c", BOOT],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        deadline = time.time() + 25
        ready = False
        while time.time() < deadline:
            try:
                requests.get(f"{BASE}/api/health", timeout=2)
                ready = True
                break
            except requests.RequestException:
                time.sleep(0.4)

        check(f"server came up on port {PORT}", ready)
        if not ready:
            return 1

        session = requests.Session()

        print("\n--- static page + assets ---")
        r = session.get(f"{BASE}/", timeout=10)
        check("GET / returns 200", r.status_code == 200)
        check("page references the stylesheet", "/static/auth.css" in r.text)
        check("page references the controller script", "/static/auth.js" in r.text)
        check("page has sign-in tab", 'id="tabLogin"' in r.text)
        check("page has OTP pane", 'id="paneOtp"' in r.text)
        check("page has reset pane", 'id="paneReset"' in r.text)
        check("page has all three providers",
              all(f"auth/start/{p}" in r.text for p in ("google", "github", "microsoft")))
        check("page has 3 storage radios", r.text.count('name="storage_pref"') == 3)

        r = session.get(f"{BASE}/static/auth.css", timeout=10)
        check("CSS served", r.status_code == 200 and "--accent" in r.text)

        r = session.get(f"{BASE}/static/auth.js", timeout=10)
        check("JS served", r.status_code == 200 and "handleOtpVerify" in r.text)

        r = session.get(f"{BASE}/api/config", timeout=10)
        check("config endpoint", r.status_code == 200 and len(r.json()["providers"]) == 3)

        print("\n--- signup + OTP over real HTTP ---")
        email = f"live-{uuid.uuid4().hex[:8]}@example.com"
        password = "LivePass99"

        r = session.post(f"{BASE}/api/signup",
                         json={"email": email, "name": "Live User", "password": password}, timeout=10)
        check("signup accepted", r.status_code == 201, r.text[:120])

        code = latest_otp(email)
        check("OTP written to outbox", bool(code) and len(code) == 6)

        r = session.post(f"{BASE}/api/otp/verify",
                         json={"email": email, "code": code, "purpose": "signup"}, timeout=10)
        check("OTP verify accepted", r.status_code == 200, r.text[:120])

        r = session.get(f"{BASE}/api/session", timeout=10)
        check("cookie session persists", r.json().get("authenticated") is True)
        check("auth cookie is named mx-session", any(c.name == "mx-session" for c in session.cookies))

        print("\n--- storage + license over real HTTP ---")
        r = session.post(f"{BASE}/api/storage-preference", json={"storage_pref": "drive"}, timeout=10)
        check("storage preference saved", r.status_code == 200 and r.json()["storage_pref"] == "drive")

        r = session.post(f"{BASE}/api/license/trial", json={"days": 30}, timeout=10)
        check("trial license issued", r.status_code == 200)
        key = r.json()["license_key"]
        check("license key looks signed", len(key) > 40 and key.count(".") == 1)

        r = session.post(f"{BASE}/api/license/activate", json={"license_key": key}, timeout=10)
        check("license activated", r.status_code == 200)

        r = session.get(f"{BASE}/api/license/status", timeout=10)
        check("license status", r.json()["licensed"] is True and r.json()["tier"] == "trial")

        r = session.get(f"{BASE}/api/session", timeout=10)
        check("session exposes license summary", r.json()["license"]["valid"] is True)

        bad = key[:-3] + ("xyz" if not key.endswith("xyz") else "abc")
        r = session.post(f"{BASE}/api/license/validate", json={"license_key": bad}, timeout=10)
        check("tampered key rejected", r.status_code == 403)

        print("\n--- logout + oauth gate ---")
        r = session.post(f"{BASE}/api/logout", timeout=10)
        check("logout accepted", r.status_code == 200)
        r = session.get(f"{BASE}/api/session", timeout=10)
        check("session cleared", r.json()["authenticated"] is False)

        r = session.get(f"{BASE}/auth/start/google", timeout=10, allow_redirects=False)
        check("unconfigured provider returns 503", r.status_code == 503)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        if TEST_DB.exists():
            TEST_DB.unlink()

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())

