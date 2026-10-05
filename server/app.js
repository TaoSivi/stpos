/* ST POS server ສຳລັບໂຮສຂອງຮ້ານ (cPanel → Setup Node.js App)
 * ແລ່ນ Code.gs ເດີມ (ຄືກັບໃນ Google Apps Script) — ແອັບຮັບ-ສົ່ງຂໍ້ມູນແບບດຽວກັນທຸກຢ່າງ
 * ຄ່າໃນ env (Setup Node.js App → Environment variables):
 *   DATA_DIR   ໂຟນເດີເກັບຂໍ້ມູນ (ຄ່າເລີ່ມຕົ້ນ ~/stpos-data — ຢູ່ນອກ public_html)
 *   API_TOKEN  ລະຫັດທີ່ແອັບຕ້ອງສົ່ງມາ (ຄວນຕັ້ງ!) — ເຄື່ອງທຸກເຄື່ອງໃສ່ token ດຽວກັນ
 *   ADMIN_KEY  ລະຫັດສຳລັບຄຳສັ່ງຜູ້ດູແລ (?admin=...) — ບໍ່ຕັ້ງ = ປິດ
 *   CRON_KEY   ລະຫັດສຳລັບ cron ທຸກຊົ່ວໂມງ (?cron=...) — ສຳຮອງ 03:00 + ລາຍງານປະຈຳວັນ
 *   WA_CALLMEBOT, REPORT_HOUR, TG_BOT, TG_CHAT  (ຄືກັບ Script Properties ເດີມ) */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

/* secrets.json ຂ້າງ app.js (ສ້າງໃນຄອມ, ບໍ່ຂຶ້ນ GitHub) ມີສິດກ່ອນ env — ບໍ່ຕ້ອງພິມລະຫັດໃນ cPanel */
if (!process.env.STPOS_NO_SECRETS) try { const sec = JSON.parse(fs.readFileSync(path.join(__dirname, 'secrets.json'), 'utf8')); ['API_TOKEN', 'ADMIN_KEY', 'CRON_KEY'].forEach(function (k) { if (typeof sec[k] === 'string' && sec[k].length >= 16) process.env[k] = sec[k]; }); } catch (e) {}
const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), 'stpos-data');
const shim = require('./gas-shim').create(DATA_DIR);
Object.assign(global, shim.globals);
const codePath = [path.join(__dirname, 'Code.gs'), path.join(__dirname, '..', 'Code.gs')].filter(fs.existsSync)[0];
if (!codePath) throw new Error('Code.gs not found next to app.js');
vm.runInThisContext(fs.readFileSync(codePath, 'utf8'), { filename: 'Code.gs' });
const G = global;

/* ===== ຫຼາຍສາຂາ ໃນ server ດຽວ: ຂໍ້ມູນແຍກຫ້ອງຕາມສາຂາ =====
 * branches.json = [{id, name, type, dir, ts}] · ສາຂາ b1 = ໂຟນເດີເດີມ (DATA_DIR) — ຂໍ້ມູນເກົ່າບໍ່ຍ້າຍ · ສາຂາໃໝ່ = DATA_DIR/b/<id>
 * ເສັ້ນທາງ: /api ຫຼື /api/b1 = ສາຂາ b1 · /api/<id> = ສາຂານັ້ນ (ແອັບແຕ່ລະເຄື່ອງຜູກກັບສາຂາດ້ວຍລິ້ງ server ຂອງມັນ) */
const BR_FILE = path.join(DATA_DIR, 'branches.json');
let CURBR = { id: 'b1', dir: '.' };
function atomicWrite0(f, data) { shim.writeAtomic(f, data); }
function branches() { try { const l = JSON.parse(fs.readFileSync(BR_FILE, 'utf8')); if (Array.isArray(l) && l.length) return l; } catch (e) {} return [{ id: 'b1', name: '', type: 'branch', dir: '.', ts: 0 }]; }
function brDir(b) { return b.dir === '.' ? DATA_DIR : path.join(DATA_DIR, b.dir); }
function brFind(id) { return branches().filter(function (b) { return b.id === id; })[0] || null; }
/* ສາຂາຈາກ path: ສ່ວນສຸດທ້າຍ (ບໍ່ແມ່ນ 'api') = id ສາຂາ */
function brFromPath(pathname) { const seg = String(pathname || '').split('/').filter(Boolean), last = (seg[seg.length - 1] || '').toLowerCase(); if (!last || last === 'api') return brFind('b1') || branches()[0]; return /^[a-z0-9_-]{1,32}$/.test(last) ? brFind(last) : null; }
function useBranch(b) { CURBR = b; shim.use(brDir(b)); }
/* ສາຂາໃໝ່ ສຳເນົາ "ການຕັ້ງຄ່າ" ຈາກສາຂາແມ່ແບບ (ເມນູ ສູດ ວັດຖຸດິບ ຜັງໂຕະ ການຊຳລະ workflow ຜູ້ໃຊ້) · "ການເຄື່ອນໄຫວ" ເລີ່ມວ່າງ */
const BR_RESET = { orders: [], bills: [], expenses: [], menuLog: [], orderLog: [], shiftLog: [], stockLog: [], cancelLog: [], prs: [], pos: [], grns: [], transfers: [], reqs: [], chkSubs: [], stockCounts: [], resv: [], stockAdj: [], wastes: [], dlSettles: [], costAlerts: [], kdsLog: [], customers: [], _custDel: [], draft: [], qr: {}, soldOut: {}, chkSets: {}, ingDel: {} };
const BR_DROP = ['curShift', 'activeShift', 'activeStaff', 'activeTable', 'activeCat', 'activeSub', '_srcLoc', '_v', 'servedToday', '_reset'];
function branchTemplate(st, name, id, type) {
  const n = JSON.parse(JSON.stringify(st || {}));
  BR_DROP.forEach(function (k) { delete n[k]; });
  Object.keys(BR_RESET).forEach(function (k) { if (k in n) n[k] = JSON.parse(JSON.stringify(BR_RESET[k])); });
  n.orderNo = 1; n.receiptSeq = 0; n.transferSeq = 0; n.shopName = name; n.branchId = id;
  n.locations = [{ id: 'main', name: name, type: type === 'warehouse' ? 'warehouse' : 'branch', active: true }];
  Object.keys(n.ingredients || {}).forEach(function (k) { const it = n.ingredients[k]; it.locs = { main: 0 }; it.stock = 0; delete it.lastIn; });
  const tb = {}; Object.keys(n.tables || {}).forEach(function (k) { const t = n.tables[k]; if (!t || t.dl) return; /* ອໍເດີ delivery ບໍ່ສຳເນົາ */
    const c = JSON.parse(JSON.stringify(t)); ['items', 'customer', 'main', 'mergedInto', 'reserved', 'memberId', 'billTs', 'del', 'sd', 'pkO', 'callTs', 'upd'].forEach(function (f) { delete c[f]; });
    c.status = 'free'; c.items = []; c.customer = null; c.dv = 1; c.upd = Date.now(); tb[k] = c; }); /* ເກັບຜັງ (ຊັ້ນ ຕຳແໜ່ງ ຮູບຮ່າງ ບ່ອນນັ່ງ) */
  n.tables = tb; n._v = Date.now();
  return n;
}

/* ===== delta sync: ຮັບ/ສົ່ງສະເພາະສ່ວນທີ່ປ່ຽນ (ໂຄດລວມຂໍ້ມູນໃນ Code.gs ຄືເກົ່າທຸກຢ່າງ) =====
 * hist/<hash>.json.gz = ສະບັບທີ່ຜ່ານມາ (ເກັບ HIST_KEEP ສະບັບລ່າສຸດ) ໃຫ້ເຄື່ອງທີ່ມີສະບັບນັ້ນ ຂໍສະເພາະສ່ວນຕ່າງ
 * hist/current.json = {v, h, len} ຂອງຂໍ້ມູນປັດຈຸບັນ · hash = sha256(canon) ກວດໄດ້ທັງສອງຝັ່ງ */
const zlib = require('zlib');
const STDelta = require('./delta');
const HIST_KEEP = 150;
function histDir() { const d = path.join(shim.dir(), 'hist'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); return d; } /* ຕໍ່ສາຂາ */
function curFile() { return path.join(histDir(), 'current.json'); }
function hashOf(obj) { return crypto.createHash('sha256').update(STDelta.canon(obj)).digest('hex').slice(0, 32); }
function readCur() { try { return JSON.parse(fs.readFileSync(curFile(), 'utf8')); } catch (e) { return null; } }
function atomicWrite(f, data) { shim.writeAtomic(f, data); }
function histGet(h) { if (!/^[0-9a-f]{32}$/.test(String(h || ''))) return null; try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(histDir(), h + '.json.gz'))).toString('utf8')); } catch (e) { return null; } }
function histPrune() {
  try {
    const H = histDir(), fl = fs.readdirSync(H).filter(function (f) { return /\.json\.gz$/.test(f); }).map(function (f) { return { f: f, t: fs.statSync(path.join(H, f)).mtimeMs }; }).sort(function (a, b) { return b.t - a.t; });
    fl.slice(HIST_KEEP).forEach(function (x) { try { fs.unlinkSync(path.join(H, x.f)); } catch (e) {} });
  } catch (e) {}
}
function stateV() { return +(shim.props.getProperty('STATE_V') || 0); }
/* ຈື່ສະບັບປັດຈຸບັນ (ເອີ້ນຫຼັງ request ທີ່ອາດຂຽນຂໍ້ມູນ ຫຼື ເມື່ອ current.json ບໍ່ກົງ STATE_V) */
function refreshCur(s) {
  if (s === undefined) s = G.getState_();
  if (!s) return null;
  const c0 = readCur(), v = stateV();
  if (c0 && c0.v === v && c0.len === s.length) return c0;
  let obj; try { obj = JSON.parse(s); } catch (e) { return null; }
  const h = hashOf(obj), f = path.join(histDir(), h + '.json.gz');
  if (!fs.existsSync(f)) atomicWrite(f, zlib.gzipSync(s)); else { const t = new Date(); try { fs.utimesSync(f, t, t); } catch (e) {} }
  const c = { v: v, h: h, len: s.length }; atomicWrite(curFile(), JSON.stringify(c)); histPrune();
  return c;
}
function curInfo() { const c = readCur(); return (c && c.v === stateV()) ? c : refreshCur(); }
/* ===== ເຂົ້າລະບົບດ້ວຍ PIN ຢູ່ server → ລະຫັດປະຈຳເຄື່ອງ (session) ແທນ API_TOKEN ຫຼັກ =====
 * ລິ້ງ/QR ພະນັກງານ ບໍ່ຕ້ອງມີ token: ເຄື່ອງໃໝ່ເລືອກຜູ້ໃຊ້ + PIN → server ກວດ PIN (pinH ຄືໃນແອັບ) → ອອກ session (HMAC, 180 ມື້)
 * session ຜູກກັບ PIN ປັດຈຸບັນ: ປ່ຽນ PIN = ເຄື່ອງຂອງຜູ້ນັ້ນຕ້ອງເຂົ້າລະບົບໃໝ່ · ປ່ຽນ API_TOKEN = ທຸກເຄື່ອງເຂົ້າລະບົບໃໝ່
 * ກັນເດົາ PIN: ຜິດ 10 ເທື່ອ/ຜູ້ໃຊ້ ຫຼື 30 ເທື່ອ/IP ໃນ 15 ນາທີ → ລັອກ 15 ນາທີ */
function apiToken() { return String(shim.props.getProperty('API_TOKEN') || '').trim(); }
function pinHash(p) { p = 'stpos:' + String(p == null ? '' : p); let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; let h2 = 52711; for (let j = p.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + p.charCodeAt(j)) | 0; return 'h' + (h >>> 0).toString(16) + '.' + (h2 >>> 0).toString(16); }
function userPinH(u) { return u ? (u.pinH || (u.pin != null ? pinHash(u.pin) : '')) : ''; }
function sessKey() { return crypto.createHmac('sha256', apiToken() || String(process.env.ADMIN_KEY || 'stpos')).update('stpos-session-v1').digest(); }
function sessSign(v) { return crypto.createHmac('sha256', sessKey()).update(v).digest('base64url'); }
function sessMake(u) { const v = Buffer.from(JSON.stringify({ u: u.id, b: CURBR.id, e: Date.now() + 180 * 86400000, p: userPinH(u).slice(-6) })).toString('base64url'); return 's1.' + v + '.' + sessSign(v); }
function stateUsers() { try { const s = G.getState_(); return s ? (JSON.parse(s).users || []) : []; } catch (e) { return []; } }
/* session ໃຊ້ໄດ້ສະເພາະສາຂາທີ່ເຂົ້າລະບົບ (b) — ຍົກເວັ້ນ superadmin ທີ່ມີບັນຊີ (PIN ດຽວກັນ) ໃນສາຂານັ້ນ · ຄືນ {id, role} ຫຼື null */
function sessUser(tk) {
  tk = String(tk || ''); if (tk.indexOf('s1.') !== 0) return null;
  const parts = tk.split('.'); if (parts.length !== 3) return null;
  const a = Buffer.from(sessSign(parts[1])), b = Buffer.from(parts[2]); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let o; try { o = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!o || !(o.e > Date.now())) return null;
  const other = (o.b || 'b1') !== CURBR.id;
  const cache = CacheService.getScriptCache(), ck = 'sessu2_' + o.u + '_' + o.p + '_' + stateV(), hit = cache.get(ck);
  if (hit === '0') return null; if (hit) { const h0 = JSON.parse(hit); return (other && h0.role !== 'superadmin') ? null : h0; }
  const u = stateUsers().filter(function (x) { return x && x.id === o.u; })[0], ok = !!u && userPinH(u).slice(-6) === o.p;
  const r = ok ? { id: u.id, role: u.role || '' } : null; cache.put(ck, r ? JSON.stringify(r) : '0', 300); return (r && other && r.role !== 'superadmin') ? null : r;
}
function sessOk(tk) { return !!sessUser(tk); }
/* ແປ session → API_TOKEN ກ່ອນສົ່ງໃຫ້ Code.gs (Code.gs ບໍ່ຕ້ອງແກ້) */
function liftToken(q) {
  const t = apiToken(); if (!t) return;
  if (q.token && q.token !== t && sessOk(q.token)) q.token = t;
  if (q.chat === '1' && q.p) { try { const p = JSON.parse(q.p); if (p && p.token && p.token !== t && sessOk(p.token)) { p.token = t; q.p = JSON.stringify(p); } } catch (e) {} }
}
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function loginApi(q, req) {
  if (q.login === 'info') {
    const s = G.getState_(); let st = {}; try { st = s ? JSON.parse(s) : {}; } catch (e) {}
    return { ok: true, login: 1, shop: st.shopName || '', users: (st.users || []).filter(function (u) { return u && u.active !== false; }).map(function (u) { return { id: u.id, name: u.name || '', role: u.role || '' }; }) };
  }
  if (q.login === 'branches') /* ໜ້າເປີດແອັບຄັ້ງທຳອິດ (stpos.store ທຳມະດາ): ໃຫ້ເລືອກສາຂາ — ຊື່ ແລະ ລິ້ງເທົ່ານັ້ນ */
    return { ok: true, login: 1, branches: brList(req).map(function (b) { return { id: b.id, name: b.name, type: b.type, url: b.url }; }) };
  if (q.login === 'pin') {
    const cache = CacheService.getScriptCache(), uid = String(q.uid || '').slice(0, 80), ip = clientIp(req);
    const ku = 'lfu_' + uid, ki = 'lfi_' + ip, nu = +(cache.get(ku) || 0), ni = +(cache.get(ki) || 0);
    if (nu >= 10 || ni >= 30) return { ok: false, err: 'locked', msg: 'ໃສ່ PIN ຜິດຫຼາຍເທື່ອ — ລໍ 15 ນາທີ' };
    const u = stateUsers().filter(function (x) { return x && x.id === uid; })[0];
    if (u && u.active !== false && userPinH(u) && userPinH(u) === pinHash(String(q.pin || ''))) { cache.remove(ku); return { ok: true, tk: sessMake(u), uid: u.id, name: u.name || '' }; }
    cache.put(ku, String(nu + 1), 900); cache.put(ki, String(ni + 1), 900);
    return { ok: false, err: 'pin', left: Math.max(0, 9 - nu) };
  }
  return { ok: false, err: 'login' };
}
/* ===== ສ່ວນກາງ (HQ): ລາຍຊື່ / ສ້າງ / ປ່ຽນຊື່ສາຂາ — ສະເພາະ API_TOKEN ຫຼັກ ຫຼື ຜູ້ໃຊ້ superadmin ===== */
function hqAuth(q) { const t = apiToken(); if (!t) return true; if (q.token === t) return true; const u = sessUser(q.token); return !!(u && u.role === 'superadmin'); }
function brUrl(req, id) { const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'stpos.store').split(',')[0].trim(); const proto = String(req.headers['x-forwarded-proto'] || (/^(localhost|127\.)/.test(host) ? 'http' : 'https')).split(',')[0].trim(); return proto + '://' + host + '/api/' + id; }
function brList(req) { return branches().map(function (b) { return { id: b.id, name: b.name || b.id, type: b.type || 'branch', url: brUrl(req, b.id) }; }); }
function hqApi(q, req) {
  if (!hqAuth(q)) return { ok: false, err: 'token' };
  const a = String(q.hq);
  if (a === 'list') return { ok: true, hq: 1, cur: CURBR.id, branches: brList(req) };
  if (a === 'add') {
    const name = String(q.name || '').replace(/[<>]/g, '').trim().slice(0, 60), type = q.type === 'warehouse' ? 'warehouse' : 'branch';
    if (!name) return { ok: false, err: 'ໃສ່ຊື່ສາຂາ' };
    const L = branches(); if (L.some(function (b) { return (b.name || '') === name; })) return { ok: false, err: 'ມີຊື່ນີ້ແລ້ວ' };
    const tpl = brFind(String(q.from || 'b1')) || L[0]; let n = L.length + 1; while (brFind('b' + n)) n++;
    const nb = { id: 'b' + n, name: name, type: type, dir: 'b/b' + n, ts: Date.now() }, prev = CURBR;
    shim.endRequest(); useBranch(tpl); shim.beginRequest();
    const ts = G.getState_(); if (!ts) { useBranch(prev); shim.beginRequest(); return { ok: false, err: 'ສາຂາແມ່ແບບບໍ່ມີຂໍ້ມູນ' }; }
    const json = JSON.stringify(branchTemplate(JSON.parse(ts), name, nb.id, type));
    shim.endRequest(); useBranch(nb); shim.beginRequest();
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try { G.saveStateRaw_(json, true); } finally { lock.releaseLock(); }
    G.setupBackup(); shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {} shim.endRequest();
    L.push(nb); atomicWrite0(BR_FILE, JSON.stringify(L, null, 1));
    useBranch(prev); shim.beginRequest();
    return { ok: true, id: nb.id, name: name, url: brUrl(req, nb.id), branches: brList(req) };
  }
  if (a === 'rename') {
    const L = branches(), b = L.filter(function (x) { return x.id === q.id; })[0], name = String(q.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
    if (!b || !name) return { ok: false, err: 'id/name' }; b.name = name; atomicWrite0(BR_FILE, JSON.stringify(L, null, 1)); return { ok: true, branches: brList(req) };
  }
  return { ok: false, err: 'hq' };
}
function jsonpOut(res, cb, payload) { send(res, 200, String(cb).replace(/[^\w$.]/g, '') + '(' + JSON.stringify(payload) + ')', 'application/javascript'); }
/* POST ແບບ DZ: = {b: hash ສະບັບພື້ນ, p: patch, h: hash ຜົນ} → ປະກອບເປັນ JSON ເຕັມ ແລ້ວສົ່ງເຂົ້າ doPost ຄືເກົ່າ; ຜິດ = 'resend' (ແອັບສົ່ງເຕັມແທນ) */
function expandDeltaBody(body) {
  try {
    const o = JSON.parse(zlib.gunzipSync(Buffer.from(body.substring(3), 'base64')).toString('utf8'));
    const base = histGet(o.b); if (!base || !o.p) return null;
    const r = STDelta.apply(base, o.p); if (hashOf(r) !== o.h) return null;
    return JSON.stringify(r);
  } catch (e) { return null; }
}

/* ເທື່ອທຳອິດ: ຕັ້ງສຳຮອງອັດຕະໂນມັດທຸກມື້ 03:00 (ເກັບ 14 ມື້) + ທະບຽນສາຂາ (b1 = ຂໍ້ມູນເດີມ, ຊື່ຕາມຊື່ຮ້ານ) */
useBranch(brFind('b1') || branches()[0]); shim.beginRequest();
try {
  if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'backupDaily'; })) G.setupBackup();
  if (!fs.existsSync(BR_FILE)) { let nm = ''; try { nm = (JSON.parse(G.getState_() || '{}').shopName) || ''; } catch (e) {} atomicWrite0(BR_FILE, JSON.stringify([{ id: 'b1', name: nm || 'ສາຂາ 1', auto: !nm, type: 'branch', dir: '.', ts: Date.now() }], null, 1)); }
} finally { shim.endRequest(); }

const ADMIN_FN = ['installDailyReport', 'removeDailyReport', 'testDailyReport', 'setupTelegram', 'setupBackup', 'backupDaily', 'rebuild', 'dailyReport'];
const MAX_BODY = 60 * 1024 * 1024;
function keyOk(given, name) { const k = String(process.env[name] || shim.props.getProperty(name) || ''); if (k.length < 8) return false; const a = Buffer.from(String(given || '')), b = Buffer.from(k); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': (type || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); }
function out(res, o) { send(res, 200, o.getContent(), o.mime); }

/* ດຶງຂໍ້ມູນຮ້ານຈາກ Google Apps Script ເດີມ (ຍ້າຍຂໍ້ມູນເທື່ອດຽວ) */
function pullFromGas(url, token) {
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return { ok: false, err: 'url' };
  const r = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=cb&token=' + encodeURIComponent(token || ''), { muteHttpExceptions: true, followRedirects: true });
  const t = r.getContentText(), m = /^\s*cb\(([\s\S]*)\)\s*;?\s*$/.exec(t);
  if (!m) return { ok: false, err: 'HTTP ' + r.getResponseCode() + ' ' + t.slice(0, 120) };
  const p = JSON.parse(m[1]); if (!p.ok || !p.state) return { ok: false, err: p.err || 'empty' };
  const st = JSON.parse(p.state);
  return { ok: true, json: p.state, bills: (st.bills || []).length, tables: Object.keys(st.tables || {}).length, ingredients: Object.keys(st.ingredients || {}).length };
}

function handle(req, res, body) {
  const u = new URL(req.url, 'http://x'), q = {};
  u.searchParams.forEach(function (v, k) { q[k] = v; });
  if (q.cron !== undefined) {                       /* cron: ແລ່ນວຽກຕາມເວລາ ທຸກສາຂາ */
    if (!keyOk(q.cron, 'CRON_KEY')) return send(res, 403, 'denied');
    const ran = [];
    branches().forEach(function (b) { try { useBranch(b); shim.beginRequest(); shim.runDue(G).forEach(function (x) { x.b = b.id; ran.push(x); }); shim.sweepCache(); } catch (e) { ran.push({ b: b.id, err: String(e && e.message || e) }); } finally { shim.endRequest(); } });
    return send(res, 200, JSON.stringify({ ok: true, ran: ran, branches: ran.length >= 0 ? branches().length : 0, at: new Date().toISOString() }), 'application/json');
  }
  const br = brFromPath(u.pathname);
  if (!br) return q.callback ? jsonpOut(res, q.callback, { ok: false, err: 'branch' }) : send(res, 404, 'no such branch');
  useBranch(br); shim.beginRequest();
  if (q.admin !== undefined) {
    if (!keyOk(q.key, 'ADMIN_KEY')) return send(res, 403, 'denied');
    const a = String(q.admin);
    if (a === 'status') {
      const s = G.getState_(); let info = { bytes: s.length };
      try { const st = JSON.parse(s || '{}'); info.shop = st.shopName; info.bills = (st.bills || []).length; info.v = st._v; } catch (e) {}
      info.backups = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf('BAK_') === 0; });
      info.triggers = ScriptApp.getProjectTriggers().map(function (t) { return t._t; });
      info.token = !!(shim.props.getProperty('API_TOKEN') || '').trim(); info.node = process.version; info.dataDir = shim.dir(); info.branch = CURBR.id; info.branches = branches().map(function (b) { return b.id + ':' + (b.name || ''); });
      return send(res, 200, JSON.stringify(info, null, 1), 'application/json');
    }
    if (a === 'pullgas' || a === 'import') {
      let json;
      if (a === 'pullgas') { const r = pullFromGas(String(q.url || ''), String(q.gtoken || '')); if (!r.ok) return send(res, 200, JSON.stringify(r), 'application/json'); json = r.json; }
      else { json = body; if (json.indexOf('GZ:') === 0) json = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(json.substring(3)))).getDataAsString('UTF-8'); }
      let st; try { st = JSON.parse(json); } catch (e) { return send(res, 400, JSON.stringify({ ok: false, err: 'json' }), 'application/json'); }
      if (!st || typeof st !== 'object' || (!st.catalog && !st.bills)) return send(res, 400, JSON.stringify({ ok: false, err: 'not ST POS data' }), 'application/json');
      if (G.getState_() && q.force !== '1') return send(res, 409, JSON.stringify({ ok: false, err: 'server ມີຂໍ້ມູນແລ້ວ — ໃສ່ &force=1 ຖ້າຕ້ອງການຂຽນທັບ (ສຳຮອງໃຫ້ກ່ອນອັດຕະໂນມັດ)' }), 'application/json');
      if (G.getState_()) G.backupDaily();
      const lock = LockService.getScriptLock(); lock.waitLock(30000);
      try { G.saveStateRaw_(json, true); } finally { lock.releaseLock(); }
      shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {}
      const L = branches(), me = L.filter(function (b) { return b.id === CURBR.id; })[0]; /* ຊື່ສາຂາອັດຕະໂນມັດ → ຊື່ຮ້ານທີ່ນຳເຂົ້າ */
      if (me && (me.auto || !me.name) && st.shopName) { me.name = String(st.shopName).slice(0, 60); delete me.auto; atomicWrite0(BR_FILE, JSON.stringify(L, null, 1)); }
      return send(res, 200, JSON.stringify({ ok: true, bytes: json.length, bills: (st.bills || []).length, tables: Object.keys(st.tables || {}).length, ingredients: Object.keys(st.ingredients || {}).length }), 'application/json');
    }
    if (ADMIN_FN.indexOf(a) >= 0) { const r = G[a](); return send(res, 200, typeof r === 'string' ? r : JSON.stringify(r), 'text/plain'); }
    return send(res, 400, 'unknown admin');
  }
  if (q.callback && q.hq !== undefined) return jsonpOut(res, q.callback, hqApi(q, req));
  liftToken(q);
  if (q.callback && q.login !== undefined) return jsonpOut(res, q.callback, loginApi(q, req));
  if (req.method === 'POST') {
    if (body.indexOf('DZ:') === 0) {
      if (!G.tokenOk_(q.token)) return send(res, 200, 'denied');
      const full = expandDeltaBody(body); if (full === null) return send(res, 200, 'resend');
      body = full;
    }
    const r = G.doPost({ parameter: q, postData: { contents: body, length: body.length, type: req.headers['content-type'] || '' } });
    shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {}
    return out(res, r);
  }
  if (q.callback && q.ver === '1' && !q.cust && G.tokenOk_(q.token)) {   /* ເລກເວີຊັນ + hash (ແອັບຮູ້ວ່າ server ຮອງຮັບ delta) */
    const c = curInfo(); return jsonpOut(res, q.callback, { ok: true, v: stateV(), h: c ? c.h : '', dz: 1 });
  }
  if (q.callback && q.dz !== undefined && !q.cust && G.tokenOk_(q.token)) { /* ຂໍຂໍ້ມູນ: ມີສະບັບພື້ນ → ສົ່ງສະເພາະສ່ວນຕ່າງ */
    const s = G.getState_(); if (!s) return jsonpOut(res, q.callback, { ok: true, state: '', dz: 1 });
    const c = refreshCur(s) || {}, v = stateV();
    if (q.dz && q.dz === c.h) return jsonpOut(res, q.callback, { ok: true, same: 1, v: v, h: c.h, dz: 1 });
    const base = q.dz ? histGet(q.dz) : null;
    if (base) { const ps = JSON.stringify(STDelta.diff(base, JSON.parse(s))); if (ps.length < s.length * 0.6) return jsonpOut(res, q.callback, { ok: true, d: zlib.gzipSync(ps).toString('base64'), v: v, h: c.h, dz: 1 }); }
    return jsonpOut(res, q.callback, { ok: true, gz: zlib.gzipSync(s).toString('base64'), v: v, h: c.h, dz: 1 });
  }
  if (q.callback) {
    const r = G.doGet({ parameter: q });
    if (q.action || q.bak || q.arch) { shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {} }
    return out(res, r);
  }
  return send(res, 200, 'ST POS server OK');
}

const server = http.createServer(function (req, res) {
  const chunks = []; let size = 0, dead = false;
  req.on('data', function (c) { size += c.length; if (size > MAX_BODY) { dead = true; send(res, 413, 'too large'); req.destroy(); return; } chunks.push(c); });
  req.on('end', function () {
    if (dead) return;
    try { handle(req, res, Buffer.concat(chunks).toString('utf8')); }
    catch (e) { console.error(new Date().toISOString(), e && e.stack || e); if (!res.headersSent) send(res, 500, 'err'); }
    finally { try { shim.endRequest(); } catch (e2) { console.error('flush failed', e2); } }
  });
});
server.listen(process.env.PORT || 3000, function () { console.log('ST POS server on', process.env.PORT || 3000, '· data', DATA_DIR); });
module.exports = server;
