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
 saveNotFound:'saveNotFound',googleSignInFailed:'googleSignInFailed',googleNoPasswordNote:'googleNoPasswordNote'};
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
  chip.title=u?u.email:"Account";
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
function closeAuthDialog(){const d=$('#authDialog');if(d)d.classList.remove('open');showAuthError('');}
function authSubmit(){
 const dlg=$('#authDialog');if(!dlg)return;
 const signup=dlg.classList.contains('mode-signup');
 const emEl=$('#emailField'),nmEl=$('#nameField'),p1El=$('#passwordField'),p2El=$('#confirmPasswordField');
 const email=emEl?emEl.value:'',name=nmEl?nmEl.value:'',
       p1=p1El?p1El.value:'',p2=p2El?p2El.value:'';
 if(signup&&p1!==p2){showAuthError('passwordTooShort');return;}
 (signup?Account.signUp(email,name,p1):Account.signIn(email,p1))
  .then(res=>{
   if(res===true){closeAuthDialog();const u=Account.currentUser();
    setStatusMode(T('welcomeMsg')+(u&&u.name?', '+u.name:''));}
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
 renderUserChip();googleSignInInit();}

/* ---------- Google Sign-In (Google Identity Services) ---------- */
let googleSignInReady=false,googleInitDone=false,googleBtnDrawn=false;
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
 if(!resp||!resp.credential){showAuthError('googleSignInFailed');return;}
 Account.signInWithGoogle(resp.credential)
  .then(res=>{
   if(res===true){closeAuthDialog();renderUserChip();
    const u=Account.currentUser();
    setStatusMode(T('welcomeMsg')+(u&&u.name?', '+u.name:''));}
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
    if($('#authDialog')&&$('#authDialog').classList.contains('open'))googleRenderButton();}
   catch(e){console.warn('[Mini Excel] Google Sign-In init failed:',e);}
  }else if(tries>=40){clearInterval(wait);
   console.warn('[Mini Excel] Google Identity Services failed to load');}
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
 Account.onChange(()=>{renderUserChip();showAccountPage();});
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
  Account.onChange(()=>{if(apiKeyInput){const k=Account.currentUser()?Account.getApiKey():null;apiKeyInput.value=k?'●'.repeat(16):'●'.repeat(16);apiKeyInput.title=k||'';}});
  on('#signOut',()=>{
  Account.signOut();closeProfilePanel();renderUserChip();
  if(typeof DriveBooks!=='undefined')DriveBooks.disconnect();
  try{if(typeof wb!=='undefined'&&wb){wb.cloudId=null;wb.cloudName=null;}if(typeof saveLS==='function')saveLS();if(typeof setBookName==='function')setBookName();}catch(e){}
  setStatusMode(T('signedOutMsg'));paintDriveBtn();});
 Account.onChange(()=>renderUserChip());}

/* ---------- boot (called from script.js init, after DOM ready) ---------- */
let accountUiBooted=false;
function initAllAccountUI(){if(accountUiBooted)return;accountUiBooted=true;try{initAuthUi();}catch(e){}try{initProfilePanel();}catch(e){}}
/* Self-boot: with <script defer>, script.js runs init() BEFORE this file defines
   initAllAccountUI, so script.js's `typeof initAllAccountUI==='function'` guard is false
   and the account UI would never initialise. Booting here (DOM is parsed by now)
   guarantees the chip / dialog / panel get wired exactly once. */
if(typeof document!=='undefined'){const bootAccountUi=()=>{try{initAllAccountUI();}catch(e){}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootAccountUi);else bootAccountUi();}