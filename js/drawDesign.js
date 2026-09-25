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
/* Self-boot: script.js never calls initDesignButtons, so wire it once the DOM is ready. */
if(typeof document!=='undefined'){const bootDesign=()=>{try{if(typeof initDesignButtons==='function')initDesignButtons();}catch(e){}try{if(typeof restoreDesignState==='function')restoreDesignState();}catch(e){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDesign);else bootDesign();}
