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

/* ===== delta sync: ຮັບ/ສົ່ງສະເພາະສ່ວນທີ່ປ່ຽນ (ໂຄດລວມຂໍ້ມູນໃນ Code.gs ຄືເກົ່າທຸກຢ່າງ) =====
 * hist/<hash>.json.gz = ສະບັບທີ່ຜ່ານມາ (ເກັບ HIST_KEEP ສະບັບລ່າສຸດ) ໃຫ້ເຄື່ອງທີ່ມີສະບັບນັ້ນ ຂໍສະເພາະສ່ວນຕ່າງ
 * hist/current.json = {v, h, len} ຂອງຂໍ້ມູນປັດຈຸບັນ · hash = sha256(canon) ກວດໄດ້ທັງສອງຝັ່ງ */
const zlib = require('zlib');
const STDelta = require('./delta');
const HIST = path.join(DATA_DIR, 'hist'), CUR = path.join(HIST, 'current.json'), HIST_KEEP = 150;
fs.mkdirSync(HIST, { recursive: true });
function hashOf(obj) { return crypto.createHash('sha256').update(STDelta.canon(obj)).digest('hex').slice(0, 32); }
function readCur() { try { return JSON.parse(fs.readFileSync(CUR, 'utf8')); } catch (e) { return null; } }
function atomicWrite(f, data) { const tmp = f + '.' + process.pid + '.' + Date.now() + '.tmp'; fs.writeFileSync(tmp, data); fs.renameSync(tmp, f); }
function histGet(h) { if (!/^[0-9a-f]{32}$/.test(String(h || ''))) return null; try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HIST, h + '.json.gz'))).toString('utf8')); } catch (e) { return null; } }
function histPrune() {
  try {
    const fl = fs.readdirSync(HIST).filter(function (f) { return /\.json\.gz$/.test(f); }).map(function (f) { return { f: f, t: fs.statSync(path.join(HIST, f)).mtimeMs }; }).sort(function (a, b) { return b.t - a.t; });
    fl.slice(HIST_KEEP).forEach(function (x) { try { fs.unlinkSync(path.join(HIST, x.f)); } catch (e) {} });
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
  const h = hashOf(obj), f = path.join(HIST, h + '.json.gz');
  if (!fs.existsSync(f)) atomicWrite(f, zlib.gzipSync(s)); else { const t = new Date(); try { fs.utimesSync(f, t, t); } catch (e) {} }
  const c = { v: v, h: h, len: s.length }; atomicWrite(CUR, JSON.stringify(c)); histPrune();
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
function sessMake(u) { const v = Buffer.from(JSON.stringify({ u: u.id, e: Date.now() + 180 * 86400000, p: userPinH(u).slice(-6) })).toString('base64url'); return 's1.' + v + '.' + sessSign(v); }
function stateUsers() { try { const s = G.getState_(); return s ? (JSON.parse(s).users || []) : []; } catch (e) { return []; } }
function sessOk(tk) {
  tk = String(tk || ''); if (tk.indexOf('s1.') !== 0) return false;
  const parts = tk.split('.'); if (parts.length !== 3) return false;
  const a = Buffer.from(sessSign(parts[1])), b = Buffer.from(parts[2]); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  let o; try { o = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch (e) { return false; }
  if (!o || !(o.e > Date.now())) return false;
  const cache = CacheService.getScriptCache(), ck = 'sessu_' + o.u + '_' + o.p + '_' + stateV(), hit = cache.get(ck);
  if (hit === '1') return true; if (hit === '0') return false;
  const u = stateUsers().filter(function (x) { return x && x.id === o.u; })[0], ok = !!u && userPinH(u).slice(-6) === o.p;
  cache.put(ck, ok ? '1' : '0', 300); return ok;
}
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

/* ເທື່ອທຳອິດ: ຕັ້ງສຳຮອງອັດຕະໂນມັດທຸກມື້ 03:00 (ເກັບ 14 ມື້) */
shim.beginRequest();
try { if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'backupDaily'; })) G.setupBackup(); }
finally { shim.endRequest(); }

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
  if (q.cron !== undefined) {
    if (!keyOk(q.cron, 'CRON_KEY')) return send(res, 403, 'denied');
    const r = shim.runDue(G); shim.sweepCache();
    return send(res, 200, JSON.stringify({ ok: true, ran: r, at: new Date().toISOString() }), 'application/json');
  }
  if (q.admin !== undefined) {
    if (!keyOk(q.key, 'ADMIN_KEY')) return send(res, 403, 'denied');
    const a = String(q.admin);
    if (a === 'status') {
      const s = G.getState_(); let info = { bytes: s.length };
      try { const st = JSON.parse(s || '{}'); info.shop = st.shopName; info.bills = (st.bills || []).length; info.v = st._v; } catch (e) {}
      info.backups = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf('BAK_') === 0; });
      info.triggers = ScriptApp.getProjectTriggers().map(function (t) { return t._t; });
      info.token = !!(shim.props.getProperty('API_TOKEN') || '').trim(); info.node = process.version; info.dataDir = DATA_DIR;
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
      return send(res, 200, JSON.stringify({ ok: true, bytes: json.length, bills: (st.bills || []).length, tables: Object.keys(st.tables || {}).length, ingredients: Object.keys(st.ingredients || {}).length }), 'application/json');
    }
    if (ADMIN_FN.indexOf(a) >= 0) { const r = G[a](); return send(res, 200, typeof r === 'string' ? r : JSON.stringify(r), 'text/plain'); }
    return send(res, 400, 'unknown admin');
  }
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
    shim.beginRequest();
    try { handle(req, res, Buffer.concat(chunks).toString('utf8')); }
    catch (e) { console.error(new Date().toISOString(), e && e.stack || e); if (!res.headersSent) send(res, 500, 'err'); }
    finally { try { shim.endRequest(); } catch (e2) { console.error('flush failed', e2); } }
  });
});
server.listen(process.env.PORT || 3000, function () { console.log('ST POS server on', process.env.PORT || 3000, '· data', DATA_DIR); });
module.exports = server;
