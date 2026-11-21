/* Service worker: ເປີດແອັບໄດ້ທັນທີ ແລະ ຕອນສັນຍານອ່ອນ (ໜ້າ/ສະຄຣິບ/ໄອຄອນ ເກັບໃນເຄື່ອງ).
 * /api/ ບໍ່ຖືກເກັບທີ່ນີ້ — ຂໍ້ມູນນ້ຳມັນ + ຄິວບັນທຶກຕອນອອບລາຍ ຢູ່ IndexedDB ໃນ offline.js.
 * ປ່ຽນ VER ທຸກຄັ້ງທີ່ແກ້ໄຟລ໌ໜ້າ ເພື່ອໃຫ້ມືຖືໂຫຼດຕົວໃໝ່ */
'use strict';
const VER = 'stdev-v128', SHELL = ['/', 'index.html', 'home.html', 'home.js', 'admin.html', 'admin.js', 'admin.css', 'sop.html', 'sop.js', 'sop.css', 'hrreport.html', 'hrreport.js', 'people.html', 'perm.js', 'office.html', 'office.css', 'office-ops.js', 'office-rep.js', 'office-admin.js', 'driver.html', 'fuel.css', 'tank.js', 'app.js', 'offline.js', 'login.js', 'office.js', 'driver.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', 'cover.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VER).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); })); /* cache:'reload' = ບໍ່ເອົາສຳເນົາເກົ່າຈາກ HTTP cache (LiteSpeed ໃຫ້ເກັບ 7 ວັນ) */ }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { /* ເວີຊັນໃໝ່ມາແທນເກົ່າ → ໂຫຼດທຸກໜ້າທີ່ເປີດຢູ່ໃໝ່ເອງ (ໜ້າເກົ່າບໍ່ຕ້ອງມີໂຄ້ດຮັບຮູ້) — ຜູ້ໃຊ້ບໍ່ຕ້ອງເຮັດຫຍັງ; ຄິວອອບລາຍເກັບໃນ IndexedDB ບໍ່ຫາຍ */
  let upgraded = false;
  e.waitUntil(caches.keys().then(function (ks) { upgraded = ks.some(function (k) { return /^stdev-v\d+$/.test(k) && k !== VER; }); return Promise.all(ks.filter(function (k) { return /^stdev-v\d+$/.test(k) && k !== VER; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }).then(function () { if (!upgraded) return; return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (x) { } }); }); }));
});
const FONTS = 'stdev-fonts';
self.addEventListener('fetch', function (e) {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { /* ຟອນ: ຄັ້ງທຳອິດໂຫຼດ ແລ້ວເກັບໄວ້ — ຕໍ່ໄປເປີດທັນທີ ແມ້ບໍ່ມີເນັດ */
    e.respondWith(caches.open(FONTS).then(function (c) { return c.match(e.request).then(function (hit) { return hit || fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; }); }); }));
    return;
  }
  if (u.origin !== location.origin || u.pathname.indexOf('/api/') === 0 || u.pathname.indexOf('/hr') === 0) return; /* /hr/ ມີ service worker ຂອງຕົນເອງ */
  /* ໜ້າ/ໂຄ້ດ: ເປີດຈາກເຄື່ອງທັນທີ (ບໍ່ລໍເນັດ) ແລ້ວໂຫຼດຕົວໃໝ່ເກັບໄວ້ເບື້ອງຫຼັງ. ເວີຊັນໃໝ່ເຂົ້າມາດ້ວຍ VER ປ່ຽນ → install ໂຫຼດໃໝ່ທັງໝົດ + ໜ້າໂຫຼດໃໝ່ເອງ */
  const key = new Request(u.origin + u.pathname);
  e.respondWith(caches.open(VER).then(function (c) { return c.match(key).then(function (hit) {
    if (hit) return hit; /* ບໍ່ໂຫຼດຊ້ຳເບື້ອງຫຼັງທຸກເທື່ອ (ແຍ່ງຊ່ອງເນັດກັບ API ເຮັດໃຫ້ຊ້າ) — ເວີຊັນໃໝ່ມາຕອນ VER ປ່ຽນ: install ໂຫຼດໃໝ່ທັງໝົດ */
    return fetch(e.request, { cache: 'no-cache' }).then(function (r) { if (r.ok) c.put(key, r.clone()); return r; }).catch(function () { return Response.error(); });
  }); }));
});

/* ===== ວຽກເບື້ອງຫຼັງ (ເຮັດຕໍ່ ເຖິງແມ່ນອອກຈາກແອັບໄປໃຊ້ແອັບອື່ນ ບໍ່ໄດ້ປັດປິດ): 1) ໂຫຼດຂໍ້ມູນທຸກໜ້າມາເກັບໄວ້ 2) ສົ່ງຄິວທີ່ບັນທຶກຕອນບໍ່ມີເນັດຂຶ້ນ server ເມື່ອມີເນັດ =====
 * ໃຊ້ບ່ອນເກັບດຽວກັບໜ້າ (IndexedDB 'stfuel'). ຂໍ້ມູນຈາກ page ຜ່ານ message / sync / periodicsync */
let IDBP = null;
function idb() { return IDBP || (IDBP = new Promise(function (res, rej) { const r = indexedDB.open('stfuel', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; })); }
function kvGet(k) { return idb().then(function (d) { return new Promise(function (res, rej) { const q = d.transaction('kv', 'readonly').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }); }
function kvSet(k, v) { return idb().then(function (d) { return new Promise(function (res, rej) { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }); }
const GEN = { dash: 1, approvers: 1, pending: 1, rqAhead: 1, userList: 1, catalog: 1, schema: 1, adjlog: 1, 'sop.board': 1, 'sop.me': 1, 'sop.open': 1, 'sop.tpls': 1, 'sop.hdr': 1 };
function rkey(a, b) { b = b || {}; if (GEN[a]) return a + '|' + JSON.stringify(b); return a === 'init' || a === 'drivers' || a === 'me' ? a : a + '|' + (b.site || '') + '|' + (b.date || ''); } /* ຕ້ອງຄືກັບ rkey ໃນ offline.js */
function apiPost(action, body, token, ms) {
  const ctl = new AbortController(); let slow = false; const t = setTimeout(function () { slow = true; ctl.abort(); }, ms || 15000);
  return fetch('/api/' + action, { method: 'POST', body: JSON.stringify(Object.assign({ token: token }, body || {})), signal: ctl.signal }).then(function (r) { return r.status === 413 ? { ok: false, error: 'toolarge' } : r.json(); }).then(function (r) { clearTimeout(t); return r; }, function () { clearTimeout(t); return { ok: false, error: 'net', slow: slow }; });
}
function tokUser(t) { try { return JSON.parse(atob(String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).u || ''; } catch (e) { return ''; } }
const nap = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
let WARMING = false;
async function warmSW() {
  if (WARMING) return; WARMING = true;
  try {
    const tk = await kvGet('tk'); if (!tk) return;
    const force = Date.now() - ((await kvGet('warmts')) || 0) >= 3 * 36e5; let init = await kvGet('init'), me = await kvGet('me');
    if (!init) { const ri = await apiPost('init', {}, tk); if (ri.ok) { init = ri.data; await kvSet('init', init); } } /* ເຄື່ອງທີ່ບໍ່ເຄີຍເປີດໜ້າສະໜາມ ກໍໂຫຼດ init ເອງ */
    if (!me) { const rm = await apiPost('me', {}, tk); if (rm.ok) { me = rm.data; await kvSet('me', me); } }
    const cfg = init && init.cfg; if (!cfg) { if (init) await kvSet('warmts', Date.now()); return; }
    const day = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), d6 = new Date(Date.now() + 7 * 36e5 - 6 * 864e5).toISOString().slice(0, 10);
    const jobs = [['drivers', {}], ['pending', {}], ['sop.me', {}], ['sop.hdr', {}]];
    (cfg.sites || []).slice(0, 6).forEach(function (st) { const s = st.id; jobs.push(['sheet', { site: s, date: day }], ['photos', { site: s, date: day }], ['photometa', { site: s, date: day }], ['ledger', { site: s }], ['approvers', { site: s }], ['rqAhead', { site: s, date: day }], ['dash', { site: s, from: d6, to: day }], ['adjlog', { site: s }]); });
    if (me && (me.level === 'superadmin' || me.level === 'admin')) jobs.push(['userList', {}], ['catalog', {}], ['schema', {}], ['sop.board', {}], ['sop.tpls', {}]);
    let done = true;
    for (const j of jobs) {
      const k = rkey(j[0], j[1]); if (!force && (await kvGet(k)) !== undefined) continue;
      const r = await apiPost(j[0], j[1], tk); if (r.error === 'net' || (r.error === 'auth' && j === jobs[0])) { done = false; break; } /* auth ຂອງຄຳຂໍທຳອິດ = token ເສຍ; ຄຳຂໍອື່ນ auth = ບໍ່ມີສິດຂໍ້ມູນນັ້ນ ຂ້າມ */
      if (r.ok) await kvSet(k, r.data); await nap(150);
    }
    if (force && done) await kvSet('warmts', Date.now());
  } catch (e) { } finally { WARMING = false; }
}
async function flushSW() { /* ສົ່ງຄິວຕາມລຳດັບ (ຕົວດຽວກັບ flush ໃນ offline.js) — ໃຊ້ lock ກັນສົ່ງຊ້ອນກັບໜ້າ */
  const run = async function () {
    let sent = 0;
    for (;;) {
      const q = (await kvGet('q')) || []; if (!q.length) break; const e = q[0], cur = await kvGet('tk'), tkn = cur && cur !== e.token && tokUser(cur) && tokUser(cur) === tokUser(e.token) ? cur : e.token; /* token ໃໝ່ຂອງຄົນດຽວກັນ */
      const r = await apiPost(e.action, e.body, tkn, 25000);
      if (r.error === 'net' || (r.error === 'auth' && !r.ok)) { if (r.slow && !e.maybe) { q[0].maybe = true; await kvSet('q', q); } break; }
      let rr = r; if (!rr.ok && e.maybe && (rr.error === 'rqstate' || rr.error === 'dup' || (rr.error === 'locked' && e.action === 'sop.submit'))) rr = { ok: true };
      const q2 = (await kvGet('q')) || []; q2.shift();
      if (rr.ok && rr.data && rr.data.id && e.body && e.body.lid && rr.data.id !== e.body.lid) q2.forEach(function (x) { if (x.body && x.body.id === e.body.lid) x.body.id = rr.data.id; });
      await kvSet('q', q2); sent++;
      if (rr.ok) { if (rr.data && rr.data.rows) await kvSet(rkey('sheet', e.body), rr.data); }
      else { const f = (await kvGet('failed')) || []; f.push({ action: e.action, body: { site: e.body.site, date: e.body.date, v: e.body.v }, error: rr.error, ts: Date.now() }); await kvSet('failed', f); }
    }
    if (sent) (await self.clients.matchAll({ type: 'window' })).forEach(function (c) { c.postMessage({ t: 'synced' }); });
  };
  if (self.navigator && navigator.locks) await navigator.locks.request('stdev-q', run); else await run();
}
self.addEventListener('message', function (e) { if (e.data && e.data.t === 'warm') e.waitUntil(warmSW()); if (e.data && e.data.t === 'flush') e.waitUntil(flushSW()); });
self.addEventListener('sync', function (e) { if (e.tag === 'stdev-flush') e.waitUntil(flushSW().then(warmSW)); });
self.addEventListener('periodicsync', function (e) { if (e.tag === 'stdev-warm') e.waitUntil(flushSW().then(warmSW)); });
