import fs from 'fs';

const F = 'index.html';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;

/* 1. Page Layout tab: Excel-accurate, fully localised four-group ribbon page */
const page = `<div class="rpage" data-page="pagelayout">
     <div class="rgrp"><div class="rrow">
      <button class="rbtn big" id="bTheme" data-i18n-t="bTheme"><span class="bi">🎨</span><span data-i18n="bTheme">Themes</span></button>
      <button class="rbtn big" id="bAccent" data-i18n-t="bAccent"><span class="bi">🌈</span><span data-i18n="bAccent">Colors</span></button>
     </div><div class="rrow">
      <button class="rbtn big" id="bThemeFonts" data-i18n-t="bThemeFonts"><span class="bi">Aa</span><span data-i18n="bThemeFonts">Fonts</span></button>
      <button class="rbtn big" id="bThemeFx" data-i18n-t="bThemeFx"><span class="bi">✦</span><span data-i18n="bThemeFx">Effects</span></button>
     </div><div class="rlabel" data-i18n="gThemes">Themes</div></div>
     <div class="rgrp"><div class="rrow">
      <button class="rbtn big" id="bMargins" data-i18n-t="bMargins"><span class="bi">⬜</span><span data-i18n="bMargins">Margins</span></button>
      <button class="rbtn big" id="bOrient" data-i18n-t="bOrient"><span class="bi">⟳</span><span id="bOrientTxt">Portrait</span></button>
      <button class="rbtn big" id="bSize" data-i18n-t="bSize"><span class="bi">📄</span><span data-i18n="bSize">Size</span></button>
      <button class="rbtn big" id="bPrintArea" data-i18n-t="bPrintArea"><span class="bi">⬚</span><span data-i18n="bPrintArea">Print Area</span></button>
     </div><div class="rrow">
      <button class="rbtn" id="bBreaks" data-i18n-t="bBreaks">⋯ <span data-i18n="bBreaks">Breaks</span> ▾</button>
      <button class="rbtn" id="bBgPic" data-i18n-t="bBgPic">🖼 <span data-i18n="bBgPic">Background</span> ▾</button>
      <button class="rbtn" id="bPrintTitles" data-i18n-t="bPrintTitles">🔖 <span data-i18n="bPrintTitles">Print Titles</span> ▾</button>
      <span class="rsep"></span>
      <button class="rbtn" id="bPlPage" data-i18n-t="bPlPage">▥ <span data-i18n="bPlPage">Page View</span></button>
      <button class="rbtn" id="bPlPrint" data-i18n-t="bPrint">🖨 <span data-i18n="bPrint">Print</span></button>
     </div>
     <button type="button" class="rlaunch" id="bPgSetup" data-i18n-t="bPgSetupDlg" aria-label="Page Setup">⌟</button>
     <div class="rlabel" data-i18n="gPageSetup">Page Setup</div></div>
     <div class="rgrp">
      <div class="rrow2"><span class="rmini" data-i18n="lblWidth">Width:</span>
       <select class="rsel" id="fitW" data-i18n-t="tipFitW"><option value="auto" data-i18n="fitAuto">Automatic</option><option>1</option><option>2</option><option>3</option><option>4</option><option>6</option></select></div>
      <div class="rrow2"><span class="rmini" data-i18n="lblHeight">Height:</span>
       <select class="rsel" id="fitH" data-i18n-t="tipFitH"><option value="auto" data-i18n="fitAuto">Automatic</option><option>1</option><option>2</option><option>3</option><option>4</option><option>6</option></select></div>
      <div class="rrow2"><span class="rmini" data-i18n="lblScale">Scale:</span>
       <select class="rsel" id="scScale" data-i18n-t="tipScale"><option value="10">10%</option><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option><option value="200">200%</option><option value="400">400%</option></select></div>
      <div class="rlabel" data-i18n="gScaleFit">Scale to Fit</div></div>
     <div class="rgrp"><div class="ropts">
      <span></span><span class="rmicro" data-i18n="lblView">View</span><span class="rmicro" data-i18n="lblPrint">Print</span>
      <span class="rmini2" data-i18n="bPlGrid">Gridlines</span>
      <label class="rchk" data-i18n-t="bPlGrid"><input type="checkbox" id="bPlGrid"><span class="sr" data-i18n="bPlGrid">Gridlines</span></label>
      <label class="rchk" data-i18n-t="bPlGridPrint"><input type="checkbox" id="bPlGridP"><span class="sr" data-i18n="bPlGridPrint">Print gridlines</span></label>
      <span class="rmini2" data-i18n="bPlHead">Headings</span>
      <label class="rchk" data-i18n-t="bPlHead"><input type="checkbox" id="bPlHead"><span class="sr" data-i18n="bPlHead">Headings</span></label>
      <label class="rchk" data-i18n-t="bPlHeadPrint"><input type="checkbox" id="bPlHeadP"><span class="sr" data-i18n="bPlHeadPrint">Print headings</span></label>
     </div><div class="rlabel" data-i18n="gSheetOpt">Sheet Options</div></div>
    </div>`;

const rePage = /<div class="rpage" data-page="pagelayout">[\s\S]*?(?=<div class="rpage" data-page="formulas">)/;
if (!rePage.test(s)) { console.log('MISS: pagelayout page'); fail = 1; }
else { s = s.replace(rePage, () => page + '\n'); console.log('OK: pagelayout page rebuilt'); }

/* 2. Page Setup dialog (same pattern as the app's other dialogs) */
const dlg = `  <div id="psDlg">
   <div class="frow"><span data-i18n="psTitle">Page Setup</span><span style="flex:1"></span><button type="button" id="psClose" aria-label="Close">✕</button></div>
   <div class="psGrid">
    <label for="psOrient" data-i18n="pgOrient">Orientation</label>
    <select id="psOrient"><option value="portrait" data-i18n="orientP">Portrait</option><option value="landscape" data-i18n="orientL">Landscape</option></select>
    <label for="psSize" data-i18n="pgSize">Paper size</label>
    <select id="psSize"></select>
    <label for="psTop" data-i18n="margTop">Top (cm)</label><input type="number" id="psTop" min="0" max="10" step="0.1">
    <label for="psBottom" data-i18n="margBottom">Bottom (cm)</label><input type="number" id="psBottom" min="0" max="10" step="0.1">
    <label for="psLeft" data-i18n="margLeft">Left (cm)</label><input type="number" id="psLeft" min="0" max="10" step="0.1">
    <label for="psRight" data-i18n="margRight">Right (cm)</label><input type="number" id="psRight" min="0" max="10" step="0.1">
    <label data-i18n="margCenter">Center on page</label>
    <div class="psChk">
     <label><input type="checkbox" id="psCenterH"><span data-i18n="chkHoriz">Horizontally</span></label>
     <label><input type="checkbox" id="psCenterV"><span data-i18n="chkVert">Vertically</span></label>
    </div>
    <label for="psScale" data-i18n="lblScale">Scale</label>
    <div class="psChk"><input type="number" id="psScale" min="10" max="400" step="5" aria-label="Scale percent"><span>%</span></div>
    <label data-i18n="lblFitTo">Fit to</label>
    <div class="psChk"><input type="number" id="psFitW" min="1" max="9" aria-label="Pages wide"><span data-i18n="lblPagesWide">page(s) wide</span><input type="number" id="psFitH" min="1" max="9" aria-label="Pages tall"><span data-i18n="lblPagesTall">page(s) tall</span></div>
    <label for="psTitleRows" data-i18n="ptRows">Rows to repeat at top</label><input type="text" id="psTitleRows" placeholder="$1:$1">
    <label for="psTitleCols" data-i18n="ptCols">Columns to repeat at left</label><input type="text" id="psTitleCols" placeholder="$A:$A">
   </div>
   <div class="frow"><span style="flex:1"></span>
    <button type="button" id="psReset" data-i18n="psReset">Reset</button>
    <button type="button" id="psOk" data-i18n="psOk">OK</button>
    <button type="button" id="psCancel" data-i18n="psCancel">Cancel</button></div>
  </div>
`;
const anchor = '<div id="popMenu"></div>';
if (s.includes('id="psDlg"')) console.log('SKIP: psDlg already present');
else if (!s.includes(anchor)) { console.log('MISS: popMenu anchor'); fail = 1; }
else { s = s.replace(anchor, dlg + anchor); console.log('OK: Page Setup dialog added'); }

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 5 FAILED'); process.exit(1); }
console.log('PL FIX 5 OK');

