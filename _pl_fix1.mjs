import fs from 'fs';
let ok = true;
function patch(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) { console.log('MISS: ' + label); ok = false; return; }
  s = s.replace(from, () => to);
  fs.writeFileSync(file, s, 'utf8');
  console.log('OK: ' + label);
}
/* 1. index.html — replace the whole Page Layout page with the Excel-accurate version */
{
  const re = /<div class="rpage" data-page="pagelayout">[\s\S]*?(?=<div class="rpage" data-page="formulas">)/;
  const block = `<div class="rpage" data-page="pagelayout">
     <div class="rgrp"><div class="rrow">
      <button class="rbtn" id="bTheme" title="Themes">🎨 Themes ▾</button>
      <button class="rbtn" id="bAccent" title="Accent colors">🌈 Colors ▾</button>
      <button class="rbtn" id="bThemeFonts" title="Theme fonts">Aa Fonts ▾</button>
      <button class="rbtn" id="bThemeFx" title="Effects">✦ Effects ▾</button>
     </div><div class="rlabel" data-i18n="gThemes">Themes</div></div>
     <div class="rgrp"><div class="rrow">
      <button class="rbtn big" id="bOrient" title="Orientation"><span class="bi">⟲</span><span id="bOrientTxt">Portrait</span></button>
      <button class="rbtn" id="bSize" title="Paper size">Size ▾</button>
      <button class="rbtn" id="bMargins" title="Margins">Margins ▾</button>
     </div><div class="rrow">
      <button class="rbtn" id="bPrintArea" title="Print Area">⬚ Print Area ▾</button>
      <button class="rbtn" id="bBreaks" title="Breaks">⋯ Breaks ▾</button>
     </div><div class="rrow">
      <button class="rbtn" id="bBgPic" title="Background">🖼 Background ▾</button>
      <button class="rbtn" id="bPrintTitles" title="Print Titles">🔖 Print Titles ▾</button>
     </div><div class="rrow">
      <button class="rbtn" id="bPlPage" title="Toggle Page Layout view">📄 Page View</button>
      <button class="rbtn" id="bPlPrint" title="Print">🖨 Print</button>
     </div><div class="rlabel" data-i18n="gPageSetup">Page Setup</div></div>
     <div class="rgrp"><div class="rrow">
      <select class="rsel" id="fitW" title="Width in pages"><option value="auto">Width: Auto</option><option value="1">Width: 1 pg</option><option value="2">Width: 2 pg</option><option value="3">Width: 3 pg</option></select>
      <select class="rsel" id="fitH" title="Height in pages"><option value="auto">Height: Auto</option><option value="1">Height: 1 pg</option><option value="2">Height: 2 pg</option><option value="3">Height: 3 pg</option></select>
      <select class="rsel" id="scScale" title="Scaling"><option value="0.5">Scale 50%</option><option value="0.75">Scale 75%</option><option value="1" selected>Scale 100%</option><option value="1.25">Scale 125%</option><option value="1.5">Scale 150%</option><option value="2">Scale 200%</option></select>
     </div><div class="rlabel" data-i18n="gScaleFit">Scale to Fit</div></div>
     <div class="rgrp"><div class="rrow">
      <button class="rbtn" id="bPlGrid" title="Show gridlines">▦ Gridlines</button>
      <button class="rbtn" id="bPlHead" title="Show headings"># Headings</button>
     </div><div class="rlabel" data-i18n="gSheetOpt">Sheet Options</div></div>
    </div>
`;
  let s = fs.readFileSync('index.html', 'utf8');
  if (!re.test(s)) { console.log('MISS: pagelayout block'); ok = false; }
  else { fs.writeFileSync('index.html', s.replace(re, () => block), 'utf8'); console.log('OK: pagelayout block'); }
}
/* 2. styles.css — theme font via CSS variable */
patch('css/styles.css',
  "*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Calibri,Arial,sans-serif}",
  "*{box-sizing:border-box;margin:0;padding:0;font-family:var(--sheet-font,'Segoe UI'),Calibri,Arial,sans-serif}",
  'theme font css var');
/* 3. styles.css — breaks, background, effects presets */
fs.appendFileSync('css/styles.css', `
#grid tr.brk>td,#grid tr.brk>th{border-top:2px dashed #4f81bd}
#gridwrap.pgbg{background-repeat:repeat;background-size:260px;background-position:top left}
body[data-fx='soft'] .rbtn,body[data-fx='soft'] .rsel,body[data-fx='soft'] .file-menu button{border-radius:6px}
body[data-fx='round'] .rbtn,body[data-fx='round'] .rsel{border-radius:10px}
body[data-fx='round'] #app{border-radius:14px}
body[data-fx='sharp'] .rbtn,body[data-fx='sharp'] .rsel,body[data-fx='sharp'] #app,body[data-fx='sharp'] .file-menu,body[data-fx='sharp'] #popMenu{border-radius:0}
`, 'utf8');
console.log('OK: styles.css additions');
if (!ok) process.exit(1);
console.log('PART 1 COMPLETE');