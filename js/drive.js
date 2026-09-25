'use strict';
/* Google Drive storage (optional): GIS OAuth token + Drive v3 REST. */
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
  return fetch('https://www.googleapis.com/drive/v3' + path, o)
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
       client_id: cid, scope: 'https://www.googleapis.com/auth/drive.file',
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
 _ensureFolder() {
  const self = this;
  if (self._folderId) return Promise.resolve(self._folderId);
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder'");
  return self._api('/files?q=' + q + '&fields=files(id)&spaces=drive').then((j) => {
   if (j && j.files && j.files.length) { self._folderId = j.files[0].id; }
   else { self._folderId = 'appfolder'; }
   return self._folderId;
  });
 },
 _upload(meta, content, fileId) {
  const self = this;
  const bd = 'miniexcel' + Date.now().toString(36);
  const url = fileId
   ? 'https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(fileId) + '?uploadType=multipart&fields=id,modifiedTime'
   : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime';
  return fetch(url, {
   method: fileId ? 'PATCH' : 'POST',
   headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, self._headers()),
   body: JSON.stringify({ meta: meta, content: content })
  }).then((r) => (r && r.ok ? r.json() : null)).catch(() => null);
 },
 list() {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  return self._ensureFolder().then(() => self._api('/files?spaces=drive&fields=files(id,name,modifiedTime)&pageSize=100')
   .then((j) => ((j && j.files) || []).map((f) => ({
    id: 'g:' + f.id, name: String(f.name || 'Book'), driveId: f.id,
    updated: f.modifiedTime ? Date.parse(f.modifiedTime) : Date.now()
   }))));
 },
 save(name, data, cur) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  const u = (typeof Account !== 'undefined' && Account.currentUser) ? Account.currentUser() : null;
  if (!u) return Promise.resolve('signInRequired');
  const localId = 'b' + Date.now().toString(36);
  return self._ensureFolder().then((fid) => {
   const meta = { name: name + '.miniexcel.json' };
   if (fid && fid !== 'appfolder') meta.parents = [fid];
   return self._upload(meta, { name: name, data: data, cur: cur, updated: Date.now() }, null).then((f) => {
    if (!f || !f.id) return 'driveSaveFailed';
    const b = { id: localId, name: name, data: data, cur: cur, updated: Date.now(), driveId: f.id };
    return CloudBooks.save(name, data, cur).then(() => b);
   });
  });
 },
 get(id) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  return self.list().then((arr) => {
   if (typeof arr === 'string') return arr;
   const hit = (arr || []).find((b) => b.id === id);
   if (!hit || !hit.driveId) return CloudBooks.get(id);
   return fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(hit.driveId) + '?alt=media',
    { headers: self._headers() }).then((r) => (r && r.ok ? r.json() : null)).then((j) => {
     if (!j) return null;
     return { id: hit.id, name: j.name || hit.name, data: j.data, cur: j.cur,
      updated: j.updated || hit.updated, driveId: hit.driveId };
    }).catch(() => null);
  });
 },
 update(id, name, data, cur) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  return self.list().then((arr) => {
   if (typeof arr === 'string') return arr;
   const hit = (arr || []).find((b) => b.id === id);
   if (hit && hit.driveId) {
    return self._upload({ name: name + '.miniexcel.json' },
     { name: name, data: data, cur: cur, updated: Date.now() }, hit.driveId)
     .then((f) => (f ? { id: id, name: name, data: data, cur: cur, updated: Date.now(), driveId: hit.driveId } : 'driveSaveFailed'));
   }
   return self.save(name, data, cur);
  });
 },
 delete(id) {
  const self = this;
  if (!self.isConnected()) return Promise.resolve('driveNeedConnect');
  return self.list().then((arr) => {
   if (typeof arr === 'string') return arr;
   const hit = (arr || []).find((b) => b.id === id);
   if (!hit || !hit.driveId) return CloudBooks.delete(id);
   return fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(hit.driveId),
    { method: 'DELETE', headers: self._headers() })
    .then(() => CloudBooks.delete(id)).catch(() => 'driveSaveFailed');
  });
 }
};
