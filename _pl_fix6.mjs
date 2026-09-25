import fs from 'fs';

const F = 'css/styles.css';
let s = fs.readFileSync(F, 'utf8');
let fail = 0;
const rep = (re, to, label, must = 1) => {
  if (!re.test(s)) { console.log((must ? 'MISS: ' : 'SKIP: ') + label); if (must) fail = 1; return; }
  s = s.replace(re, () => to);
  console.log('OK: ' + label);
};

/* 1. Page Setup dialog joins the shared dialog styling */
rep(/#findDlg,#chartDlg,#pivotDlg,#recDlg,#picDlg,#helpDlg\{/,
  '#findDlg,#chartDlg,#pivotDlg,#recDlg,#picDlg,#helpDlg,#psDlg{', 'dialog base selector');
rep(/#findDlg\.open,#chartDlg\.open,#pivotDlg\.open,#recDlg\.open,#picDlg\.open,#helpDlg\.open\{/,
  '#findDlg.open,#chartDlg.open,#pivotDlg.open,#recDlg.open,#picDlg.open,#helpDlg.open,#psDlg.open{', 'dialog open selector');
rep(/#findDlg,#chartDlg,#pivotDlg,#recDlg,#picDlg,#ctxMenu,#popMenu,#drawLayer\{/,
  '#findDlg,#chartDlg,#pivotDlg,#recDlg,#picDlg,#psDlg,#ctxMenu,#popMenu,#drawLayer{', 'print hide selector');

fs.writeFileSync(F, s, 'utf8');
if (fail) { console.log('PL FIX 6 FAILED'); process.exit(1); }
console.log('PL FIX 6 OK');
