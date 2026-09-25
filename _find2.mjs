import fs from 'fs';
import path from 'path';

const hist = path.join(process.env.APPDATA || '', 'Code', 'User', 'History');
const out = [];
function walk(dir, depth) {
  if (depth > 4) return;
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p, depth + 1);
    else {
      let txt = '';
      try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { continue; }
      if (txt.includes('mini-excel-wb-v2') || txt.includes('applyNumDec')) {
        out.push({ p, size: txt.length, mtime: fs.statSync(p).mtimeMs, num: txt.includes('function applyNumDec'), init: txt.includes('function init(') });
      }
    }
  }
}
walk(hist, 0);
out.sort((a, b) => b.mtime - a.mtime);
console.log('hits: ' + out.length);
out.slice(0, 10).forEach(c => console.log(new Date(c.mtime).toISOString(), c.size, 'numDec=' + c.num, 'init=' + c.init, c.p));

/* how broken is the current script.js? */
const cur = fs.readFileSync('js/script.js', 'utf8');
const open = (cur.match(/\{/g) || []).length, close = (cur.match(/\}/g) || []).length;
console.log('braces { = ' + open + '  } = ' + close + '  diff=' + (open - close));
console.log('has initRibbon=' + cur.includes('function initRibbon') + '  has init(=' + cur.includes('function init(') + '  has applyNumDec=' + cur.includes('function applyNumDec') + '  has applyLink=' + cur.includes('function applyLink') + '  has explainActive=' + cur.includes('function explainActive') + '  has nameMgrMenu=' + cur.includes('function nameMgrMenu'));
