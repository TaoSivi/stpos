/* ໃຊ້ໄດ້ຕອນບໍ່ມີເນັດ: ອ່ານ = ໃຊ້ຂໍ້ມູນລ່າສຸດທີ່ເກັບໃນເຄື່ອງ · ບັນທຶກ = ເກັບໃນຄິວ + ຄິດໄລ່ລິດໃນເຄື່ອງ ແລ້ວສົ່ງເຂົ້າ server ເອງເມື່ອມີເນັດ
 * ຄິວ/ແຄັດ ຢູ່ IndexedDB (ຖ້າບໍ່ໄດ້ ໃຊ້ໃນໜ່ວຍຄວາມຈຳ — ປິດແອັບແລ້ວຫາຍ). ລຳດັບການສົ່ງ = ລຳດັບທີ່ກອກ; ແຕ່ລະລາຍການເປັນຄ່າສົມບູນ (ສົ່ງຊ້ຳບໍ່ເປັນຫຍັງ).
 * ສົ່ງບໍ່ຜ່ານເພາະ server ປະຕິເສດ (ເຊັ່ນ ອະນຸມັດແລ້ວ) → ເຂົ້າລາຍການ "ສົ່ງບໍ່ໄດ້" ໃຫ້ຜູ້ໃຊ້ເຫັນ, ບໍ່ຫາຍງຽບໆ. ໝົດສິດເຂົ້າລະບົບ → ຄິວຄ້າງໄວ້ ລໍເຂົ້າລະບົບໃໝ່.
 * ຕັ້ງຄ່າ / ພະນັກງານ / ປ່ຽນ PIN / ເຂົ້າລະບົບ ຕ້ອງມີເນັດ (ບໍ່ເຂົ້າຄິວ). */
'use strict';
var kv = (function () {
 var mem = {}, dbp = null;
 function db() { return dbp || (dbp = new Promise(function (res, rej) { try { var r = indexedDB.open('stfuel', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); } })); }
 function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('kv', mode), q = fn(t.objectStore('kv')); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
 return {
  get: function (k) { return tx('readonly', function (s) { return s.get(k); }).catch(function () { return mem[k]; }); },
  set: function (k, v) { mem[k] = v; return tx('readwrite', function (s) { s.put(v, k); }).catch(function () {}); },
  del: function (k) { delete mem[k]; return tx('readwrite', function (s) { s.delete(k); }).catch(function () {}); },
  keys: function () { return tx('readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return k || []; }, function () { return Object.keys(mem); }); }
 };
})();
/* ===== ເຂົ້າລະບົບຕອນບໍ່ມີເນັດ: ຫຼັງ login ສຳເລັດ ເກັບ hash ຂອງ PIN (PBKDF2 + salt) + token ໄວ້ໃນເຄື່ອງ — ເບີດຽວກັນໃສ່ PIN ຖືກ ເຂົ້າໄດ້ເລີຍ ບໍ່ຕ້ອງລໍເນັດ ===== */
var dg = function (p) { return String(p || '').replace(/\D/g, '').slice(-8); };
function pinHash(pin, salt, it) { var enc = new TextEncoder(); return crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']).then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: it || 120000, hash: 'SHA-256' }, k, 256); }).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }
function credSave(phone, pin, r) {
 if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve();
 var salt = crypto.getRandomValues(new Uint8Array(16)); return pinHash(pin, salt, 20000).then(function (h) { return kv.set('cred', { p: dg(phone), it: 20000, s: Array.prototype.slice.call(salt), h: h, token: r.token, name: r.name, napps: r.napps, ts: Date.now() }); }).catch(function () { });
}
function credLogin(phone, pin) { /* ຄືນ {ok:true,...} / {ok:false,error:'login'} / null (ບໍ່ມີ cred ຂອງເບີນີ້) */
 return kv.get('cred').then(function (c) {
  if (!c || c.p !== dg(phone) || !window.crypto || !crypto.subtle) return null;
  return kv.get('credfail').then(function (f) { f = f || { n: 0, until: 0 }; if (f.n >= 5 && f.until > Date.now()) return { ok: false, error: 'locked', min: Math.ceil((f.until - Date.now()) / 60000) };
   return pinHash(String(pin), new Uint8Array(c.s), c.it).then(function (h) {
    if (h === c.h) return kv.del('credfail').then(function () { return { ok: true, token: c.token, name: c.name, napps: c.napps, offline: true }; });
    f.n = f.until < Date.now() ? 1 : f.n + 1; f.until = Date.now() + 15 * 60000; return kv.set('credfail', f).then(function () { return { ok: false, error: 'login', left: Math.max(0, 5 - f.n) }; }); }); });
 }).catch(function () { return null; });
}
function clearCache() { return kv.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== 'q' && k !== 'failed' && k !== 'cred' && k !== 'credfail'; }).map(function (k) { return kv.del(k); })); }); }

var GEN = { dash: 1, approvers: 1, pending: 1, rqAhead: 1, userList: 1, catalog: 1, schema: 1, adjlog: 1, 'sop.board': 1, 'sop.me': 1, 'sop.open': 1, 'sop.tpls': 1, 'sop.hdr': 1 }; /* ອ່ານອື່ນໆ: ເກັບສຳເນົາຫຼ້າສຸດ ບໍ່ມີເນັດກໍເບິ່ງໄດ້ (key = ຊື່ + ພາລາມິເຕີ) */
var READS = { me: 1, init: 1, sheet: 1, photos: 1, photometa: 1, ledger: 1, drivers: 1 }, WRITES = { row: 1, tank: 1, photo: 1, ack: 1, approve: 1, assign: 1, rqNew: 1, rqCancel: 1, rqDecide: 1, rqDecideMany: 1, rqStart: 1, rqUrgent: 1, 'sop.mark': 1, 'sop.markMany': 1, 'sop.submit': 1, 'sop.new': 1, subDriver: 1 };
Object.keys(GEN).forEach(function (k) { READS[k] = 1; });
var OFF = false, SYNCING = false, DONE = false;
var rkey = function (a, b) { if (GEN[a]) return a + '|' + JSON.stringify(b || {}); return a === 'init' || a === 'drivers' || a === 'me' ? a : a + '|' + (b.site || '') + '|' + (b.date || ''); };
function post(action, body, token) { /* ເນັດຊ້າ = ຖືວ່າບໍ່ມີເນັດ (ໝົດເວລາ) ບໍ່ໃຫ້ໜ້າຄ້າງ; slow = ອາດສົ່ງຂຶ້ນ server ແລ້ວແຕ່ຍັງບໍ່ຮູ້ຜົນ */
 var ctl = window.AbortController ? new AbortController() : null, slow = false, ms = action === 'photo' ? 45000 : (WRITES[action] ? 25000 : 12000), t = ctl && setTimeout(function () { slow = true; ctl.abort(); }, ms);
 return fetch('/api/' + action, { method: 'POST', body: JSON.stringify(Object.assign({ token: token }, body || {})), signal: ctl ? ctl.signal : undefined }).then(function (r) { return r.json(); }).then(function (r) { clearTimeout(t); OFF = false; return r; }, function () { clearTimeout(t); OFF = true; return { ok: false, error: 'net', slow: slow }; });
}
var tmo = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var laoDay = function () { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); };
function isoWeek(d) { var t = new Date(d + 'T00:00:00Z'), mon = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 864e5), th = new Date(mon.getTime() + 3 * 864e5), y = th.getUTCFullYear(), wk = Math.floor((th - Date.UTC(y, 0, 1)) / 864e5 / 7) + 1; return y + '-W' + ('0' + wk).slice(-2); }
function mondayOf(key) { var m = /^(\d{4})-W(\d{2})/.exec(key), j4 = new Date(Date.UTC(+m[1], 0, 4)), mon1 = new Date(j4.getTime() - ((j4.getUTCDay() + 6) % 7) * 864e5); return new Date(mon1.getTime() + (+m[2] - 1) * 7 * 864e5).toISOString().slice(0, 10); }
function sopKey(t) { return t.freq === 'daily' ? laoDay() : t.freq === 'weekly' ? isoWeek(laoDay()) : t.freq === 'monthly' ? laoDay().slice(0, 7) : null; }
function sopMonth(key) { return key[0] === 'e' ? laoDay().slice(0, 7) : /^\d{4}-W\d{2}/.test(key) ? mondayOf(key).slice(0, 7) : key.slice(0, 7); }
function sopSum(r) { var a = r.a || {}, ans = r.items.filter(function (i) { return a[i.id] && (a[i.id].v === 1 || a[i.id].v === 0); }).length; return { id: r.id, tpl: r.tpl, user: r.user, name: r.name, key: r.key, label: r.label || '', status: r.status, total: r.items.length, answered: ans, fails: r.items.filter(function (i) { return a[i.id] && a[i.id].v === 0; }).length, doneAt: r.doneAt || 0, created: r.created, appr: r.appr || null }; }
function sopMeSync(run) { /* ລາຍການ "ຂອງຂ້ອຍ" ໃນເຄື່ອງ ສະແດງສະຖານະໃບນີ້ (ຄືບໜ້າ) */
 return kv.get(rkey('sop.me', {})).then(function (me) { if (!me || !me.mine) return; var sm = sopSum(run), hit = false;
  me.mine.forEach(function (e) { if (e.tpl.id !== run.tpl) return;
   if (e.veh) e.veh.forEach(function (v) { if (v.key === run.key) { v.run = sm; hit = true; } });
   else if (e.key) { if (e.key === run.key) { e.run = sm; hit = true; } }
   else { e.runs = e.runs || []; var k = e.runs.filter(function (x) { return x.id === run.id; })[0]; if (k) Object.assign(k, sm); else e.runs.unshift(sm); hit = true; } });
  return hit ? kv.set(rkey('sop.me', {}), me) : 0; });
}
function sopBuild(body, isNew) { /* ສ້າງໃບເຊັກລິດໃນເຄື່ອງ ຈາກລາຍການທີ່ເກັບໄວ້ (sop.me) — ບໍ່ເຄີຍເປີດມາກ່ອນ ແລະ ບໍ່ມີເນັດ ກໍເຮັດໄດ້ */
 return kv.get(rkey('sop.me', {})).then(function (me) {
  var e = me && me.mine ? me.mine.filter(function (x) { return x.tpl.id === body.tpl; })[0] : null; if (!e || !e.snap) return null; var t = e.tpl, key, veh = null;
  if (isNew) { if (t.freq !== 'event' || !String(body.label || '').trim()) return null; key = body.key; }
  else { key = sopKey(t); if (!key) return null; if (t.per) { veh = (e.veh || []).filter(function (v) { return v.id === body.veh; })[0]; if (!veh) return null; key += '@' + veh.id; } }
  var run = { id: sopMonth(key) + '~' + t.id + '~' + me.id + '~' + key, veh: veh ? { id: veh.id, name: veh.name } : null, tpl: t.id, code: t.code, title: t.title, sop: t.sop, freq: t.freq, warn: t.warn || '', user: me.id, name: me.name, key: key, label: String(body.label || '').replace(/[<>]/g, '').slice(0, 60), items: e.snap, a: {}, created: Date.now(), status: 'open', doneAt: 0, appr: null };
  return run; });
}
function sopStore(run, edit) { /* ເກັບໃບເຊັກລິດ SOP ທີ່ເປີດແລ້ວໃນເຄື່ອງ (ທຸກ key ທີ່ເປັນໃບດຽວກັນ); edit(run) ປ່ຽນແລ້ວຄືນ error ຫຼື null */
 return kv.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return String(k).indexOf('sop.open|') === 0; }).map(function (k) { return kv.get(k).then(function (r) { return [k, r]; }); })); }).then(function (l) {
  var id = run ? run.id : null, hit = l.filter(function (x) { return x[1] && x[1].id === (id || edit.id); }); if (!hit.length && !run) return { ok: false, error: 'net' };
  if (run) return Promise.all(hit.map(function (x) { return kv.set(x[0], run); })).then(function () { return { ok: true }; });
  var r = hit[0][1], bad = edit.fn(r); if (bad) return bad;
  return Promise.all(hit.map(function (x) { return kv.set(x[0], r); })).then(function () { return sopMeSync(r); }).then(function () { return { ok: true, data: r, queued: true }; });
 });
}
function sopApply(action, b) { /* ເຊັກລິດ SOP ໃນເຄື່ອງ: ໝາຍຂໍ້ / ໝາຍທັງໝວດ / ສົ່ງ (ໃບຕ້ອງເຄີຍເປີດຕອນມີເນັດ ມື້ນັ້ນ) */
 var ans = function (r) { return r.items.filter(function (i) { return r.a[i.id] && (r.a[i.id].v === 1 || r.a[i.id].v === 0); }).length; }, has = function (r, x) { return r.items.some(function (i) { return i.id === x; }); };
 return sopStore(null, { id: String(b.id), fn: function (r) {
  if (r.status !== 'open') return { ok: false, error: 'locked' }; r.a = r.a || {};
  if (action === 'sop.mark') { if (!has(r, b.item)) return { ok: false, error: 'item' }; var v = b.v === 1 || b.v === 0 ? b.v : null, note = String(b.note || '').replace(/[<>]/g, '').slice(0, 200); if (v == null && !note) delete r.a[b.item]; else r.a[b.item] = { v: v, note: note, at: Date.now() }; return null; }
  if (action === 'sop.markMany') { var ids = Array.isArray(b.items) ? b.items.map(String) : []; if (!ids.every(function (x) { return has(r, x); })) return { ok: false, error: 'item' }; ids.forEach(function (x) { var a = r.a[x]; if (!a || (a.v !== 1 && a.v !== 0)) r.a[x] = { v: 1, note: a ? a.note || '' : '', at: Date.now() }; }); return null; }
  if (ans(r) < r.items.length) return { ok: false, error: 'open' };
  if (r.items.some(function (i) { return r.a[i.id].v === 0 && !r.a[i.id].note; })) return { ok: false, error: 'note' };
  r.status = 'done'; r.doneAt = Date.now(); return null; } });
}
function rqApply(action, b, sh, me, cfg) { /* ຄຳຂໍນ້ຳມັນໃນເຄື່ອງ: ປ່ຽນ sh.reqs / sh.rows (ເຊີບເວີກວດຊ້ຳ + ຍອດແທ່ງຕອນສົ່ງ) — ຄືນ error ຫຼື null */
 var cars = (cfg && cfg.vehicles) || [], car = function (id) { return cars.filter(function (v) { return v.id === id; })[0]; }, reqs = sh.reqs || (sh.reqs = []), rows = sh.rows || (sh.rows = []), now = Date.now();
 var by = function (id) { return reqs.filter(function (x) { return x.id === id; })[0]; }, drvOf = function (id) { var c = car(id); return sh.drv && sh.drv[id] && sh.drv[id].d != null ? sh.drv[id].d : (c && c.driver) || ''; };
 var srcN = function (v) { return v === 'jug' ? 'jug' : v === 'shop' ? 'shop' : 'tank'; }, txt = function (v, n) { return String(v || '').replace(/[<>]/g, '').slice(0, n); };
 var open = function (x) { var n = 1, id = x.v, r = rows.filter(function (y) { return y.v === id; })[0];
  if (!(r && !r.rq && r.cm0 == null && r.cm1 == null && r.cm2 == null)) { do { n++; id = x.v + '_r' + n; } while (n <= 9 && rows.some(function (y) { return y.v === id; })); if (n > 9) return false; r = null; }
  var c = car(x.v) || {}, d = drvOf(x.v);
  if (r) { r.rq = x.id; r.src = x.ok.src; r.shop = x.ok.shop || ''; } else rows.push({ v: id, name: (c.name || x.v) + ' · ເຕີມຄັ້ງທີ ' + n, driver: d, mine: d === me.id, base: x.v, round: n, rq: x.id, src: x.ok.src, shop: x.ok.shop || '' });
  x.row = id; x.state = 'filling'; return true; };
 if (action === 'rqNew') {
  var lines = Array.isArray(b.lines) ? b.lines : [{ v: b.v, lit: b.lit }], seen = {}, ready = [], i;
  if (!lines.length || lines.length > 60) return { ok: false, error: 'lit' };
  for (i = 0; i < lines.length; i++) { var c = car((lines[i] || {}).v); if (!c) return { ok: false, error: 'vehicle' }; if (!drvOf(c.id)) return { ok: false, error: 'nodriver' }; if (seen[c.id]) return { ok: false, error: 'dup' }; seen[c.id] = 1; var lit = num(lines[i].lit); if (!(lit > 0) || lit > 100000) return { ok: false, error: 'lit' }; ready.push({ c: c, lit: lit }); }
  if (reqs.some(function (y) { return y.bid === b.cid; })) return null;
  var bno = reqs.reduce(function (m, x) { return Math.max(m, x.bno || 0); }, 0) + 1;
  ready.forEach(function (z, i) { reqs.push({ id: 'r' + b.cid.slice(1) + i.toString(36), bid: b.cid, bno: bno, v: z.c.id, lit: z.lit, note: txt(b.note, 200), by: me.id, name: me.name, at: now, st: 'pending', car: z.c.name || z.c.id, fill: null, state: 'pending' }); });
  return null;
 }
 if (action === 'rqDecide') {
  var x = by(b.id); if (!x) return { ok: false, error: 'rq' }; if (x.st !== 'pending' && !(x.st === 'approved' && !x.row)) return { ok: false, error: 'rqstate' };
  if (b.yes && x.by === me.id) return { ok: false, error: 'self' };
  if (b.yes) { var l2 = b.lit == null || b.lit === '' ? x.lit : num(b.lit); if (!(l2 > 0) || l2 > 100000) return { ok: false, error: 'lit' }; x.st = x.state = 'approved'; x.ok = { by: me.id, name: me.name, at: now, lit: l2, src: srcN(b.src), shop: txt(b.shop, 60) }; delete x.why; }
  else { x.st = x.state = 'rejected'; x.why = txt(b.why, 200); x.ok = { by: me.id, name: me.name, at: now }; }
  return null;
 }
 if (action === 'rqDecideMany') {
  if (!Array.isArray(b.ids) || !b.ids.length) return { ok: false, error: 'rq' };
  b.ids.forEach(function (id) { var x = by(id); if (!x || x.st !== 'pending' || x.by === me.id) return; x.st = x.state = 'approved'; x.ok = { by: me.id, name: me.name, at: now, lit: x.lit, src: srcN(b.src), shop: txt(b.shop, 60) }; delete x.why; });
  return null;
 }
 if (action === 'rqCancel') { var y = by(b.id); if (!y) return { ok: false, error: 'rq' }; if (y.row || y.st === 'rejected' || y.st === 'cancel') return { ok: false, error: 'rqstate' }; y.st = y.state = 'cancel'; return null; }
 if (action === 'rqStart') { var z = by(b.id); if (!z || z.st !== 'approved' || z.row) return { ok: false, error: 'rqstate' }; if (!drvOf(z.v)) return { ok: false, error: 'nodriver' }; return open(z) ? null : { ok: false, error: 'rounds' }; }
 if (action === 'rqUrgent') {
  var cu = car(b.v); if (!cu) return { ok: false, error: 'vehicle' }; if (!drvOf(cu.id)) return { ok: false, error: 'nodriver' }; var uid = 'r' + b.cid.slice(1) + 'u'; if (by(uid)) return null;
  var u = { id: uid, v: cu.id, lit: null, note: txt(b.note, 200), by: me.id, name: me.name, at: now, st: 'approved', state: 'approved', urgent: true, car: cu.name || cu.id, fill: null, ok: { by: me.id, name: me.name, at: now, lit: null, src: srcN(b.src), shop: txt(b.shop, 60) } };
  reqs.push(u); if (!open(u)) { reqs.pop(); return { ok: false, error: 'rounds' }; } return null;
 }
 return { ok: false, error: 'action' };
}
function getQ() { return kv.get('q').then(function (q) { return q || []; }); }

/* ===== ໂຫຼດຂໍ້ມູນເກັບໄວ້ລ່ວງໜ້າ: ຫຼັງເຂົ້າລະບົບຄັ້ງດຽວ ໜ້າທີ່ຍັງບໍ່ເຄີຍເປີດກໍໃຊ້ໄດ້ຕອນບໍ່ມີເນັດ (ອ່ານຢ່າງດຽວ ບໍ່ສ້າງຂໍ້ມູນໃນ server) ===== */
var WARMED = 0;
function warm() {
 var tk = ls('fuel_tk'); if (!tk || OFF || navigator.onLine === false || Date.now() - WARMED < 6 * 36e5) return; WARMED = Date.now();
 kv.get('init').then(function (init) {
  var sites = init && init.cfg && init.cfg.sites ? init.cfg.sites : [], day = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  var jobs = [['drivers', {}], ['sop.me', {}], ['sop.hdr', {}]].concat(sites.slice(0, 6).map(function (s) { return ['sheet', { site: s.id, date: day }]; }));
  return jobs.reduce(function (p, j) { return p.then(function () { return OFF ? 0 : kv.get(rkey(j[0], j[1])).then(function (have) { if (have !== undefined) return; /* ມີແລ້ວ = ບໍ່ໂຫຼດຊ້ຳ (ການໃຊ້ງານປົກກະຕິອັບເດດເອງ) */ return post(j[0], j[1], tk).then(function (r) { if (r.ok) return kv.set(rkey(j[0], j[1]), r.data); }); }); }); }, Promise.resolve());
 }).catch(function () { });
}
/* ===== ຄິດໄລ່ໃນເຄື່ອງ (ໃຫ້ຜົນຄືກັບ server ເພາະໃຊ້ Tank.liters ໄຟລ໌ດຽວກັນ) ===== */
var num = function (x) { var n = Number(x); return x === '' || x == null || !isFinite(n) || n < 0 || n > 1e6 ? null : n; };
function mcalc(t) { if (!t.meter) return; t.mused = t.mtr != null && t.mprev != null ? t.mtr - t.mprev : null; t.mdiff = t.mused != null ? t.mused - ((t.mbase || 0) + t.out) : null; }
function calcRow(car, r) { var L0 = Tank.liters(car.tank, r.cm0), L1 = Tank.liters(car.tank, r.cm1), L2 = Tank.liters(car.tank, r.cm2); r.L0 = L0; r.L1 = L1; r.L2 = L2; r.gap = r.prev && L0 != null && r.prev.L2 != null ? L0 - r.prev.L2 : null; r.add = L0 != null && L1 != null ? L1 - L0 : null; r.used = L1 != null && L2 != null ? L1 - L2 : null; }
function localApply(action, b) { /* ຄືນ {ok, data} ຫຼື {ok:false,error} — ແລະ ບັນທຶກແຄັດ */
 if (action === 'sop.new') return sopBuild(b, true).then(function (run) { if (!run) return { ok: false, error: 'net' }; b.lid = run.id; return kv.set(rkey('sop.open', { id: run.id }), run).then(function () { return sopMeSync(run); }).then(function () { return { ok: true, data: run, queued: true }; }); });
 if (/^sop\./.test(action)) return sopApply(action, b);
 return Promise.all([kv.get('init'), kv.get(rkey('sheet', b)), kv.get(rkey('photos', b))]).then(function (c) {
  var init = c[0], sh = c[1], ph = c[2] || {}, me = init && init.me, cfg = init && init.cfg;
  if (action === 'assign') { if (!cfg) return { ok: false, error: 'net' }; cfg.vehicles.forEach(function (v) { if (v.id === b.v) v.driver = String(b.driver || ''); }); return kv.set('init', init).then(function () { return { ok: true, data: cfg.vehicles.filter(function (v) { return v.site === b.site; }).map(function (v) { return { id: v.id, driver: v.driver }; }), queued: true }; }); }
  if (action === 'photo') { if (b.data) ph[b.key] = b.data; else delete ph[b.key]; return kv.set(rkey('photos', b), ph).then(function () { return { ok: true, data: 1, queued: true }; }); }
  if (action === 'subDriver') { if (!sh || !me || !cfg) return { ok: false, error: 'net' }; var sc = (cfg.vehicles || []).filter(function (v) { return v.id === b.v; })[0]; if (!sc) return { ok: false, error: 'vehicle' };
   if ((sh.rows || []).some(function (r) { return (r.v === sc.id || String(r.v).indexOf(sc.id + '_r') === 0) && r.ack; })) return { ok: false, error: 'subacked' };
   sh.drv = sh.drv || {}; var cur = sh.drv[sc.id] || { d: sc.driver || '', sub: false, reg: '' }, reg = cur.sub ? cur.reg : cur.d, nd = b.reset ? reg : String(b.driver || '').slice(0, 40);
   sh.drv[sc.id] = b.reset ? { d: reg, sub: false, reg: '' } : { d: nd, sub: true, reg: reg };
   (sh.rows || []).forEach(function (r) { if (r.v === sc.id || String(r.v).indexOf(sc.id + '_r') === 0) { r.driver = sh.drv[sc.id].d; r.mine = r.driver === me.id; } });
   return kv.set(rkey('sheet', b), sh).then(function () { return { ok: true, data: { drv: sh.drv }, queued: true }; }); }
  if (/^rq/.test(action)) { if (!sh || !me) return { ok: false, error: 'net' }; var rqe = rqApply(action, b, sh, me, cfg); if (rqe) return rqe; return kv.set(rkey('sheet', b), sh).then(function () { return { ok: true, data: sh, queued: true }; }); }
  if (!sh || !me) return { ok: false, error: 'net' };
  var site = ((cfg && cfg.sites) || []).filter(function (s) { return s.id === b.site; })[0] || {}, car = ((cfg && cfg.vehicles) || []).filter(function (v) { return v.id === b.v; })[0], row = sh.rows.filter(function (r) { return r.v === b.v; })[0];
  var sumOut = function () { return sh.rows.reduce(function (t, r) { return t + (r.add > 0 && r.src !== 'shop' ? r.add : 0); }, 0); };
  var vm = /^(.+)_r([2-9])$/.exec(String(b.v || '')); /* ຮອບເຕີມທີ 2, 3… ຂອງລົດດຽວກັນ (ເບິ່ງ fuel-core: <ລົດ>_r2) */
  if (!car && vm) { var bc = ((cfg && cfg.vehicles) || []).filter(function (v) { return v.id === vm[1]; })[0]; if (bc) { car = Object.assign({}, bc, { id: b.v, round: +vm[2], name: bc.name + ' · ເຕີມຄັ້ງທີ ' + vm[2] }); if (!row && action === 'row' && !b.del) { row = { v: b.v, name: car.name, driver: bc.driver, mine: bc.driver === me.id, base: bc.id, round: +vm[2] }; sh.rows.push(row); } } }
  if (action === 'row' && b.del && vm && row) { sh.rows = sh.rows.filter(function (r) { return r.v !== b.v; }); if (sh.tank) { var d0 = sh.tank.out, d1 = sumOut(); sh.tank.bal += d0 - d1; sh.tank.out = d1; mcalc(sh.tank); } return kv.set(rkey('sheet', b), sh).then(function () { return { ok: true, data: sh, queued: true }; }); }
  if (action === 'row' && vm) delete b.cm2;
  if (action === 'row') {
   if (!car || !row) return { ok: false, error: 'vehicle' };
   var fill = ['cm0', 'cm1'].some(function (k) { return k in b && num(b[k]) !== (row[k] == null ? null : row[k]); }) || ('src' in b && (b.src === 'jug' ? 'jug' : b.src === 'shop' ? 'shop' : 'tank') !== (row.src || 'tank'));
   var nrow = Object.assign({}, row); ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in b) { var n0 = num(b[k]); if (n0 == null) delete nrow[k]; else nrow[k] = n0; } });
   var bad = Tank.check(car.tank, nrow); if (bad) return { ok: false, error: bad };
   if (fill) { delete row.ack; delete row.rej; }
   ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in b) { var n = num(b[k]); if (n == null) delete row[k]; else row[k] = n; } });
   if ('src' in b) row.src = b.src === 'jug' ? 'jug' : b.src === 'shop' ? 'shop' : 'tank'; if ('shop' in b) row.shop = String(b.shop || '').replace(/[<>]/g, '').slice(0, 60); if ('note' in b) row.note = String(b.note || '').slice(0, 200); calcRow(car, row);
   if (sh.tank) { var out0 = sh.tank.out, out1 = sumOut(); sh.tank.bal += out0 - out1; sh.tank.out = out1; mcalc(sh.tank); }
  } else if (action === 'tank') {
   if (!sh.tank) return { ok: false, error: 'auth' }; var recv0 = sh.tank.recv || 0;
   ['cm', 'mtr'].concat(Array.isArray(sh.tank.recvs) ? [] : ['recv']).forEach(function (k) { if (k in b) { var n = num(b[k]); if (n == null) delete sh.tank[k]; else sh.tank[k] = n; } });
   if (b.add || b.del) { var tk = sh.tank; if (!Array.isArray(tk.recvs)) tk.recvs = tk.recv > 0 ? [{ id: 'r0', lit: tk.recv, from: '', note: '' }] : [];
    if (b.add) { var al = num(b.add.lit); if (!(al > 0)) return { ok: false, error: 'lit' }; if (!tk.recvs.some(function (r) { return r.id === b.add.id; })) tk.recvs.push({ id: b.add.id || 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36), lit: al, from: String(b.add.from || '').replace(/[<>]/g, '').slice(0, 60), note: String(b.add.note || '').replace(/[<>]/g, '').slice(0, 200) }); }
    if (b.del) tk.recvs = tk.recvs.filter(function (r) { return r.id !== b.del; });
    tk.recv = tk.recvs.reduce(function (s, r) { return s + r.lit; }, 0); }
   sh.tank.bal += (sh.tank.recv || 0) - recv0; sh.tank.measured = Tank.liters(site.tank, sh.tank.cm); mcalc(sh.tank);
  } else if (action === 'ack') {
   if (!row || row.add == null) return { ok: false, error: 'empty' };
   if (b.yes) { row.ack = { by: me.id, name: me.name, at: Date.now(), cm0: row.cm0, cm1: row.cm1, add: row.add }; delete row.rej; } else { row.rej = { by: me.id, name: me.name, at: Date.now(), why: String(b.why || '').slice(0, 200) }; delete row.ack; }
  } else if (action === 'approve') {
   if (b.yes) { if (sh.rows.some(function (r) { return r.cm1 != null && !r.ack; })) return { ok: false, error: 'unacked' }; sh.approved = { by: me.id, name: me.name, at: Date.now() }; } else sh.approved = null;
  }
  return kv.set(rkey('sheet', b), sh).then(function () { return { ok: true, data: sh, queued: true }; });
 });
}

/* ===== api(): ໜ້າຕ່າງທຸກໜ້າໃຊ້ອັນນີ້ ===== */
function apiRaw(action, body) {
 body = body || {}; var tk = ls('fuel_tk');
 var fin = function (r) { if (!r.ok && r.error === 'auth' && action === 'init') { ls('fuel_tk', null); location.href = '/'; } if (!r.ok && action !== 'login' && !(r.error === 'net' && READS[action])) toast((ERR[r.error] || 'ບໍ່ສຳເລັດ: ' + r.error) + (r.have != null ? ' (ແທ່ງເຫຼືອ ' + Math.round(r.have) + ' L)' : '') + (r.max != null ? ' (ເຕີມໄດ້ສູງສຸດ ' + Math.round(r.max) + ' L)' : ''), 'bad'); syncBar(); return r; };
 if (READS[action]) {
  return Promise.all([getQ(), kv.get(rkey(action, body))]).then(function (c) { var f = c[0].length ? flush() : 0; return c[1] !== undefined ? c[1] : (f ? Promise.race([f, tmo(3000)]).then(function () { return kv.get(rkey(action, body)); }) : undefined); }).then(function (cached) {
   var net = post(action, body, tk); if (cached === undefined) return net;
   return Promise.race([net, tmo(120).then(function () { return null; })]).then(function (r) {
    if (r) return r; /* ເນັດໄວພໍ → ຂໍ້ມູນສົດ */
    net.then(function (n) { if (n && n.ok) { kv.set(rkey(action, body), n.data); if (JSON.stringify(n.data) !== JSON.stringify(cached)) document.dispatchEvent(new CustomEvent('synced')); } }); /* ເນັດຊ້າ: ສະແດງຂອງໃນເຄື່ອງກ່ອນ ແລ້ວແຕ້ມໃໝ່ເມື່ອຂໍ້ມູນສົດມາ ແລະ ຕ່າງ */
    return { ok: true, data: cached, cached: true, stale: true };
   });
  }).then(function (r) {
   if (r.ok) return kv.set(rkey(action, body), r.data).then(function () { if (action === 'init') setTimeout(warm, 8000); if (action === 'me' && r.data && r.data.renew) { ls('fuel_tk', r.data.renew); kv.get('cred').then(function (c) { if (c) { c.token = r.data.renew; return kv.set('cred', c); } }); } return r; });
   if (r.error !== 'net') return r;
   return kv.get(rkey(action, body)).then(function (d) { if (d !== undefined) return { ok: true, data: d, cached: true }; if (action !== 'sop.open' || body.id) return r;
    return sopBuild(body, false).then(function (run) { if (!run) return r; return kv.set(rkey(action, body), run).then(function () { return sopMeSync(run); }).then(function () { return getQ(); }).then(function (q) { q.push({ action: 'sop.open', body: Object.assign({ lid: run.id }, body), token: tk, ts: Date.now() }); return kv.set('q', q); }).then(function () { setTimeout(flush, 0); return { ok: true, data: run, cached: true, queued: true }; }); }); }); /* ບໍ່ເຄີຍໂຫຼດມາກ່ອນ ແລະ ບໍ່ມີເນັດ */
  }).then(function (r) { if (!r.ok && r.error === 'net') toast(ERR.net + ' (ຍັງບໍ່ມີຂໍ້ມູນໃນເຄື່ອງ)', 'bad'); var sk = document.getElementById('v'); if (!r.ok && r.error === 'net' && sk && sk.querySelector && sk.querySelector('.skel')) sk.innerHTML = '<div class="card empty">ບໍ່ມີເນັດ ແລະ ຍັງບໍ່ມີຂໍ້ມູນໃນເຄື່ອງ — ລອງໃໝ່ເມື່ອມີເນັດ<br><button type="button" class="btn line" onclick="location.reload()">ລອງໃໝ່</button></div>'; return fin(r); });
 }
 if (WRITES[action]) {
  var rnd = function () { return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); };
  if ((action === 'rqNew' || action === 'rqUrgent') && !body.cid) body.cid = 'b' + rnd(); if (action === 'tank' && body.add && !body.add.id) body.add.id = 'r' + rnd(); if (action === 'sop.new' && !body.key) body.key = 'e' + rnd();
  var entry = { action: action, body: body, token: tk, ts: Date.now() }, slow = false;
  var queue = function () { entry.maybe = slow; return localApply(action, body).then(function (r) { if (!r.ok) return r; return getQ().then(function (q) { q.push(entry); return kv.set('q', q); }).then(function () { setTimeout(flush, 0); return r; }); }); };
  return getQ().then(function (q) { if (q.length) return queue(); return post(action, body, tk).then(function (r) { if (r.ok) { if (r.data && r.data.rows) return kv.set(rkey('sheet', body), r.data).then(function () { return r; }); if (/^sop\./.test(action) && r.data && r.data.id) return sopStore(r.data).then(function () { return r; }); return r; } if (r.error === 'net') { slow = !!r.slow; return queue(); } return r; }); }).then(fin);
 }
 if (action === 'login') return post(action, body, tk).then(function (r) {
  if (r.ok) return kv.get('cred').then(function (c) { return c && c.p === dg(body.phone) ? 0 : clearCache(); }).then(function () { return credSave(body.phone, body.pin, r); }).then(function () { return r; }); /* ເບີອື່ນ = ລ້າງຂໍ້ມູນເຄື່ອງ; ເບີດຽວກັນ = ເກັບໄວ້ */
  if (r.error !== 'net') return r;
  return credLogin(body.phone, body.pin).then(function (c) { return c || r; });
 }).then(fin);
 return post(action, body, tk).then(function (r) { return r; }).then(fin);
}

var SAVES = /^(row|tank|ack|approve|cfgSave|userSave|pin|rq(New|Decide|DecideMany|Cancel|Start|Urgent)|subDriver|sop\.(assignSet|submit|approve|reopen|new|tplSave|tplReset))$/;
function api(action, body) { /* ຫຸ້ມ apiRaw: ປອບອັບ "ກຳລັງໂຫຼດ/ບັນທຶກ…" + "ບັນທຶກແລ້ວ ✓" (ຖ້າຍັງບໍ່ມີປອບອັບອື່ນ) */
 var w = SAVES.test(action), n0 = TOASTN; bzy(1, w ? 'ກຳລັງບັນທຶກ…' : 'ກຳລັງໂຫຼດ…');
 return apiRaw(action, body).then(function (r) { bzy(-1); if (w && r && r.ok) setTimeout(function () { if (TOASTN === n0) toast(r.queued ? 'ບັນທຶກໃນເຄື່ອງແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ບັນທຶກແລ້ວ', 'ok'); }, 200); return r; }, function (e) { bzy(-1); throw e; });
}

/* ===== ສົ່ງຄິວເຂົ້າ server ===== */
var FLUSHP = Promise.resolve();
function flush() { return SYNCING ? FLUSHP : (FLUSHP = flushRun()); } /* ເອີ້ນຊ້ອນ = ລໍອັນທີ່ກຳລັງສົ່ງຢູ່ */
function flushRun() {
 SYNCING = true; syncBar(); var sent = 0;
 function step() {
  return getQ().then(function (q) {
   if (!q.length) return;
   var e = q[0]; return post(e.action, e.body, e.token).then(function (r) {
    if (r.error === 'net' || (r.error === 'auth' && !r.ok)) { if (r.error === 'auth') AUTHFAIL = true; if (r.slow && !e.maybe) return getQ().then(function (q3) { if (q3[0]) { q3[0].maybe = true; return kv.set('q', q3); } }); return; } /* ຄ້າງໄວ້ ລໍເນັດ / ລໍເຂົ້າລະບົບໃໝ່ */
    AUTHFAIL = false; if (!r.ok && e.maybe && (r.error === 'rqstate' || r.error === 'dup' || (r.error === 'locked' && e.action === 'sop.submit'))) r = { ok: true }; /* ສົ່ງຊ້ຳຫຼັງໝົດເວລາ: server ມີແລ້ວ */
    return getQ().then(function (q2) { q2.shift(); if (r.ok && r.data && r.data.id && e.body && e.body.lid && r.data.id !== e.body.lid) q2.forEach(function (x) { if (x.body && x.body.id === e.body.lid) x.body.id = r.data.id; }); /* id ຝັ່ງ server ຕ່າງ → ແກ້ຄິວທີ່ເຫຼືອ */ return kv.set('q', q2); }).then(function () {
     sent++;
     if (r.ok) { if (r.data && r.data.rows) return kv.set(rkey('sheet', e.body), r.data); if (/^sop\./.test(e.action) && r.data && r.data.id) return getQ().then(function (qq) { return qq.some(function (x) { return x.body && x.body.id === r.data.id; }) ? 0 : sopStore(r.data); }); return; }
     return kv.get('failed').then(function (f) { f = f || []; f.push({ action: e.action, body: { site: e.body.site, date: e.body.date, v: e.body.v }, error: r.error, ts: Date.now() }); return kv.set('failed', f); });
    }).then(step);
   });
  });
 }
 return step().catch(function () {}).then(function () { SYNCING = false; return getQ(); }).then(function (q) { if (sent && !q.length) { DONE = true; setTimeout(function () { DONE = false; syncBar(); }, 3000); } syncBar(); if (sent) document.dispatchEvent(new CustomEvent('synced')); });
}
var AUTHFAIL = false;
window.addEventListener('online', function () { flush().then(function () { WARMED = 0; warm(); }); });
window.addEventListener('offline', function () { OFF = true; syncBar(); });
document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
setInterval(function () { getQ().then(function (q) { if (q.length) flush(); }); }, 20000);

/* ===== ແຖບສະຖານະ ===== */
function syncBar() {
 Promise.all([getQ(), kv.get('failed')]).then(function (c) {
  var n = c[0].length, f = (c[1] || []).length, off = OFF || navigator.onLine === false, el = document.getElementById('syncbar'), txt = '', cls = '';
  if (f) { txt = f + ' ລາຍການສົ່ງບໍ່ໄດ້ — ກົດເບິ່ງ'; cls = 'bad'; }
  else if (n && AUTHFAIL) { txt = n + ' ລາຍການລໍສົ່ງ — ເຂົ້າລະບົບໃໝ່ເພື່ອສົ່ງ'; cls = 'bad'; }
  else if (n && SYNCING) { txt = 'ກຳລັງສົ່ງ ' + n + ' ລາຍການ…'; cls = 'warn'; }
  else if (n) { txt = (off ? 'ອອບລາຍ · ' : '') + 'ບັນທຶກໃນເຄື່ອງແລ້ວ — ລໍສົ່ງ ' + n + ' ລາຍການ'; cls = 'warn'; }
  else if (off) { txt = 'ອອບລາຍ — ໃຊ້ຂໍ້ມູນທີ່ເກັບໃນເຄື່ອງ'; cls = 'warn'; }
  else if (DONE) { txt = 'ສົ່ງເຂົ້າ server ຄົບແລ້ວ ✓'; cls = 'ok'; }
  if (!txt) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'syncbar'; el.type = 'button'; el.setAttribute('role', 'status'); el.onclick = showFailed; document.body.appendChild(el); }
  el.className = 'chip ' + cls; el.textContent = txt;
 });
}
function showFailed() {
 kv.get('failed').then(function (f) {
  if (!f || !f.length) return; var NM = { 'sop.mark': 'SOP', 'sop.markMany': 'SOP', 'sop.submit': 'SOP', row: 'ແກ້ cm', tank: 'ແທ່ງນ້ຳມັນ', photo: 'ຮູບ', ack: 'ຮັບຮູ້', approve: 'ອະນຸມັດ', assign: 'ມອບລົດ' };
  var m = modal('<h2>ສົ່ງບໍ່ໄດ້ ' + f.length + ' ລາຍການ</h2><p class="muted sm">server ປະຕິເສດ (ມັກເປັນເພາະໃບຖືກອະນຸມັດ/ລັອກແລ້ວ) — ກວດຂໍ້ມູນຈິງ ແລ້ວກອກໃໝ່ຖ້າຈຳເປັນ</p>' + f.map(function (x) { return '<div class="cr"><b>' + esc(NM[x.action] || x.action) + '</b> · ' + esc(x.body.date || '') + '<br><span class="muted sm">' + esc(ERR[x.error] || x.error) + '</span></div>'; }).join('') + '<button class="btn blk" id="fok" style="margin-top:12px">ຮັບຊາບ</button>');
  m.querySelector('#fok').onclick = function () { kv.del('failed').then(function () { m.remove(); syncBar(); }); };
 });
}

/* ===== ອອກຈາກລະບົບ: ມີຂອງຄ້າງຄິວ = ເຕືອນກ່ອນ (ອອກແລ້ວຈະເສຍ) ===== */
function logout() {
 getQ().then(function (q) { return q.length ? flush().then(getQ) : q; }).then(function (q) {
  var out = function () { ls('fuel_tk', null); Promise.all([kv.del('q'), kv.del('failed')]).then(function () { location.href = '/'; }); };
  if (!q.length) return out();
  var m = modal('<h2>ຍັງມີ ' + q.length + ' ລາຍການທີ່ຍັງບໍ່ໄດ້ສົ່ງ</h2><p class="muted">ຖ້າອອກຈາກລະບົບດຽວນີ້ ຂໍ້ມູນນັ້ນຈະຫາຍ. ລໍມີເນັດກ່ອນຈຶ່ງອອກ.</p><div class="row"><button class="btn line grow" id="lno">ຍັງບໍ່ອອກ</button><button class="btn bad grow" id="lyes">ອອກ ແລະ ຖິ້ມ</button></div>');
  m.querySelector('#lno').onclick = function () { m.remove(); }; m.querySelector('#lyes').onclick = out;
 });
}
document.addEventListener('DOMContentLoaded', syncBar);
