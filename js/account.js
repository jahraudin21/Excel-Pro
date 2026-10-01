'use strict';
/* ================= Account system + cloud workbook storage =================
   Local demo provider: accounts & cloud workbooks live in localStorage,
   namespaced per user. Passwords are salted + SHA-256 hashed (SubtleCrypto,
   with a fallback hash for non-secure contexts). The API is promise-based so
   the provider can later be swapped for Firebase/Supabase without touching
   the UI code in script.js. */
const APP_USERS_KEY='mx-users-v1';
const APP_SESSION_KEY='mx-session-v1';
const APP_BOOKS_KEY=u=>'mx-cloud-books-'+u;
const APP_AUTH_SALT='mx.v1';

function readStoredJSON(key,fb){try{const v=JSON.parse(localStorage.getItem(key));return v==null?fb:v;}catch(e){return fb;}}
function writeStoredJSON(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}
function hashPassword(salt,pass){
 const data=salt+':'+pass;
 if(typeof crypto!=='undefined'&&crypto.subtle&&crypto.subtle.digest&&typeof TextEncoder!=='undefined'){
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(data))
   .then(buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''))
   .catch(()=>fallbackHash(data));
 }
 return Promise.resolve(fallbackHash(data));
}
function fallbackHash(s){let h1=0xdeadbeef,h2=0x41c6ce57;
 for(let i=0;i<s.length;i++){const ch=s.charCodeAt(i);
  h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
 h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
 h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
 return (4294967296*(2097151&h2)+(h1>>>0)).toString(16);}
function newUserId(){return 'u'+Date.now().toString(36)+Math.floor(Math.random()*1e6).toString(36);}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Account={
 _user:null,_listeners:[],
 onChange(cb){this._listeners.push(cb);},
 _emit(){const u=this.currentUser();this._listeners.forEach(cb=>{try{cb(u);}catch(e){}});},
 users(){return readStoredJSON(APP_USERS_KEY,[]);},
 _saveUsers(list){writeStoredJSON(APP_USERS_KEY,list);},
 currentUser(){
  if(this._user)return this._user;
  const sess=readStoredJSON(APP_SESSION_KEY,null);
  if(sess&&sess.id){const u=this.users().find(x=>x.id===sess.id);if(u)this._user=u;}
  return this._user;},
 _startSession(u){this._user=u;writeStoredJSON(APP_SESSION_KEY,{id:u.id,at:Date.now()});this._emit();},
 signUp(email,name,pass){
  email=String(email||'').trim().toLowerCase();name=String(name||'').trim();
  if(!EMAIL_RE.test(email))return Promise.resolve('invalidEmail');
  if(pass==null||String(pass).length<4)return Promise.resolve('passwordTooShort');
  if(!name)return Promise.resolve('fillAllFields');
  const users=this.users();
  if(users.some(u=>u.email===email))return Promise.resolve('emailExists');
  return hashPassword(APP_AUTH_SALT,email+pass).then(hash=>{
   const u={id:newUserId(),email:email,name:name,salt:APP_AUTH_SALT,hash:hash,created:Date.now()};
   users.push(u);this._saveUsers(users);this._startSession(u);return true;});},
 signIn(email,pass){
  email=String(email||'').trim().toLowerCase();
  const u=this.users().find(x=>x.email===email);
  if(!u)return Promise.resolve('noSuchUser');
  return hashPassword(APP_AUTH_SALT,email+pass).then(hash=>
   hash===u.hash?(this._startSession(u),true):'wrongPassword');},
 signOut(){this._user=null;try{localStorage.removeItem(APP_SESSION_KEY);}catch(e){}
  this._emit();},
 updateName(name){
  const u=this.currentUser();if(!u)return Promise.resolve(false);
  name=String(name||'').trim();if(!name)return Promise.resolve(false);
  const users=this.users();const rec=users.find(x=>x.id===u.id);
  if(rec){rec.name=name;this._saveUsers(users);this._user=rec;this._emit();}
  return Promise.resolve(true);},
 updateAddress(addr){
  const u=this.currentUser();if(!u)return Promise.resolve(false);
  addr=String(addr||'').trim().slice(0,200);
  const users=this.users();const rec=users.find(x=>x.id===u.id);
  if(rec){rec.address=addr;this._saveUsers(users);this._user=rec;this._emit();}
  return Promise.resolve(true);},
 setStoragePref(p){
  const u=this.currentUser();if(!u)return Promise.resolve(false);
  p=String(p||'browser');if(p!=='browser'&&p!=='cloud'&&p!=='drive')p='browser';
  const users=this.users();const rec=users.find(x=>x.id===u.id);
  if(rec){rec.storagePref=p;this._saveUsers(users);this._user=rec;this._emit();}
  try{localStorage.setItem('mx-storage-pref',p);}catch(e){}
  return Promise.resolve(true);},
 changePassword(oldP,newP){
  const u=this.currentUser();if(!u)return Promise.resolve('noSuchUser');
  if(newP==null||String(newP).length<4)return Promise.resolve('passwordTooShort');
  if(u.provider==='google'&&!u.hash)return Promise.resolve('googleNoPasswordNote');
  return hashPassword(APP_AUTH_SALT,u.email+oldP).then(hash=>{
   if(hash!==u.hash)return 'wrongPassword';
   return hashPassword(APP_AUTH_SALT,u.email+newP).then(h2=>{
    const users=this.users();const rec=users.find(x=>x.id===u.id);
    if(rec){rec.hash=h2;this._saveUsers(users);this._user=rec;}
    return true;});});}
};

/* ---------- cloud workbook storage (per-user namespaced localStorage) ---------- */
const CloudBooks={
 list(){const u=Account.currentUser();if(!u)return Promise.resolve([]);
  return Promise.resolve(readStoredJSON(APP_BOOKS_KEY(u.id),[]));},
 get(id){return this.list().then(arr=>arr.find(b=>b.id===id)||null);},
 save(name,data,cur,id){
  const u=Account.currentUser();if(!u)return Promise.resolve('signInRequired');
  const arr=readStoredJSON(APP_BOOKS_KEY(u.id),[]);
  const now=Date.now();
  /* DriveBooks mirrors every remote book locally under the SAME 'g:<fileId>'
     id, so the merged list in StorageBooks.list() de-duplicates on id instead
     of showing the book twice when Drive cannot be reached. */
  const b={id:id||('b'+now.toString(36)+Math.floor(Math.random()*1e4).toString(36)),
   name:String(name||'Book1'),data:data,cur:cur||0,created:now,updated:now};
  /* Re-mirroring a Drive book must refresh the existing record, not stack a
     second copy of it on top of the first. findIndex returns -1 when absent,
     and splice(-1,1) would delete the newest unrelated book, so check first. */
  if(id){const at=arr.findIndex(x=>x.id===id);if(at>=0)arr.splice(at,1);}
  arr.unshift(b);writeStoredJSON(APP_BOOKS_KEY(u.id),arr);
  return Promise.resolve(b);},
 update(id,name,data,cur){
  const u=Account.currentUser();if(!u)return Promise.resolve('signInRequired');
  const arr=readStoredJSON(APP_BOOKS_KEY(u.id),[]);
  const b=arr.find(x=>x.id===id);if(!b)return Promise.resolve('saveNotFound');
  if(name!==undefined)b.name=name;
  if(data!==undefined)b.data=data;
  if(cur!==undefined)b.cur=cur;
  b.updated=Date.now();
  writeStoredJSON(APP_BOOKS_KEY(u.id),arr);
  return Promise.resolve(b);},
 delete(id){
  const u=Account.currentUser();if(!u)return Promise.resolve('signInRequired');
  const arr=readStoredJSON(APP_BOOKS_KEY(u.id),[]).filter(x=>x.id!==id);
  writeStoredJSON(APP_BOOKS_KEY(u.id),arr);
  return Promise.resolve(true);}
};
/* ---------- storage preference + provider routing (browser / app cloud / Drive) ---------- */
const StorageBooks={
 pref(){
  try{
   const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
   /* An explicit choice the user already made always wins. */
   if(u&&u.storagePref)return u.storagePref;
   /* Google accounts default to Google Drive as their cloud backend; password
      accounts keep the previous local-first default. */
   if(u&&u.provider==='google')return 'drive';
   return localStorage.getItem('mx-storage-pref')||'browser';
  }catch(e){return 'browser';}
 },
 setPref(p){
  p=String(p||'browser');
  if(p!=='browser'&&p!=='cloud'&&p!=='drive')p='browser';
  try{localStorage.setItem('mx-storage-pref',p);}catch(e){}
  try{
   const u=(typeof Account!=='undefined'&&Account.currentUser)?Account.currentUser():null;
   if(u&&Account.setStoragePref)Account.setStoragePref(p);
  }catch(e){}
  return p;
 },
 provider(){
  const p=this.pref();
  if(p==='drive'&&typeof DriveBooks!=='undefined'&&DriveBooks.isConnected())return DriveBooks;
  return CloudBooks;
 },
 providerFor(id){
  if(id&&String(id).indexOf('g:')===0&&typeof DriveBooks!=='undefined')return DriveBooks;
  return this.provider();
 },
 list(){
  const p=this.pref();
  const local=(typeof CloudBooks!=='undefined'&&CloudBooks.list)?CloudBooks.list():Promise.resolve([]);
  if(p!=='drive'||typeof DriveBooks==='undefined'||!DriveBooks.isConnected())return local;
  return Promise.all([local,DriveBooks.list().catch(()=>[])]).then(parts=>{
   const seen={};const out=[];
   (parts[1]||[]).concat(parts[0]||[]).forEach(b=>{if(!b||seen[b.id])return;seen[b.id]=1;out.push(b);});
   return out;
  });
 },
 get(id){return this.providerFor(id).get(id);},
 save(name,data,cur){return this.provider().save(name,data,cur);},
 update(id,name,data,cur){return this.providerFor(id).update(id,name,data,cur);},
 delete(id){return this.providerFor(id).delete(id);}
};
/* ---------- API key system: monthly auto-rotating key ---------- */
const API_KEYS_KEY = u => 'mx-api-keys-' + u.id;
function apiKeySeed(user){
  return user.email + '-' + user.id + '-mx.v1';
}
function generateApiKey(user){
  const seed = apiKeySeed(user);
  const now = new Date();
  const monthKey = String(Math.floor(now.getTime() / 86400000 / 30));
  const rand = Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const body = seed + '.' + monthKey + '.' + rand;
  return body.slice(0, 48);
}
function userApiKeys(user){
  return readStoredJSON(API_KEYS_KEY(user), []);
}
function saveUserApiKeys(user, keys){
  writeStoredJSON(API_KEYS_KEY(user), keys);
}
Account.getApiKey = function(){
  const u = this.currentUser(); if (!u) return null;
  const keys = userApiKeys(u.id);
  const now = new Date();
  const monthKey = String(Math.floor(now.getTime() / 86400000 / 30));
  let active = keys.find(k => k.monthKey === monthKey);
  if (!active){
    const fresh = generateApiKey(u);
    keys.push({ key: fresh, monthKey: monthKey, created: Date.now() });
    saveUserApiKeys(u.id, keys);
    active = { key: fresh, monthKey: monthKey, created: Date.now() };
  }
  return active.key;
};
Account.regenerateApiKey = function(){
  const u = this.currentUser(); if (!u) return Promise.resolve(null);
  const keys = userApiKeys(u.id);
  const now = new Date();
  const monthKey = String(Math.floor(now.getTime() / 86400000 / 30));
  keys = keys.filter(k => k.monthKey !== monthKey);
  const fresh = generateApiKey(u);
  keys.push({ key: fresh, monthKey: monthKey, created: Date.now() });
  saveUserApiKeys(u.id, keys);
  return Promise.resolve(fresh);
};
Account.listApiKeys = function(){
  const u = this.currentUser(); if (!u) return Promise.resolve([]);
  return Promise.resolve(userApiKeys(u.id).map(k => ({ ...k })));
};

/* ---------- Google Sign-In (Identity Services) ----------
   Client ID comes from <meta name="google-client-id"> in index.html (setup: GOOGLE_SIGNIN.md).
   The ID token's claims (issuer, audience, expiry, verified email) are validated here,
   matching this app's localStorage-only trust model — read the security notes in
   GOOGLE_SIGNIN.md before pairing this with server-side data. */
const GOOGLE_CLIENT_META='meta[name=google-client-id]';
function googleClientId(){
 try{const m=document.querySelector(GOOGLE_CLIENT_META);
  const id=m&&m.content?String(m.content).trim():'';
  return(id&&!/^YOUR_/i.test(id))?id:'';}catch(e){return '';}}
function base64UrlDecode(s){
 let b=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
 if(b.length%4)b+='='.repeat(4-(b.length%4));
 let bin;try{bin=atob(b);}catch(e){return '';}
 try{return new TextDecoder().decode(Uint8Array.from(bin,ch=>ch.charCodeAt(0)));}
 catch(e){return bin;}}
function parseJwt(token){
 const p=String(token||'').split('.');
 if(p.length!==3)return null;
 try{const o=JSON.parse(base64UrlDecode(p[1]));return o&&typeof o==='object'?o:null;}
 catch(e){return null;}}
const GOOGLE_PIC_RE=/^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\/[A-Za-z0-9_\-./?=%&+]*$/i;
Account.isGoogleConfigured=function(){return!!googleClientId();};
Account.parseGoogleCredential=function(credential){
 const p=parseJwt(credential);
 if(!p)return null;
 if(p.iss!=='https://accounts.google.com'&&p.iss!=='accounts.google.com')return null;
 const aud=googleClientId();
 if(!aud||p.aud!==aud)return null;
 if(!p.sub||!p.email)return null;
 if(p.email_verified===false)return null;
 if(!p.exp||Date.now()>=Number(p.exp)*1000)return null;
 return{sub:String(p.sub),email:String(p.email).toLowerCase(),
  name:String(p.name||p.email).slice(0,120),
  picture:p.picture&&GOOGLE_PIC_RE.test(String(p.picture))?String(p.picture):''};};
Account.signInWithGoogle=function(credential){
 const p=this.parseGoogleCredential(credential);
 if(!p)return Promise.resolve('googleSignInFailed');
 const users=this.users();
 let u=users.find(x=>x.googleSub===p.sub)||users.find(x=>x.email===p.email);
 if(u){
  u.provider='google';u.googleSub=p.sub;
  if(!u.name&&p.name)u.name=p.name;
  if(p.picture)u.picture=p.picture;
  /* Persist Drive as the default backend, but never overwrite a choice the
     user already made in the storage preference picker. */
  if(!u.storagePref)u.storagePref='drive';
  this._saveUsers(users);
 }else{
  u={id:newUserId(),email:p.email,name:p.name,provider:'google',googleSub:p.sub,
   picture:p.picture||'',emailVerified:true,created:Date.now(),storagePref:'drive'};
  users.push(u);this._saveUsers(users);
 }
 /* No device-level mirror is written here: mx-storage-pref is global to the
    browser profile, so stamping it would leak "drive" onto any later password
    account used on this device. The per-user record is authoritative. */
 this._startSession(u);
 return Promise.resolve(true);};

