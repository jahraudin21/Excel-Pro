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
if(typeof STR!=='undefined')Object.assign(STR,{designReset:{np:'डिजाइन रिसेट',hi:'डिज़ाइन रीसेट',en:'Design reset'},paletteApplied:{np:'प्यालेट लागू',hi:'पैलेट लागू',en:'Palette applied'},styleApplied:{np:'स्टाइल लागू',hi:'स्टाइल लागू',en:'Style applied'}});
/* ---------- Format Cells dialog (index.html fmtDlg) ---------- */
if(typeof STR!=='undefined')Object.assign(STR,{
 fmtTitle:{np:'सेल ढाँचा',hi:'सेल प्रारूप',en:'Format Cells'},
 tipFmtCells:{np:'सेल ढाँचा (Ctrl+1)',hi:'सेल प्रारूप (Ctrl+1)',en:'Format Cells (Ctrl+1)'},
 fmtTabFont:{np:'फन्ट',hi:'फ़ॉन्ट',en:'Font'},
 fmtTabFill:{np:'भराइ',hi:'भराई',en:'Fill'},
 fmtTabBorder:{np:'बोर्डर',hi:'बॉर्डर',en:'Border'},
 fmtTabAlign:{np:'संरेखण',hi:'संरेखण',en:'Alignment'},
 fmtFontName:{np:'फन्ट',hi:'फ़ॉन्ट',en:'Font'},
 fmtFontSize:{np:'फन्ट आकार',hi:'फ़ॉन्ट आकार',en:'Font size'},
 fmtFontStyle:{np:'फन्ट शैली',hi:'फ़ॉन्ट शैली',en:'Font style'},
 fmtStyleNormal:{np:'सामान्य',hi:'सामान्य',en:'Normal'},
 fmtStyleItalic:{np:'इटालिक',hi:'इटैलिक',en:'Italic'},
 fmtStyleBold:{np:'बोल्ड',hi:'बोल्ड',en:'Bold'},
 fmtStyleBoldItalic:{np:'बोल्ड इटालिक',hi:'बोल्ड इटैलिक',en:'Bold Italic'},
 fmtUnderline:{np:'रेखांकन',hi:'रेखांकन',en:'Underline'},
 fmtNone:{np:'कुनै छैन',hi:'कोई नहीं',en:'None'},
 fmtUSingle:{np:'एकल',hi:'एकहरी',en:'Single'},
 fmtUDouble:{np:'दोहरो',hi:'दोहरी',en:'Double'},
 fmtColor:{np:'रङ',hi:'रंग',en:'Color'},
 fmtColorPick:{np:'स्वतः',hi:'स्वतः',en:'Automatic'},
 fmtStrike:{np:'मध्यरेखा',hi:'मध्यरेखा',en:'Strikethrough'},
 fmtSampleTxt:{np:'नमुना',hi:'नमूना',en:'Sample'},
 fmtBgColor:{np:'पृष्ठभूमि रङ',hi:'पृष्ठभूमि रंग',en:'Background color'},
 fmtBgPick:{np:'रङ छान्नुहोस्',hi:'रंग चुनें',en:'Choose a color'},
 fmtNoFill:{np:'भराइ छैन',hi:'कोई भराई नहीं',en:'No fill'},
 fmtLineStyle:{np:'रेखा शैली',hi:'रेखा शैली',en:'Line style'},
 fmtLineNone:{np:'कुनै छैन',hi:'कोई नहीं',en:'None'},
 fmtLineThin:{np:'पातलो',hi:'पतली',en:'Thin'},
 fmtLineMedium:{np:'मध्यम',hi:'मध्यम',en:'Medium'},
 fmtLineThick:{np:'बाक्लो',hi:'मोटी',en:'Thick'},
 fmtBorderColor:{np:'रङ',hi:'रंग',en:'Color'},
 fmtBorderAll:{np:'चारै किनारामा लागू',hi:'चारों किनारों पर लागू',en:'Apply to all four sides'},
 fmtHAlign:{np:'तिरो',hi:'क्षैतिज',en:'Horizontal'},
 fmtHGeneral:{np:'सामान्य',hi:'सामान्य',en:'General'},
 fmtHLeft:{np:'बायाँ',hi:'बायाँ',en:'Left'},
 fmtHCenter:{np:'बीच',hi:'बीच',en:'Center'},
 fmtHRight:{np:'दायाँ',hi:'दायाँ',en:'Right'},
 fmtVAlign:{np:'खडा',hi:'लंबवत',en:'Vertical'},
 fmtVTop:{np:'माथि',hi:'ऊपर',en:'Top'},
 fmtVMiddle:{np:'बीचमा',hi:'बीच में',en:'Middle'},
 fmtVBottom:{np:'तल',hi:'नीचे',en:'Bottom'},
 fmtRotate:{np:'पाठ घुमाउन',hi:'पाठ घुमाएँ',en:'Text rotation'},
 fmtRot0:{np:'० डिग्री',hi:'0 डिग्री',en:'0 degrees'},
 fmtRot45:{np:'४५ डिग्री',hi:'45 डिग्री',en:'45 degrees'},
 fmtRot90:{np:'९० डिग्री',hi:'90 डिग्री',en:'90 degrees'},
 fmtRotNeg45:{np:'-४५ डिग्री',hi:'-45 डिग्री',en:'-45 degrees'},
 fmtRotNeg90:{np:'-९० डिग्री',hi:'-90 डिग्री',en:'-90 degrees'},
 fmtIndent:{np:'इन्डेन्ट',hi:'इंडेंट',en:'Indent'},
 fmtWrapText:{np:'पाठ प्रतिबद्ध गर्नुहोस्',hi:'पाठ रैप करें',en:'Wrap text'},
 fmtReset:{np:'रिसेट',hi:'रीसेट',en:'Reset'},
 fmtOk:{np:'ठीक',hi:'ठीक है',en:'OK'},
 fmtCancel:{np:'रद्द',hi:'रद्द करें',en:'Cancel'}});
/* Self-boot: script.js never calls initDesignButtons, so wire it once the DOM is ready. */
if(typeof document!=='undefined'){const bootDesign=()=>{try{if(typeof initDesignButtons==='function')initDesignButtons();}catch(e){}try{if(typeof restoreDesignState==='function')restoreDesignState();}catch(e){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDesign);else bootDesign();}
