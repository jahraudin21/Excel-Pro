/* Renders the Sales Dashboard template in the real app and captures it, so
   the layout can be inspected instead of merely asserted.
 * Usage:  npx electron _shot_dashboard.mjs  [outPrefix]
 *
 * Stages the markup into an ASCII temp folder first (the repo path contains
 * non-ASCII characters, which Electron's file:// loader refuses), applies the
 * dashboard template at runtime, then captures: the whole window, the grid
 * area from the top, and the grid scrolled to the source table. It also
 * reports structural diagnostics (canvas count, merged spans, KPI text).
 */
import { app, BrowserWindow } from 'electron';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

const out = path.resolve(process.argv[2] || '_dash');
const stage = path.join(os.tmpdir(), 'excelpro_dash_shot');
fs.mkdirSync(stage, { recursive: true });
fs.cpSync('index.html', path.join(stage, 'index.html'));
fs.cpSync('css', path.join(stage, 'css'), { recursive: true });
fs.cpSync('js', path.join(stage, 'js'), { recursive: true });
const pageUrl = pathToFileURL(path.join(stage, 'index.html')).href;
app.disableHardwareAcceleration();

const gridRect = async win => win.webContents.executeJavaScript(`(() => {
  const w = document.getElementById('gridwrap');
  if (!w) return null;
  const b = w.getBoundingClientRect();
  return { x: Math.max(0, Math.round(b.x)), y: Math.max(0, Math.round(b.y)),
           width: Math.round(b.width), height: Math.round(b.height) };
})()`);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400, height: 900, show: false,
    webPreferences: { contextIsolation: false, nodeIntegration: true },
  });
  const errors = [];
  win.webContents.on('console-message', (_e, _l, msg) => {
    if (/error|uncaught/i.test(msg)) errors.push(msg);
  });
  await win.loadURL(pageUrl);
  await new Promise(r => setTimeout(r, 600));

  /* Take the launch overlays off for the capture only (same technique as
     _shot_home.mjs: display:none survives the guard's re-sync timer). */
  await win.webContents.executeJavaScript(`(() => {
    const s = document.createElement('style');
    s.textContent = '#startScreen,#authLock,#authDialog{display:none !important}';
    document.head.appendChild(s);
    const start = document.querySelector('#startScreen');
    if (start) start.remove();
    if (typeof AuthGuard !== 'undefined') AuthGuard.locked = false;
    document.body.classList.remove('auth-locked','start-open');
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));

  const diag = await win.webContents.executeJavaScript(`(() => {
    try {
      StartScreen.applyTemplate('dashboard');
      const w = document.getElementById('gridwrap');
      if (w) { w.scrollLeft = 0; w.scrollTop = 0; }
      const canvases = document.querySelectorAll('#drawLayer canvas').length;
      const a1 = document.querySelector('td[data-ref="A1"]');
      const kpi = document.querySelector('td[data-ref="A5"]');
      const grid = document.getElementById('grid');
      return {
        applied: true, canvases: canvases,
        mergedA1: a1 ? a1.colSpan + 'x' + a1.rowSpan : null,
        kpi: kpi ? kpi.textContent : null,
        nogrid: grid ? grid.classList.contains('nogrid') : null,
        charts: [...document.querySelectorAll('#drawLayer .draw')].map(d => d.dataset.did),
      };
    } catch (e) { return { applied: false, error: String(e) }; }
  })()`);
  console.log('template: ' + JSON.stringify(diag));
  await new Promise(r => setTimeout(r, 700));

  await win.webContents.capturePage().then(img =>
    fs.writeFileSync(out + '_full.png', img.toPNG()));
  console.log('wrote ' + out + '_full.png');

  const r1 = await gridRect(win);
  if (r1) {
    await win.webContents.capturePage(r1).then(img =>
      fs.writeFileSync(out + '_top.png', img.toPNG()));
    console.log('wrote ' + out + '_top.png  (' + r1.width + 'x' + r1.height + ')');
  }

  /* Scroll to the insights + source table and capture again. */
  await win.webContents.executeJavaScript(`(() => {
    const w = document.getElementById('gridwrap');
    w.scrollTop = 22 * 23; w.scrollLeft = 0;
    return w.scrollTop;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  const r2 = await gridRect(win);
  if (r2) {
    await win.webContents.capturePage(r2).then(img =>
      fs.writeFileSync(out + '_lower.png', img.toPNG()));
    console.log('wrote ' + out + '_lower.png');
  }

  if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
  else console.log('no page errors');
  app.quit();
});
