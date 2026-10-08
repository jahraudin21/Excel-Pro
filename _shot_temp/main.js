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

  /* Wait for the page + defer scripts to settle (8s timeout). */
  setTimeout(function () {
    log('AFTER_LOAD_TIMEOUT');

    /* Apply the dashboard template from the REAL app (installWorkbook /
     * renderAll driven by applyTemplate, defined at top level of
     * start-screen.js). In a classic script, function declarations become
     * globals, but 'const StartScreen' does not - so call the global. */
    win.webContents.executeJavaScript(`(() => {
      try {
        applyTemplate('dashboard');
        return true;
      } catch (e) {
        return { error: String(e) };
      }
    })()`).then(function (r) {
      log('TEMPLATE_APPLIED ' + JSON.stringify(r));
      return gridRect(win);
    }).then(function (r1) {
      log('GRID_RECT ' + JSON.stringify(r1));
      return win.webContents.executeJavaScript(`(() => {
        const dl = document.getElementById('drawLayer');
        const canvases = dl ? dl.querySelectorAll('canvas').length : 0;
        const a1 = document.querySelector('td[data-ref="A1"]');
        const kpi = document.querySelector('td[data-ref="A5"]');
        const w = document.getElementById('gridwrap');
        return {
          canvases: canvases,
          mergedA1: a1 ? a1.colSpan + 'x' + a1.rowSpan : null,
          kpi: kpi ? kpi.textContent : null,
          nogrid: w ? w.classList.contains('nogrid') : null,
        };
      })()`);
    }).then(function (diag) {
      log('TEMPLATE_DIAG ' + JSON.stringify(diag));
      return win.webContents.capturePage();
    }).then(function (img) {
      fs.writeFileSync(path.join(__dirname, '_full.png'), img.toPNG());
      log('wrote _full.png');

      /* Scroll to the source table and capture lower. */
      return win.webContents.executeJavaScript(`(() => {
        const w = document.getElementById('gridwrap');
        w.scrollTop = 22 * 23; w.scrollLeft = 0;
        return w.scrollTop;
      })()`);
    }).then(function () {
      return new Promise(function (resolve) { setTimeout(resolve, 300); });
    }).then(function () {
      return gridRect(win);
    }).then(function (r2) {
      log('GRID_RECT_LOWER ' + JSON.stringify(r2));
      if (r2) {
        return win.webContents.capturePage(r2).then(function (img) {
          fs.writeFileSync(path.join(__dirname, '_lower.png'), img.toPNG());
          log('wrote _lower.png');
        });
      }
    }).then(function () {
      if (errors.length) log('page errors: ' + errors.join(', '));
      else log('no page errors');
      app.quit();
    });
  }, 8000);
});
