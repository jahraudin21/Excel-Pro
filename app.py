"""Flask development server for the Excel-like spreadsheet application."""

from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory


PROJECT_ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

# Development-only storage. Replace this with a database or object store before
# deploying the application across multiple processes or machines.
spreadsheet_store: dict[str, dict] = {}


def validate_workbook(workbook: object) -> str | None:
    """Return an error message when a workbook does not match the app schema."""
    if not isinstance(workbook, dict):
        return "Spreadsheet data must be a JSON object."

    sheets = workbook.get("sheets")
    if not isinstance(sheets, list) or not sheets:
        return "Spreadsheet data must include a non-empty 'sheets' array."

    for index, sheet in enumerate(sheets, start=1):
        if not isinstance(sheet, dict):
            return f"Sheet {index} must be an object."
        if not isinstance(sheet.get("name"), str) or not sheet["name"].strip():
            return f"Sheet {index} must have a non-empty string 'name'."
        if not isinstance(sheet.get("cells", {}), dict):
            return f"Sheet {index} 'cells' must be an object."

    return None


@app.get("/")
def index():
    """Serve the spreadsheet application."""
    return send_from_directory(PROJECT_ROOT, "index.html")


@app.get("/css/<path:filename>")
def css(filename: str):
    """Serve stylesheet assets."""
    return send_from_directory(PROJECT_ROOT / "css", filename)


@app.get("/js/<path:filename>")
def javascript(filename: str):
    """Serve JavaScript assets."""
    return send_from_directory(PROJECT_ROOT / "js", filename)


@app.get("/api/health")
def health():
    """Provide a lightweight backend health check for the web client."""
    return jsonify(status="ok", service="mini-excel")


@app.post("/api/spreadsheets")
def create_spreadsheet():
    """Accept and retain a workbook JSON payload for the current server session.

    The endpoint accepts either the browser workbook directly or an object with
    a ``workbook`` property. Example: ``{"sheets": [{"name": "Sheet1",
    "cells": {"A1": {"raw": "Hello"}}}]}``.
    """
    if not request.is_json:
        return jsonify(error="Content-Type must be application/json."), 415

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify(error="Request body must contain valid JSON."), 400

    workbook = payload.get("workbook", payload) if isinstance(payload, dict) else payload
    validation_error = validate_workbook(workbook)
    if validation_error:
        return jsonify(error=validation_error), 400

    spreadsheet_id = str(uuid4())
    spreadsheet_store[spreadsheet_id] = workbook
    return jsonify(
        id=spreadsheet_id,
        message="Spreadsheet data accepted.",
        sheet_count=len(workbook["sheets"]),
    ), 201


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)