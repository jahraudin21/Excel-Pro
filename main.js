'use strict';
/* ================= Electron main process =================
   Wraps the existing browser app (index.html + js/, css/) in a native window.

   Notes on how this app is normally run: it is a static site served by the
   Flask dev server in app.py on http://127.0.0.1:5000. Electron loads the same
   index.html straight off disk instead, so the Flask server is NOT required.

   Two consequences of loading over file:// that are worth knowing:
     1. Service workers (sw.js) are unavailable on file://, so the offline
        caching added for the web build silently does nothing here. The app
        still works, it just always reads from disk.
     2. "Sign in with Google" needs a real origin registered in the Google Cloud
        console (see GOOGLE_SIGNIN.md), and file:// is not one. Email/password
        sign-in is unaffected. To enable Google, set USE_DEV_SERVER (below). */

const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, protocol, shell } = require('electron');

/* The app is loaded over a custom ``app://`` scheme rather than ``file://``.
   Chromium's own file:// reader cannot open files from this repository's path
   (it lives under OneDrive and contains non-ASCII characters), which made every
   launch fail with ERR_FAILED. Serving the files through Node's fs sidesteps
   that and behaves identically on any machine. */
const APP_SCHEME = 'app';
const APP_ORIGIN = `${APP_SCHEME}://mini-excel`;
const APP_ROOT = __dirname;

/* ---------------- Chromium cache switches (see npm start below) ----------
   This build is a local, offline-first app: every asset is served straight off
   disk through the custom app:// protocol below, so Chromium's HTTP disk cache
   and its GPU program/shader caches buy us nothing.

   They also fail on Windows here, which is what made `npm start` look broken:

     [ERROR:net\disk_cache\cache_util_win.cc] Unable to move the cache:
     Access is denied. (0x5)
     [ERROR:net\disk_cache\disk_cache.cc] Unable to create cache
     [ERROR:gpu\ipc\host\gpu_disk_cache.cc] Gpu Cache Creation failed: -2

   PowerShell renders anything a native process writes to stderr as a red
   NativeCommandError block, so a perfectly healthy launch appeared as a failure
   and a wall of red text. Turning the unused caches off removes the stderr
   output entirely.

   These must be appended before the app becomes ready. */
app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

/* Content types for the asset kinds this app ships. A wrong type here would
   make the browser refuse to run the script or apply the stylesheet. */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

/* Must run before app.whenReady(). */
protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    let relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    /* Directory requests resolve to index.html, matching static hosting. */
    if (relative.endsWith('/')) relative += 'index.html';

    const filePath = path.resolve(APP_ROOT, relative);
    /* Refuse anything that escapes the app directory (../ traversal). */
    if (filePath !== APP_ROOT && !filePath.startsWith(APP_ROOT + path.sep)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const body = await fs.promises.readFile(filePath);
      const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return new Response(body, { status: 200, headers: { 'content-type': type } });
    } catch (err) {
      return new Response('Not found', { status: 404 });
    }
  });
}

/* Set to 5000 to load from the Flask dev server instead of disk, which is what
   Google Sign-In and the service worker both need. Ignored in packaged builds:
   a shipped app must never depend on a locally running dev server. */
const USE_DEV_SERVER = false;
const DEV_SERVER_URL = 'http://127.0.0.1:5000';

/* The renderer is locked down in every build; these extra restrictions only
   apply to a packaged app so that development keeps its devtools shortcuts. */
const IS_PROD = app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#ffffff',
    title: 'Mini Excel — Spreadsheet',
    webPreferences: {
      /* The app is plain browser JavaScript with no Node APIs, so keep the
         renderer sandboxed and do not expose require() to page scripts. */
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  /* Avoid the white flash while the first paint is still loading. */
  win.once('ready-to-show', () => win.show());

  if (USE_DEV_SERVER && !IS_PROD) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadURL(`${APP_ORIGIN}/index.html`);
  }

  /* Any link that wants a new window (the app has no in-app router) opens in
     the user's real browser rather than spawning a stray Electron window. */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  /* Block in-page navigation away from the app; external URLs go to the browser. */
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url !== current && !url.startsWith(APP_ORIGIN + '/') && url !== APP_ORIGIN) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  /* Shipped builds get no developer tooling. The renderer has no Node access
     and is sandboxed, so this is defence in depth rather than the only guard. */
  if (IS_PROD) {
    win.webContents.on('devtools-opened', () => win.webContents.closeDevTools());
  }

  return win;
}

/* One instance only: a second launch focuses the window already running.
   The single-instance lock must be requested before app.whenReady(). */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    registerAppProtocol();

    /* The stock menu (View > Reload, Developer Tools, ...) is a development
       affordance. A packaged build ships without it. */
    if (IS_PROD) Menu.setApplicationMenu(null);

    createWindow();

    /* macOS keeps the process alive with no windows open; re-create on dock click. */
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  /* Close the app on every platform, including macOS, since there is only ever
     one window and the spreadsheet is autosaved to localStorage. */
  app.on('window-all-closed', () => app.quit());
}