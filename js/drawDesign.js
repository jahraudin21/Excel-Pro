'use strict';
/* ================= Drawing Design: style presets, templates, design tools ================= */

/* ---------- design preset palettes ---------- */
const DESIGN_PALETTES = {
  greens:   { name:'Green Tones',   colors:['#217346','#2ecc71','#58d68d','#145a32','#196f3d'] },
  blues:    { name:'Blue Tones',    colors:['#2980b9','#3498db','#5dade2','#1a5276','#2471a3'] },
  earth:    { name:'Earth Tones',   colors:['#8e44ad','#c0392b','#d35400','#7f8c8d','#2c3e50'] },
  sunset:   { name:'Sunset',        colors:['#e67e22','#f39c12','#e74c3c','#f1c40f','#d35400'] },
  mono:     { name:'Monochrome',    colors:['#2c3e50','#34495e','#5d6d7e','#95a5a6','#bdc3c7'] },
  pastel:   { name:'Pastel',        colors:['#a2d9ce','#aed6f1','#f5b7b1','#f9e79f','#d7bde2'] }
};

/* ---------- shape style presets ---------- */
const SHAPE_STYLES = {
  outline:  { border:'2px solid', fill:'none', radius:0 },
  filled:   { border:'2px solid', fill:'20%', radius:0 },
  rounded:  { border:'2px solid', fill:'none', radius:10 },
  roundedFilled: { border:'2px solid', fill:'15%', radius:10 },
  dashed:   { border:'2px dashed', fill:'none', radius:0 },
  thick:    { border:'4px solid', fill:'none', radius:0 },
  double:   { border:'3px double', fill:'none', radius:0 }
};

/* ---------- get the current design palette ---------- */
function currentPalette(){
  const sel=$('#designPalette');
  return sel && sel.value ? DESIGN_PALETTES[sel.value] : DESIGN_PALETTES.greens;
}

/* ---------- apply a design style to a drawing definition ---------- */
function applyStyleToDrawing(d, styleName){
  const style=SHAPE_STYLES[styleName]||SHAPE_STYLES.outline;
  d.borderStyle=style.border;
  d.fill=style.fill;
  d.radius=style.radius;
  return d;
}

/* ---------- create a drawing with design styling ---------- */
function addStyledDrawing(kind, styleName, paletteName){
  const base={kind:kind};
  const color=currentPalette().colors[0];
  const b=cellBox(active)||{x:60,y:60};
  base.x=b.x+10; base.y=b.y+10; base.color=color;
  applyStyleToDrawing(base, styleName||'outline');
  if(kind==='line'||kind==='arrow')Object.assign(base,{w:150,h:26});
  else if(kind==='text')Object.assign(base,{w:180,h:40,text:''});
  else Object.assign(base,{w:150,h:84});
  return addDrawing(base);
}

/* ---------- design presets menu ---------- */
function designPresetsMenu(){
  return [
    {head:'Design Palettes'},
    ...Object.entries(DESIGN_PALETTES).map(([key,ph])=>({
      label:ph.name, action:()=>{
        const sel=$('#designPalette');
        if(sel){sel.value=key;sel.dispatchEvent(new Event('change'));}
      }
    })),
    {head:'Shape Styles'},
    ...Object.entries(SHAPE_STYLES).map(([key,sh])=>({
      label:key.charAt(0).toUpperCase()+key.slice(1), action:()=>{
        addStyledDrawing('rect', key);
      }
    }))
  ];
}

/* ---------- design toolbar buttons ---------- */
function initDesignButtons(){
 /* Local click-binder: script.js only defines an equivalent `tg` inside initRibbon's
    scope, so the bare `tg(...)` calls below threw ReferenceError and nothing was wired. */
 const tg=(id2,fn)=>{try{const el2=document.querySelector(id2);if(el2)el2.onclick=fn;}catch(e){}};
  tg('#bDesignPalettes',()=>{
    const menu=designPresetsMenu();
    popMenu($('#bDesignPalettes'),menu);
  });
  tg('#bDesignStyle',()=>{
    const styleNames=Object.keys(SHAPE_STYLES);
    popMenu($('#bDesignStyle'),[
      {head:'Apply Style'},
      ...styleNames.map(n=>({label:n, action:()=>addStyledDrawing('rect',n)}))
    ]);
  });
  tg('#bDesignReset',()=>{
    const sel=$('#designPalette');
    if(sel){sel.value='greens';sel.dispatchEvent(new Event('change'));}
    setStatusMode(T('designReset'));
  });
}

/* ---------- save/restore current design state ---------- */
function saveDesignState(){
  const state={
    palette:$('#designPalette')&&$('#designPalette').value,
    style:$('#designStyle')&&$('#designStyle').value
  };
  try{const wb=window.wb;if(wb)wb.designState=state;}catch(e){}
}

/* ---------- restore design state on load ---------- */
function restoreDesignState(){
  try{
    const wb=window.wb;
    if(wb && wb.designState){
      const ds=wb.designState;
      const pal=$('#designPalette');
      if(pal && ds.palette) pal.value=ds.palette;
      const sty=$('#designStyle');
      if(sty && ds.style) sty.value=ds.style;
    }
  }catch(e){}
}

/* ---------- design helper: create color swatch element ---------- */
function colorSwatch(color, size){
  const sw=document.createElement('div');
  sw.style.width=size+'px';
  sw.style.height=size+'px';
  sw.style.background=color;
  sw.style.border='1px solid #ccc';
  sw.style.borderRadius='3px';
  sw.style.display='inline-block';
  sw.style.margin='2px';
  return sw;
}

/* ---------- design helper: render palette preview ---------- */
function renderPalettePreview(palette, container){
  container.innerHTML='';
  palette.colors.forEach(c=>container.appendChild(colorSwatch(c,18)));
}

/* ---------- Financial functions ----------
 * Excel's Financial category, implementing the standard annuity/depreciation
 * identities. Sign convention follows Excel: money received is positive, money
 * paid out is negative, so PMT on a loan (pv > 0) returns a negative number.
 *
 * RATE and IRR have no closed form, so both are solved by bisection over a
 * bracket. That is slower than a formula but converges reliably and, unlike
 * Newton, cannot run away on a degenerate input.
 */
(function () {
  'use strict';
  if (typeof FN === 'undefined') return;

  /* Future value of (pv, pmt) at rate over nper periods. A zero rate would
   * divide by zero in the annuity term, so callers branch on it instead. */
  const fvOf = (rate, nper, pmt, pv, type) =>
    type ? -(pv * Math.pow(1 + rate, nper) + pmt * (1 + rate * type) * ((Math.pow(1 + rate, nper) - 1) / rate))
         : -(pv * Math.pow(1 + rate, nper) + pmt * ((Math.pow(1 + rate, nper) - 1) / rate));

  /* PMT(rate, nper, pv, [fv], [type]). Rate 0 is the linear limit, not an error:
   * you simply repay the principal spread evenly. */
  function pmt(rate, nper, pv, fv, type) {
    nper = num(nper);
    if (nper === 0) return '#NUM!';
    if (rate === 0) return -(pv + fv) / nper;
    const k = Math.pow(1 + rate, nper);
    return -(pv * k + fv) * rate / ((k - 1) * (type ? 1 + rate : 1));
  }

  function pvOf(rate, nper, pmt, fv, type) {
    if (rate === 0) return -(pmt * nper + fv);
    const k = Math.pow(1 + rate, nper);
    return -(fv + pmt * (type ? (1 + rate * type) : 1) * (k - 1) / rate) / k;
  }

  function fvCalc(rate, nper, pmt, pv, type) {
    if (rate === 0) return -(pv + pmt * nper);
    const k = Math.pow(1 + rate, nper);
    return -(pv * k + pmt * (type ? (1 + rate * type) : 1) * (k - 1) / rate);
  }

  function nperOf(rate, pmt, pv, fv, type) {
    if (rate === 0) {
      if (!pmt) return '#NUM!';
      return -(pv + fv) / pmt;
    }
    const z = pmt * (type ? 1 + rate : 1);
    const top = z - fv * rate;
    const bottom = pv * rate + z;
    if (!top || !bottom || top / bottom <= 0) return '#NUM!';
    return Math.log(top / bottom) / Math.log(1 + rate);
  }

  /* Bisection over a rate bracket, widened until the sign of fv flips. Rates at
   * or below -100% are meaningless (1 + rate <= 0), so the bracket stays above. */
  function rateOf(nper, pmt, pv, fv, type, guess) {
    let lo = guess === undefined ? 0.1 : guess;
    let hi = guess === undefined ? 1 : guess + 0.5;
    let flo = fvOf(lo, nper, pmt, pv, type);
    let fhi = fvOf(hi, nper, pmt, pv, type);
    let steps = 0;
    while (flo * fhi > 0 && steps < 60) {
      lo *= 2; hi *= 2;
      flo = fvOf(lo, nper, pmt, pv, type);
      fhi = fvOf(hi, nper, pmt, pv, type);
      steps++;
    }
    if (flo * fhi > 0) return '#NUM!';
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const fm = fvOf(mid, nper, pmt, pv, type);
      if (Math.abs(fm) < 1e-10) return mid;
      if (flo * fm <= 0) { hi = mid; fhi = fm; }
      else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  /* Excel's IPMT/PPMT split a payment into interest and principal for period
   * `per` (1-based). With type=1 the first payment carries no interest. */
  function ipmt(rate, per, nper, pv, fv, type) {
    const p = pmt(rate, nper, pv, fv, type);
    const bal = fvCalc(rate, per - 1, p, pv, type);
    return type && per === 1 ? 0 : bal * rate;
  }

  function cumipmt(rate, nper, pv, start, end, type) {
    if (start < 1 || end < start || rate <= 0) return '#NUM!';
    let total = 0;
    for (let i = start; i <= end; i++) total += ipmt(rate, i, nper, pv, 0, type);
    return total;
  }

  /* NPV of a cash-flow series, discounting the first value by one period. */
  function npvAt(rate, values) {
    let total = 0;
    for (let i = 0; i < values.length; i++) {
      const v = num(values[i]);
      if (isNaN(v)) return '#NUM!';
      total += v / Math.pow(1 + rate, i + 1);
    }
    return total;
  }

  /* IRR by bisection on NPV, the same robustness rationale as RATE. */
  function irr(values) {
    const list = flat([values]);
    if (list.length < 2) return '#NUM!';
    let lo = -0.9999, hi = 10;
    let flo = npvAt(lo, list), fhi = npvAt(hi, list);
    let steps = 0;
    while (flo * fhi > 0 && steps < 200) { hi *= 1.5; fhi = npvAt(hi, list); steps++; }
    if (flo * fhi > 0) return '#NUM!';
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fm = npvAt(mid, list);
      if (Math.abs(fm) < 1e-10) return mid;
      if (flo * fm <= 0) { hi = mid; fhi = fm; }
      else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  /* XNPV/XIRR need matching date/value pairs. Dates arrive as Excel serials, so
   * they are normalised against the earliest to get day offsets. Excel uses a
   * 365-day year regardless of leap years, which is what the /365 does. */
  function xnpv(rate, values, dates) {
    const vals = flat([values]);
    const dts = flat([dates]).map(d => num(d));
    if (vals.length !== dts.length || !vals.length) return '#NUM!';
    if (rate <= -1) return '#NUM!';
    const first = Math.min.apply(null, dts);
    let total = 0;
    for (let i = 0; i < vals.length; i++) total += num(vals[i]) / Math.pow(1 + rate, (dts[i] - first) / 365);
    return total;
  }

  function xirr(values, dates) {
    const vals = flat([values]);
    const dts = flat([dates]).map(d => num(d));
    if (vals.length !== dts.length || vals.length < 2) return '#NUM!';
    const f = r => xnpv(r, vals, dts);
    let lo = -0.9999, hi = 10;
    let flo = f(lo), fhi = f(hi);
    let steps = 0;
    while (flo * fhi > 0 && steps < 200) { hi *= 1.5; fhi = f(hi); steps++; }
    if (flo * fhi > 0) return '#NUM!';
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const fm = f(mid);
      if (Math.abs(fm) < 1e-10) return mid;
      if (flo * fm <= 0) { hi = mid; fhi = fm; }
      else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  /* ---------- depreciation ---------- */

  /* Straight-line: a flat (cost - salvage) / life each period. */
  function sln(cost, salvage, life) {
    return (num(cost) - num(salvage)) / num(life);
  }

  /* Sum-of-years'-digits: front-loaded, so the factor falls as the period rises. */
  function syd(cost, salvage, life, period) {
    const c = num(cost), s = num(salvage), l = num(life), p = num(period);
    return ((c - s) * (l - p + 1)) / ((l * (l + 1)) / 2);
  }

  /* Fixed-declining balance: the rate comes from salvage, and Excel charges a
   * half-year in year one, so period 1 is scaled by months/12. Book value is
   * floored at salvage so the total never exceeds cost - salvage. */
  function db(cost, salvage, life, period, months) {
    const c = num(cost), s = num(salvage), l = num(life), p = num(period);
    if (l <= 0 || c <= 0) return '#NUM!';
    const rate = 1 - Math.pow(s / c, 1 / l);
    let book = c, dep = 0;
    for (let i = 1; i <= p; i++) {
      let d = book * rate;
      if (i === 1) d = d * num(months === undefined ? 12 : months) / 12;
      d = Math.min(d, Math.max(0, book - s));
      dep = d; book -= d;
    }
    return dep;
  }

  /* Double-declining balance: rate = factor / life, floored at salvage. */
  function ddb(cost, salvage, life, period, factor) {
    const c = num(cost), s = num(salvage), l = num(life), p = num(period);
    if (l <= 0 || p < 1) return '#NUM!';
    const rate = num(factor === undefined ? 2 : factor) / l;
    let book = c, dep = 0;
    for (let i = 1; i <= p; i++) {
      dep = Math.min(book * rate, Math.max(0, book - s));
      book -= dep;
    }
    return dep;
  }

  Object.assign(FN, {
    PMT: (...a) => pmt(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0)),
    PV: (...a) => pvOf(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0)),
    FV: (...a) => fvCalc(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0)),
    NPER: (...a) => nperOf(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0)),
    RATE: (...a) => rateOf(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0)),
    IPMT: (...a) => ipmt(num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4] || 0), num(a[5] || 0)),
    PPMT: (...a) => {
      const p = pmt(num(a[0]), num(a[1]), num(a[2]), num(a[3] || 0), num(a[4] || 0));
      return p - ipmt(num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4] || 0), num(a[5] || 0));
    },
    CUMIPMT: (...a) => cumipmt(num(a[0]), num(a[1]), num(a[2]), num(a[3]), num(a[4]), num(a[5] || 0)),

    /* NPV discounts the first value by one period, so the series is walked in
     * reverse and each value folded in before dividing. */
    NPV: (rate, ...a) => {
      const list = flat(a);
      let total = 0;
      for (let i = list.length - 1; i >= 0; i--) total = (total + num(list[i])) / (1 + num(rate));
      return total;
    },
    IRR: values => irr(flat([values])),
    XNPV: (rate, values, dates) => xnpv(num(rate), values, dates),
    XIRR: (values, dates) => xirr(flat([values]), dates),

    SLN: (cost, salvage, life) => sln(cost, salvage, life),
    SYD: (cost, salvage, life, period) => syd(cost, salvage, life, period),
    DB: (cost, salvage, life, period, months) => db(cost, salvage, life, period, months),
    DDB: (cost, salvage, life, period, factor) => ddb(cost, salvage, life, period, factor),

    EFFECT: (nominal, npery) => Math.pow(1 + num(nominal) / num(npery), num(npery)) - 1,
    NOMINAL: (effect, npery) => {
      const n = num(npery);
      if (n < 1) return '#NUM!';
      return (Math.pow(1 + num(effect), n) - 1) * n;
    },
    PDURATION: (rate, pv, fv) => {
      const r = num(rate);
      if (r <= 0 || num(fv) <= 0 || num(pv) <= 0) return '#NUM!';
      return (Math.log(num(fv)) - Math.log(num(pv))) / Math.log(1 + r);
    },
    RRI: (nper, pv, fv) => {
      const n = num(nper);
      if (n <= 0) return '#NUM!';
      return Math.pow(num(fv) / num(pv), 1 / n) - 1;
    }
  });

  /* One-line help text each, matching the FN_HELP shape the category menu reads. */
  if (typeof FN_HELP !== 'undefined') Object.assign(FN_HELP, {
    PMT: 'EMI / periodic payment', PV: 'Present value', FV: 'Future value',
    NPER: 'Number of periods', RATE: 'Interest rate per period',
    IPMT: 'Interest part of a payment', PPMT: 'Principal part of a payment',
    NPV: 'Net present value', IRR: 'Internal rate of return',
    XIRR: 'IRR with dates', XNPV: 'NPV with dates', CUMIPMT: 'Cumulative interest',
    SLN: 'Straight-line depreciation', SYD: 'Sum-of-years depreciation',
    DB: 'Fixed declining balance', DDB: 'Double declining balance',
    EFFECT: 'Effective annual rate', NOMINAL: 'Nominal annual rate',
    PDURATION: 'Time to reach a value', RRI: 'Equivalent rate'
  });
})();

/* ---------- design helper: create a design template drawing ---------- */
function createDesignTemplate(templateName){
  const templates={
    boxLabel: {kind:'rect', w:130, h:54, style:'filled'},
    callout:  {kind:'rect', w:160, h:70, style:'roundedFilled'},
    button:   {kind:'rect', w:120, h:36, style:'rounded'},
    card:     {kind:'rect', w:200, h:140, style:'outline'}
  };
  const t=templates[templateName];
  if(!t) return null;
  const color=currentPalette().colors[0];
  const b=cellBox(active)||{x:60,y:60};
  return {
    kind:t.kind,
    x:b.x+10, y:b.y+10,
    w:t.w, h:t.h,
    color:color,
    borderStyle:SHAPE_STYLES[t.style].border,
    fill:SHAPE_STYLES[t.style].fill,
    radius:SHAPE_STYLES[t.style].radius
  };
}

/* ---------- design helper: add a template drawing ---------- */
function addDesignTemplate(templateName){
  const t=createDesignTemplate(templateName);
  if(t) return addDrawing(t);
  return null;
}

/* ---------- design status messages (T() falls back to the key itself when missing) ---------- */
if(typeof STR!=='undefined')Object.assign(STR,{designReset:{np:'डिजाइन रिसेट',hi:'डिज़ाइन रीसेट',en:'Design reset'},paletteApplied:{np:'à¤ªà¥यालेट लागू',hi:'पैलेट लागू',en:'Palette applied'},styleApplied:{np:'à¤¸à¥टाइल लागू',hi:'à¤¸à¥टाइल लागू',en:'Style applied'}});
/* ---------- Format Cells dialog (index.html fmtDlg) ---------- */
if(typeof STR!=='undefined')Object.assign(STR,{
 fmtTitle:{np:'सेल à¤¢à¤¾à¤चा',hi:'सेल à¤ªà¥रारूप',en:'Format Cells'},
 tipFmtCells:{np:'सेल à¤¢à¤¾à¤चा (Ctrl+1)',hi:'सेल à¤ªà¥रारूप (Ctrl+1)',en:'Format Cells (Ctrl+1)'},
 fmtTabFont:{np:'à¤«à¤¨à¥ट',hi:'à¤«à¤¼à¥‰à¤¨à¥ट',en:'Font'},
 fmtTabFill:{np:'भराइ',hi:'भराई',en:'Fill'},
 fmtTabBorder:{np:'à¤¬à¥‹à¤°à¥डर',hi:'à¤¬à¥‰à¤°à¥डर',en:'Border'},
 fmtTabAlign:{np:'संरेखण',hi:'संरेखण',en:'Alignment'},
 fmtFontName:{np:'à¤«à¤¨à¥ट',hi:'à¤«à¤¼à¥‰à¤¨à¥ट',en:'Font'},
 fmtFontSize:{np:'à¤«à¤¨à¥ट आकार',hi:'à¤«à¤¼à¥‰à¤¨à¥ट आकार',en:'Font size'},
 fmtFontStyle:{np:'à¤«à¤¨à¥ट शैली',hi:'à¤«à¤¼à¥‰à¤¨à¥ट शैली',en:'Font style'},
 fmtStyleNormal:{np:'à¤¸à¤¾à¤®à¤¾à¤¨à¥य',hi:'à¤¸à¤¾à¤®à¤¾à¤¨à¥य',en:'Normal'},
 fmtStyleItalic:{np:'इटालिक',hi:'इटैलिक',en:'Italic'},
 fmtStyleBold:{np:'à¤¬à¥‹à¤²à¥ड',hi:'à¤¬à¥‹à¤²à¥ड',en:'Bold'},
 fmtStyleBoldItalic:{np:'à¤¬à¥‹à¤²à¥ड इटालिक',hi:'à¤¬à¥‹à¤²à¥ड इटैलिक',en:'Bold Italic'},
 fmtUnderline:{np:'रेखांकन',hi:'रेखांकन',en:'Underline'},
 fmtNone:{np:'à¤•à¥नै छैन',hi:'कोई नहीं',en:'None'},
 fmtUSingle:{np:'à¤कल',hi:'à¤कहरी',en:'Single'},
 fmtUDouble:{np:'दोहरो',hi:'दोहरी',en:'Double'},
 fmtColor:{np:'रङ',hi:'रंग',en:'Color'},
 fmtColorPick:{np:'à¤¸à¥वतः',hi:'à¤¸à¥वतः',en:'Automatic'},
 fmtStrike:{np:'à¤®à¤§à¥यरेखा',hi:'à¤®à¤§à¥यरेखा',en:'Strikethrough'},
 fmtSampleTxt:{np:'à¤¨à¤®à¥ना',hi:'नमूना',en:'Sample'},
 fmtBgColor:{np:'à¤ªà¥ƒà¤·à¥ठभूमि रङ',hi:'à¤ªà¥ƒà¤·à¥ठभूमि रंग',en:'Background color'},
 fmtBgPick:{np:'रङ à¤›à¤¾à¤¨à¥à¤¨à¥à¤¹à¥‹à¤¸à¥',hi:'रंग à¤šà¥नें',en:'Choose a color'},
 fmtNoFill:{np:'भराइ छैन',hi:'कोई भराई नहीं',en:'No fill'},
 fmtLineStyle:{np:'रेखा शैली',hi:'रेखा शैली',en:'Line style'},
 fmtLineNone:{np:'à¤•à¥नै छैन',hi:'कोई नहीं',en:'None'},
 fmtLineThin:{np:'पातलो',hi:'पतली',en:'Thin'},
 fmtLineMedium:{np:'à¤®à¤§à¥यम',hi:'à¤®à¤§à¥यम',en:'Medium'},
 fmtLineThick:{np:'à¤¬à¤¾à¤•à¥लो',hi:'मोटी',en:'Thick'},
 fmtBorderColor:{np:'रङ',hi:'रंग',en:'Color'},
 fmtBorderAll:{np:'चारै किनारामा लागू',hi:'चारों किनारों पर लागू',en:'Apply to all four sides'},
 fmtHAlign:{np:'तिरो',hi:'à¤•à¥षैतिज',en:'Horizontal'},
 fmtHGeneral:{np:'à¤¸à¤¾à¤®à¤¾à¤¨à¥य',hi:'à¤¸à¤¾à¤®à¤¾à¤¨à¥य',en:'General'},
 fmtHLeft:{np:'à¤¬à¤¾à¤¯à¤¾à¤',hi:'à¤¬à¤¾à¤¯à¤¾à¤',en:'Left'},
 fmtHCenter:{np:'बीच',hi:'बीच',en:'Center'},
 fmtHRight:{np:'à¤¦à¤¾à¤¯à¤¾à¤',hi:'à¤¦à¤¾à¤¯à¤¾à¤',en:'Right'},
 fmtVAlign:{np:'खडा',hi:'लंबवत',en:'Vertical'},
 fmtVTop:{np:'माथि',hi:'ऊपर',en:'Top'},
 fmtVMiddle:{np:'बीचमा',hi:'बीच में',en:'Middle'},
 fmtVBottom:{np:'तल',hi:'नीचे',en:'Bottom'},
 fmtRotate:{np:'पाठ à¤˜à¥माउन',hi:'पाठ à¤˜à¥à¤®à¤¾à¤à¤',en:'Text rotation'},
 fmtRot0:{np:'० à¤¡à¤¿à¤—à¥री',hi:'0 à¤¡à¤¿à¤—à¥री',en:'0 degrees'},
 fmtRot45:{np:'४५ à¤¡à¤¿à¤—à¥री',hi:'45 à¤¡à¤¿à¤—à¥री',en:'45 degrees'},
 fmtRot90:{np:'९० à¤¡à¤¿à¤—à¥री',hi:'90 à¤¡à¤¿à¤—à¥री',en:'90 degrees'},
 fmtRotNeg45:{np:'-४५ à¤¡à¤¿à¤—à¥री',hi:'-45 à¤¡à¤¿à¤—à¥री',en:'-45 degrees'},
 fmtRotNeg90:{np:'-९० à¤¡à¤¿à¤—à¥री',hi:'-90 à¤¡à¤¿à¤—à¥री',en:'-90 degrees'},
 fmtIndent:{np:'à¤‡à¤¨à¥à¤¡à¥‡à¤¨à¥ट',hi:'इंडेंट',en:'Indent'},
 fmtWrapText:{np:'पाठ à¤ªà¥à¤°à¤¤à¤¿à¤¬à¤¦à¥ध à¤—à¤°à¥à¤¨à¥à¤¹à¥‹à¤¸à¥',hi:'पाठ रैप करें',en:'Wrap text'},
 fmtReset:{np:'रिसेट',hi:'रीसेट',en:'Reset'},
 fmtOk:{np:'ठीक',hi:'ठीक है',en:'OK'},
 fmtCancel:{np:'à¤°à¤¦à¥द',hi:'à¤°à¤¦à¥द करें',en:'Cancel'}});
/* Self-boot: script.js never calls initDesignButtons, so wire it once the DOM is ready. */
if(typeof document!=='undefined'){const bootDesign=()=>{try{if(typeof initDesignButtons==='function')initDesignButtons();}catch(e){}try{if(typeof restoreDesignState==='function')restoreDesignState();}catch(e){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDesign);else bootDesign();}
