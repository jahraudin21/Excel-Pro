"""Verify the documented entry point (`python auth_app/app.py`).

The __main__ block runs for real, with `flask.Flask.run` intercepted so the
blocking server never starts. That lets us assert on genuine side effects:
database initialisation, banner text, and host/port selection. Serving real
HTTP traffic is covered separately by _test_live_server.py.
"""

import io
import os
import runpy
import sys
from contextlib import redirect_stdout
from pathlib import Path

import flask

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

TEST_DB = ROOT / "auth_app" / "_entry_auth.db"
OUTBOX = ROOT / "auth_app" / "outbox.log"
SCRIPT = ROOT / "auth_app" / "app.py"

os.environ["AUTH_DB_PATH"] = str(TEST_DB)
os.environ["AUTH_SECRET"] = "entry-point-secret"
os.environ.pop("SMTP_HOST", None)
os.environ.pop("GOOGLE_CLIENT_ID", None)
os.environ.pop("AUTH_PORT", None)

captured = {}
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


def run_main_block():
    """Execute app.py as __main__ with Flask.run intercepted."""
    captured.clear()
    real_run = flask.Flask.run

    def fake_run(self, *args, **kwargs):
        captured["args"] = args
        captured["kwargs"] = kwargs
        captured["app_name"] = self.name

    flask.Flask.run = fake_run
    buffer = io.StringIO()
    try:
        with redirect_stdout(buffer):
            runpy.run_path(str(SCRIPT), run_name="__main__")
    finally:
        flask.Flask.run = real_run
    return buffer.getvalue()


def cleanup():
    for path in (TEST_DB, OUTBOX):
        if path.exists():
            path.unlink()
    cache = ROOT / "auth_app" / "__pycache__"
    if cache.exists():
        for item in cache.iterdir():
            item.unlink()
        cache.rmdir()



def main():
    print("=== entry point check: python auth_app/app.py ===")

    banner = run_main_block()

    check("__main__ block completes without blocking", True)
    # Flask derives the app name from the __main__ module's file (app.py -> "app"),
    # which confirms the block really executed as a script would.
    check("app.run() invoked from the app.py __main__ context",
          captured.get("app_name") == "app", repr(captured.get("app_name")))
    check("binds to loopback only", captured.get("kwargs", {}).get("host") == "127.0.0.1")
    check("defaults to port 5001", captured.get("kwargs", {}).get("port") == 5001)

    check("banner announces the listening URL", "http://127.0.0.1:5001" in banner)
    check("banner lists configured OAuth providers", "configured OAuth providers" in banner)
    check("banner reports the OTP mail transport", "OTP email transport" in banner)
    check("console transport used when SMTP_HOST is unset", "console" in banner)
    check("banner explains how to enable providers", "*_CLIENT_ID" in banner)

    check("db.init_db() created the database file", TEST_DB.exists())

    print("\n--- AUTH_PORT override ---")
    os.environ["AUTH_PORT"] = "8123"
    banner2 = run_main_block()
    check("AUTH_PORT env is honoured", captured.get("kwargs", {}).get("port") == 8123)
    check("banner reflects the custom port", "http://127.0.0.1:8123" in banner2)
    os.environ.pop("AUTH_PORT")

    print("\n--- provider banner with credentials present ---")
    os.environ["GOOGLE_CLIENT_ID"] = "cid"
    os.environ["GOOGLE_CLIENT_SECRET"] = "csecret"
    banner3 = run_main_block()
    check("banner names the configured provider", "google" in banner3.lower())
    os.environ.pop("GOOGLE_CLIENT_ID")
    os.environ.pop("GOOGLE_CLIENT_SECRET")

    os.environ["SMTP_HOST"] = "smtp.example.com"
    banner4 = run_main_block()
    check("banner switches to smtp transport", "smtp" in banner4.lower())
    os.environ.pop("SMTP_HOST")

    cleanup()

    print("\n========================================")
    print(f"{PASSED} passed, {FAILED} failed")
    print("========================================")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(main())
