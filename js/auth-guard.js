'use strict';
/* ================= Authentication guard =================
   Requires a registered user before any app feature can be used.

   - On boot, if there is no session, the app is veiled by #authLock and every
     interactive surface is made inert (pointer-events:none via body.auth-locked).
   - Guard actions are queued: if a feature is triggered while locked, it is
     remembered and replayed once sign-in/sign-up succeeds.
   - The dialog cannot be dismissed with ✕ / Escape while locked, so there is
     always a path back into the app.

   Depends on: account.js (Account), account-ui.js (openAuthDialog, renderUserChip),
   script.js ($, T, STR, setStatusMode). */

Object.assign(STR, {
  lockTitle:{np:'खाता खोल्नुहोस्',hi:'खाता खोलें',en:'Registration required'},
  lockBody:{np:'साम्प्रदायिक गणित, चार्ट र क्लाउड सेभ प्रयोग गर्न नयाँ खाता खोल्नुहोस्।',hi:'फ़ॉर्मूला, चार्ट और क्लाउड सेव इस्तेमाल करने के लिए नया खाता बनाएँ।',en:'Create a free account to unlock formulas, charts and cloud saves.'},
  lockCta:{np:'खाता खोल्नुहोस्',hi:'खाता बनाएँ',en:'Create account'},
  lockAlt:{np:'पहिले नै खाता छ? साइन इन',hi:'पहले से खाता है? साइन इन करें',en:'Already registered? Sign in'},
  lockedMsg:{np:'पहिले खाता खोल्नुहोस्',hi:'पहले खाता बनाएँ',en:'Please create an account first'}
});

/* script.js runs init() -> applyLang() while it is still parsing (it is the
   earlier defer script), i.e. BEFORE these keys existed, so T() fell back to
   the raw key name and stamped "lockTitle" into the card. Re-apply just the
   lock card's own data-i18n nodes instead of the global applyLang(), which
   would needlessly re-render the whole grid. Later language switches go
   through applyLang() normally and pick these keys up. */
function applyLockI18n(){
 const root=$('#authLock');if(!root||typeof T!=='function')return;
 try{
  root.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=T(el.dataset.i18n);});
  root.querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=T(el.dataset.i18nPh);});
  root.querySelectorAll('[data-i18n-t]').forEach(el=>{el.title=T(el.dataset.i18nT);});
 }catch(e){}
}

const AuthGuard={
  locked:false,
  _queue:[],
  _wired:false,

  /* Is somebody actually registered and signed in? */
 isAuthed(){
  try{
   if(typeof Account==='undefined'||!Account.currentUser)return false;
   return !!Account.currentUser();
  }catch(e){return false;}
 },

  /* Core gate.
     When a user IS registered: run the action immediately and return true, so a
     call site stays a single expression -- on('#bCharts',()=>requireAuth(chart)).
     When nobody is registered: lock the app, remember the action, and return
     false. unlock() replays it once the user signs in or signs up. */
  require(action){
   if(this.isAuthed()){
    if(typeof action==='function')action();
    return true;
   }
   this.lock();
  if(typeof action==='function'&&this._queue.indexOf(action)<0)this._queue.push(action);
  try{if(typeof setStatusMode==='function')setStatusMode(T('lockedMsg'));}catch(e){}
  return false;
 },

 lock(){
  this.locked=true;
  document.body.classList.add('auth-locked');
  const veil=$('#authLock');if(veil)veil.classList.add('open');
 },

 unlock(){
  this.locked=false;
  document.body.classList.remove('auth-locked');
  const veil=$('#authLock');if(veil)veil.classList.remove('open');
  /* Replay whatever the user tried to do before registering. */
  const q=this._queue;this._queue=[];
  q.forEach(fn=>{try{fn();}catch(e){}});
 },

 sync(){if(this.isAuthed())this.unlock();else this.lock();},

 /* The auth card is the only way out while locked, so hide the dismiss
    affordances and ignore Escape. */
 canCloseAuthDialog(){return !this.locked;},

 init(){
  if(this._wired)return;this._wired=true;

  const cta=$('#authLockCta');if(cta)cta.onclick=()=>{try{openAuthDialog('signup');}catch(e){}};
  const alt=$('#authLockSignIn');if(alt)alt.onclick=()=>{try{openAuthDialog('signin');}catch(e){}};

  /* Account emits on sign-in, sign-up and sign-out. */
  try{Account.onChange(()=>{renderUserChip();this.sync();});}catch(e){}

  /* Belt and braces: swallow clicks on the app surface while locked. */
  document.addEventListener('click',e=>{
   if(!this.locked)return;
   if(e.target.closest('#authLock')||e.target.closest('#authDialog')||e.target.closest('#userChip'))return;
   /* The start screen is the launch surface and carries its own sign-in
      affordance, so it stays interactive even while the app is locked. */
   if(e.target.closest('#startScreen'))return;
   e.preventDefault();e.stopPropagation();
  },true);

  document.addEventListener('keydown',e=>{
   if(!this.locked)return;
   if(e.key==='Tab')return;/* keep focus cycling inside the dialog */
   if(e.target.closest&&e.target.closest('#authDialog'))return;
  /* stopPropagation, not just preventDefault: script.js binds its shortcuts on
     document in the bubble phase, so without this the app still reacts to
     Ctrl+Z / Ctrl+S / arrow keys etc. while locked. */
  e.preventDefault();e.stopPropagation();
  },true);

 applyLockI18n();
  this.sync();
 }
};

/* Convenience wrappers used by the rest of the app. */
function requireAuth(action){return AuthGuard.require(action);}
function isAuthed(){return AuthGuard.isAuthed();}

if(typeof document!=='undefined'){
 const boot=()=>{try{AuthGuard.init();}catch(e){console.warn('[Mini Excel] Auth guard init failed:',e);}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}