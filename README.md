# Mini Excel — Spreadsheet

A browser-based spreadsheet application shipped two ways:

| Target | What it is | Build |
|--------|-----------|-------|
| **Desktop** | Electron shell wrapping `index.html` + `js/` + `css/` | `npm run build:win` / `build:mac` / `build:linux` |
| **Web** | Flask backend in `auth_app/` (auth, licenses, storage) | gunicorn via `Procfile` |

The spreadsheet UI itself is plain browser JavaScript — no framework, no bundler,
and no runtime dependencies. There is nothing to transpile.

---

## Desktop build

```bash
npm install          # install Electron + electron-builder
npm start            # run unpacked during development
npm test             # JavaScript test suite (50 assertions)
```

### Producing installers

```bash
npm run build:win    # Windows: NSIS installer + portable .exe  -> release/
npm run build:mac    # macOS:   .dmg + .zip
npm run build:linux  # Linux:   AppImage + .deb
```

All artifacts land in `release/` (git-ignored). `npm run build` is an alias for
the Windows build.

Only these files are packaged into the app bundle:

```
main.js  index.html  sw.js  js/**  css/**
```

Everything else in the repository — the Flask backend, test scripts, VBA
exports, sample `.xlsx`/`.zip` files — is deliberately excluded by the `files`
whitelist in `package.json`, so installers stay small and no development-only
material ships to users.

### Notes

- The renderer runs with `nodeIntegration: false`, `contextIsolation: true` and
  `sandbox: true`; it has no Node access.
- `main.js` ignores `USE_DEV_SERVER` in a packaged build, so a shipped app can
  never depend on a local dev server.
- Packaged builds start with **no application menu** and cannot open devtools.
- The service worker (`sw.js`) does not run under `file://`, so the desktop build
  reads from disk. Offline caching is a web-only feature.
- Icons: no icon set is committed, so electron-builder uses its default. Drop
  `build/icon.ico` (or `icon.png`) in to customise.

---

## Web backend (`auth_app/`)

```bash
pip install -r requirements.txt
python auth_app/app.py     # http://127.0.0.1:5001
npm run test:auth          # 73 assertions across three suites
```

Configuration is documented in [`auth_app/.env.example`](auth_app/.env.example)
and [`auth_app/README.md`](auth_app/README.md).

### Production deployment

Set at minimum:

```bash
AUTH_ENV=production
AUTH_SECRET=<random>       # REQUIRED in production — see below
AUTH_DB_PATH=<path to auth.db>
```

Generate a secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

`AUTH_ENV=production` turns on:

- **Fail-fast on a weak secret.** If `AUTH_SECRET` is missing or left at the
  placeholder value, the app refuses to boot. This secret signs *both* session
  cookies and license keys, so a publicly known value would make every session
  and licence forgeable.
- **`Secure` cookies** (`mx-session` and the Flask flow cookie).
- **HSTS** and a strict **Content-Security-Policy** (`script-src 'self'`;
  `https:` images are allowed because OAuth avatars are hosted by Google,
  GitHub and Microsoft).
- **Generic 500 responses** — exception text is no longer echoed to the browser.

Caching is set per route: `no-store` for `/api/*` (session and profile data),
`no-cache` for the sign-in page and static assets (they are not content-hashed,
so they must revalidate rather than risk a stale copy after a deploy).

### Two things to fix before running at scale

1. **SQLite is not durable or shared.** `auth_app/db.py` writes to a local file,
   which is wiped on every dyno restart/redeploy, and cannot be shared between
   processes. `Procfile` therefore pins `--workers 1`. Move `db.py` to a real
   database before increasing concurrency.
2. **`app.py` at the repository root is a legacy dev server**, not the
   production app. It serves the spreadsheet UI for local development and
   Electron's `USE_DEV_SERVER` mode. `Procfile` correctly targets
   `auth_app.app:app`.

---

## Repository layout

```
index.html  js/  css/  sw.js     spreadsheet UI (the actual app)
main.js                        Electron main process
app.py                         legacy dev/static server (port 5000)
auth_app/                      production Flask backend (port 5001)
Procfile  requirements.txt      deployment config
js/script.js                   ~209 KB — the spreadsheet engine
```

Files prefixed with `_` are development scratch scripts and tests; they are not
part of any build.
