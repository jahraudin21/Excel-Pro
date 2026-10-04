/* Render docs/excel-ui-reference.svg to a PNG using the Electron runtime that
 * already ships with this project (Chromium's renderer does the rasterising).
 *
 * Doing it in Electron rather than adding an image library keeps the build free
 * of a new dependency for a one-off export. */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SVG = path.join(ROOT, 'docs', 'excel-ui-reference.svg');
const PNG = path.join(ROOT, 'docs', 'excel-ui-reference.png');
const W = 1440, H = 820;

/* Scale 2 for a crisp result on a high-DPI display. */
const SCALE = 2;

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const svg = fs.readFileSync(SVG, 'utf8');

  /* frame:false so the window size IS the content size, and overflow:hidden on
   * the host page. With a framed window the content area is smaller than the
   * requested size, which made Chromium add scrollbars and crop the right-hand
   * column and the bottom rows out of the capture. */
  const win = new BrowserWindow({
    width: W, height: H, show: false, frame: false, useContentSize: true,
    webPreferences: { backgroundThrottling: false }
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    '<!doctype html><meta charset="utf-8">' +
    '<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}' +
    'svg{display:block}</style>' +
    svg
  ));

  /* Let fonts and the SVG layout settle before the capture. */
  await new Promise(r => setTimeout(r, 900));

  /* The window may end up smaller than requested (the display work area is the
   * ceiling), which would crop the right-hand column and the sheet tabs. Rather
   * than hard-code a size, scale the SVG to whatever viewport we actually got.
   * The viewBox keeps it proportional, so nothing distorts or drops out. */
  const vp = await win.webContents.executeJavaScript(
    '({w: document.documentElement.clientWidth, h: document.documentElement.clientHeight})');
  await win.webContents.executeJavaScript(
    'document.querySelector("svg").setAttribute("width",' + vp.w +
    ');document.querySelector("svg").setAttribute("height",' + vp.h + ');');
  await new Promise(r => setTimeout(r, 250));

  const img = await win.webContents.capturePage({ x: 0, y: 0, width: vp.w, height: vp.h });
  const buf = img.toPNG();
  fs.writeFileSync(PNG, buf);

  const size = img.getSize();
  console.log('rendered ' + PNG);
  console.log('  requested ' + W + 'x' + H + '  viewport ' + vp.w + 'x' + vp.h
    + '  captured ' + size.width + 'x' + size.height + '  ' + buf.length + ' bytes');
  win.destroy();
  app.quit();
}).catch(e => {
  console.error('render failed:', e && e.stack ? e.stack : e);
  app.exit(1);
});