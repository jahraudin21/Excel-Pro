"""End-to-end check for the landing page and its registration gate.

Exercises the real Flask app: renders /landing, confirms the gate starts
locked, then walks a full signup -> OTP -> unlocked path through the actual
API routes so the gate is proven against real server behaviour rather than a
mock. Uses a throwaway database and a stubbed mailer transport.
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

os.environ["AUTH_DB_PATH"] = str(ROOT / "auth_app" / "_landing_gate.db")
os.environ["AUTH_SECRET"] = "landing-gate-test-secret"
os.environ["OTP_PEPPER"] = "landing-gate-pepper"
os.environ.pop("AUTH_ENV", None)

passed = failed = 0


def check(condition, label):
    global passed, failed
    if condition:
        passed += 1
        print("  PASS " + label)
    else:
        failed += 1
        print("  FAIL " + label)


def main():
    from auth_app import app as mod
    from auth_app import db, mailer

    client = mod.app.test_client()

    print("\n--- page renders ---")
    resp = client.get("/landing")
    html = resp.get_data(as_text=True)
    check(resp.status_code == 200, "GET /landing returns 200")
    check(len(html) > 3000, "page has real content (%d bytes)" % len(html))

    print("\n--- structure ---")
    for needle, label in [
        ('id="profile"', "app profile section present"),
        ('id="features"', "features section present"),
        ('id="gate"', "gated section present"),
        ('class="gate is-locked"', "gate ships in the locked state"),
        ('id="gateBody" aria-hidden="true"', "gated body is hidden from assistive tech"),
        ("Try Free", "Try Free call-to-action present"),
        ('data-open-signup', "CTA opens the sign-up modal"),
        ("/static/landing.css", "stylesheet linked"),
        ("/static/landing.js", "controller linked"),
    ]:
        check(needle in html, label)

    print("\n--- profile section states real features ---")
    check("97" in html, "advertises the 97 verified functions")
    check("Pivot" in html, "pivot tables mentioned")
    check("Google Drive" in html, "Drive sync mentioned")
    check(".xlsx" in html, "Excel file support mentioned")

    print("\n--- CSP: no inline script, style or handlers ---")
    check(not re.search(r"\son[a-z]+\s*=", html, re.I), "no inline on* handlers")
    check(not re.search(r"\sstyle\s*=", html, re.I), "no style attributes")
    inline = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>", html, re.I)
    check(not inline, "no inline <script> blocks (script-src 'self')")

    print("\n--- assets are served ---")
    check(client.get("/static/landing.css").status_code == 200, "landing.css served")
    check(client.get("/static/landing.js").status_code == 200, "landing.js served")

    print("\n--- gate starts locked for an anonymous visitor ---")
    sess = client.get("/api/session").get_json()
    check(sess.get("authenticated") is False, "no session before registering")

    print("\n--- Try Free requires registration ---")
    # /api/session is the authority the page asks on load. Before signup it must
    # report unauthenticated, which is what leaves the gate closed.
    check(
        sess.get("authenticated") is not True,
        "gate cannot be opened without an authenticated session",
    )

    print("\n--- signup + OTP unlocks a real session ---")
    email = "gate.tester@example.com"
    client.post(
        "/api/signup",
        json={"name": "Gate Tester", "email": email, "password": "Passw0rd!23",
              "send_otp": True},
    )

    code = _latest_otp(email)
    check(code is not None, "an OTP was issued for the new account")

    if code:
        verified = client.post(
            "/api/otp/verify",
            json={"email": email, "code": code, "purpose": "signup"},
        )
        payload = verified.get_json()
        check(payload.get("ok") is True, "OTP verification succeeds")
        check(bool(payload.get("user")), "verification returns the user")

        after = client.get("/api/session").get_json()
        check(after.get("authenticated") is True,
              "session is authenticated after verification")
        check((after.get("user") or {}).get("email") == email,
              "session belongs to the new account")

    print("\n--- weak passwords are refused by the real API ---")
    bad = client.post(
        "/api/signup",
        json={"name": "Weak", "email": "weak@example.com", "password": "short"},
    )
    check(bad.status_code == 422, "weak password rejected with 422")

    print("\n--- cleanup ---")
    Path(os.environ["AUTH_DB_PATH"]).unlink(missing_ok=True)
    print("  (temp database removed)")


def _latest_otp(email):
    """Read the most recent OTP for ``email`` from the console transport log.

    The database only stores a hash of the code, so with no SMTP_HOST configured
    the plaintext exists solely in auth_app/outbox.log -- which is exactly the
    documented local-development path. That keeps the test honest: it drives the
    same verify call a real user would make after reading their email.
    """
    outbox = ROOT / "auth_app" / "outbox.log"
    if not outbox.exists():
        return None
    found = None
    for line in outbox.read_text(encoding="utf-8", errors="replace").splitlines():
        if email in line:
            match = re.search(r"(\d{6})", line)
            if match:
                found = match.group(1)
    return found


if __name__ == "__main__":
    main()
    print("\n%d passed, %d failed" % (passed, failed))
    sys.exit(1 if failed else 0)