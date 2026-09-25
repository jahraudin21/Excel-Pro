import fs from 'fs';

const F = 'css/styles.css';
let s = fs.readFileSync(F, 'utf8');

if (s.includes('/* ---------- Page Layout tab:')) { console.log('SKIP: page layout css already present'); process.exit(0); }

s += `
/* ---------- Page Layout tab: Themes / Page Setup / Scale to Fit / Sheet Options ---------- */
.rgrp{position:relative}
.rrow2{display:flex;align-items:center;gap:4px;margin:1px 0}
.rmini{font-size:10px;color:#555;min-width:42px;text-align:right}
.rmini2{font-size:10.5px;color:#444;white-space:nowrap}
.rmicro{font-size:9.5px;color:#777;text-align:center;min-width:32px}
.rchk{display:flex;align-items:center;justify-content:center;margin:0}
.rchk input{margin:0;accent-color:#217346;cursor:pointer}
.ropts{display:grid;grid-template-columns:auto 32px 32px;align-items:center;gap:3px 6px;padding:2px 0}
.rlaunch{position:absolute;right:3px;bottom:17px;width:15px;height:15px;line-height:13px;padding:0;border:none;background:transparent;color:#999;font-size:11px;cursor:pointer}
.rlaunch:hover{color:#217346}
.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
/* Page Layout view aids: repeated print titles stay pinned, cells outside the print area dim */
#grid.pageview tbody tr.ptitle>th,#grid.pageview tbody tr.ptitle>td{position:sticky;top:22px;z-index:2;background:#fff}
#grid.breakview tbody tr.paout>th,#grid.breakview tbody tr.paout>td{opacity:.35}
body[data-theme='dark'] #grid.pageview tbody tr.ptitle>th,body[data-theme='dark'] #grid.pageview tbody tr.ptitle>td{background:#2b2b2b}
body[data-theme='dark'] .rmini,body[data-theme='dark'] .rmini2,body[data-theme='dark'] .rmicro{color:#b9b9b9}
body[data-theme='dark'] .rsel{background:#2b2b2b;color:#e6e6e6;border-color:#555}
/* Page Setup dialog */
#psDlg{min-width:360px}
.psGrid{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;font-size:12.5px}
.psGrid>label{color:#444;white-space:nowrap}
.psGrid select,.psGrid input[type=number],.psGrid input[type=text]{border:1px solid #ccc;border-radius:3px;padding:3px 6px;font-size:12.5px;background:#fff;outline:none}
.psGrid input[type=number]{width:78px}
.psGrid input[type=text]{width:100%}
.psGrid select:focus,.psGrid input:focus{border-color:#217346}
.psChk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#555}
.psChk>label{display:flex;align-items:center;gap:4px;cursor:pointer}
.psChk input[type=checkbox]{accent-color:#217346;cursor:pointer;margin:0}
.psChk input[type=number]{border:1px solid #ccc;border-radius:3px;padding:3px 6px;font-size:12.5px;width:66px}
body[data-theme='dark'] #psDlg{background:#2b2b2b;border-color:#555;color:#e8e8e8}
body[data-theme='dark'] .psGrid>label,body[data-theme='dark'] .psChk{color:#ccc}
body[data-theme='dark'] .psGrid select,body[data-theme='dark'] .psGrid input{background:#1f1f1f;color:#e8e8e8;border-color:#555}
`;
fs.writeFileSync(F, s, 'utf8');
console.log('OK: page layout css appended (' + s.length + ' bytes)');
