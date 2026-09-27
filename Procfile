# Production web process.
#
# Targets auth_app.app (the real auth backend), NOT the top-level app.py, which
# is the legacy static-only dev server.
#
# --workers 1 is deliberate: auth_app stores data in SQLite, so a second worker
# would not share state. Raise this only after moving db.py to a real database.
# --preload loads the app before forking so the schema is created once, up front.
web: gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --preload --access-logfile - --timeout 60 auth_app.app:app

