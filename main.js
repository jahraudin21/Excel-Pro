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
const { app, BrowserWindow, shell } = require('electron');

/* Set to 5000 to load from the Flask dev server instead of disk, which is what
   Google Sign-In and the service worker both need. */
const USE_DEV_SERVER = false;
const DEV_SERVER_URL = 'http://127.0.0.1:5000';

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

  if (USE_DEV_SERVER) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, 'index.html'));
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
    if (url !== current && !url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

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