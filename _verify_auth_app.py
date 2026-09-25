"""Consolidated final verification for the auth application."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PY = sys.executable

SUITES = [
    ("License + security unit tests", "_test_license.py"),
    ("Database layer tests", "_test_auth_db.py"),
    ("API surface tests (test client)", "_test_auth_app.py"),
    ("Live HTTP server smoke test", "_test_live_server.py"),
    ("Entry point check (app.py)", "_test_entrypoint.py"),
]

FILES = [
    "auth_app/app.py",
    "auth_app/db.py",
    "auth_app/security.py",
    "auth_app/oauth.py",
    "auth_app/mailer.py",
    "auth_app/license.py",
    "auth_app/templates/auth.html",
    "auth_app/static/auth.css",
    "auth_app/static/auth.js",
    "auth_app/requirements.txt",
    "auth_app/README.md",
    "auth_app/.env.example",
    "_test_license.py",
    "_test_auth_db.py",
    "_test_auth_app.py",
    "_test_live_server.py",
    "_test_entrypoint.py",
]


def summarize(output):
    for line in reversed(output.strip().splitlines()):
        if "passed," in line and "failed" in line:
            return line.strip()
    return "(no summary line)"


def main():
    print("=" * 62)
    print("FILE PRESENCE")
    print("=" * 62)
    missing = 0
    for rel in FILES:
        path = ROOT / rel
        status = "OK  " if path.exists() else "MISS"
        if not path.exists():
            missing += 1
        size = f"{path.stat().st_size:>7,} bytes" if path.exists() else ""
        print(f"  {status} {size}  {rel}")

    print()
    print("=" * 62)
    print("PYTHON SYNTAX (compileall)")
    print("=" * 62)
    compiled = subprocess.run(
        [PY, "-m", "compileall", "-q", str(ROOT / "auth_app")],
        capture_output=True,
        text=True,
    )
    print(f"  compileall exit code: {compiled.returncode}")
    if compiled.stdout.strip():
        print(compiled.stdout)
    if compiled.stderr.strip():
        print(compiled.stderr)

    print()
    print("=" * 62)
    print("JAVASCRIPT SYNTAX (node --check)")
    print("=" * 62)
    js = subprocess.run(
        ["node", "--check", str(ROOT / "auth_app" / "static" / "auth.js")],
        capture_output=True,
        text=True,
        shell=False,
    )
    print(f"  node --check exit code: {js.returncode}")
    if js.stderr.strip():
        print(js.stderr)

    print()
    results = []
    for label, script in SUITES:
        print("=" * 62)
        print(f"RUNNING: {label}")
        print("=" * 62)
        completed = subprocess.run(
            [PY, str(ROOT / script)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        tail = "\n".join(completed.stdout.strip().splitlines()[-4:])
        print(tail)
        results.append((label, summarize(completed.stdout), completed.returncode))
        print()

    print("=" * 62)
    print("FINAL SUMMARY")
    print("=" * 62)
    all_good = True
    for label, summary, code in results:
        verdict = "PASS" if code == 0 else "FAIL"
        if code != 0:
            all_good = False
        print(f"  [{verdict}] {label:<38} {summary}")

    if missing:
        all_good = False
        print(f"  [FAIL] {missing} expected file(s) missing")

    print()
    print("ALL SUITES GREEN" if all_good else "SOME CHECKS FAILED")
    return 0 if all_good else 1


if __name__ == "__main__":
    raise SystemExit(main())
