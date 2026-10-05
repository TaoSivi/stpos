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
function branchTemplate(st, name, id, type, srcId) {
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
  /* ຈື່ວ່າເມນູໃດມາຈາກສາຂາແມ່ (ການສົ່ງເມນູຄັ້ງຕໍ່ໄປ ຈະແຍກເມນູທີ່ສາຂາເພີ່ມເອງໄດ້ຖືກ) */
  n.menuHQ = { src: srcId || 'b1', mode: 'hq', ts: Date.now(), codes: menuItems(n.catalog).map(function (x) { return x.m.c; }), gids: (n.modGroups || []).map(function (g) { return g && g.id; }).filter(Boolean) };
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
    const json = JSON.stringify(branchTemplate(JSON.parse(ts), name, nb.id, type, tpl.id));
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
  /* ໄລຍະ 2: ເມນູກາງ */
  if (a === 'menu') return menuStatus(req);
  if (a === 'menuSrc') { const b = brFind(String(q.id || '')); if (!b) return { ok: false, err: 'id' }; const hq = hqRead(); hq.menuSrc = b.id; hqWrite(hq); return menuStatus(req); }
  if (a === 'menuItems') {
    const hq = hqRead(), src = brFind(hq.menuSrc || 'b1') || branches()[0], st = branchState(src) || {};
    return { ok: true, src: src.id, rule: q.id ? ruleOf(hq, String(q.id)) : null, items: menuItems(st.catalog).map(function (x) { return { c: x.m.c, n: x.m.n, p: x.m.p, k: x.m.k, cat: x.c, sub: x.s }; }) };
  }
  /* ໄລຍະ 3: ລາຍງານລວມ + ຄັງບິນ */
  if (a === 'report') return hqReport(String(q.from || ''), String(q.to || ''));
  if (a === 'archInfo' || a === 'archCfg' || a === 'archive') {
    const hq = hqRead();
    if (a === 'archCfg') { const d = +q.days; hq.archDays = (d === 0) ? 0 : Math.max(30, d || ARCH_DAYS_DEFAULT); hqWrite(hq); }
    const days = hq.archDays === undefined ? ARCH_DAYS_DEFAULT : hq.archDays, ran = (a === 'archive' && days) ? archiveAll(days) : null;
    const info = branches().map(function (b) { return withBranch(b, function () { const s = G.getState_(), st = s ? JSON.parse(s) : {}; return { id: b.id, name: b.name, hot: (st.bills || []).length, archived: archIndex().count || 0, before: st.archInfo ? st.archInfo.before : 0 }; }); });
    return { ok: true, days: days, ran: ran, branches: info };
  }
  if (a === 'archBills') {
    const b = brFind(String(q.id || '')), from = String(q.from || ''), to = String(q.to || ''); if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return { ok: false, err: 'args' };
    return withBranch(b, function () { const out = [], seen = {}, inR = function (x) { const d = dayKey(x.ts || 0); return d >= from && d <= to; };
      const s = G.getState_(); (s ? JSON.parse(s).bills || [] : []).forEach(function (x) { if (x && inR(x)) { seen[billKey(x)] = 1; out.push(x); } });
      try { fs.readdirSync(path.join(shim.dir(), 'archive')).forEach(function (f) { const mm = /^bills-(\d{4}-\d{2})\.json\.gz$/.exec(f); if (!mm || mm[1] < from.slice(0, 7) || mm[1] > to.slice(0, 7)) return; archMonth(mm[1]).forEach(function (x) { if (x && inR(x) && !seen[billKey(x)]) { seen[billKey(x)] = 1; out.push(x); } }); }); } catch (e) {}
      out.sort(function (x, y) { return (x.ts || 0) - (y.ts || 0); });
      return { ok: true, id: b.id, name: b.name, bills: out.slice(0, 30000).map(function (x) { return { receipt: x.receipt, ts: x.ts, table: x.table, total: x.total, net: rNet(x), cogs: x.cogs || 0, pay: x.pay, voided: !!x.voided, refund: x.refundAmt || 0, cashier: x.cashier || x.by || '', items: (x.items || []).map(function (i) { return (i.qty || 0) + 'x ' + (i.name || i.code); }).join('; ') }; }) }; });
  }
  if (a === 'menuPush') { const ids = q.ids && q.ids !== 'all' ? String(q.ids).split(',') : null; return menuPush(ids, String(q.by || '').slice(0, 60)); }
  return { ok: false, err: 'hq' };
}
/* POST ສຳລັບ HQ (ກົດເມນູລາຍສາຂາ ມີຂໍ້ມູນຫຼາຍ ເກີນ URL) · ຕອບ JSON + CORS ໃຫ້ແອັບອ່ານໄດ້ */
function hqPost(q, req, res, body) {
  const origin = String(req.headers.origin || ''), hdr = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin) { hdr['Access-Control-Allow-Origin'] = origin; hdr['Vary'] = 'Origin'; }
  const done = function (o) { res.writeHead(200, hdr); res.end(JSON.stringify(o)); };
  if (!hqAuth(q)) return done({ ok: false, err: 'token' });
  let o; try { o = JSON.parse(body || '{}'); } catch (e) { return done({ ok: false, err: 'json' }); }
  if (q.hq === 'menuRule') {
    const b = brFind(String(o.id || '')); if (!b) return done({ ok: false, err: 'id' });
    const mode = (o.mode === 'own' || o.mode === 'except') ? o.mode : 'hq', off = {}, price = {};
    Object.keys(o.off || {}).forEach(function (c) { if (o.off[c]) off[String(c).slice(0, 40)] = 1; });
    Object.keys(o.price || {}).forEach(function (c) { const v = o.price[c]; if (v !== '' && v !== null && isFinite(+v) && +v >= 0) price[String(c).slice(0, 40)] = Math.round(+v); });
    const hq = hqRead(); if (!hq.rules) hq.rules = {}; hq.rules[b.id] = { mode: mode, off: off, price: price, ts: Date.now() }; hqWrite(hq);
    return done(Object.assign(menuStatus(req), { saved: b.id }));
  }
  return done({ ok: false, err: 'hq' });
}
function jsonpOut(res, cb, payload) { send(res, 200, String(cb).replace(/[^\w$.]/g, '') + '(' + JSON.stringify(payload) + ')', 'application/javascript'); }
/* POST ແບບ DZ: = {b: hash ສະບັບພື້ນ, p: patch, h: hash ຜົນ} → {obj: state ເຕັມຂອງເຄື່ອງ, p} · ຜິດ = null ('resend' → ແອັບສົ່ງເຕັມແທນ) */
function expandDelta(body) {
  try {
    const o = JSON.parse(zlib.gunzipSync(Buffer.from(body.substring(3), 'base64')).toString('utf8'));
    const base = histGet(o.b); if (!base || !o.p) return null;
    const r = STDelta.apply(base, o.p); if (hashOf(r) !== o.h) return null;
    return { obj: r, p: o.p };
  } catch (e) { return null; }
}
/* ກ່ອນລວມຂໍ້ມູນ: (1) delta — ສ່ວນທີ່ເຄື່ອງບໍ່ໄດ້ແກ້ ໃຊ້ຂອງ server (ບໍ່ດຶງຂໍ້ມູນເກົ່າກັບຄືນ ເຊັ່ນ ເມນູທີ່ HQ ຫາກໍສົ່ງ)
 * (2) ເມນູ: ເຄື່ອງທີ່ຖືເມນູເວີຊັນເກົ່າກວ່າ server (menuV) ຂຽນທັບເມນູບໍ່ໄດ້ */
const MENU_KEYS = ['catalog', 'menuImg', 'modGroups', 'menuHQ', 'menuV'];
function prepIncoming(inc, p, cur) {
  if (!cur || !inc || typeof inc !== 'object') return inc;
  if (p) {
    Object.keys(cur).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(p.s, k) && p.d.indexOf(k) < 0) inc[k] = cur[k]; });
    Object.keys(inc).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(cur, k) && !Object.prototype.hasOwnProperty.call(p.s, k)) delete inc[k]; });
  }
  if ((+cur.menuV || 0) > (+inc.menuV || 0)) MENU_KEYS.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(cur, k)) inc[k] = cur[k]; else delete inc[k]; });
  const ai = archIndex(); /* ບິນທີ່ຍ້າຍໄປຄັງແລ້ວ ບໍ່ໃຫ້ເຄື່ອງເກົ່າເອົາກັບຄືນ */
  if (ai.count && Array.isArray(inc.bills)) inc.bills = inc.bills.filter(function (b) { return !ai.keys[billKey(b)]; });
  if (cur.archInfo && (!inc.archInfo || (+inc.archInfo.ts || 0) < (+cur.archInfo.ts || 0))) inc.archInfo = cur.archInfo;
  return inc;
}

/* ===== ໄລຍະ 2: ເມນູ ແລະ ລາຄາກາງ =====
 * hq.json = { menuSrc: id ສາຂາແມ່, rules: {id: {mode: 'hq'|'except'|'own', off: {code:1}, price: {code: ລາຄາ}}}, push: {ts, by, h, res} }
 * ສົ່ງເມນູ: ເມນູ (catalog) + ຮູບ + ຂະໜາດ/Topping ຂອງສາຂາແມ່ → ສາຂາອື່ນຕາມກົດ · ເມນູທີ່ສາຂາເພີ່ມເອງບໍ່ຖືກລຶບ · ວັດຖຸດິບໃນສູດທີ່ສາຂາບໍ່ມີ ເພີ່ມໃຫ້ (ສະຕ໋ອກ 0) */
const HQ_FILE = path.join(DATA_DIR, 'hq.json');
function hqRead() { try { return JSON.parse(fs.readFileSync(HQ_FILE, 'utf8')) || {}; } catch (e) { return {}; } }
function hqWrite(o) { atomicWrite0(HQ_FILE, JSON.stringify(o, null, 1)); }
function withBranch(b, fn) { const prev = CURBR; shim.endRequest(); useBranch(b); shim.beginRequest(); try { return fn(); } finally { shim.endRequest(); useBranch(prev); shim.beginRequest(); } }
function branchState(b) { return withBranch(b, function () { const s = G.getState_(); return s ? JSON.parse(s) : null; }); }
function menuItems(cat) { const out = []; Object.keys(cat || {}).forEach(function (c) { Object.keys(cat[c] || {}).forEach(function (s) { (cat[c][s] || []).forEach(function (m) { if (m && m.c) out.push({ m: m, c: c, s: s }); }); }); }); return out; }
function menuOf(st) { return { catalog: st.catalog || {}, menuImg: st.menuImg || {}, modGroups: st.modGroups || [] }; }
function ruleOf(hq, id) { const r = (hq.rules || {})[id] || {}; return { mode: (r.mode === 'own' || r.mode === 'except') ? r.mode : 'hq', off: r.off || {}, price: r.price || {} }; }
function ingRefs(menu) {
  const s = {};
  menuItems(menu.catalog).forEach(function (x) { (x.m.bom || []).concat(Array.isArray(x.m.pk) ? x.m.pk : []).forEach(function (b) { if (b && b[0]) s[b[0]] = 1; }); });
  (menu.modGroups || []).forEach(function (g) { (g.opts || []).forEach(function (o) { if (o && o.ing) s[o.ing] = 1; if (o && o.pc) s[o.pc] = 1; }); });
  return Object.keys(s);
}
function buildMenu(src, rule, tgt) {
  const menu = JSON.parse(JSON.stringify(menuOf(src))), mCodes = {}; menuItems(menu.catalog).forEach(function (x) { mCodes[x.m.c] = 1; });
  const prev = tgt.menuHQ && Array.isArray(tgt.menuHQ.codes) ? tgt.menuHQ.codes : null, prevSet = {}; (prev || []).forEach(function (c) { prevSet[c] = 1; });
  let off = 0, priced = 0, own = 0;
  if (rule.mode === 'except') Object.keys(menu.catalog).forEach(function (c) { Object.keys(menu.catalog[c]).forEach(function (s) {
    menu.catalog[c][s] = menu.catalog[c][s].filter(function (m) { if (rule.off[m.c]) { off++; return false; } return true; }).map(function (m) {
      const p = rule.price[m.c]; if (p !== undefined && p !== null && p !== '' && +p >= 0) { m.p = +p; priced++; } return m; }); }); });
  /* ເມນູຂອງສາຂາເອງ = ບໍ່ມີໃນສາຂາແມ່ ແລະ ບໍ່ເຄີຍມາຈາກສາຂາແມ່ (ຖ້າເຄີຍມາ ແລ້ວແມ່ລຶບອອກ = ລຶບນຳ) */
  menuItems(tgt.catalog).forEach(function (x) { if (mCodes[x.m.c] || prevSet[x.m.c]) return;
    if (!menu.catalog[x.c]) menu.catalog[x.c] = {}; if (!menu.catalog[x.c][x.s]) menu.catalog[x.c][x.s] = []; menu.catalog[x.c][x.s].push(x.m); own++; });
  const gm = {}; menu.modGroups.forEach(function (g) { if (g && g.id) gm[g.id] = 1; });
  const prevG = {}; ((tgt.menuHQ && tgt.menuHQ.gids) || []).forEach(function (id) { prevG[id] = 1; });
  (tgt.modGroups || []).forEach(function (g) { if (g && g.id && !gm[g.id] && !prevG[g.id]) menu.modGroups.push(g); });
  menu.menuImg = Object.assign({}, tgt.menuImg || {}, menu.menuImg);
  return { menu: menu, off: off, priced: priced, own: own, codes: Object.keys(mCodes), gids: Object.keys(gm) };
}
function menuPush(ids, by) {
  const hq = hqRead(), src = brFind(hq.menuSrc || 'b1') || branches()[0], srcSt = branchState(src);
  if (!srcSt || !srcSt.catalog) return { ok: false, err: 'ສາຂາແມ່ບໍ່ມີເມນູ' };
  const mv = Date.now(), h = hashOf(menuOf(srcSt)), res = [];
  branches().forEach(function (b) {
    if (b.id === src.id || (ids && ids.indexOf(b.id) < 0)) return;
    const rule = ruleOf(hq, b.id);
    if (rule.mode === 'own') { res.push({ id: b.id, name: b.name, mode: 'own', skip: 1 }); return; }
    withBranch(b, function () {
      const lock = LockService.getScriptLock(); lock.waitLock(30000);
      try {
        const s = G.getState_(); if (!s) { res.push({ id: b.id, name: b.name, err: 'empty' }); return; }
        const st = JSON.parse(s), r = buildMenu(srcSt, rule, st);
        st.catalog = r.menu.catalog; st.menuImg = r.menu.menuImg; st.modGroups = r.menu.modGroups;
        let addIng = 0; if (!st.ingredients) st.ingredients = {};
        ingRefs(r.menu).forEach(function (code) { if (st.ingredients[code]) return; const si = srcSt.ingredients && srcSt.ingredients[code]; if (!si) return;
          const ni = JSON.parse(JSON.stringify(si)); ni.locs = { main: 0 }; ni.stock = 0; delete ni.lastIn; ni.addTs = Date.now(); st.ingredients[code] = ni; addIng++; });
        st.menuV = mv; st.menuHQ = { src: src.id, srcName: src.name || src.id, mode: rule.mode, ts: mv, by: by || '', codes: r.codes, gids: r.gids };
        st._v = Math.max(Date.now(), (+st._v || 0) + 1);
        G.saveStateRaw_(JSON.stringify(st), true, true);
        res.push({ id: b.id, name: b.name, mode: rule.mode, items: menuItems(st.catalog).length, off: r.off, priced: r.priced, own: r.own, addIng: addIng });
      } finally { lock.releaseLock(); }
      shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {}
    });
  });
  hq.push = { ts: mv, by: by || '', h: h, res: res }; hqWrite(hq);
  return { ok: true, push: hq.push };
}
/* ===== ໄລຍະ 3: ຄັງບິນເກົ່າ + ລາຍງານລວມທຸກສາຂາ =====
 * ຄັງ: <ສາຂາ>/archive/bills-YYYY-MM.json.gz (ບິນເຕັມ) + index.json {keys: {receipt|ts: 1}} — ບິນເກົ່າກວ່າ N ວັນ ອອກຈາກຂໍ້ມູນທີ່ເຄື່ອງຖື (ຕິດໜີ້ຍັງບໍ່ຈ່າຍ ບໍ່ຍ້າຍ)
 * ເຄື່ອງເກົ່າທີ່ຍັງຖືບິນເຫຼົ່ານັ້ນ ບັນທຶກແລ້ວ ບິນບໍ່ກັບມາ (prepIncoming ກັ່ນອອກຕາມ index) · ລາຍງານລວມອ່ານທັງຂໍ້ມູນປັດຈຸບັນ ແລະ ຄັງ */
const ARCH_DAYS_DEFAULT = 180;
function archDir() { const d = path.join(shim.dir(), 'archive'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); return d; }
function billKey(b) { return String(b && b.receipt) + '|' + (+(b && b.ts) || 0); }
const _archIdx = {};
function archIndex() {
  const f = path.join(shim.dir(), 'archive', 'index.json'); let m = 0; try { m = fs.statSync(f).mtimeMs; } catch (e) { return { keys: {}, count: 0 }; }
  const c = _archIdx[f]; if (c && c.m === m) return c.v;
  let v; try { v = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { v = { keys: {}, count: 0 }; } _archIdx[f] = { m: m, v: v }; return v;
}
function monthKey(ts) { return shim.formatDate(new Date(ts), 'GMT+7', 'yyyy-MM'); }
function dayKey(ts) { return shim.formatDate(new Date(ts), 'GMT+7', 'yyyy-MM-dd'); }
function archMonth(mk) { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(archDir(), 'bills-' + mk + '.json.gz'))).toString('utf8')); } catch (e) { return []; } }
function archiveBills(days) {
  days = Math.max(30, +days || ARCH_DAYS_DEFAULT);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const s = G.getState_(); if (!s) return { ok: true, archived: 0 };
    const st = JSON.parse(s), cutoff = Date.now() - days * 86400000, keep = [], byM = {};
    (st.bills || []).forEach(function (b) { if (!b || !(b.ts < cutoff) || (b.credit && !b.creditSettled)) { keep.push(b); return; } const mk = monthKey(b.ts); (byM[mk] = byM[mk] || []).push(b); });
    const n = Object.keys(byM).reduce(function (a, k) { return a + byM[k].length; }, 0); if (!n) return { ok: true, archived: 0, kept: keep.length };
    const idx = archIndex(), keys = Object.assign({}, idx.keys || {});
    Object.keys(byM).forEach(function (mk) { const have = archMonth(mk), seen = {}; have.forEach(function (b) { seen[billKey(b)] = 1; });
      byM[mk].forEach(function (b) { const k = billKey(b); if (!seen[k]) { have.push(b); seen[k] = 1; } keys[k] = 1; });
      have.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }); atomicWrite(path.join(archDir(), 'bills-' + mk + '.json.gz'), zlib.gzipSync(JSON.stringify(have))); });
    atomicWrite(path.join(archDir(), 'index.json'), JSON.stringify({ keys: keys, count: Object.keys(keys).length, ts: Date.now() }));
    st.bills = keep; st.archInfo = { before: cutoff, days: days, count: Object.keys(keys).length, ts: Date.now() }; st._v = Math.max(Date.now(), (+st._v || 0) + 1);
    G.saveStateRaw_(JSON.stringify(st), true, true);
    return { ok: true, archived: n, kept: keep.length, total: Object.keys(keys).length };
  } finally { lock.releaseLock(); }
}
function archiveAll(days) { const out = []; branches().forEach(function (b) { withBranch(b, function () { const r = archiveBills(days); shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {} out.push(Object.assign({ id: b.id, name: b.name }, r)); }); }); return out; }
/* ສູດດຽວກັບແອັບ: billNet = ຍອດ − ຄືນເງິນ (Void = 0) · lineTotal ຕາມສ່ວນຫຼຸດ/ໂປຣ */
function rLine(i) { const d = Math.min(100, (+i.disc || 0) + (+i.promoPct || 0)); return ((+i.price || 0) + (+i.modPrice || 0)) * (1 - d / 100) * Math.max(0, (+i.qty || 0) - (+i.promoFree || 0)); }
function rNet(b) { return b.voided ? 0 : (+b.total || 0) - (+b.refundAmt || 0); }
function branchReport(b, from, to) {
  return withBranch(b, function () {
    const s = G.getState_(), st = s ? JSON.parse(s) : {}, seen = {}, bills = [];
    const inR = function (x) { const d = dayKey(x.ts || 0); return d >= from && d <= to; };
    (st.bills || []).forEach(function (x) { if (x && inR(x)) { seen[billKey(x)] = 1; bills.push(x); } });
    const m0 = from.slice(0, 7), m1 = to.slice(0, 7);
    try { fs.readdirSync(path.join(shim.dir(), 'archive')).forEach(function (f) { const mm = /^bills-(\d{4}-\d{2})\.json\.gz$/.exec(f); if (!mm || mm[1] < m0 || mm[1] > m1) return;
      archMonth(mm[1]).forEach(function (x) { if (x && inR(x) && !seen[billKey(x)]) { seen[billKey(x)] = 1; bills.push(x); } }); }); } catch (e) {}
    const R = { id: b.id, name: b.name, type: b.type || 'branch', sales: 0, bills: 0, cogs: 0, disc: 0, voids: 0, voidAmt: 0, refunds: 0, expenses: 0, waste: 0, shortage: 0, pay: {}, days: {}, items: {} };
    bills.forEach(function (x) {
      if (x.voided) { R.voids++; R.voidAmt += +x.total || 0; return; }
      const net = rNet(x), d = dayKey(x.ts); R.sales += net; R.bills++; R.cogs += +x.cogs || 0; R.disc += +x.discAmt || 0; R.refunds += +x.refundAmt || 0; R.days[d] = (R.days[d] || 0) + net;
      const tot = +x.total || 0, parts = Array.isArray(x.payParts) && x.payParts.length ? x.payParts.map(function (p) { return [p.type, +p.amt || 0]; }) : [[x.pay || '-', tot]];
      const sum = parts.reduce(function (a, p) { return a + p[1]; }, 0) || 1; parts.forEach(function (p) { R.pay[p[0]] = (R.pay[p[0]] || 0) + p[1] / sum * net; });
      (x.items || []).forEach(function (i) { const k = i.code || i.name; if (!k) return; const a = R.items[k] || (R.items[k] = { c: i.code || '', n: i.name || k, q: 0, v: 0 }); a.q += +i.qty || 0; a.v += rLine(i); });
    });
    (st.expenses || []).forEach(function (e) { if (e && inR(e)) R.expenses += +e.amount || 0; });
    const ing = st.ingredients || {};
    (st.stockLog || []).forEach(function (l) { if (!l || !inR(l)) return; const c = +(ing[l.code] && ing[l.code].cost) || 0, d = +l.delta || 0;
      if (l.reason === 'ເສຍຫາຍ' && d < 0) R.waste += -d * c; else if (l.reason === 'ນັບປັບສະຕ໋ອກ' && d < 0) R.shortage += -d * c; });
    R.gp = R.sales - R.cogs; R.avg = R.bills ? R.sales / R.bills : 0; R.archived = (archIndex().count || 0); R.archBefore = st.archInfo ? st.archInfo.before : 0;
    return R;
  });
}
function hqReport(from, to) {
  const ok = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')); }; if (!ok(from) || !ok(to) || from > to) return { ok: false, err: 'date' };
  const L = branches().map(function (b) { return branchReport(b, from, to); }), T = { sales: 0, bills: 0, cogs: 0, disc: 0, voids: 0, voidAmt: 0, refunds: 0, expenses: 0, waste: 0, shortage: 0, pay: {}, days: {} }, items = {};
  L.forEach(function (r) {
    ['sales', 'bills', 'cogs', 'disc', 'voids', 'voidAmt', 'refunds', 'expenses', 'waste', 'shortage'].forEach(function (k) { T[k] += r[k]; });
    Object.keys(r.pay).forEach(function (k) { T.pay[k] = (T.pay[k] || 0) + r.pay[k]; }); Object.keys(r.days).forEach(function (k) { T.days[k] = (T.days[k] || 0) + r.days[k]; });
    Object.keys(r.items).forEach(function (k) { const a = r.items[k], t = items[k] || (items[k] = { c: a.c, n: a.n, q: 0, v: 0, by: {} }); t.q += a.q; t.v += a.v; t.by[r.id] = { q: a.q, v: a.v }; });
    r.top = Object.keys(r.items).map(function (k) { return r.items[k]; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 20); delete r.items;
  });
  T.gp = T.sales - T.cogs; T.avg = T.bills ? T.sales / T.bills : 0;
  return { ok: true, from: from, to: to, at: Date.now(), branches: L, total: T, top: Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 50) };
}
function menuStatus(req) {
  const hq = hqRead(), src = brFind(hq.menuSrc || 'b1') || branches()[0], srcSt = branchState(src) || {};
  const h = hashOf(menuOf(srcSt)), L = branches().map(function (b) { const r = ruleOf(hq, b.id); return { id: b.id, name: b.name, type: b.type, src: b.id === src.id, mode: r.mode, off: Object.keys(r.off).length, price: Object.keys(r.price).length }; });
  return { ok: true, src: src.id, srcName: src.name, items: menuItems(srcSt.catalog).length, dirty: !hq.push || hq.push.h !== h, push: hq.push ? { ts: hq.push.ts, by: hq.push.by, res: hq.push.res } : null, branches: L };
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
    const hq0 = hqRead(), adays = hq0.archDays === undefined ? ARCH_DAYS_DEFAULT : hq0.archDays, today = dayKey(Date.now());
    branches().forEach(function (b) { try { useBranch(b); shim.beginRequest(); shim.runDue(G).forEach(function (x) { x.b = b.id; ran.push(x); }); shim.sweepCache();
        if (adays && shim.props.getProperty('ARCH_DAY') !== today && +shim.formatDate(new Date(), 'GMT+7', 'HH') >= 3) { /* ຍ້າຍບິນເກົ່າເຂົ້າຄັງ ມື້ລະເທື່ອ (ຫຼັງ 03:00) */
          shim.props.setProperty('ARCH_DAY', today); const r = archiveBills(adays); shim.endRequest(); shim.beginRequest(); try { refreshCur(); } catch (e) {} if (r.archived) ran.push({ b: b.id, fn: 'archive', res: r.archived + ' bills' }); }
      } catch (e) { ran.push({ b: b.id, err: String(e && e.message || e) }); } finally { shim.endRequest(); } });
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
    if (q.hq !== undefined) return hqPost(q, req, res, body);
    let inc = null, dz = null;
    if (body.indexOf('DZ:') === 0) {
      if (!G.tokenOk_(q.token)) return send(res, 200, 'denied');
      dz = expandDelta(body); if (dz === null) return send(res, 200, 'resend');
      inc = dz.obj;
    } else if (G.tokenOk_(q.token)) {
      try { inc = JSON.parse(body.indexOf('GZ:') === 0 ? zlib.gunzipSync(Buffer.from(body.substring(3), 'base64')).toString('utf8') : body); } catch (e) { inc = null; }
    }
    if (inc && typeof inc === 'object' && !inc.action && !inc.cust) {
      let cur = null; try { const cs = G.getState_(); cur = cs ? JSON.parse(cs) : null; } catch (e) {}
      prepIncoming(inc, dz && dz.p, cur); body = JSON.stringify(inc);
    } else if (dz) body = JSON.stringify(inc);
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
