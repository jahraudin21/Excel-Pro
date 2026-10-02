'use strict';
/* ================= Account UI: titlebar account chip, auth dialogs, cloud saves =================
   Depends on: account.js (Account, CloudBooks), script.js ($, T, STR, applyLang, wb, sheet, saveLS). */

/* ---------- i18n ---------- */
Object.assign(STR,{
 signIn:{np:'साइन इन',hi:'साइन इन',en:'Sign in'},
 saveAsNewLabel:{np:'नयाँ रूपमा सेभ',hi:'नए रूप में सेव',en:'Save as new'},
 signUp:{np:'खाता खोलें',hi:'खाता खोलें',en:'Sign up'},
 signOut:{np:'साइन आउट',hi:'साइन आउट',en:'Sign out'},
 myAccount:{np:'मेरो खाता',hi:'मेरा खाता',en:'My account'},
 emailLabel:{np:'इमेल',hi:'ईमेल',en:'Email'},
 userName:{np:'नाम',hi:'नाम',en:'Name'},
 passwordLabel:{np:'पासवर्ड',hi:'पासवर्ड',en:'Password'},
 newPasswordField:{np:'नयाँ पासवर्ड',hi:'नया पासवर्ड',en:'New password'},
 currentPasswordLabel:{np:'हालको पासवर्ड',hi:'वर्तमान पासवर्ड',en:'Current password'},
 haveAccount:{np:'खाता छ? साइन इन',hi:'खाता है? साइन इन',en:'Have an account? Sign in'},
 noAccount:{np:'खाता छैन? खाता खोलें',hi:'खाता नहीं? खाता खोलें',en:'No account? Sign up'},
 cloudSaves:{np:'क्लाउड सेभ',hi:'क्लाउड सेव',en:'Cloud saves'},
 saveToCloud:{np:'क्लाउडमा सेभ गर्नुहोस्',hi:'क्लाउड में सेव करें',en:'Save to cloud'},
 openLabel:{np:'खोल्नुहोस्',hi:'खोलें',en:'Open'},
 renameLabel:{np:'नाम बदल्नुहोस्',hi:'नाम बदलें',en:'Rename'},
 deleteLabel:{np:'मेट्नुहोस्',hi:'हटाएँ',en:'Delete'},
 saveNow:{np:'अहिले सेभ',hi:'अभी सेव',en:'Save now'},
 updateLabel:{np:'अपडेट',hi:'अपडेट',en:'Update'},
 noSaves:{np:'कुनै क्लाउड सेभ छैन',hi:'कोई क्लाउड सेव नहीं',en:'No cloud saves yet'},
 profileTitle:{np:'प्रोफाइल',hi:'प्रोफ़ाइल',en:'Profile'},
 changePassword:{np:'पासवर्ड बदल्नुहोस्',hi:'पासवर्ड बदलें',en:'Change password'},
 savedToCloud:{np:'क्लाउडमा सेभ भयो',hi:'क्लाउड में सेव हो गया',en:'Saved to cloud'},
 updatedInCloud:{np:'क्लाउडमा अपडेट भयो',hi:'क्लाउड में अपडेट हो गया',en:'Updated in cloud'},
 openedFromCloud:{np:'क्लाउडबाट खोलियो',hi:'क्लाउड से खोला गया',en:'Opened from cloud'},
 deletedLabel:{np:'मेटियो',hi:'हटा दिया',en:'Deleted'},
 signedInAs:{np:'साइन इन भएको',hi:'साइन इन किया',en:'Signed in as'},
 welcomeMsg:{np:'स्वागत',hi:'स्वागत है',en:'Welcome'},
 signedOutMsg:{np:'साइन आउट भयो',hi:'साइन आउट हो गया',en:'Signed out'},
 profileSaved:{np:'प्रोफाइल अपडेट भयो',hi:'प्रोफ़ाइल अपडेट हो गया',en:'Profile updated'},
 passwordChanged:{np:'पासवर्ड बदलियो',hi:'पासवर्ड बदल गया',en:'Password changed'},
 openFromCloudFirst:{np:'पहिले क्लाउडबाट खोल्नुहोस्',hi:'पहले क्लाउड से खोलें',en:'Open from cloud first'},
 confirmDeleteSave:{np:'यो क्लाउड सेभ मेट्ने?',hi:'यह क्लाउड सेव हटाएँ?',en:'Delete this cloud save?'},
 errorMsg:{np:'त्रुटि',hi:'त्रुटि',en:'Error'},
  apiKeyTitle:{np:'API कुंजी',hi:'API कुंजी',en:'API key'},
  showLabel:{np:'देखाउनुहोस्',hi:'दिखाएँ',en:'Show'},
  regenerateLabel:{np:'नयाँ कुंजी बनाउनुहोस्',hi:'नया कुंजी बनाएँ',en:'Regenerate'},
  apiKeyHint:{np:'हर महिना स्वचालित रूपमा परिवर्तन हुन्छ। क्लाउड API पहुँचको लागि प्रयोग गर्नुहोस्।',hi:'हर महीने अपने आप बदलती है। क्लाउड API एक्सेस के लिए उपयोग करें।',en:'Auto-rotates every month. Use for cloud API access.'},
  apiKeyShowBtn:{np:'कुंजी देखाउनुहोस्',hi:'कुंजी दिखाएँ',en:'Show key'},
  hideApiKey:{np:'कुंजी छुपाउनुहोस्',hi:'कुंजी छुपाएँ',en:'Hide key'},
  copiedMsg:{np:'कॉपी गरियो',hi:'कॉपी किया',en:'Copied'}
});

/* ---------- error code -> i18n key ---------- */
const AUTH_ERR={invalidEmail:'invalidEmail',passwordTooShort:'passwordTooShort',fillAllFields:'fillAllFields',
 emailExists:'emailExists',noSuchUser:'noSuchUser',wrongPassword:'wrongPassword',signInRequired:'signInRequired',
 saveNotFound:'saveNotFound',googleSignInFailed:'googleSignInFailed',googleNoPasswordNote:'googleNoPasswordNote',
 driveSaveFailed:'driveSaveFailed',driveNeedConnect:'driveNeedConnect'};
Object.assign(STR,{
 invalidEmail:{np:'अमान्य इमेल',hi:'अमान्य ईमेल',en:'Invalid email'},
 passwordTooShort:{np:'पासवर्ड कम्तीमा ४ अक्षर',hi:'पासवर्ड कम से कम 4 अक्षर',en:'Password must be 4+ chars'},
 fillAllFields:{np:'सबै फिल्ड भर्नुहोस्',hi:'सभी फ़ील्ड भरें',en:'Fill in all fields'},
 emailExists:{np:'यो इमेल पहिले नै दर्ता छ',hi:'यह ईमेल पहले से पंजीकृत है',en:'Email already registered'},
 noSuchUser:{np:'खाता भेटिएन',hi:'खाता नहीं मिला',en:'Account not found'},
 wrongPassword:{np:'गलत पासवर्ड',hi:'गलत पासवर्ड',en:'Wrong password'},
 signInRequired:{np:'पहिले साइन इन गर्नुहोस्',hi:'पहले साइन इन करें',en:'Please sign in first'},
 saveNotFound:{np:'फेला परेन',hi:'नहीं मिला',en:'Not found'},
 backstageHint:{np:'स्प्रेडसिटहरू क्लाउडमा सिङ्क',hi:'स्प्रेडशीट क्लाउड में सिंक करें',en:'Sync spreadsheets to the cloud'},
  orLabel:{np:'वा',hi:'या',en:'or'},
  googleSignInFailed:{np:'Google साइन इन असफल भयो',hi:'Google साइन इन विफल रहा',en:'Google sign-in failed'},
  googleUnavailable:{np:'Google साइन इन अहिले उपलब्ध छैन',hi:'Google साइन इन अभी उपलब्ध नहीं है',en:'Google sign-in is unavailable right now'},
  googleNoPasswordNote:{np:'Google खाताको पासवर्ड Google बाट आउँछ',hi:'Google खाते का पासवर्ड Google से आते हैं',en:'Google accounts sign in with their Google password'},
  addressLabel:{np:'ठेगाना',hi:'पता',en:'Address'},
  addressSaved:{np:'ठेगाना सेभ भयो',hi:'पता सेव हो गया',en:'Address saved'},
  lastUpdated:{np:'अन्तिम अपडेट',hi:'अंतिम अपडेट',en:'Last updated'}
});

/* ---------- strings for the start screen + redesigned auth dialog ---------- */
Object.assign(STR,{
  gsignLabel:{np:'Google मा साइन इन गर्नुहोस्',hi:'Google से साइन इन करें',en:'Sign in with Google'},
  newAccountReset:{np:'नयाँ खाताका लागि स्प्रेडसिट खाली गरियो',hi:'नए खाते के लिए स्प्रेडशीट खाली कर दी गई',en:'Started a fresh sheet for the new account'}
});

/* ---------- auth dialog subtitle + storage preference picker ----------
   These are referenced from index.html via data-i18n; without a definition here
   T() falls through to the key name and the UI renders the raw "authSub". */
Object.assign(STR,{
  authSub:{np:'आफ्ना स्प्रेडसिट सबै यन्त्रमा पर्नुहोस्',hi:'अपनी स्प्रेडशीट हर उपकरण पर रखें',en:'Sync spreadsheets across devices'},
  storagePref:{np:'कहाँ सेभ गर्ने?',hi:'कहाँ सेव करें?',en:'Where to save'},
  storageBrowser:{np:'ब्राउजरमा',hi:'ब्राउज़र में',en:'In this browser'},
  storageCloud:{np:'मिनी क्लाउडमा',hi:'मिनी क्लाउड में',en:'In Mini Excel Cloud'},
  storageDrive:{np:'Google Driveमा',hi:'Google ड्राइव में',en:'In Google Drive'},
  connectDrive:{np:'Drive जोड्नुहोस्',hi:'ड्राइव कनेक्ट करें',en:'Connect Drive'}
});

/* ---------- Drive status strings used by the storage panel + status bar ----------
   paintDriveBtn()/saveCloudBook()/DriveBooks.connect() all feed these through T().
   Without them the status bar echoed the raw key ("driveConnected") instead of a
   message, and AUTH_ERR left a Drive save failure as the generic "Error". */
Object.assign(STR,{
  disconnectDrive:{np:'Drive विच्छेद गर्नुहोस्',hi:'ड्राइव डिस्कनेक्ट करें',en:'Disconnect Drive'},
  driveConnected:{np:'Google Drive जोडियो',hi:'Google Drive जुड़ गया',en:'Google Drive connected'},
  driveSaved:{np:'Google Drive मा सेभ भयो',hi:'Google Drive में सेव हो गया',en:'Saved to Google Drive'},
  driveSaveFailed:{np:'Google Drive मा सेभ गर्न सकिएन',hi:'Google Drive में सेव नहीं हो सका',en:'Could not save to Google Drive'},
  driveNeedConnect:{np:'पहिले Google Drive जोड्नुहोस्',hi:'पहले Google Drive कनेक्ट करें',en:'Connect Google Drive first'}
});

/* ---------- "Sign in with Google" button in the redesigned dialog ----------
   GOOGLE_SIGNIN.md promises the Google row stays hidden until a client id is
   configured, so #gsignBtn, the "or" divider and #googleRow start hidden here
   and are revealed by syncGoogleUi() only when Account.isGoogleConfigured() is
   true. That is what "enabled" means for this button: it is offered exactly
   when it can actually work. Previously it was always visible, so a click could
   only ever report "Google unavailable". */
function syncGoogleUi(){
 const cfg=(typeof Account!=='undefined'&&Account.isGoogleConfigured&&Account.isGoogleConfigured())?true:false;
 [['#gsignBtn',cfg],['.googleDivider',cfg],['#googleRow',cfg]].forEach(function(pair){
  const el=$(pair[0]);if(!el)return;
  el.style.display=pair[1]?'':'none';});
 return cfg;}
function gsignClick(){
 if(typeof Account==='undefined'||!Account.isGoogleConfigured||!Account.isGoogleConfigured()){
  showAuthError('googleUnavailable');return false;}
  /* GIS is already live, so a click acts immediately. */
  if(googleSignInReady)return googleOpenPrompt(true);
  /* The loader already gave up (see the tries>=40 branch of googleSignInInit):
     say so rather than silently waiting forever. */
  if(googleInitDone){showAuthError('googleUnavailable');return false;}
  /* Google Identity Services is loaded by an async <script>, so the first click
     can only record the intent; googleSignInInit()'s poll fulfils it the moment
     GIS is ready. This replaces the previous handler, which called
     googleSignInInit() -- a no-op after the boot-time call -- and returned, so
     the button silently did nothing for the rest of the session. */
  googlePromptPending=true;
  googleSignInInit();
  return true;
}
/* Reveal the official Google control and report whether it really rendered.
   GIS draws its own button into #googleBtn, and clicking *that* is what opens
   the OAuth consent popup. We cannot open it on the user's behalf:
     - a synthesised click on a cross-origin <iframe> is ignored outright, and
     - a popup may only be opened from a transient user gesture, which a
       setInterval callback (the googlePromptPending branch below) does not have.
   So the honest implementation makes the genuine control visible and lets the
   user click it, rather than pretending a programmatic click worked. */
function googleShowOfficialButton(){
 try{googleRenderButton();}catch(e){}
 const row=$('#googleRow');if(row)row.style.display='';
 try{
  const host=$('#googleBtn');if(!host||!host.querySelector)return false;
  /* FedCM mode renders div[role="button"]; the third-party-cookie fallback
     renders an <iframe>. Either way the user must click it themselves. */
  return !!host.querySelector('div[role="button"],iframe');
 }catch(e){return false;}
}
/* Surface the real Google affordance after a click on #gsignBtn.
   fromGesture=true only for a genuine click; the deferred post-load call passes
   false so it never attempts a gesture it does not have. */
function googleOpenPrompt(fromGesture){
 const drawn=googleShowOfficialButton();
 if(drawn)return true;
 /* The control is not in the DOM yet, so fall back to One Tap -- but only
    where a real click supplies the gesture that it requires. */
 if(fromGesture){
  try{
   if(typeof google!=='undefined'&&google.accounts&&google.accounts.id
    &&typeof google.accounts.id.prompt==='function'){google.accounts.id.prompt();return true;}
  }catch(e){}
 }
 showAuthError('googleUnavailable');
 return false;
}

/* ---------- clear grid + headers when the signed-in account changes ----------
   The workbook lives under a single global localStorage key, so without this a
   second account would inherit the previous account's cells and column headers.
   Only fires when the account id actually differs, so a returning user keeps
   their own sheet. */
const LAST_ACCOUNT_KEY='mx-last-account-v1';
function clearHeadersForNewAccount(user){
  try{
    if(!user||!user.id)return false;
    let prev=null;
    try{prev=localStorage.getItem(LAST_ACCOUNT_KEY);}catch(e){}
    if(prev===user.id)return false;
    try{localStorage.setItem(LAST_ACCOUNT_KEY,user.id);}catch(e){}

    if(typeof wb!=='undefined'){
      wb={cur:0,sheets:[{name:'Sheet1',cells:{}}]};
      /* Column widths are the header layout; reset them to the default. */
      if(typeof COLS!=='undefined'){
        colW=new Array(COLS).fill(88);
        wb.colW=colW;
      }
    }
    if(typeof hist!=='undefined')hist.length=0;
    if(typeof fut!=='undefined')fut.length=0;
    if(typeof vals!=='undefined')vals={};
    if(typeof cache!=='undefined')cache={};
    active=selA=selB='A1';

    if(typeof saveLS==='function')saveLS();
    if(typeof renderAll==='function')renderAll();
    if(typeof renderTabs==='function')renderTabs();
    if(typeof applyColW==='function')applyColW();
    if(typeof setBookName==='function')setBookName();
    if(typeof StartScreen!=='undefined'&&StartScreen&&StartScreen.rememberCurrent)StartScreen.rememberCurrent();
    if(typeof setStatusMode==='function')setStatusMode(T('newAccountReset'));
    return true;
  }catch(e){return false;}
}

/* ---------- account chip in the titlebar ---------- */
function paintAvatar(el,u,fb){if(!el)return;
 if(u&&u.picture){el.style.backgroundImage='url("'+u.picture+'")';
  el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.textContent='';}
 else{el.style.backgroundImage='';el.textContent=u?userInitial(u):(fb||'?');}}
function userInitial(u){const n=(u&&u.name)||'?';return n.trim().charAt(0).toUpperCase()||'?';}
function renderUserChip(){
 try{
  const chip=$("#userChip");if(!chip)return;
  const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
  chip.classList.toggle("signed-in",!!u);
  paintAvatar($("#userAvatar"),u,"👤");
  const nm=$("#userName");if(nm)nm.textContent=u?u.name:T("signIn");
  /* Second line of the pill: the account email, so the corner carries the full
     account identity instead of just a display name. */
  const ml=$("#userMail");if(ml)ml.textContent=u?(u.email||''):'';
  chip.title=u?((u.name||'')+(u.email?' · '+u.email:'')):"Account";
  chip.setAttribute("aria-label",u?((u.name||T("signIn"))+(u.email?' · '+u.email:'')):T("signIn"));
  /* Mirror the identity into the start screen's account block. */
  try{if(typeof StartScreen!=='undefined'&&StartScreen&&StartScreen.syncAccount)StartScreen.syncAccount();}catch(e){}
 }catch(e){}}

/* ---------- auth dialog ---------- */
function showAuthError(msg){const el=$('#formError');if(!el)return;
 el.textContent=msg?T(msg):'';el.style.display=msg?'block':'none';}
function authSwitchMode(mode){const d=$('#authDialog');if(!d)return;
 d.classList.toggle('mode-signup',mode==='signup');
 const t=$('#authTitle');if(t)t.textContent=T(mode==='signup'?'signUp':'signIn');
 const sub=$('#authSubmit');if(sub)sub.textContent=T(mode==='signup'?'signUp':'signIn');
 showAuthError('');}
function openAuthDialog(mode){const d=$('#authDialog');if(!d)return;
 try{
  const em0=$('#emailField');if(em0)em0.value='';const nm0=$('#nameField');if(nm0)nm0.value='';
  const p10=$('#passwordField');if(p10)p10.value='';const p20=$('#confirmPasswordField');if(p20)p20.value='';
 }catch(e){}
 d.classList.add('open');
 authSwitchMode(mode||'signin');
 try{const em=$('#emailField');if(em)setTimeout(()=>{try{em.focus();}catch(e){}},0);}catch(e){}
 try{if(typeof googleRenderButton==='function')googleRenderButton();}catch(e){}}
function closeAuthDialog(){const d=$('#authDialog');
 /* While the auth guard is locked the dialog is the only route into the app. */
 if(typeof AuthGuard!=='undefined'&&AuthGuard.canCloseAuthDialog&&!AuthGuard.canCloseAuthDialog())return;
 if(d)d.classList.remove('open');showAuthError('');}
/* Post-login redirect: dismiss the auth dialog AND the start screen, then put
   focus on the spreadsheet grid so the user lands straight in the workbook. */
function enterApp(){
 /* The guard has already reacted to the account change and unlocked the app,
    so the dialog is dismissible by the time we get here. */
 setTimeout(()=>{try{closeAuthDialog();}catch(e){}
  try{if(typeof StartScreen!=='undefined'&&StartScreen&&StartScreen.isOpen&&StartScreen.isOpen())
   StartScreen.close();}catch(e){}
  try{const g=document.getElementById('grid');if(g&&g.focus)g.focus();}catch(e){}},0);}
/* ---------- post-authentication transition ----------
   One funnel for every successful sign-in -- sign-up, password sign-in and
   Google Sign-In -- so the paths cannot drift apart: dismiss the dialog and the
   start screen, land in the workbook, refresh the account chrome, re-sync the
   storage UI, and hand a Google account to its Drive backend. */
function authTransition(){
 try{enterApp();}catch(e){}
 try{renderUserChip();}catch(e){}
 try{syncStorageUi();}catch(e){}
 const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
 try{setStatusMode(T('welcomeMsg')+(u&&u.name?', '+u.name:''));}catch(e){}
 driveConnectAfterAuth(u);
}
/* A Google account lands with storagePref 'drive' (Account.signInWithGoogle), but
   the ID token that proves its identity is not a Drive token. Without this the
   account looks connected while every cloud save quietly falls back to
   localStorage. connect() asks for the token silently (prompt:''), so a refused
   grant just leaves the "Connect Drive" affordance in place instead of opening a
   surprise consent popup on top of the sign-in that just finished. */
function driveConnectAfterAuth(u){
 try{
  if(!u||u.provider!=='google')return;
  if(typeof StorageBooks==='undefined'||StorageBooks.pref()!=='drive')return;
  if(typeof DriveBooks==='undefined'||!DriveBooks.isConfigured||!DriveBooks.isConfigured())return;
  if(DriveBooks.isConnected())return;
  DriveBooks.connect().then(res=>{
   try{if(res===true){setStatusMode(T('driveConnected'));syncStorageUi();}else paintDriveBtn();}catch(e){}
  }).catch(()=>{try{paintDriveBtn();}catch(e){}});
 }catch(e){}
}
function authSubmit(){
 const dlg=$('#authDialog');if(!dlg)return;
 const signup=dlg.classList.contains('mode-signup');
 const emEl=$('#emailField'),nmEl=$('#nameField'),p1El=$('#passwordField'),p2El=$('#confirmPasswordField');
 const email=emEl?emEl.value:'',name=nmEl?nmEl.value:'',
       p1=p1El?p1El.value:'',p2=p2El?p2El.value:'';
 if(signup&&p1!==p2){showAuthError('passwordTooShort');return;}
 (signup?Account.signUp(email,name,p1):Account.signIn(email,p1))
  .then(res=>{
   if(res===true)authTransition();
   else showAuthError(AUTH_ERR[res]||res);})
  .catch(()=>showAuthError('errorMsg'));}
function initAuthUi(){
 if(typeof Account==='undefined')return;
 const chip=$('#userChip');if(!chip)return;
 if(chip.dataset.userWired)return;chip.dataset.userWired='1';
 chip.onclick=()=>{try{const u=Account.currentUser();
  if(u)openProfilePanel();else openAuthDialog('signin');}catch(e){try{openAuthDialog('signin');}catch(e2){}}};
 /* auth dialog buttons */
 const sw=$('#authSwitchMode');if(sw)sw.onclick=()=>{const dg=$('#authDialog');authSwitchMode(dg&&dg.classList.contains('mode-signup')?'signin':'signup');};
 const close=$('#authClose');if(close)close.onclick=closeAuthDialog;
 const subBtn=$('#authSubmit');if(subBtn)subBtn.onclick=e=>{if(e&&e.preventDefault)e.preventDefault();authSubmit();};
 /* auth form submit */
 const form=$('#authForm');if(form){
  form.onsubmit=e=>{e.preventDefault();authSubmit();};
  [$('#emailField'),$('#nameField'),$('#passwordField'),$('#confirmPasswordField')].forEach(inp=>{
   if(inp)inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();authSubmit();}});});
 }
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;const dg=$('#authDialog');if(dg&&dg.classList.contains('open'))closeAuthDialog();});
 renderUserChip();syncGoogleUi();googleSignInInit();}

/* ---------- Google Sign-In (Google Identity Services) ---------- */
let googleSignInReady=false,googleInitDone=false,googleBtnDrawn=false,googlePromptPending=false;
function googleSignInLocale(){try{return (typeof LANG!=='undefined'&&LANG==='np')?'ne':((typeof LANG!=='undefined'&&LANG==='hi')?'hi':'en');}catch(e){return 'en';}}
function googleRenderButton(){
 if(!googleSignInReady||googleBtnDrawn)return;
 if(typeof Account==='undefined'||!Account.isGoogleConfigured||!Account.isGoogleConfigured())return;
 const host=$('#googleBtn');if(!host)return;
 try{google.accounts.id.renderButton(host,{theme:'outline',size:'medium',
 text:'signin_with',shape:'rectangular',locale:googleSignInLocale(),width:220});
  googleBtnDrawn=true;}
 catch(e){console.warn('[Mini Excel] Google button render failed:',e);
  showAuthError('googleUnavailable');}}
function googleCredentialHandler(resp){
 /* A credential arriving means the OAuth flow finished, so the click-time
    "waiting for GIS" flag has served its purpose. */
 googlePromptPending=false;
 if(!resp||!resp.credential){showAuthError('googleSignInFailed');return;}
 Account.signInWithGoogle(resp.credential)
  .then(res=>{
   if(res===true)authTransition();
   else showAuthError(AUTH_ERR[res]||res);})
  .catch(()=>showAuthError('googleSignInFailed'));}
function googleSignInError(err){
 if(err&&err.type==='popup_failed_to_open')showAuthError('googleUnavailable');
 else if(err&&err.type!=='popup_closed')showAuthError('googleSignInFailed');}
function googleSignInInit(){
 if(googleInitDone)return;
 try{
  if(typeof Account==='undefined'||!Account.isGoogleConfigured||!Account.isGoogleConfigured()){googleInitDone=true;return;}
 }catch(e){googleInitDone=true;return;}
 googleInitDone=true;
 let tries=0;
 const wait=setInterval(()=>{
  tries++;
  const g=window.google;
  if(g&&g.accounts&&g.accounts.id){
   clearInterval(wait);
   try{g.accounts.id.initialize({client_id:(typeof googleClientId==='function'?googleClientId():''),
     callback:(typeof googleCredentialHandler==='function'?googleCredentialHandler:function(){}),error_callback:(typeof googleSignInError==='function'?googleSignInError:function(){})});
    googleSignInReady=true;
    const row=$('#googleRow');if(row)row.style.display='';
    if($('#authDialog')&&$('#authDialog').classList.contains('open'))googleRenderButton();
    /* Fulfil a #gsignBtn click that arrived while GIS was still loading. */
    if(googlePromptPending){googlePromptPending=false;googleOpenPrompt(false);}}
   catch(e){console.warn('[Mini Excel] Google Sign-In init failed:',e);}
  }else if(tries>=40){clearInterval(wait);
   console.warn('[Mini Excel] Google Identity Services failed to load');
   if(googlePromptPending){googlePromptPending=false;showAuthError('googleUnavailable');}}
 },250);}

/* ---------- account panel (profile + cloud saves) ---------- */
function openProfilePanel(){const p=$('#profilePanel');if(!p)return;
 if(typeof Account==='undefined'||!Account.currentUser){openAuthDialog('signin');return;}
 const u=Account.currentUser();if(!u){openAuthDialog('signin');return;}
 paintAvatar($('#profileAvatar'),u,'?');
 const pn=$('#profileName');if(pn)pn.textContent=u.name||'';
 const pe=$('#profileEmail');if(pe)pe.textContent=u.email||'';
 {const pf=$('#passwordForm'),gn=$('#googlePasswordNote'),g=u.provider==='google'&&!u.hash;
  if(pf)pf.style.display=g?'none':'';if(gn)gn.style.display=g?'block':'none';}
 renderCloudList();p.classList.add('open');}
function closeProfilePanel(){const p=$('#profilePanel');if(p)p.classList.remove('open');}
function renderCloudList(){
 const wrap=$('#cloudList');if(!wrap)return;
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 if(typeof CloudBooks==='undefined'||!CloudBooks.list){wrap.innerHTML='';return;}
 wrap.innerHTML='';
 Store.list().then(arr=>{
  if(!arr.length){const d=document.createElement('div');d.className='cloudEmpty';
   d.textContent=T('noSaves');wrap.appendChild(d);return;}
  arr.forEach(b=>{
   const row=document.createElement('div');row.className='cloudRow';
   const info=document.createElement('div');info.className='cloudInfo';
   const nm=document.createElement('div');nm.className='cloudName';nm.textContent=b.name;
   const meta=document.createElement('div');meta.className='cloudMeta';
   meta.textContent=new Date(b.updated).toLocaleString();
   info.appendChild(nm);info.appendChild(meta);row.appendChild(info);
   const btns=document.createElement('div');btns.className='cloudBtns';
   const mk=(label,fn,cls)=>{const x=document.createElement('button');x.type='button';
    x.textContent=label;if(cls)x.className=cls;x.onclick=fn;btns.appendChild(x);return x;};
   mk(T('openLabel'),()=>openCloudBook(b.id));
   mk(T('renameLabel'),()=>renameCloudBook(b));
   mk('⬆',()=>saveCloudBook(b.id),'iconBtn');
   mk(T('deleteLabel'),()=>deleteCloudBook(b.id),'btnDanger');
   row.appendChild(btns);wrap.appendChild(row);});});}
function askSaveName(title,current){
 const v=prompt(title,current==null?'':current);return v===null?null:v.trim();}
function saveCloudBook(id){
 if(typeof Account==='undefined'||!Account.currentUser) {openAuthDialog('signin');return;}
 const u=Account.currentUser();if(!u){openAuthDialog('signin');return;}
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 if(typeof saveLS==='function')saveLS();
 const payload={sheets:wb.sheets,cur:wb.cur,colW:colW};
 const name=(wb.cloudName||sheet().name||'Book1');
 if(id){
  Store.update(id,name,payload,wb.cur).then(b=>{
   if(b&&b.id){wb.cloudId=b.id;wb.cloudName=b.name;saveLS();setBookName();
    setStatusMode(T(StorageBooks.pref()==='drive'?'driveSaved':'updatedInCloud'));renderCloudList();}
   else setStatusMode(T(AUTH_ERR[b]||'errorMsg'));});
 }else{
  Store.save(name,payload,wb.cur).then(b=>{
   if(b&&b.id){wb.cloudId=b.id;wb.cloudName=b.name;saveLS();setBookName();
    setStatusMode(T(StorageBooks.pref()==='drive'?'driveSaved':'savedToCloud'));renderCloudList();}
   else setStatusMode(T(AUTH_ERR[b]||'errorMsg'));});}}
function openCloudBook(id){
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 if(!Store||!Store.get){setStatusMode(T('errorMsg'));return;}
 Store.get(id).then(b=>{
  if(!b){setStatusMode(T('saveNotFound'));return;}
  wb.sheets=b.data.sheets;wb.cur=Math.min(b.cur||0,b.data.sheets.length-1);
  if(Array.isArray(b.data.colW)&&b.data.colW.length===COLS)colW=b.data.colW;
  wb.cloudId=b.id;wb.cloudName=b.name;
  hist=[];fut=[];active=selA=selB='A1';
  saveLS();buildGrid();renderAll();renderTabs();setBookName();
  closeProfilePanel();setStatusMode(T('openedFromCloud'));});}
function renameCloudBook(b){
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 if(!Store||!Store.update)return;
 const v=askSaveName(T('renameLabel'),b.name);if(v===null||!v)return;
 Store.update(b.id,v).then(()=>{if(wb&&wb.cloudId===b.id){wb.cloudName=v;saveLS();}
  renderCloudList();setStatusMode(T('updatedInCloud'));});}
function deleteCloudBook(id){
 if(!confirm(T('confirmDeleteSave')))return;
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 if(!Store||!Store.delete)return;
 Store.delete(id).then(()=>{
  if(wb&&wb.cloudId===id){wb.cloudId=null;wb.cloudName=null;saveLS();}
  renderCloudList();setStatusMode(T('deletedLabel'));});}
function showAccountPage(){
 if(typeof Account==='undefined')return;
 const box=$('#bsUserBox');const u=Account.currentUser();
 const set=(id,v)=>{const el=$(id);if(el)el.textContent=v==null?'':v;};
 set('#bsUserName',u?u.name:'');set('#bsUserEmail',u?u.email:'');
 if(box)box.style.display=u?'block':'none';
 const prof=$('#bsUserProfile');
 if(prof){prof.style.display=u?'flex':'none';
  if(u){paintAvatar($('#bsUserAvatar'),u,'?');
   set('#bsUserProfileName',u.name);set('#bsUserProfileEmail',u.email);
   set('#bsUserProfileAddr',u.address?u.address:'—');}}
 const rail=document.querySelector('.bsItem[data-bs-page="account"]');
 if(rail){rail.dataset.i18n=u?'myAccount':'signIn';rail.textContent=T(rail.dataset.i18n);}
 if(typeof CloudBooks==='undefined'||!CloudBooks.list)return;
 const Store=(typeof StorageBooks!=='undefined')?StorageBooks:CloudBooks;
 Store.list().then(arr=>{
  arr=arr||[];
  set('#bsUserBooks',String(arr.length));
  set('#bsUserUpdated',arr.length?new Date(Math.max.apply(null,arr.map(b=>b.updated||0))).toLocaleDateString():'—');
  const host=$('#bsUserList')||$('#cloudList');if(!host)return;
  host.innerHTML='';
  if(!u||!arr.length)return;
  arr.slice().sort((a,b2)=>b2.updated-a.updated).forEach(b=>{
   const row=document.createElement('div');row.className='cloudRow';
   const info=document.createElement('div');info.className='cloudInfo';
   const nm=document.createElement('div');nm.className='cloudName';nm.textContent=b.name;
   const mt=document.createElement('div');mt.className='cloudMeta';
   mt.textContent=new Date(b.updated).toLocaleString();info.appendChild(nm);info.appendChild(mt);
   const btns=document.createElement('div');btns.className='cloudBtns';
   const mk=(label,cls,fn)=>{const x=document.createElement('button');x.type='button';
    x.className=cls||'';x.textContent=label;x.onclick=fn;btns.appendChild(x);};
   mk(T('openLabel'),'',()=>openCloudBook(b.id));
   mk('⬆','iconBtn',()=>saveCloudBook(b.id));
   mk(T('deleteLabel'),'btnDanger',()=>deleteCloudBook(b.id));
   row.appendChild(info);row.appendChild(btns);host.appendChild(row);});});}
function paintDriveBtn(){
 try{
  const b=$('#driveConnectBtn');if(!b)return;
  const on=(typeof DriveBooks!=='undefined'&&DriveBooks.isConnected());
  b.textContent=T(on?'disconnectDrive':'connectDrive');
 }catch(e){}
}
/* ---------- storage preference UI sync ----------
   The preference is per-account state, so the radios and the backstage
   "Account / Storage / Cloud saves" rows have to follow the signed-in user
   rather than whatever was true at boot. Google accounts default to Drive, so
   without this the panel kept showing the previous account's choice, and the
   OneDrive page's info rows stayed at their placeholder "—/—/0" forever. */
function syncStorageUi(){
 try{
  const pref=(typeof StorageBooks!=='undefined')?StorageBooks.pref():'browser';
  document.querySelectorAll('input[name="storagePref"]').forEach(r=>{r.checked=(r.value===pref);});
  const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
  const set=(id,v)=>{const el=$('#'+id);if(el&&v!=null)el.textContent=v;};
  set('bsCloudUser',u?(u.email||u.name||''):'—');
  set('bsCloudPref',T(pref==='drive'?'storageDrive':(pref==='cloud'?'storageCloud':'storageBrowser')));
  paintDriveBtn();
  const Store=(typeof StorageBooks!=='undefined')?StorageBooks:(typeof CloudBooks!=='undefined'?CloudBooks:null);
  if(!u||!Store||!Store.list){set('bsCloudCount','0');return;}
  Store.list().then(arr=>set('bsCloudCount',String((arr||[]).length))).catch(()=>set('bsCloudCount','0'));
 }catch(e){}
}

/* ---------- Drive auto-save (debounced; only when Drive is the preference) ---------- */
let driveAutoT=null;
function scheduleDriveAutosave(){
 try{
  if(typeof StorageBooks==='undefined'||StorageBooks.pref()!=='drive')return;
  if(typeof DriveBooks==='undefined'||!DriveBooks.isConnected())return;
  if(typeof Account==='undefined'||!Account.currentUser())return;
  if(driveAutoT)clearTimeout(driveAutoT);
  driveAutoT=setTimeout(()=>{
   try{saveCloudBook((typeof wb!=='undefined'&&wb&&wb.cloudId)?wb.cloudId:null);}catch(e){}
  },2000);
 }catch(e){}
}
function initProfilePanel(){
 const p=$('#profilePanel');if(!p)return;
 if(p.dataset.userWired)return;if(typeof Account==='undefined')return;p.dataset.userWired='1';
 const on=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 on('#profileClose',closeProfilePanel);
 on('#saveCloudBtn',()=>{try{saveCloudBook((typeof wb!=='undefined'&&wb&&wb.cloudId)?wb.cloudId:null);}catch(e){}});
 on('#saveAsNewBtn',()=>{try{saveCloudBook(null);}catch(e){}});
 /* storage preference radios + Drive connect */
 try{
  const pref=(typeof StorageBooks!=='undefined')?StorageBooks.pref():'browser';
  document.querySelectorAll('input[name="storagePref"]').forEach(r=>{
   r.checked=(r.value===pref);
   r.onchange=()=>{
    const v=(document.querySelector('input[name="storagePref"]:checked')||{}).value||'browser';
    if(typeof StorageBooks!=='undefined')StorageBooks.setPref(v);
    if(v==='drive'&&typeof DriveBooks!=='undefined'&&!DriveBooks.isConnected()){
     DriveBooks.connect().then(res=>{
      if(res===true){setStatusMode(T('driveConnected'));renderCloudList();}
      else setStatusMode(T(typeof res==='string'?res:'driveNeedConnect'));
      paintDriveBtn();
     });
    }else{renderCloudList();paintDriveBtn();}
   };});
 }catch(e){}
 on('#driveConnectBtn',()=>{
  if(typeof DriveBooks==='undefined'){setStatusMode(T('driveNeedConnect'));return;}
  if(DriveBooks.isConnected()){DriveBooks.disconnect();setStatusMode(T('signedOutMsg'));paintDriveBtn();renderCloudList();return;}
  DriveBooks.connect().then(res=>{
   if(res===true){setStatusMode(T('driveConnected'));renderCloudList();}
   else setStatusMode(T(typeof res==='string'?res:'driveNeedConnect'));
   paintDriveBtn();
  });
 });
 paintDriveBtn();
 const card=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
 card('#bsUserOpen',()=>{if(Account.currentUser())showAccountPage();else openAuthDialog('signin');});
 card('#bsUserCloudOpen',()=>{renderCloudList();showAccountPage();});
 card('#bsUserSave',()=>{try{saveCloudBook((typeof wb!=='undefined'&&wb&&wb.cloudId)?wb.cloudId:null);}catch(e){}});
 card('#bsUserSignOut',()=>{Account.signOut();renderUserChip();showAccountPage();setStatusMode(T('signedOutMsg'));});
 Account.onChange(()=>{renderUserChip();showAccountPage();clearHeadersForNewAccount(Account.currentUser());syncStorageUi();});
 on('#profileSave',()=>{
  const ne=$('#profileNameField');const v=ne?ne.value:'';
  if(!Account.updateName)return;
  Account.updateName(v).then(ok=>{
   if(ok){renderUserChip();const pn=$('#profileName');if(pn)pn.textContent=v;
    setStatusMode(T('profileSaved'));if(ne)ne.value='';}});});
 /* profile: address save (input exists in index.html but had no handler, so the
    profile/address section appeared unresponsive) */
 on('#profileAddressSave',()=>{
  const ae=$('#profileAddressField');const v=ae?ae.value:'';
  if(!Account.updateAddress)return;
  Account.updateAddress(v).then(ok=>{
   if(ok){renderUserChip();showAccountPage();
    setStatusMode(T('addressSaved'));if(ae)ae.value='';}});});
 /* password change form submit */
  const passForm=$('#passwordForm');
  if(passForm){
   passForm.onsubmit=e=>{e.preventDefault();doChangePassword();};
  }
  function doChangePassword(){
  const oEl=$('#currentPasswordField'),nEl=$('#newPasswordField');
  Account.changePassword(oEl?oEl.value:'',nEl?nEl.value:'')
   .then(res=>{
    if(res===true){if(oEl)oEl.value='';if(nEl)nEl.value='';
     setStatusMode(T('passwordChanged'));}
    else{setStatusMode(T(AUTH_ERR[res]||'errorMsg'));}})
   .catch(()=>{setStatusMode(T('errorMsg'));});
   }
   /* #passwordSave is type=submit inside #passwordForm: the form onsubmit above handles it (a click handler here would run the change twice). */
 
  /* API key handlers */
  const apiKeyInput=$('#apiKeyField');
  let _akShown=false;
  function _showAk(s){if(!apiKeyInput)return;const k=Account.getApiKey();if(k){apiKeyInput.value=s?k:'●'.repeat(16);apiKeyInput.title=s?k:'';}else{apiKeyInput.value='';apiKeyInput.title='';}}
  on('#apiKeyShowBtn',()=>{_showAk(!_akShown);_akShown=!_akShown;});
  on('#apiKeyRegenBtn',()=>{if(!Account.currentUser()){setStatusMode(T('signInRequired'));return;}Account.regenerateApiKey().then(k=>{if(k){_akShown=true;_showAk(true);setStatusMode(T('copiedMsg'));}else setStatusMode(T('errorMsg'));}).catch(()=>setStatusMode(T('errorMsg')));});
  /* Reset the field to its masked placeholder on every account change. Asking
     Account.getApiKey() here used to *create* a monthly key as a side effect, so
     merely signing in persisted an API key the user had never opened. */
  Account.onChange(()=>{if(apiKeyInput){apiKeyInput.value='●'.repeat(16);apiKeyInput.title='';}_akShown=false;});
  on('#signOut',()=>{
  Account.signOut();closeProfilePanel();renderUserChip();
  if(typeof DriveBooks!=='undefined')DriveBooks.disconnect();
  try{if(typeof wb!=='undefined'&&wb){wb.cloudId=null;wb.cloudName=null;}if(typeof saveLS==='function')saveLS();if(typeof setBookName==='function')setBookName();}catch(e){}
  setStatusMode(T('signedOutMsg'));paintDriveBtn();});
 Account.onChange(()=>renderUserChip());
 syncStorageUi();}

/* ---------- boot (called from script.js init, after DOM ready) ---------- */
let accountUiBooted=false;
function initAllAccountUI(){if(accountUiBooted)return;accountUiBooted=true;try{initAuthUi();}catch(e){}try{initProfilePanel();}catch(e){}/* StartScreen is defined by an earlier deferred script. The readyState check
   above runs while deferred scripts execute, which the HTML spec puts at
   "interactive", so this boots before later scripts are evaluated. */
try{if(typeof StartScreen!=='undefined')StartScreen.init();}catch(e){}try{if(typeof RibbonDisplay!=='undefined'){RibbonDisplay.init();setTimeout(function(){try{RibbonDisplay.apply();}catch(e){}},0);}}catch(e){}try{on('#gsignBtn',()=>gsignClick());}catch(e){}try{on('#ssOpen',()=>StartScreen.open());}catch(e){}
 /* Excel opens on the start screen every launch. Deferred a tick so the grid
    and the auth guard have finished their own boot first; when nobody is
    signed in the auth dialog is raised on top of it so "Sign in with Google"
    is the first actionable thing on screen. */
 setTimeout(()=>{try{
   if(typeof StartScreen!=='undefined'&&StartScreen&&StartScreen.open)StartScreen.open();
   const authed=(typeof Account!=='undefined'&&Account.currentUser&&Account.currentUser())?true:false;
   if(!authed&&typeof openAuthDialog==='function')openAuthDialog('signin');
  }catch(e){}},0);}
/* Self-boot: with <script defer>, script.js runs init() BEFORE this file defines
   initAllAccountUI, so script.js's `typeof initAllAccountUI==='function'` guard is false
   and the account UI would never initialise. Booting here (DOM is parsed by now)
   guarantees the chip / dialog / panel get wired exactly once. */
if(typeof document!=='undefined'){const bootAccountUi=()=>{try{initAllAccountUI();}catch(e){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAccountUi);else bootAccountUi();}
