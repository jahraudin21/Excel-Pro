/* Render an SVG illustration to a PNG using the Electron runtime that already
 * ships with this project (Chromium's renderer does the rasterising).
 *
 * Doing it in Electron rather than adding an image library keeps the build free
 * of a new dependency for a one-off export.
 *
 *   npx electron _render_png.js <svg> [png]
 *
 * The SVG's own width/height decide the output size, so the drawing is authored
 * in comfortable CSS pixels and scaled by its own attributes. */
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SVG_PATH = path.resolve(ROOT, process.argv[2] || 'docs/excel-ui-reference.svg');
const PNG_PATH = path.resolve(ROOT, process.argv[3] || SVG_PATH.replace(/\.svg$/, '.png'));

const svg = fs.readFileSync(SVG_PATH, 'utf8');
const W = Number(/width="(\d+)"/.exec(svg)[1]);
const H = Number(/height="(\d+)"/.exec(svg)[1]);

app.disableHardwareAcceleration();

/* Fit the window to the drawing's aspect ratio within the available work area.
 * Requesting the drawing's own size is not enough: the window gets clamped to
 * the work area, and a clamped window of the wrong ratio makes the SVG's
 * preserveAspectRatio letterbox the drawing, leaving bands of page background
 * above and below it in the capture. So the size is derived here, up front, from
 * the ratio the SVG actually needs. */
function fitWindow(w, h) {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const s = Math.min(wa.width / w, wa.height / h, 1.5);
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

app.whenReady().then(async () => {
  const fit = fitWindow(W, H);

  /* frame:false so the window size IS the content size, and overflow:hidden on
   * the host page. With a framed window the content area is smaller than the
   * requested size, which makes Chromium add scrollbars and crop the drawing. */
  const win = new BrowserWindow({
    ...fit, show: false, frame: false, useContentSize: true,
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

  /* Scale the drawing to fill whatever viewport we actually got. The window can
   * end up smaller than requested (the display work area is the ceiling), and
   * measuring first meant the capture could still disagree with that measurement.
   *
   * The SVG's width/height attributes are in CSS pixels, NOT device pixels, so
   * they are set from the raw viewport. Multiplying by the device pixel ratio
   * here made the drawing larger than the page, and overflow:hidden then cropped
   * the bottom rows off the capture. The ratio is only reported, for context. */
  const m = await win.webContents.executeJavaScript(
    '({w: document.documentElement.clientWidth, h: document.documentElement.clientHeight,' +
    ' dpr: window.devicePixelRatio})');
  const cw = m.w, ch = m.h;
  await win.webContents.executeJavaScript(
    'var s=document.querySelector("svg");' +
    's.setAttribute("width",' + cw + ');s.setAttribute("height",' + ch + ');');
  await new Promise(r => setTimeout(r, 250));

  const img = await win.webContents.capturePage();
  const buf = img.toPNG();
  fs.writeFileSync(PNG_PATH, buf);

  const size = img.getSize();
  console.log('rendered ' + PNG_PATH);
  console.log('  svg ' + W + 'x' + H + '  viewport ' + m.w + 'x' + m.h
    + ' @' + m.dpr + 'x  captured ' + size.width + 'x' + size.height
    + '  ' + buf.length + ' bytes');
  win.destroy();
  app.quit();
}).catch(e => {
  console.error('render failed:', e && e.stack ? e.stack : e);
  app.exit(1);
});