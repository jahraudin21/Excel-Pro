#!/usr/bin/env node
'use strict';
/* ============================================================================
 *  Locate the built Windows .exe files and print their absolute paths.
 *
 *  Why this exists: a `npm run build:win` produces several executables, and only
 *  one or two of them are the thing you actually want to ship or launch. The
 *  others are noise:
 *
 *    release\Mini Excel-Setup-1.0.0.exe       <- the NSIS installer   (ship this)
 *    release\Mini Excel-1.0.0-portable.exe    <- the portable build   (ship this)
 *    release\win-unpacked\Mini Excel.exe      <- unpacked app, for debugging
 *    release\win-unpacked\resources\elevate.exe  <- electron-builder's own UAC
 *                                                     helper, NOT a deliverable
 *
 *  So a naive `dir /s *.exe` reports four files and quietly conflates the helper
 *  with the app. This script separates them by role and prints absolute paths,
 *  newest first within each group.
 *
 *  Usage:
 *    node find_exe.js             human-readable listing
 *    node find_exe.js --json      machine-readable (for CI or other scripts)
 *    node find_exe.js installer   print only the installer path, bare (for piping)
 *
 *  Exit codes:
 *    0  at least one artifact found
 *    1  nothing built yet (tells you how to fix it)
 *    2  bad usage
 * ========================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
/* electron-builder writes to build.directories.output in package.json (release/).
   Overridable so CI can point at a custom output dir without editing code. */
const OUT_DIR = process.env.ELECTRON_BUILDER_OUT_DIR
  ? path.resolve(process.env.ELECTRON_BUILDER_OUT_DIR)
  : path.join(ROOT, 'release');

const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const roleFilter = args.find(a => !a.startsWith('-'));
const VALID_ROLES = ['installer', 'portable', 'unpacked'];

/* A build artifact is large. electron-builder's bundled helpers (elevate.exe,
   nsis plugins) sit in the same tree but are tiny, so this cleanly separates
   "something we built" from "something electron-builder shipped with". */
const MIN_ARTIFACT_BYTES = 1024 * 1024;

function statSafe(p) {
  try { return fs.statSync(p); }
  catch { return null; }
}

function isArtifact(p) {
  const st = statSafe(p);
  return !!st && st.isFile() && st.size >= MIN_ARTIFACT_BYTES;
}

function collect() {
  const found = { installer: [], portable: [], unpacked: [] };

  if (!fs.existsSync(OUT_DIR)) return found;

  // --- top-level artifacts: the installer and the portable build ----------
  // Classified by filename rather than by trusting directory layout alone,
  // because the NSIS naming comes from build.nsis.artifactName and
  // build.portable.artifactName in package.json.
  for (const name of fs.readdirSync(OUT_DIR)) {
    const full = path.join(OUT_DIR, name);
    if (!isArtifact(full) || !name.toLowerCase().endsWith('.exe')) continue;

    if (/-portable/i.test(name)) found.portable.push(full);
    else if (/setup/i.test(name)) found.installer.push(full);
    else found.unpacked.push(full);   // a stray top-level exe; still report it
  }

  // --- the unpacked app: <output>/<name>-unpacked/<Product>.exe ----------
  // Only the top level of that directory is scanned. Descending would pick up
  // resources\elevate.exe, which is electron-builder's UAC helper, not the app.
  for (const dir of fs.readdirSync(OUT_DIR)) {
    const dirPath = path.join(OUT_DIR, dir);
    if (!statSafe(dirPath)?.isDirectory() || !/-unpacked$/i.test(dir)) continue;
    for (const name of fs.readdirSync(dirPath)) {
      const full = path.join(dirPath, name);
      if (isArtifact(full) && name.toLowerCase().endsWith('.exe')) {
        found.unpacked.push(full);
      }
    }
  }

  for (const role of VALID_ROLES) {
    found[role].sort((a, b) => statSafe(b).mtimeMs - statSafe(a).mtimeMs);
  }
  return found;
}

const found = collect();
const total = VALID_ROLES.reduce((n, r) => n + found[r].length, 0);

/* ---- nothing built yet ------------------------------------------------- */
if (total === 0) {
  const msg =
    `No build artifacts found in:\n  ${OUT_DIR}\n\n` +
    `Build the app first:\n  npm run build:win\n`;
  if (wantJson) {
    process.stdout.write(JSON.stringify({ outDir: OUT_DIR, artifacts: [] }, null, 2) + '\n');
  } else {
    process.stderr.write(msg);
  }
  process.exit(1);
}

/* ---- --json: machine-readable ------------------------------------------ */
if (wantJson) {
  const artifacts = [];
  for (const role of VALID_ROLES) {
    for (const p of found[role]) {
      artifacts.push({ role, path: p, size: statSafe(p).size });
    }
  }
  process.stdout.write(JSON.stringify({ outDir: OUT_DIR, artifacts }, null, 2) + '\n');
  process.exit(0);
}

/* ---- single-role mode: one bare path, for piping ------------------------ */
if (roleFilter) {
  if (!VALID_ROLES.includes(roleFilter)) {
    process.stderr.write(
      `Unknown role "${roleFilter}". Expected one of: ${VALID_ROLES.join(', ')}\n`);
    process.exit(2);
  }
  const list = found[roleFilter];
  if (list.length === 0) {
    process.stderr.write(
      `No ${roleFilter} found in ${OUT_DIR}. Did you run "npm run build:win"?\n`);
    process.exit(1);
  }
  process.stdout.write(list[0] + '\n');
  process.exit(0);
}

/* ---- default: human-readable ------------------------------------------- */
const mb = b => (b / (1024 * 1024)).toFixed(1) + ' MB';
const LABELS = {
  installer: 'Installer      (ship this)',
  portable: 'Portable build (ship this)',
  unpacked: 'Unpacked app   (for debugging)',
};

process.stdout.write(`Build output: ${OUT_DIR}\n\n`);
for (const role of VALID_ROLES) {
  if (!found[role].length) continue;
  process.stdout.write(LABELS[role] + '\n');
  for (const p of found[role]) {
    process.stdout.write(`  ${p}\n      ${mb(statSafe(p).size)}\n`);
  }
  process.stdout.write('\n');
}
process.stdout.write(
  `Total: ${total} artifact${total === 1 ? '' : 's'}\n` +
  `Tip: node find_exe.js installer   -> bare path of the installer\n`);