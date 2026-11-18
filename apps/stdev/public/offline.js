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
function clearCache() { return kv.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== 'q' && k !== 'failed'; }).map(function (k) { return kv.del(k); })); }); }

var READS = { me: 1, init: 1, sheet: 1, photos: 1, photometa: 1, ledger: 1, drivers: 1 }, WRITES = { row: 1, tank: 1, photo: 1, ack: 1, approve: 1, assign: 1 };
var OFF = false, SYNCING = false, DONE = false;
var rkey = function (a, b) { return a === 'init' || a === 'drivers' || a === 'me' ? a : a + '|' + (b.site || '') + '|' + (b.date || ''); };
function post(action, body, token) {
 return fetch('/api/' + action, { method: 'POST', body: JSON.stringify(Object.assign({ token: token }, body || {})) }).then(function (r) { return r.json(); }).then(function (r) { OFF = false; return r; }, function () { OFF = true; return { ok: false, error: 'net' }; });
}
function getQ() { return kv.get('q').then(function (q) { return q || []; }); }

/* ===== ຄິດໄລ່ໃນເຄື່ອງ (ໃຫ້ຜົນຄືກັບ server ເພາະໃຊ້ Tank.liters ໄຟລ໌ດຽວກັນ) ===== */
var num = function (x) { var n = Number(x); return x === '' || x == null || !isFinite(n) || n < 0 || n > 1e6 ? null : n; };
function mcalc(t) { if (!t.meter) return; t.mused = t.mtr != null && t.mprev != null ? t.mtr - t.mprev : null; t.mdiff = t.mused != null ? t.mused - ((t.mbase || 0) + t.out) : null; }
function calcRow(car, r) { var L0 = Tank.liters(car.tank, r.cm0), L1 = Tank.liters(car.tank, r.cm1), L2 = Tank.liters(car.tank, r.cm2); r.L0 = L0; r.L1 = L1; r.L2 = L2; r.gap = r.prev && L0 != null && r.prev.L2 != null ? L0 - r.prev.L2 : null; r.add = L0 != null && L1 != null ? L1 - L0 : null; r.used = L1 != null && L2 != null ? L1 - L2 : null; }
function localApply(action, b) { /* ຄືນ {ok, data} ຫຼື {ok:false,error} — ແລະ ບັນທຶກແຄັດ */
 return Promise.all([kv.get('init'), kv.get(rkey('sheet', b)), kv.get(rkey('photos', b))]).then(function (c) {
  var init = c[0], sh = c[1], ph = c[2] || {}, me = init && init.me, cfg = init && init.cfg;
  if (action === 'assign') { if (!cfg) return { ok: false, error: 'net' }; cfg.vehicles.forEach(function (v) { if (v.id === b.v) v.driver = String(b.driver || ''); }); return kv.set('init', init).then(function () { return { ok: true, data: cfg.vehicles.filter(function (v) { return v.site === b.site; }).map(function (v) { return { id: v.id, driver: v.driver }; }), queued: true }; }); }
  if (action === 'photo') { if (b.data) ph[b.key] = b.data; else delete ph[b.key]; return kv.set(rkey('photos', b), ph).then(function () { return { ok: true, data: 1, queued: true }; }); }
  if (!sh || !me) return { ok: false, error: 'net' };
  var site = ((cfg && cfg.sites) || []).filter(function (s) { return s.id === b.site; })[0] || {}, car = ((cfg && cfg.vehicles) || []).filter(function (v) { return v.id === b.v; })[0], row = sh.rows.filter(function (r) { return r.v === b.v; })[0];
  var sumOut = function () { return sh.rows.reduce(function (t, r) { return t + (r.add > 0 ? r.add : 0); }, 0); };
  if (action === 'row') {
   if (!car || !row) return { ok: false, error: 'vehicle' };
   var fill = ['cm0', 'cm1'].some(function (k) { return k in b && num(b[k]) !== (row[k] == null ? null : row[k]); }) || ('src' in b && (b.src === 'jug' ? 'jug' : 'tank') !== (row.src || 'tank'));
   var nrow = Object.assign({}, row); ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in b) { var n0 = num(b[k]); if (n0 == null) delete nrow[k]; else nrow[k] = n0; } });
   var bad = Tank.check(car.tank, nrow); if (bad) return { ok: false, error: bad };
   if (fill) { delete row.ack; delete row.rej; }
   ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in b) { var n = num(b[k]); if (n == null) delete row[k]; else row[k] = n; } });
   if ('src' in b) row.src = b.src === 'jug' ? 'jug' : 'tank'; if ('note' in b) row.note = String(b.note || '').slice(0, 200); calcRow(car, row);
   if (sh.tank) { var out0 = sh.tank.out, out1 = sumOut(); sh.tank.bal += out0 - out1; sh.tank.out = out1; mcalc(sh.tank); }
  } else if (action === 'tank') {
   if (!sh.tank) return { ok: false, error: 'auth' }; var recv0 = sh.tank.recv || 0;
   ['cm', 'recv', 'mtr'].forEach(function (k) { if (k in b) { var n = num(b[k]); if (n == null) delete sh.tank[k]; else sh.tank[k] = n; } });
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
function api(action, body) {
 body = body || {}; var tk = ls('fuel_tk');
 var fin = function (r) { if (!r.ok && r.error === 'auth' && action === 'init') { ls('fuel_tk', null); location.href = '/'; } if (!r.ok && action !== 'login' && !(r.error === 'net' && READS[action])) toast(ERR[r.error] || 'ບໍ່ສຳເລັດ: ' + r.error, 'bad'); syncBar(); return r; };
 if (READS[action]) {
  return getQ().then(function (q) { return q.length ? flush() : 0; }).then(function () { return post(action, body, tk); }).then(function (r) {
   if (r.ok) return kv.set(rkey(action, body), r.data).then(function () { return r; });
   if (r.error !== 'net') return r;
   return kv.get(rkey(action, body)).then(function (d) { return d !== undefined ? { ok: true, data: d, cached: true } : r; }); /* ບໍ່ເຄີຍໂຫຼດມາກ່ອນ ແລະ ບໍ່ມີເນັດ */
  }).then(function (r) { if (!r.ok && r.error === 'net') toast(ERR.net + ' (ຍັງບໍ່ມີຂໍ້ມູນໃນເຄື່ອງ)', 'bad'); return fin(r); });
 }
 if (WRITES[action]) {
  var entry = { action: action, body: body, token: tk, ts: Date.now() };
  var queue = function () { return localApply(action, body).then(function (r) { if (!r.ok) return r; return getQ().then(function (q) { q.push(entry); return kv.set('q', q); }).then(function () { setTimeout(flush, 0); return r; }); }); };
  return getQ().then(function (q) { if (q.length) return queue(); return post(action, body, tk).then(function (r) { if (r.ok) { if (r.data && r.data.rows) return kv.set(rkey('sheet', body), r.data).then(function () { return r; }); return r; } return r.error === 'net' ? queue() : r; }); }).then(fin);
 }
 return post(action, body, tk).then(function (r) { if (r.ok && action === 'login') return clearCache().then(function () { return r; }); return r; }).then(fin);
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
    if (r.error === 'net' || (r.error === 'auth' && !r.ok)) { if (r.error === 'auth') AUTHFAIL = true; return; } /* ຄ້າງໄວ້ ລໍເນັດ / ລໍເຂົ້າລະບົບໃໝ່ */
    AUTHFAIL = false;
    return getQ().then(function (q2) { q2.shift(); return kv.set('q', q2); }).then(function () {
     sent++;
     if (r.ok) { if (r.data && r.data.rows) return kv.set(rkey('sheet', e.body), r.data); return; }
     return kv.get('failed').then(function (f) { f = f || []; f.push({ action: e.action, body: { site: e.body.site, date: e.body.date, v: e.body.v }, error: r.error, ts: Date.now() }); return kv.set('failed', f); });
    }).then(step);
   });
  });
 }
 return step().catch(function () {}).then(function () { SYNCING = false; return getQ(); }).then(function (q) { if (sent && !q.length) { DONE = true; setTimeout(function () { DONE = false; syncBar(); }, 3000); } syncBar(); if (sent) document.dispatchEvent(new CustomEvent('synced')); });
}
var AUTHFAIL = false;
window.addEventListener('online', function () { flush(); });
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
  if (!f || !f.length) return; var NM = { row: 'ແກ້ cm', tank: 'ແທ່ງນ້ຳມັນ', photo: 'ຮູບ', ack: 'ຮັບຮູ້', approve: 'ອະນຸມັດ', assign: 'ມອບລົດ' };
  var m = modal('<h2>ສົ່ງບໍ່ໄດ້ ' + f.length + ' ລາຍການ</h2><p class="muted sm">server ປະຕິເສດ (ມັກເປັນເພາະໃບຖືກອະນຸມັດ/ລັອກແລ້ວ) — ກວດຂໍ້ມູນຈິງ ແລ້ວກອກໃໝ່ຖ້າຈຳເປັນ</p>' + f.map(function (x) { return '<div class="cr"><b>' + esc(NM[x.action] || x.action) + '</b> · ' + esc(x.body.date || '') + '<br><span class="muted sm">' + esc(ERR[x.error] || x.error) + '</span></div>'; }).join('') + '<button class="btn blk" id="fok" style="margin-top:12px">ຮັບຊາບ</button>');
  m.querySelector('#fok').onclick = function () { kv.del('failed').then(function () { m.remove(); syncBar(); }); };
 });
}

/* ===== ອອກຈາກລະບົບ: ມີຂອງຄ້າງຄິວ = ເຕືອນກ່ອນ (ອອກແລ້ວຈະເສຍ) ===== */
function logout() {
 getQ().then(function (q) { return q.length ? flush().then(getQ) : q; }).then(function (q) {
  var out = function () { ls('fuel_tk', null); Promise.all([clearCache(), kv.del('q'), kv.del('failed')]).then(function () { location.href = '/'; }); };
  if (!q.length) return out();
  var m = modal('<h2>ຍັງມີ ' + q.length + ' ລາຍການທີ່ຍັງບໍ່ໄດ້ສົ່ງ</h2><p class="muted">ຖ້າອອກຈາກລະບົບດຽວນີ້ ຂໍ້ມູນນັ້ນຈະຫາຍ. ລໍມີເນັດກ່ອນຈຶ່ງອອກ.</p><div class="row"><button class="btn line grow" id="lno">ຍັງບໍ່ອອກ</button><button class="btn bad grow" id="lyes">ອອກ ແລະ ຖິ້ມ</button></div>');
  m.querySelector('#lno').onclick = function () { m.remove(); }; m.querySelector('#lyes').onclick = out;
 });
}
document.addEventListener('DOMContentLoaded', syncBar);
