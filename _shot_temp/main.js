'use strict';
/* Minimal Electron app for screenshot capture. Writes all output and PNGs to
 * a log file and the _shot_temp dir so PowerShell redirection doesn't swallow
 * the stdout. Built as CommonJS for the binary's Node runtime. */
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const LOG = path.join(__dirname, 'capture.log');
function log(msg) {
  fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + msg + '\n');
  console.log(msg);
}

app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-dev-shm-usage');

const gridRect = function (win) {
  return win.webContents.executeJavaScript(`(() => {
    const w = document.getElementById('gridwrap');
    if (!w) return null;
    const b = w.getBoundingClientRect();
    return { x: Math.max(0, Math.round(b.x)), y: Math.max(0, Math.round(b.y)),
             width: Math.round(b.width), height: Math.round(b.height) };
  })()`);
};

app.whenReady().then(function () {
  const staged = path.join(__dirname);
  const win = new BrowserWindow({
    width: 1400, height: 900, show: false,
    webPreferences: { contextIsolation: false, nodeIntegration: true },
  });

  const errors = [];
  win.webContents.on('console-message', function (_e, _l, msg) {
    if (/error|uncaught/i.test(msg)) errors.push(msg);
    log('renderer: ' + msg);
  });

  const url = 'file://' + path.join(staged, 'index.html');
  log('LOADING ' + url);
  win.loadURL(url);

  /* Wait up to ~8s for the grid to be populated (defer scripts + template). */
  setTimeout(function () {
    win.webContents.executeJavaScript(`(() => {
      const w = document.getElementById('gridwrap');
      const g = w ? w.querySelector('table#grid') : null;
      const dl = document.getElementById('drawLayer');
      const canvases = dl ? dl.querySelectorAll('canvas').length : 0;
      const a1 = document.querySelector('td[data-ref="A1"]');
      const kpi = document.querySelector('td[data-ref="A5"]');
      return {
        gridwrap: !!w, grid: !!g, canvases: canvases,
        a1Text: a1 ? a1.textContent : null,
        kpiText: kpi ? kpi.textContent : null,
        nogrid: w && w.classList.contains('nogrid') ? 'yes' : 'no',
      };
    })()`).then(function (r) {
      log('DOM_AFTER_LOAD ' + JSON.stringify(r));
      return gridRect(win);
    }).then(function (r1) {
      log('GRID_RECT ' + JSON.stringify(r1));
      return win.webContents.capturePage();
    }).then(function (img) {
      fs.writeFileSync(path.join(__dirname, '_full.png'), img.toPNG());
      log('wrote _full.png');
      return app.quit();
    }).catch(function (e) {
      log('HARNESS_ERR ' + e);
      return app.quit();
    });
  }, 8000);
});
