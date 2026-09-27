'use strict';
/* ================= Ribbon Display Options (Excel parity) =================
   Excel's ribbon can be shown three ways, chosen from the chevron at the right
   end of the tab strip:
     auto - Auto-hide the Ribbon: commands hidden until a tab is clicked.
     tabs - Show Tabs Only: commands stay hidden.
     full - Show Tabs and Commands: the classic always-expanded ribbon.
   The choice persists across restarts and Ctrl+F1 cycles it, like Excel.
   Depends on: $, T, toggleRibbon (script.js). */

Object.assign(STR, {
  ribbonDisplay:{np:'रिबन डिस्प्ले विकल्प',hi:'रिबन प्रदर्शन विकल्प',en:'Ribbon Display Options'},
  rdAuto:{np:'रिबन स्वतः लुकाउनुहोस्',hi:'रिबन स्वतः छिपाएँ',en:'Auto-hide the Ribbon'},
  rdTabs:{np:'मात्र ट्याबहरू देखाउनुहोस्',hi:'केवल टैब दिखाएँ',en:'Show Tabs Only'},
  rdFull:{np:'ट्याब र कमाण्डहरू देखाउनुहोस्',hi:'टैब और कमांड दिखाएँ',en:'Show Tabs and Commands'},
  rdCollapse:{np:'रिबन मिलाउनुहोस् (Ctrl+F1)',hi:'रिबन नीचे लाएँ (Ctrl+F1)',en:'Collapse the Ribbon (Ctrl+F1)'},
  rdExpand:{np:'रिबन फैलाउनुहोस् (Ctrl+F1)',hi:'रिबन फैलाएँ (Ctrl+F1)',en:'Expand the Ribbon (Ctrl+F1)'}
});

const RibbonDisplay=(function(){
  const KEY='mx-ribbon-display-v1';
  const MODES=['auto','tabs','full'];
  let mode='full';
  let temporarilyExpanded=false;

  function ribbonEl(){return document.querySelector('.ribbon');}

  function readMode(){
    try{const v=localStorage.getItem(KEY);return MODES.indexOf(v)>=0?v:'full';}catch(e){return 'full';}
  }
  function saveMode(){try{localStorage.setItem(KEY,mode);}catch(e){}}

  /* Commands show only in full mode, or in auto mode while temporarily
     expanded. "tabs" never shows them. */
  function isBodyVisible(){
    if(mode==='full')return true;
    if(mode==='tabs')return false;
    return temporarilyExpanded;
  }

  function apply(){
    const rb=ribbonEl();
    if(!rb)return;
    rb.classList.remove('rd-auto','rd-tabs','rd-full');
    rb.classList.add('rd-'+mode);
    /* `min` is the pre-existing two-state class; keep it in sync so the old
       toggleRibbon() and its styling keep working unchanged. */
    rb.classList.toggle('min',!isBodyVisible());
    rb.setAttribute('data-rd-mode',mode);
    syncButton();
    syncMenu();
  }

  function syncButton(){
    const btn=document.getElementById('ribbonDispBtn');
    if(!btn)return;
    try{
      const t=(typeof T==='function')?T(isBodyVisible()?'rdCollapse':'rdExpand'):'Ribbon Display Options';
      btn.title=t;
      btn.setAttribute('aria-label',(typeof T==='function')?T('ribbonDisplay'):'Ribbon Display Options');
    }catch(e){}
  }

  function syncMenu(){
    const menu=document.getElementById('ribbonDispMenu');
    if(!menu)return;
    Array.prototype.forEach.call(menu.querySelectorAll('[data-rd]'),function(item){
      const on=item.dataset.rd===mode;
      item.classList.toggle('on',on);
      item.setAttribute('aria-checked',on?'true':'false');
      item.setAttribute('role','menuitemradio');
    });
  }
  function setMode(next,fromUser){
    if(MODES.indexOf(next)<0)next='full';
    mode=next;
    temporarilyExpanded=false;
    saveMode();
    apply();
    if(fromUser)closeMenu();
  }

  /* Ctrl+F1 cycles Auto-hide -> Tabs Only -> Full, matching Excel. */
  function cycle(){
    const i=MODES.indexOf(mode);
    setMode(MODES[(i+1)%MODES.length],false);
  }

  function expandTemporarily(){
    if(mode!=='auto')return;
    temporarilyExpanded=true;
    apply();
  }
  function collapseTemporary(){
    if(mode!=='auto'||!temporarilyExpanded)return;
    temporarilyExpanded=false;
    apply();
  }

  function openMenu(){
    const m=document.getElementById('ribbonDispMenu');
    const b=document.getElementById('ribbonDispBtn');
    if(!m)return;
    syncMenu();
    m.classList.add('open');
    if(b)b.setAttribute('aria-expanded','true');
  }
  function closeMenu(){
    const m=document.getElementById('ribbonDispMenu');
    const b=document.getElementById('ribbonDispBtn');
    if(!m)return;
    m.classList.remove('open');
    if(b)b.setAttribute('aria-expanded','false');
  }
  function toggleMenu(){
    const m=document.getElementById('ribbonDispMenu');
    if(m&&m.classList.contains('open'))closeMenu();else openMenu();
  }

  function wire(){
    const btn=document.getElementById('ribbonDispBtn');
    if(btn)btn.addEventListener('click',function(e){e.stopPropagation();toggleMenu();});

    const menu=document.getElementById('ribbonDispMenu');
    if(menu){
      menu.addEventListener('click',function(e){
        const item=e.target.closest('[data-rd]');
        if(item){setMode(item.dataset.rd,true);return;}
        if(e.target.closest('[data-rd-close]'))closeMenu();
      });
    }

    /* Clicking outside closes the menu. */
    document.addEventListener('click',function(e){
      const m=document.getElementById('ribbonDispMenu');
      if(!m||!m.classList.contains('open'))return;
      if(e.target.closest&&(e.target.closest('#ribbonDispMenu')||e.target.closest('#ribbonDispBtn')))return;
      closeMenu();
    });

    /* In auto-hide mode, clicking a ribbon tab reveals the commands. */
    Array.prototype.forEach.call(document.querySelectorAll('.rtab'),function(t){
      t.addEventListener('click',function(){if(mode==='auto')expandTemporarily();});
    });

    /* Escape collapses a temporarily expanded auto-hide ribbon. */
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){closeMenu();collapseTemporary();}
    });

    /* Clicking back into the grid hides the temporary ribbon again. */
    const grid=document.getElementById('grid');
    if(grid)grid.addEventListener('mousedown',function(){collapseTemporary();});

    /* Ctrl+F1 cycles the display modes. */
    document.addEventListener('keydown',function(e){
      if(e.key==='F1'&&e.ctrlKey){e.preventDefault();cycle();}
    });

    /* The legacy chevron (#ribbonMin) flips between full and tabs. */
    const legacy=document.getElementById('ribbonMin');
    if(legacy){
      legacy.addEventListener('click',function(e){
        e.stopPropagation();
        if(typeof toggleRibbon==='function'&&mode==='full'){toggleRibbon();setMode('tabs',false);}
        else setMode('full',false);
      });
    }
  }

  function init(){
    mode=readMode();
    apply();
    wire();
  }

  return {init:init,setMode:setMode,cycle:cycle,apply:apply,
          getMode:function(){return mode;},
          openMenu:openMenu,closeMenu:closeMenu,
          isBodyVisible:isBodyVisible};
})();

