/* ST POS — ຊັ້ນທົດແທນບໍລິການ Google Apps Script ເພື່ອແລ່ນ Code.gs ເທິງ Node.js (ໂຮສຂອງຮ້ານ)
 * ຂໍ້ມູນທັງໝົດເກັບເປັນໄຟລ໌ໃນ DATA_DIR (ນອກ public_html):
 *   props.json          = Script Properties (ຄ່າໃນ env ຂອງແອັບ ໃຊ້ເປັນຄ່າເລີ່ມຕົ້ນ ເຊັ່ນ API_TOKEN, WA_CALLMEBOT)
 *   sheets/<name>.json  = ແຜ່ນງານ (STATE = ຂໍ້ມູນຮ້ານ, BAK_* = ສຳຮອງ, CHAT, ແທັບສຳເນົາ)
 *   cache/<key>.json    = CacheService (ມີອາຍຸ)
 *   locks/              = LockService (ໃຊ້ໄດ້ຂ້າມຫຼາຍ process)
 * ທຸກຢ່າງເປັນແບບ synchronous ຄືກັບ Apps Script ເພື່ອໃຫ້ Code.gs ແລ່ນໄດ້ໂດຍບໍ່ຕ້ອງແກ້ */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

function create(dataDir) {
  /* ໂຟນເດີຂໍ້ມູນປັດຈຸບັນ — ສະຫຼັບໄດ້ຕໍ່ request ດ້ວຍ use(dir) (ຫຼາຍສາຂາ: 1 ໂຟນເດີ/ສາຂາ) */
  let D, SHEETS, CACHE, LOCKS, PROPS;
  function use(dir) {
    D = path.resolve(dir); SHEETS = path.join(D, 'sheets'); CACHE = path.join(D, 'cache'); LOCKS = path.join(D, 'locks'); PROPS = path.join(D, 'props.json');
    [D, SHEETS, CACHE, LOCKS].forEach(function (d) { fs.mkdirSync(d, { recursive: true }); });
    book = null;
  }
  const sab = new Int32Array(new SharedArrayBuffer(4));
  function sleep(ms) { if (ms > 0) Atomics.wait(sab, 0, 0, ms); }
  /* ຂຽນແບບ atomic: ໄຟລ໌ຊົ່ວຄາວ → rename (ຜູ້ອ່ານບໍ່ເຫັນໄຟລ໌ເຄິ່ງໆ) */
  /* Windows: ປ່ຽນຊື່ທັບໄຟລ໌ທີ່ process ອື່ນກຳລັງອ່ານ → EPERM/EBUSY ຊົ່ວຄາວ → ລອງໃໝ່ (Linux ບໍ່ເກີດ) */
  function renameRetry(a, b) { for (let i = 0; ; i++) { try { fs.renameSync(a, b); return; } catch (e) { if (i >= 40 || (e.code !== 'EPERM' && e.code !== 'EBUSY' && e.code !== 'EACCES')) { try { fs.unlinkSync(a); } catch (e2) {} throw e; } sleep(10 + i * 5); } } }
  function writeAtomic(file, data) { const tmp = file + '.' + process.pid + '.' + Date.now() + '.' + Math.random().toString(36).slice(2, 6) + '.tmp'; fs.writeFileSync(tmp, data); renameRetry(tmp, file); }
  function readJson(file, dflt) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return dflt; } }
  const enc = function (name) { return encodeURIComponent(String(name)).replace(/\*/g, '%2A') + '.json'; };

  /* ---------- PropertiesService ---------- */
  const props = {
    getProperty: function (k) { const p = readJson(PROPS, {}); if (Object.prototype.hasOwnProperty.call(p, k)) return p[k]; const e = process.env[k]; return e === undefined || e === '' ? null : String(e); },
    setProperty: function (k, v) { withFileLock('props', function () { const p = readJson(PROPS, {}); p[k] = String(v); writeAtomic(PROPS, JSON.stringify(p)); }); return props; },
    deleteProperty: function (k) { withFileLock('props', function () { const p = readJson(PROPS, {}); delete p[k]; writeAtomic(PROPS, JSON.stringify(p)); }); return props; },
    getProperties: function () { return Object.assign({}, readJson(PROPS, {})); }
  };
  const PropertiesService = { getScriptProperties: function () { return props; }, getUserProperties: function () { return props; } };

  /* ---------- LockService (ໂຟນເດີ lock — mkdir ເປັນ atomic ທຸກລະບົບ) ---------- */
  function acquire(name, timeoutMs) {
    const dir = path.join(LOCKS, name + '.lock'), end = Date.now() + (timeoutMs || 0);
    for (;;) {
      try { fs.mkdirSync(dir); return dir; } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        try { if (Date.now() - fs.statSync(dir).mtimeMs > 120000) { fs.rmdirSync(dir); continue; } } catch (e2) {} /* lock ຄ້າງ (process ຕາຍ) */
        if (Date.now() >= end) throw new Error('Lock timeout: ' + name);
        sleep(25);
      }
    }
  }
  function release(dir) { try { fs.rmdirSync(dir); } catch (e) {} }
  function withFileLock(name, fn) { const d = acquire(name, 10000); try { return fn(); } finally { release(d); } }
  /* ໄດ້ lock ແລ້ວ: ລ້າງແຜ່ນງານທີ່ອ່ານໄວ້ກ່ອນ lock (ບໍ່ໄດ້ແກ້) → ອ່ານໃໝ່ຫຼັງ lock ເຫັນສິ່ງທີ່ process ອື່ນຫາກໍຂຽນ (ກັນລວມກັບຂໍ້ມູນເກົ່າ) */
  function dropClean() { if (!book) return; Object.keys(book).forEach(function (n) { if (!book[n]._dirty) delete book[n]; }); }
  function makeLock(name) {
    let held = null;
    return {
      waitLock: function (ms) { if (held) return; held = acquire(name, ms); dropClean(); },
      tryLock: function (ms) { if (held) return true; try { held = acquire(name, ms); dropClean(); return true; } catch (e) { return false; } },
      hasLock: function () { return !!held; },
      releaseLock: function () { if (held) { release(held); held = null; } }
    };
  }
  const LockService = { getScriptLock: function () { return makeLock('script'); }, getUserLock: function () { return makeLock('user'); }, getDocumentLock: function () { return makeLock('script'); } };

  /* ---------- CacheService ---------- */
  const cacheFile = function (k) { return path.join(CACHE, crypto.createHash('sha1').update(String(k)).digest('hex') + '.json'); };
  const cache = {
    get: function (k) { const o = readJson(cacheFile(k), null); if (!o) return null; if (o.exp < Date.now()) { try { fs.unlinkSync(cacheFile(k)); } catch (e) {} return null; } return o.v; },
    put: function (k, v, ttl) { writeAtomic(cacheFile(k), JSON.stringify({ v: String(v), exp: Date.now() + Math.min(21600, +ttl || 600) * 1000 })); },
    remove: function (k) { try { fs.unlinkSync(cacheFile(k)); } catch (e) {} }
  };
  const CacheService = { getScriptCache: function () { return cache; }, getUserCache: function () { return cache; } };
  function sweepCache() { try { const now = Date.now(); fs.readdirSync(CACHE).forEach(function (f) { const o = readJson(path.join(CACHE, f), null); if (!o || o.exp < now) { try { fs.unlinkSync(path.join(CACHE, f)); } catch (e) {} } }); } catch (e) {} }

  /* ---------- SpreadsheetApp (ແຜ່ນງານ = ໄຟລ໌ JSON; ແກ້ໃນໜ່ວຍຄວາມຈຳ ແລ້ວຂຽນຕອນ flush) ---------- */
  let book = null; /* ຕໍ່ 1 request: {name: Sheet} */
  function Sheet(name, data) { this._n = name; this._rows = (data && data.rows) || []; this._hidden = !!(data && data.hidden); this._dirty = false; this._deleted = false; }
  Sheet.prototype.getName = function () { return this._n; };
  Sheet.prototype.getLastRow = function () { let n = this._rows.length; while (n > 0 && (this._rows[n - 1] || []).every(function (v) { return v === '' || v == null; })) n--; return n; };
  Sheet.prototype.getLastColumn = function () { return this._rows.reduce(function (m, r) { return Math.max(m, (r || []).length); }, 0); };
  Sheet.prototype.getRange = function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); };
  Sheet.prototype.getDataRange = function () { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); };
  Sheet.prototype.clearContents = function () { this._rows = []; this._dirty = true; return this; };
  Sheet.prototype.clear = Sheet.prototype.clearContents;
  Sheet.prototype.appendRow = function (row) { this._rows.length = this.getLastRow(); this._rows.push(row.map(cellVal)); this._dirty = true; return this; };
  Sheet.prototype.hideSheet = function () { this._hidden = true; this._dirty = true; return this; };
  Sheet.prototype.showSheet = function () { this._hidden = false; this._dirty = true; return this; };
  Sheet.prototype.isSheetHidden = function () { return this._hidden; };
  Sheet.prototype.setFrozenRows = function () { return this; };
  Sheet.prototype.setName = function (n) { const old = this._n; this._n = String(n); delete book[old]; book[this._n] = this; this._dirty = true; this._renamedFrom = old; return this; };
  function cellVal(v) { if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString(); return v == null ? '' : v; }
  function Range(sh, r, c, nr, nc) { this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Range.prototype.getValues = function () { const out = []; for (let i = 0; i < this.nr; i++) { const src = this.sh._rows[this.r - 1 + i] || [], row = []; for (let j = 0; j < this.nc; j++) { const v = src[this.c - 1 + j]; row.push(v == null ? '' : v); } out.push(row); } return out; };
  Range.prototype.getValue = function () { return this.getValues()[0][0]; };
  Range.prototype.setValues = function (vals) { for (let i = 0; i < vals.length; i++) { const ri = this.r - 1 + i; while (this.sh._rows.length <= ri) this.sh._rows.push([]); const row = this.sh._rows[ri]; for (let j = 0; j < vals[i].length; j++) { while (row.length < this.c - 1 + j) row.push(''); row[this.c - 1 + j] = cellVal(vals[i][j]); } } this.sh._dirty = true; return this; };
  Range.prototype.setValue = function (v) { return this.setValues([[v]]); };
  Range.prototype.clearContent = function () { const blank = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(''); blank.push(row); } return this.setValues(blank); };
  function loadBook() { if (book) return book; book = {}; return book; }
  function getSheet(name) {
    loadBook(); name = String(name);
    if (book[name]) return book[name]._deleted ? null : book[name];
    const f = path.join(SHEETS, enc(name)); if (!fs.existsSync(f)) return null;
    const sh = new Sheet(name, readJson(f, { rows: [] })); book[name] = sh; return sh;
  }
  function listNames() { loadBook(); const s = {}; try { fs.readdirSync(SHEETS).forEach(function (f) { if (/\.json$/.test(f)) s[decodeURIComponent(f.slice(0, -5))] = 1; }); } catch (e) {} Object.keys(book).forEach(function (n) { if (book[n]._deleted) delete s[n]; else s[n] = 1; }); return Object.keys(s); }
  const ss = {
    getId: function () { return 'local'; },
    getName: function () { return 'ST POS DB'; },
    getSheetByName: function (n) { return getSheet(n); },
    insertSheet: function (n) { loadBook(); n = String(n || ('Sheet' + Date.now())); const sh = new Sheet(n, null); sh._dirty = true; book[n] = sh; return sh; },
    getSheets: function () { return listNames().sort().map(getSheet).filter(Boolean); },
    deleteSheet: function (sh) { loadBook(); sh._deleted = true; sh._dirty = true; book[sh._n] = sh; }
  };
  function flush() {
    if (!book) return;
    Object.keys(book).forEach(function (n) {
      const sh = book[n]; if (!sh._dirty) return;
      const f = path.join(SHEETS, enc(n));
      if (sh._renamedFrom) { try { fs.unlinkSync(path.join(SHEETS, enc(sh._renamedFrom))); } catch (e) {} sh._renamedFrom = null; }
      if (sh._deleted) { try { fs.unlinkSync(f); } catch (e) {} delete book[n]; return; }
      writeAtomic(f, JSON.stringify({ rows: sh._rows.slice(0, sh.getLastRow()), hidden: sh._hidden }));
      sh._dirty = false;
    });
  }
  const SpreadsheetApp = { getActiveSpreadsheet: function () { return ss; }, openById: function () { return ss; }, create: function () { return ss; }, flush: flush };

  /* ---------- Utilities ---------- */
  function Blob(buf, type, name) { this._b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || ''); this._t = type || ''; this._n = name || ''; }
  Blob.prototype.getBytes = function () { return this._b; };
  Blob.prototype.getDataAsString = function (cs) { return this._b.toString(/^utf-?8$/i.test(cs || 'utf-8') ? 'utf8' : 'latin1'); };
  Blob.prototype.getContentType = function () { return this._t; };
  Blob.prototype.getName = function () { return this._n; };
  Blob.prototype.setName = function (n) { this._n = n; return this; };
  Blob.prototype.setContentType = function (t) { this._t = t; return this; };
  function toBuf(x) { if (x instanceof Blob) return x._b; if (Buffer.isBuffer(x)) return x; if (Array.isArray(x)) return Buffer.from(x.map(function (b) { return b & 255; })); return Buffer.from(String(x == null ? '' : x), 'utf8'); }
  const TZ = { 'GMT+7': 420, 'Asia/Vientiane': 420, 'Asia/Bangkok': 420, 'Asia/Ho_Chi_Minh': 420, 'UTC': 0, 'GMT': 0 };
  function tzOffset(tz) { if (TZ[tz] !== undefined) return TZ[tz]; const m = /^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(tz || ''); if (m) return (m[1] === '-' ? -1 : 1) * ((+m[2]) * 60 + (+m[3] || 0)); return 420; }
  function formatDate(date, tz, pat) {
    const d = new Date(new Date(date).getTime() + tzOffset(tz) * 60000), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
    const map = { yyyy: String(d.getUTCFullYear()), yy: String(d.getUTCFullYear()).slice(-2), MM: p2(d.getUTCMonth() + 1), dd: p2(d.getUTCDate()), HH: p2(d.getUTCHours()), mm: p2(d.getUTCMinutes()), ss: p2(d.getUTCSeconds()) };
    return String(pat).replace(/yyyy|yy|MM|dd|HH|mm|ss/g, function (t) { return map[t]; });
  }
  const Utilities = {
    Charset: { UTF_8: 'UTF-8', US_ASCII: 'US-ASCII' },
    formatDate: formatDate,
    formatString: function (fmt) { const a = Array.prototype.slice.call(arguments, 1); let i = 0; return String(fmt).replace(/%[sdf]/g, function () { return String(a[i++]); }); },
    newBlob: function (data, type, name) { return new Blob(toBuf(data), type, name); },
    gzip: function (blob, name) { return new Blob(zlib.gzipSync(toBuf(blob)), 'application/x-gzip', name || ''); },
    ungzip: function (blob) { return new Blob(zlib.gunzipSync(toBuf(blob))); },
    base64Encode: function (data) { return toBuf(data).toString('base64'); },
    base64Decode: function (s) { return Buffer.from(String(s), 'base64'); },
    base64EncodeWebSafe: function (data) { return toBuf(data).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'); },
    base64DecodeWebSafe: function (s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); },
    computeHmacSha256Signature: function (v, key) { return crypto.createHmac('sha256', toBuf(key)).update(toBuf(v)).digest(); },
    computeDigest: function (alg, v) { return crypto.createHash(String(alg).toLowerCase().replace(/_/g, '')).update(toBuf(v)).digest(); },
    DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5', SHA_1: 'sha1' },
    getUuid: function () { return crypto.randomUUID(); },
    sleep: sleep
  };

  /* ---------- UrlFetchApp (synchronous: ແລ່ນ fetch ໃນ process ລູກ) ---------- */
  const FETCH_CHILD = "let i='';process.stdin.on('data',d=>i+=d).on('end',async()=>{const q=JSON.parse(i);let body;"
    + "if(q.form){body=new FormData();for(const k in q.form){const v=q.form[k];if(v&&v.__blob)body.append(k,new Blob([Buffer.from(v.b64,'base64')],{type:v.type}),v.name||'file');else body.append(k,String(v));}}else if(q.body!=null)body=q.body;"
    + "try{const ac=new AbortController();setTimeout(()=>ac.abort(),q.timeout);const r=await fetch(q.url,{method:q.method,headers:q.headers,body,signal:ac.signal});const t=await r.text();process.stdout.write(JSON.stringify({code:r.status,text:t}));}"
    + "catch(e){process.stdout.write(JSON.stringify({err:String(e&&e.message||e)}));}});";
  const UrlFetchApp = {
    fetch: function (url, o) {
      o = o || {}; const q = { url: String(url), method: String(o.method || 'get').toUpperCase(), headers: Object.assign({}, o.headers || {}), timeout: 30000 };
      const pl = o.payload;
      if (pl != null && typeof pl === 'object' && !(pl instanceof Blob) && !Buffer.isBuffer(pl)) {
        q.form = {}; Object.keys(pl).forEach(function (k) { const v = pl[k]; q.form[k] = v instanceof Blob ? { __blob: 1, b64: v._b.toString('base64'), type: v._t, name: v._n } : v; });
      } else if (pl != null) { q.body = String(pl); if (o.contentType) q.headers['Content-Type'] = o.contentType; }
      const r = spawnSync(process.execPath, ['-e', FETCH_CHILD], { input: JSON.stringify(q), timeout: 40000, maxBuffer: 20 * 1024 * 1024 });
      let res = {}; try { res = JSON.parse(String(r.stdout || '')); } catch (e) { res = { err: 'fetch failed' }; }
      if (res.err) { if (o.muteHttpExceptions) return { getResponseCode: function () { return 0; }, getContentText: function () { return res.err; } }; throw new Error(res.err); }
      return { getResponseCode: function () { return res.code; }, getContentText: function () { return res.text; }, getBlob: function () { return new Blob(Buffer.from(res.text)); } };
    }
  };

  /* ---------- ScriptApp: trigger ແບບລາຍວັນ (cron ຂອງ cPanel ເອີ້ນ runDue ທຸກຊົ່ວໂມງ) ---------- */
  function trigList() { try { return JSON.parse(props.getProperty('__TRIGGERS') || '[]'); } catch (e) { return []; } }
  function trigSave(l) { props.setProperty('__TRIGGERS', JSON.stringify(l)); }
  function trigObj(t) { return { getHandlerFunction: function () { return t.fn; }, getUniqueId: function () { return t.id; }, _t: t }; }
  const ScriptApp = {
    getProjectTriggers: function () { return trigList().map(trigObj); },
    deleteTrigger: function (o) { trigSave(trigList().filter(function (t) { return t.id !== (o._t && o._t.id); })); },
    newTrigger: function (fn) {
      const t = { id: crypto.randomUUID(), fn: String(fn), hour: 0, tz: 'GMT+7', last: '' };
      const b = { timeBased: function () { return b; }, everyDays: function () { return b; }, atHour: function (h) { t.hour = +h || 0; return b; }, nearMinute: function () { return b; }, inTimezone: function (z) { t.tz = z; return b; },
        create: function () { const l = trigList(); l.push(t); trigSave(l); return trigObj(t); } };
      return b;
    }
  };
  /* ແລ່ນ trigger ທີ່ຮອດເວລາ (ຊົ່ວໂມງປັດຈຸບັນ ≥ ຊົ່ວໂມງທີ່ຕັ້ງ ແລະ ມື້ນີ້ຍັງບໍ່ໄດ້ແລ່ນ) */
  function runDue(ctx, now) {
    now = now || new Date(); const out = [];
    trigList().forEach(function (t) {
      const day = formatDate(now, t.tz, 'yyyy-MM-dd'), hr = +formatDate(now, t.tz, 'HH');
      if (t.last === day || hr < t.hour) return;
      const l = trigList(), me = l.filter(function (x) { return x.id === t.id; })[0]; if (!me || me.last === day) return;
      me.last = day; trigSave(l);
      let res; try { res = typeof ctx[t.fn] === 'function' ? ctx[t.fn]() : 'missing'; } catch (e) { res = 'ERR ' + (e && e.message || e); }
      out.push({ fn: t.fn, res: typeof res === 'string' ? res : JSON.stringify(res) });
    });
    return out;
  }

  /* ---------- ContentService / HtmlService / Logger ---------- */
  function TextOutput(s) { this.s = String(s == null ? '' : s); this.mime = 'text/plain'; }
  TextOutput.prototype.setMimeType = function (m) { this.mime = m; return this; };
  TextOutput.prototype.getContent = function () { return this.s; };
  const ContentService = { createTextOutput: function (s) { return new TextOutput(s); }, MimeType: { JAVASCRIPT: 'application/javascript', JSON: 'application/json', TEXT: 'text/plain' } };
  const chain = { setTitle: function () { return chain; }, addMetaTag: function () { return chain; }, setXFrameOptionsMode: function () { return chain; }, getContent: function () { return ''; } };
  const HtmlService = { createHtmlOutputFromFile: function () { return chain; }, XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' } };
  const logs = [];
  const Logger = { log: function () { const s = Array.prototype.slice.call(arguments).join(' '); logs.push(s); if (logs.length > 50) logs.shift(); return Logger; } };

  use(dataDir);
  return {
    use: use, dir: function () { return D; },
    writeAtomic: writeAtomic,
    globals: { PropertiesService: PropertiesService, LockService: LockService, CacheService: CacheService, SpreadsheetApp: SpreadsheetApp, Utilities: Utilities, UrlFetchApp: UrlFetchApp, ScriptApp: ScriptApp, ContentService: ContentService, HtmlService: HtmlService, Logger: Logger },
    beginRequest: function () { book = null; },
    endRequest: function () { try { flush(); } finally { book = null; } },
    runDue: runDue, sweepCache: sweepCache, props: props, logs: logs, dataDir: path.resolve(dataDir), formatDate: formatDate
  };
}
module.exports = { create: create };
