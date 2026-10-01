'use strict';
/* Google Drive storage (optional): GIS OAuth token + Drive v3 REST.

   Every book is a JSON blob in the app's own "MiniExcel" folder, tagged with
   BOOK_MIME so list() can tell our own files apart from everything else the
   user keeps in Drive. Without that tag the drive.file scope would surface the
   user's whole Drive as a list of "cloud saves".

   The access token is held in memory only and never written to storage. */
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BOOK_MIME = 'application/vnd.miniexcel.book+json';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const FOLDER_NAME = 'MiniExcel';
const DRIVE_PREFIX = 'g:';

const DriveBooks = {
 _token: null, _exp: 0, _folderId: null,
 _clientId() {
  try {
   if (typeof googleClientId === 'function') return googleClientId();
   const m = document.querySelector('meta[name=google-client-id]');
   const id = m && m.content ? String(m.content).trim() : '';
   return (id && !/^YOUR_/i.test(id)) ? id : '';
  } catch (e) { return ''; }
 },
 isConfigured() { return !!this._clientId(); },
 isConnected() { return !!this._token && Date.now() < this._exp - 30000; },
 disconnect() { this._token = null; this._exp = 0; this._folderId = null; },
 _headers() { return { Authorization: 'Bearer ' + this._token }; },
 _api(path, opts) {
  if (!this.isConnected()) return Promise.resolve(null);
  const o = opts || {};
  o.headers = Object.assign({}, o.headers || {}, this._headers());
  return fetch(DRIVE_API + path, o)
   .then((r) => (r && r.ok ? r.json() : null)).catch(() => null);
 },
 connect() {
  const cid = this._clientId();
  if (!cid) return Promise.resolve('driveNeedConnect');
  if (this.isConnected()) return Promise.resolve(true);
  const self = this;
  return new Promise((resolve) => {
   const wait = () => {
    const g = (typeof google !== 'undefined') ? google : null;
    if (g && g.accounts && g.accounts.oauth2) {
     try {
      const tc = g.accounts.oauth2.initTokenClient({
       client_id: cid, scope: DRIVE_SCOPE,
       callback: (resp) => {
        if (resp && resp.access_token) {
         self._token = resp.access_token;
         self._exp = Date.now() + (Number(resp.expires_in || 3600) * 1000);
         resolve(true);
        } else resolve('driveNeedConnect');
       },
       error_callback: () => resolve('driveNeedConnect')
      });
      tc.requestAccessToken({ prompt: '' });
     } catch (e) { resolve('driveNeedConnect'); }
    } else setTimeout(wait, 250);
   };
   wait();
  });
 },
 /* Find (or create) the single app folder. Matching on name + folder mimeType
    rather than "any folder" is what stops books landing in an unrelated
    folder the user happens to already have. */
 _ensureFolder() {
  const self = this;
  if (self._folderId) return Promise.resolve(self._folderId);
  const q = encodeURIComponent("name='" + FOLDER_NAME + "' and mimeType='" + FOLDER_MIME
   + "' and trashed=false");
  return self._api('/files?q=' + q + '&fields=files(id,name)&pageSize=1').then((j) => {
   const hit = j && j.files && j.files[0];
   if (hit) { self._folderId = hit.id; return self._folderId; }
   return self._api('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME })
   }).then((f) => {
    if (!f || !f.id) return null;
    self._folderId = f.id;
    return self._folderId;
   });
  });
 },
 /* Drive's uploadType=multipart wants a real MIME multipart body: a metadata
    part and a media part, each introduced by its own Content-Type and closed
    by the boundary. JSON.stringify({meta,content}) is NOT that shape and Drive
    answers 400, so the envelope is assembled by hand here. */
 _upload(meta, book, fileId) {
  const self = this;
  const bd = 'miniexcel' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const body = '--' + bd + '\r\n'
   + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
   + JSON.stringify(meta) + '\r\n'
   + '--' + bd + '\r\n'
   + 'Content-Type: ' + BOOK_MIME + '\r\n\r\n'
   + JSON.stringify(book) + '\r\n'
   + '--' + bd + '--';
  const url = (fileId ? DRIVE_UPLOAD + '/' + encodeURIComponent(fileId) : DRIVE_UPLOAD)
   + '?uploadType=multipart&fields=id,name,modifiedTime';
  return fetch(url, {
   method: fileId ? 'PATCH' : 'POST',
   headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, self._headers()),
   body: body
  }).then((r) => (r && r.ok ? r.json() : null)).catch(() => null);
 },
 /* Scoped to the app folder AND our own mime type, so only Mini Excel books
    are ever listed. */
 list() {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  return self._ensureFolder().then((fid) => {
   if (!fid) return [];
   const q = encodeURIComponent("'" + fid + "' in parents and mimeType='" + BOOK_MIME
    + "' and trashed=false");
   return self._api('/files?q=' + q
    + '&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=100')
    .then((j) => ((j && j.files) || []).map((f) => ({
     id: DRIVE_PREFIX + f.id, name: String(f.name || 'Book'), driveId: f.id,
     updated: f.modifiedTime ? Date.parse(f.modifiedTime) : Date.now()
    })));
  });
 },
 /* Books are mirrored locally under their 'g:<fileId>' id, so the merged
    StorageBooks list shows one row per book and the id still routes back here
    through providerFor(). */
 _mirror(name, data, cur, driveId) {
  if (typeof CloudBooks === 'undefined' || !CloudBooks.save) return Promise.resolve(null);
  return CloudBooks.save(name, data, cur, DRIVE_PREFIX + driveId);
 },
 save(name, data, cur) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  const u = (typeof Account !== 'undefined' && Account.currentUser) ? Account.currentUser() : null;
  if (!u) return Promise.resolve('signInRequired');
  return self._ensureFolder().then((fid) => {
   if (!fid) return 'driveSaveFailed';
   const meta = { name: name + '.miniexcel.json', mimeType: BOOK_MIME, parents: [fid] };
   const now = Date.now();
   return self._upload(meta, { name: name, data: data, cur: cur, updated: now }, null)
    .then((f) => {
     if (!f || !f.id) return 'driveSaveFailed';
     return self._mirror(name, data, cur, f.id).then(() => ({
      id: DRIVE_PREFIX + f.id, name: name, data: data, cur: cur, updated: now, driveId: f.id
     }));
    });
  });
 },
 /* Drive ids arrive as 'g:<fileId>'; strip the prefix rather than re-listing
    the whole folder to rediscover the file the caller already named. */
 _fileId(id) {
  const s = String(id == null ? '' : id);
  return s.indexOf(DRIVE_PREFIX) === 0 ? s.slice(DRIVE_PREFIX.length) : '';
 },
 get(id) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  const fileId = self._fileId(id);
  if (!fileId) return CloudBooks.get(id);
  return fetch(DRIVE_API + '/files/' + encodeURIComponent(fileId) + '?alt=media',
   { headers: self._headers() })
   .then((r) => (r && r.ok ? r.json() : null))
   .then((j) => (j ? { id: id, name: j.name, data: j.data, cur: j.cur,
    updated: j.updated || Date.now(), driveId: fileId } : null))
   .catch(() => null);
 },
 update(id, name, data, cur) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  const fileId = self._fileId(id);
  /* A book saved locally before Drive was connected has no fileId: upload it
     now rather than reporting a failure the user cannot act on. */
  if (!fileId) {
   return CloudBooks.get(id).then((b) => {
    if (!b) return 'saveNotFound';
    return self.save(name === undefined ? b.name : name,
     data === undefined ? b.data : data, cur === undefined ? b.cur : cur);
   });
  }
  return self.get(id).then((b) => {
   const nm = name === undefined ? (b ? b.name : '') : name;
   const dt = data === undefined ? (b ? b.data : null) : data;
   const cc = cur === undefined ? (b ? b.cur : 0) : cur;
   if (dt === null) return 'saveNotFound';
   const now = Date.now();
   return self._upload({ name: nm + '.miniexcel.json', mimeType: BOOK_MIME },
    { name: nm, data: dt, cur: cc, updated: now }, fileId)
    .then((f) => {
     if (!f) return 'driveSaveFailed';
     return self._mirror(nm, dt, cc, fileId).then(() => ({
      id: id, name: nm, data: dt, cur: cc, updated: now, driveId: fileId
     }));
    });
  });
 },
 delete(id) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  const fileId = self._fileId(id);
  if (!fileId) return CloudBooks.delete(id);
  return fetch(DRIVE_API + '/files/' + encodeURIComponent(fileId),
   { method: 'DELETE', headers: self._headers() })
   .then((r) => (r && r.ok ? r.json() : null))
   /* Trashed remotely, but drop the local mirror too or the row lingers. */
   .then(() => CloudBooks.delete(id))
   .catch(() => 'driveSaveFailed');
 }
};
