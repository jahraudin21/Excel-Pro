/**
 * DriveBooks (js/drive.js) against a mock Drive API + Google Identity Services.
 *
 * This is the half of Google Sign-In that touches the network, and its failure
 * modes are quiet: every method resolves an error *string* instead of throwing,
 * so a malformed request surfaces in the UI as "save failed" with nothing in
 * the console. So the wire format is asserted directly -- the multipart
 * envelope, the folder lookup, the list filter, and id round-tripping.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; console.log('  PASS ' + msg); }
  else { failed++; console.log('  FAIL ' + msg); }
}

const CLIENT_ID = '123456789-drive.apps.googleusercontent.com';
const FOLDER = 'folder-miniexcel';
const FILE = 'file-abc123';

function makeSandbox(opts) {
  opts = opts || {};
  const store = Object.create(null);
  const meta = { content: opts.clientId === undefined ? CLIENT_ID : opts.clientId };
  const calls = [];
  const cloud = [];            // local mirror, as CloudBooks would hold it
  const remote = Object.assign({}, opts.remote);   // id -> {name, book}

  const json = (obj, okFlag) => Promise.resolve({
    ok: okFlag !== false, json: () => Promise.resolve(obj)
  });

  function fetchImpl(url, o) {
    o = o || {};
    const rec = { url: String(url), method: o.method || 'GET', body: o.body,
                  headers: o.headers || {} };
    calls.push(rec);

    if (rec.url.indexOf('uploadType=multipart') !== -1) {
      if (opts.uploadFails) return json({}, false);
      remote[FILE] = { name: 'Book1', book: { name: 'Book1', data: {}, cur: 0 } };
      return json({ id: FILE, name: 'Book1.miniexcel.json',
                    modifiedTime: '2026-01-02T03:04:05.000Z' }, true);
    }
    if (rec.url.indexOf('alt=media') !== -1) {
      const id = decodeURIComponent(rec.url.split('/files/')[1].split('?')[0]);
      return remote[id] ? json(remote[id].book, true) : json(null, false);
    }
    if (rec.method === 'DELETE') {
      // Drive really answers a successful delete with 204 and an EMPTY body, so
      // the default mock is noBody. r.json() rejects on an empty body, which is
      // how the "local mirror is never dropped" bug hid from this suite.
      if (opts.emptyDelete === false) return json({}, true);
      return Promise.resolve({ ok: true, status: 204,
        json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')) });
    }
    // List first: its query also mentions the folder, so it must be matched
    // before the folder lookup below.
    if (rec.url.indexOf('in%20parents') !== -1) {
      return json({ files: [{ id: FILE, name: 'Book1.miniexcel.json',
                              modifiedTime: '2026-01-02T03:04:05.000Z' }] }, true);
    }
    // Folder lookup: name='MiniExcel' and mimeType='...folder' (query is encoded)
    if (rec.url.indexOf('name%3D') !== -1) {
      return json(opts.folderExists === false ? { files: [] }
                                              : { files: [{ id: FOLDER, name: 'MiniExcel' }] }, true);
    }
    if (rec.method === 'POST' && rec.url.indexOf('/files') !== -1) {
      return json({ id: FOLDER, name: 'MiniExcel' }, true);
    }
    return json({}, true);
  }

  const sandbox = {
    console, Date, JSON, Math, Promise, Object, String, Number, Array, Error,
    encodeURIComponent, decodeURIComponent, fetch: fetchImpl,
    document: { querySelector: sel => (sel === 'meta[name=google-client-id]' ? meta : null) },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    Account: { currentUser: () => ({ id: 'u1', email: 'a@b.co', provider: 'google' }) },
    /* Mirrors the real CloudBooks.save signature, including the id override
       that DriveBooks relies on to key its local mirror by 'g:<fileId>'. */
    CloudBooks: {
      list() { return Promise.resolve(cloud.slice()); },
      get(id) { return Promise.resolve(cloud.find(b => b.id === id) || null); },
      save(name, data, cur, id) {
        const b = { id: id || ('b' + cloud.length), name, data, cur, updated: Date.now() };
        const at = cloud.findIndex(x => x.id === b.id);
        if (at >= 0) cloud.splice(at, 1);
        cloud.unshift(b);
        return Promise.resolve(b);
      },
      delete(id) {
        const at = cloud.findIndex(x => x.id === id);
        if (at >= 0) cloud.splice(at, 1);
        return Promise.resolve(true);
      }
    },
    __calls: calls, __cloud: cloud, __remote: remote, __meta: meta
  };
  if (opts.withGoogle !== false) {
    sandbox.google = { accounts: { oauth2: { initTokenClient(cfg) {
      return { requestAccessToken() {
        if (opts.tokenFails) { cfg.error_callback({ type: 'access_denied' }); return; }
        cfg.callback({ access_token: 'ya29.tok', expires_in: 3600 });
      } };
    } } } };
  }
  const ctx = vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, 'js', 'drive.js'), 'utf8')
    + '\nglobalThis.__DriveBooks = DriveBooks;';
  vm.runInContext(src, ctx, { filename: 'drive.js' });
  return ctx;
}

function lastCall(ctx, frag) {
  for (let i = ctx.__calls.length - 1; i >= 0; i--) {
    if (ctx.__calls[i].url.indexOf(frag) !== -1) return ctx.__calls[i];
  }
  return null;
}

async function main() {
  console.log('=== drive provider ===');

  console.log('\n[configuration]');
  let ctx = makeSandbox();
  let D = ctx.__DriveBooks;
  ok(D.isConfigured() === true, 'configured when the meta tag holds a client id');
  const bare = makeSandbox({ clientId: '' });
  ok(bare.__DriveBooks.isConfigured() === false, 'unconfigured when the meta tag is empty');
  const ph = makeSandbox({ clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com' });
  ok(ph.__DriveBooks.isConfigured() === false, 'unconfigured for the placeholder id');

  console.log('\n[connect]');
  ok(await D.connect() === true, 'a granted token connects');
  ok(D.isConnected() === true, 'isConnected reflects the live token');
  ok(ctx.__calls.length === 0, 'connecting does not hit the Drive API');
  D.disconnect();
  ok(D.isConnected() === false, 'disconnect drops the token');
  const noTok = makeSandbox({ tokenFails: true });
  ok(await noTok.__DriveBooks.connect() === 'driveNeedConnect',
    'a denied grant resolves driveNeedConnect instead of hanging');
  const noGis = makeSandbox({ withGoogle: false, clientId: '' });
  ok(await noGis.__DriveBooks.connect() === 'driveNeedConnect',
    'connect without a client id resolves immediately');

  console.log('\n[folder resolution]');
  ctx = makeSandbox();
  D = ctx.__DriveBooks;
  await D.connect();
  await D.list();
  /* list() issues two queries: the folder lookup, then the listing itself.
     Select the former by its encoded name filter rather than by URL shape. */
  const fq = decodeURIComponent(lastCall(ctx, 'name%3D').url);
  ok(fq.indexOf("name='MiniExcel'") !== -1, 'the folder lookup filters on the app folder name');
  ok(fq.indexOf('application/vnd.google-apps.folder') !== -1,
    'the folder lookup filters on the folder mime type');
  ok(fq.indexOf('trashed=false') !== -1, 'the folder lookup skips trashed folders');
  const noFolder = makeSandbox({ folderExists: false });
  await noFolder.__DriveBooks.connect();
  await noFolder.__DriveBooks.list();
  const created = noFolder.__calls.filter(c => c.method === 'POST').pop();
  ok(!!created, 'a missing folder is created');
  ok(created && created.body.indexOf('application/vnd.google-apps.folder') !== -1,
    'the created folder uses the folder mime type');
  ok(created && created.body.indexOf('"name":"MiniExcel"') !== -1,
    'the created folder is named for the app');

  console.log('\n[upload envelope]');
  await D.save('Book1', { sheets: [] }, 0);
  const up = lastCall(ctx, 'uploadType=multipart');
  const bd = String(up.headers['Content-Type']).split('boundary=')[1];
  ok(up.headers['Content-Type'].indexOf('multipart/related') === 0,
    'the request declares multipart/related');
  ok(!!bd, 'the request declares a boundary');
  ok(up.body.indexOf('--' + bd) === 0, 'the body opens with the boundary delimiter');
  ok(up.body.indexOf('--' + bd + '--') !== -1, 'the body is closed with the terminating boundary');
  ok(up.body.split('--' + bd).length - 1 === 3, 'the envelope carries exactly two parts');
  ok(up.body.indexOf('\r\n\r\n') !== -1, 'each part is separated by a blank CRLF line');
  ok(up.body.indexOf('Content-Type: application/json') !== -1,
    'the metadata part declares application/json');
  ok(up.body.indexOf('application/vnd.miniexcel.book+json') !== -1,
    'the media part declares the app mime type');
  ok(up.body.indexOf('"name":"Book1.miniexcel.json"') !== -1,
    'the metadata part names the file with the app suffix');
  ok(up.body.indexOf('"parents"') !== -1, 'the metadata part records the parent folder');
  /* The previous body was one bare JSON object, which Drive rejects with 400. */
  ok(up.body.charAt(0) === '-', 'the body is a MIME envelope, not bare JSON');
  ok(up.headers['Authorization'].indexOf('Bearer ') === 0, 'the upload carries the bearer token');


  console.log('\n[id round-trip]');
  const saved = await D.save('Book1', { sheets: [] }, 0);
  ok(String(saved.id).indexOf('g:') === 0,
    'save returns a g:-prefixed id, so providerFor routes updates back to Drive');
  ok(saved.driveId === FILE, 'save records the remote file id');
  ok(ctx.__cloud.length === 1 && ctx.__cloud[0].id === 'g:' + FILE,
    'the local mirror is keyed by the same g: id, so the merged list de-duplicates');
  await D.save('Book1', { sheets: [1] }, 0);
  ok(ctx.__cloud.length === 1, 're-saving mirrors over the record instead of duplicating it');

  console.log('\n[list scoping]');
  const lq = decodeURIComponent(lastCall(ctx, 'in%20parents').url);
  ok(lq.indexOf("'" + FOLDER + "' in parents") !== -1,
    'list is restricted to the resolved app folder');
  ok(lq.indexOf('application/vnd.miniexcel.book+json') !== -1,
    'list filters on the app mime type, so unrelated user files never appear');
  ok(lq.indexOf('trashed=false') !== -1, 'list skips trashed files');
  const arr = await D.list();
  ok(Array.isArray(arr) && arr[0].id === 'g:' + FILE, 'list maps remote files to g: ids');
  ok(ctx.__calls.filter(c => c.url.indexOf('spaces=drive') !== -1).length === 0,
    'list never walks the whole Drive');

  console.log('\n[get / update / delete]');
  const got = await D.get('g:' + FILE);
  ok(got && got.id === 'g:' + FILE && got.driveId === FILE,
    'get resolves straight from the file id in the g: id');
  const before = ctx.__calls.filter(c => c.url.indexOf('in%20parents') !== -1).length;
  const patched = await D.update('g:' + FILE, 'Renamed', { sheets: [1] }, 0);
  ok(patched && patched.name === 'Renamed' && patched.id === 'g:' + FILE, 'update patches in place');
  const up2 = lastCall(ctx, 'uploadType=multipart');
  ok(up2.method === 'PATCH', 'update issues a PATCH against the existing file');
  ok(up2.url.indexOf('/files/' + FILE) !== -1,
    'update targets the file id from the g: id');
  ok(ctx.__calls.filter(c => c.url.indexOf('in%20parents') !== -1).length === before,
    'update does not re-list the folder to find a file it was already handed');
  await D.delete('g:' + FILE);
  ok(lastCall(ctx, '/files/' + FILE).method === 'DELETE', 'delete removes the remote file');
  ok(ctx.__cloud.length === 0, 'delete also drops the local mirror so the row does not linger');

  // Regression: a 204 has an empty body, so parsing it must not be on the path.
  const noBody = makeSandbox();
  await noBody.__DriveBooks.connect();
  await noBody.__DriveBooks.save('Book1', { sheets: [] }, 0);
  ok(noBody.__cloud.length === 1, 'mirror exists before the delete under test');
  ok(await noBody.__DriveBooks.delete('g:' + FILE) !== 'driveSaveFailed',
    'a 204 empty-body delete is not reported as a failure');
  ok(noBody.__cloud.length === 0,
    'a 204 empty-body delete still drops the local mirror');
  const jsonBody = makeSandbox({ emptyDelete: false });
  await jsonBody.__DriveBooks.connect();
  await jsonBody.__DriveBooks.save('Book1', { sheets: [] }, 0);
  await jsonBody.__DriveBooks.delete('g:' + FILE);
  ok(jsonBody.__cloud.length === 0,
    'a delete that does return a JSON body drops the mirror too');

  console.log('\n[local-only books]');
  ctx.__cloud.push({ id: 'b-local', name: 'Local', data: { sheets: [] }, cur: 0 });
  const promoted = await D.update('b-local', undefined, { sheets: [2] });
  ok(promoted && String(promoted.id).indexOf('g:') === 0,
    'updating a locally-saved book uploads it and hands back a g: id');
  ok(await D.get('b-nope') === null, 'get on an unknown local id resolves null');

  console.log('\n[error handling]');
  const failing = makeSandbox({ uploadFails: true });
  await failing.__DriveBooks.connect();
  ok(await failing.__DriveBooks.save('Book1', {}, 0) === 'driveSaveFailed',
    'a rejected upload resolves driveSaveFailed, which the UI can translate');
  const off = makeSandbox();
  for (const m of ['list', 'save', 'get', 'update', 'delete']) {
    ok(await off.__DriveBooks[m]('g:x') === 'driveNeedConnect',
      m + ' resolves driveNeedConnect when not connected');
  }

  console.log('\n========================================');
  console.log('  ' + passed + ' passed, ' + failed + ' failed');
  console.log('========================================');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });

