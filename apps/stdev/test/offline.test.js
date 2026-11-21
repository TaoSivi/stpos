/* ທົດສອບຄິວອອບລາຍ (public/offline.js) ກັບ server ຈິງ: ບໍ່ມີເນັດ / ເນັດຊ້າ(ຄ້າງ) / ຕອບຫາຍ ແລ້ວສົ່ງຊ້ຳ — ບໍ່ຊ້ຳ, ບໍ່ຄ້າງ, ຂໍ້ມູນຂຶ້ນ server ຄົບ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const PORT = 4100 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-o-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: JSON.stringify(o || {}) }).then(function (r) { return r.json(); }); };
const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const D = '2026-11-19'; let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
(async function () {
  try {
    assert.strictEqual(cli('adduser', '02055550001', 'ເຈົ້າຂອງ', '4321', 'superadmin').status, 0);
    assert.strictEqual(cli('adduser', '02055550005', 'ຫົວໜ້າ', '9753', 'user', '--fuel=head', '--sites=s1').status, 0);
    assert.strictEqual(cli('adduser', '02055550003', 'ຄົນຂັບ', '1357', 'user', '--fuel=driver', '--sites=s1').status, 0);
    proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await wait(900);
    const sa = (await call('login', { phone: '02055550001', pin: '4321' })).token, head = (await call('login', { phone: '02055550005', pin: '9753' })).token;
    assert.ok((await call('cfgSave', { token: sa, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 }, rq: true }], vehicles: [{ id: 'v1', name: 'ລົດ 1', site: 's1', driver: '02055550003', tank: { t: 'lpc', k: 5 } }, { id: 'v2', name: 'ລົດ 2', site: 's1', driver: '02055550003', tank: { t: 'lpc', k: 5 } }] } })).ok);

    /* ----- ຫ້ອງທົດລອງ: offline.js ຢູ່ໃນ vm ມີ fetch ທີ່ຄວບຄຸມໄດ້ (up / down / hang / lost) ----- */
    let mode = 'up', store = {}; const box = { toasts: [] };
    const ctx = {
      fetch: function (url, opt) {
        if (mode === 'down') return Promise.reject(new TypeError('offline'));
        const sig = opt && opt.signal, never = function (rej) { return new Promise(function (res, rj) { if (sig) sig.addEventListener('abort', function () { rj(new Error('aborted')); }); }); };
        if (mode === 'hang') return never();
        if (mode === 'slow') return new Promise(function (res) { setTimeout(function () { res(fetch(H + url, { method: 'POST', body: opt.body })); }, 1200); });
        const real = fetch(H + url, { method: 'POST', body: opt.body }); /* ຂໍຖືກສົ່ງຖືງ server ແລ້ວ */
        return mode === 'lost' ? real.then(function () { return never(); }) : real;
      },
      atob: function (x) { return Buffer.from(x, 'base64').toString('binary'); }, AbortController: AbortController, crypto: require('crypto').webcrypto, TextEncoder: TextEncoder, Uint8Array: Uint8Array, CustomEvent: function () { }, ls: function (k, v) { if (v === undefined) return store[k]; if (v === null) delete store[k]; else store[k] = v; }, toast: function (m) { box.toasts.push(m); }, ERR: {}, TOASTN: 0,
      bzy: function () { }, modal: function () { return { querySelector: function () { return {}; } }; }, esc: String, Tank: require('../public/tank.js'), navigator: { onLine: true }, location: {}, console: console,
      document: { createElement: function () { return { setAttribute: function () { }, remove: function () { } }; }, addEventListener: function () { }, getElementById: function () { return null; }, dispatchEvent: function () { }, hidden: false, body: { appendChild: function () { } } },
      setInterval: function () { }, setTimeout: function (f, ms) { return setTimeout(f, ms >= 10000 ? 150 : ms); }, clearTimeout: clearTimeout, Promise: Promise, JSON: JSON, Date: Date, Math: Math, Object: Object, Array: Array, String: String, Number: Number, isFinite: isFinite
    };
    ctx.window = ctx; ctx.addEventListener = function () { }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'offline.js'), 'utf8'), ctx);
    const api = function (a, b) { return ctx.api(a, b); }, q = function () { return vm.runInContext('getQ()', ctx); }, failed = function () { return vm.runInContext("kv.get('failed')", ctx); };
    store.fuel_tk = head; const S = { site: 's1', date: D };

    /* ----- ມີເນັດ: ໂຫຼດ ແລ້ວເກັບໃນເຄື່ອງ ----- */
    assert.ok((await api('init')).ok); assert.ok((await api('sheet', S)).ok); ok('online: init + sheet loaded and cached');

    /* ----- ບໍ່ມີເນັດ ----- */
    mode = 'down';
    const c1 = await api('sheet', S); assert.ok(c1.ok && c1.cached, 'read falls back to the saved copy');
    const n1 = await api('rqNew', Object.assign({ lines: [{ v: 'v1', lit: 40 }, { v: 'v2', lit: 25 }], note: 'ຂຸດ' }, S));
    assert.ok(n1.ok && n1.queued, 'new request saved on the device: ' + JSON.stringify(n1));
    const sh1 = (await api('sheet', S)).data; assert.strictEqual(sh1.reqs.length, 2); assert.strictEqual(sh1.reqs[0].state, 'pending'); assert.strictEqual((await q()).length, 1);
    const u1 = await api('rqUrgent', Object.assign({ v: 'v1', src: 'tank' }, S)); assert.ok(u1.ok, 'urgent fill offline: ' + JSON.stringify(u1));
    const sh2 = (await api('sheet', S)).data; assert.ok(sh2.reqs.some(function (r) { return r.urgent; }) && sh2.rows.some(function (r) { return r.rq; }), 'urgent request opens a fill row locally');
    const cn = await api('rqCancel', Object.assign({ id: sh1.reqs[1].id }, S)); assert.ok(cn.ok, 'cancel a request that has not reached the server yet');
    assert.strictEqual((await api('rqNew', Object.assign({ lines: [{ v: 'nope', lit: 5 }] }, S))).ok, false, 'bad input is refused at once, not queued');
    assert.strictEqual((await q()).length, 3); ok('offline: request / urgent / cancel are saved on the device, shown at once, and queued in order');

    /* ----- ເນັດຄ້າງ (ບໍ່ຕອບ): ອ່ານໄດ້ຈາກເຄື່ອງ, ບັນທຶກເຂົ້າຄິວ, ບໍ່ຄ້າງ ----- */
    mode = 'hang'; const t0 = Date.now(), c2 = await api('sheet', S); assert.ok(c2.ok && c2.cached && Date.now() - t0 < 4000, 'slow net: read answers from the saved copy');
    const h1 = await api('rqNew', Object.assign({ lines: [{ v: 'v2', lit: 10 }] }, S)); assert.ok(h1.ok && h1.queued && Date.now() - t0 < 6000, 'slow net: write is queued, page not stuck'); ok('slow network: no hang, reads from device, writes queued');

    /* ----- ເນັດກັບມາ → ສົ່ງເຂົ້າ server ຄົບ ບໍ່ຊ້ຳ ----- */
    await wait(500); mode = 'up'; await ctx.flush(); assert.strictEqual((await q()).length, 0, 'queue drained'); assert.ok(!(await failed()) || !(await failed()).length, 'nothing failed');
    const srvSh = (await call('sheet', { token: head, site: 's1', date: D })).data; const live = srvSh.reqs.filter(function (r) { return r.state !== 'cancel'; });
    assert.strictEqual(srvSh.reqs.length, 4, 'server has all: 2 + urgent + 1 later (cancelled one kept as cancel)'); assert.strictEqual(srvSh.reqs.filter(function (r) { return r.state === 'cancel'; }).length, 1);
    assert.strictEqual(srvSh.reqs.filter(function (r) { return r.urgent; }).length, 1); ok('back online: queue sent in order, nothing lost, nothing duplicated');

    /* ----- ຄຳຂໍໄປຮອດ server ແລ້ວ ແຕ່ຄຳຕອບຫາຍ → ສົ່ງຊ້ຳ ບໍ່ເປັນຄຳຂໍຊ້ຳ ----- */
    mode = 'lost'; const l1 = await api('rqNew', Object.assign({ lines: [{ v: 'v1', lit: 7 }] }, S)); assert.ok(l1.ok && l1.queued);
    const before = (await call('sheet', { token: head, site: 's1', date: D })).data.reqs.length; assert.strictEqual(before, 5, 'the lost-reply request did reach the server once');
    await wait(500); mode = 'up'; await ctx.flush(); const after = (await call('sheet', { token: head, site: 's1', date: D })).data.reqs.length; assert.strictEqual(after, 5, 'resend does not duplicate'); assert.strictEqual((await q()).length, 0); ok('lost reply + resend: server deduplicates (client id)');

    /* ----- ຍົກເລີກທີ່ໄປຮອດແລ້ວ ແຕ່ຕອບຫາຍ → ສົ່ງຊ້ຳບໍ່ຂຶ້ນ "ສົ່ງບໍ່ໄດ້" ----- */
    const tgt = (await call('sheet', { token: head, site: 's1', date: D })).data.reqs.filter(function (r) { return r.state === 'pending' && r.lit === 7; })[0];
    mode = 'lost'; assert.ok((await api('rqCancel', Object.assign({ id: tgt.id }, S))).ok); await wait(500); mode = 'up'; await ctx.flush();
    assert.ok(!(await failed()) || !(await failed()).length, 'replayed cancel is not reported as a failure'); ok('lost reply on cancel: replay is silent');
    /* ----- SOP: ໝາຍຂໍ້ / ສົ່ງ ຕອນບໍ່ມີເນັດ (ໃບຕ້ອງເຄີຍເປີດຕອນມີເນັດ) ----- */
    assert.ok((await call('userSave', { token: sa, user: { phone: '02055550005', name: 'ຫົວໜ້າ', pin: '9753', level: 'user', fuel: 'head', sites: ['s1'], apps: ['fuel', 'sop'] } })).ok);
    const hd = (await call('login', { phone: '02055550005', pin: '9753' })).token; store.fuel_tk = hd;
    assert.ok((await call('sop.assignSet', { token: sa, tpl: 'f03', users: ['02055550005'] })).ok);
    const op = await api('sop.open', { tpl: 'f03' }); assert.ok(op.ok, 'open checklist online: ' + JSON.stringify(op)); const run = op.data, ids = run.items.map(function (i) { return i.id; });
    mode = 'down'; const m1 = await api('sop.mark', { id: run.id, item: ids[0], v: 0, note: 'ເສຍ' }); assert.ok(m1.ok && m1.queued && m1.data.a[ids[0]].v === 0, 'mark offline: ' + JSON.stringify(m1));
    const mm = await api('sop.markMany', { id: run.id, items: ids }); assert.ok(mm.ok); assert.strictEqual(mm.data.a[ids[0]].v, 0, 'markMany keeps the answered item');
    const re = await api('sop.open', { tpl: 'f03' }); assert.ok(re.ok && re.data.a[ids[0]].v === 0 && re.cached, 'reopening offline shows the offline answers');
    const sb = await api('sop.submit', { id: run.id }); assert.ok(sb.ok && sb.data.status === 'done', 'submit offline: ' + JSON.stringify(sb));
    mode = 'lost'; await ctx.flush(); await wait(500); mode = 'up'; await ctx.flush(); assert.strictEqual((await q()).length, 0); assert.ok(!(await failed()) || !(await failed()).length, 'nothing failed');
    const srvRun = (await call('sop.open', { token: hd, tpl: 'f03' })).data; assert.strictEqual(srvRun.status, 'done'); assert.strictEqual(srvRun.a[ids[0]].v, 0); ok('SOP: mark / mark-all / submit offline, replay after lost reply, server complete');
    /* ----- ບໍ່ເຄີຍເປີດມາກ່ອນ: ໂຫຼດລ່ວງໜ້າຫຼັງເຂົ້າລະບົບ, ແລ້ວ SOP (ລາຍອາທິດ + ແບບຄັ້ງ) ແລະ ມອບລົດແທນ ໃຊ້ໄດ້ຕອນບໍ່ມີເນັດ ----- */
    assert.ok((await call('sop.assignSet', { token: sa, tpl: 'f03w', users: ['02055550005'] })).ok); assert.ok((await call('sop.assignSet', { token: sa, tpl: 'f01', users: ['02055550005'] })).ok);
    const today = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), T = { site: 's1', date: today };
    await vm.runInContext('clearCache()', ctx); await vm.runInContext("kv.del('q')", ctx); ctx.WARMED_RESET = 1; vm.runInContext('WARMED = 0', ctx);
    mode = 'up'; assert.ok((await api('init')).ok); vm.runInContext('WARMED = 0; warm()', ctx); await wait(4500); /* warm() ໂຫຼດ sheet / sop.me ມາເກັບ ໂດຍຜູ້ໃຊ້ບໍ່ໄດ້ເປີດໜ້ານັ້ນ */
    assert.ok(await vm.runInContext("kv.get('sop.me|{}')", ctx), 'sop.me prefetched'); assert.ok(await vm.runInContext("kv.get('ledger|s1|')", ctx), 'ledger prefetched'); assert.ok(await vm.runInContext('kv.get("approvers|{\\"site\\":\\"s1\\"}")', ctx), 'approvers prefetched'); assert.ok(await vm.runInContext("kv.keys().then(function (k) { return k.some(function (x) { return String(x).indexOf('dash|') === 0; }); })", ctx), 'dash prefetched'); assert.ok(await vm.runInContext("kv.get('sheet|s1|" + today + "')", ctx), 'today sheet prefetched');
    mode = 'down';
    const w1 = await api('sop.open', { tpl: 'f03w' }); assert.ok(w1.ok && w1.data.items.length > 0 && w1.data.status === 'open', 'never-opened weekly checklist opens offline: ' + JSON.stringify(w1).slice(0, 120));
    const wids = w1.data.items.map(function (i) { return i.id; }); assert.ok((await api('sop.markMany', { id: w1.data.id, items: wids })).ok); const ws = await api('sop.submit', { id: w1.data.id }); assert.ok(ws.ok && ws.data.status === 'done', 'complete + submit offline: ' + JSON.stringify(ws).slice(0, 100));
    const mine = (await api('sop.me')).data.mine.filter(function (e) { return e.tpl.id === 'f03w'; })[0]; assert.strictEqual(mine.run.status, 'done', 'my list shows progress offline');
    const ev = await api('sop.new', { tpl: 'f01', label: 'ໂຄງການທົດສອບ' }); assert.ok(ev.ok && ev.data.label === 'ໂຄງການທົດສອບ', 'event checklist created offline: ' + JSON.stringify(ev).slice(0, 100));
    assert.ok((await api('sop.mark', { id: ev.data.id, item: ev.data.items[0].id, v: 1 })).ok);
    const sd = await api('subDriver', Object.assign({ v: 'v1', driver: '02055550005' }, T)); assert.ok(sd.ok && sd.data.drv.v1.d === '02055550005' && sd.data.drv.v1.sub, 'substitute driver offline: ' + JSON.stringify(sd).slice(0, 100));
    assert.strictEqual((await api('sheet', T)).data.drv.v1.d, '02055550005', 'sheet shows the substitute');
    await wait(300); mode = 'up'; await ctx.flush(); assert.strictEqual((await q()).length, 0, 'queue drained'); assert.ok(!(await failed()) || !(await failed()).length, 'nothing failed: ' + JSON.stringify(await failed()));
    const sw = (await call('sop.open', { token: hd, tpl: 'f03w' })).data; assert.strictEqual(sw.status, 'done'); assert.strictEqual(sw.items.filter(function (i) { return sw.a[i.id] && sw.a[i.id].v === 1; }).length, sw.items.length, 'weekly run complete on server');
    assert.strictEqual((await call('sop.open', { token: hd, id: ev.data.id })).data.a[ev.data.items[0].id].v, 1, 'event run exists on server with the offline mark');
    assert.strictEqual((await call('sheet', Object.assign({ token: hd }, T))).data.drv.v1.d, '02055550005', 'substitute stored on server'); ok('never-opened: prefetch, weekly + event SOP, substitute driver all work offline and sync');
    /* ----- ເຂົ້າລະບົບຕອນບໍ່ມີເນັດ (ເຄີຍ login ເຄື່ອງນີ້ແລ້ວ) + token ຕໍ່ອາຍຸເອງ ----- */
    mode = 'up'; const lg = await api('login', { phone: '020 5555 0005', pin: '9753' }); assert.ok(lg.ok && lg.token, 'online login'); store.fuel_tk = null;
    mode = 'down'; const o1 = await api('login', { phone: '02055550005', pin: '9753' }); assert.ok(o1.ok && o1.offline && o1.token === lg.token, 'offline login with the right PIN: ' + JSON.stringify(o1));
    const o2 = await api('login', { phone: '02055550005', pin: '0000' }); assert.strictEqual(o2.error, 'login', 'wrong PIN refused offline'); assert.strictEqual((await api('login', { phone: '02055550077', pin: '9753' })).error, 'net', 'a phone never used on this device needs the network');
    for (let i = 0; i < 5; i++) await api('login', { phone: '02055550005', pin: '1111' }); assert.strictEqual((await api('login', { phone: '02055550005', pin: '9753' })).error, 'locked', 'offline guesses are limited'); await vm.runInContext("kv.del('credfail')", ctx);
    mode = 'up'; const lgb = await api('login', { phone: '02055550005', pin: '9753' }); assert.ok(lgb.ok);
    const acc = require('../accounts.js').create(DATA), real = Date.now; assert.strictEqual(acc.renew(lg.token), null, 'fresh token is not renewed'); Date.now = function () { return real() + 10 * 864e5; };
    const rn = acc.renew(lg.token); Date.now = real; assert.ok(rn && rn !== lg.token && acc.userOf(rn), 'token with < 25 days left is renewed'); ok('offline login (PIN hash kept on device, lockout) + sliding token');
    /* ----- ເນັດຊ້າ (ຕອບຊ້າ ~1.2 ວິ): ມີຂໍ້ມູນໃນເຄື່ອງ → ສະແດງທັນທີ (<0.9 ວິ) ແລ້ວຂໍ້ມູນສົດເກັບເບື້ອງຫຼັງ ----- */
    store.fuel_tk = hd; mode = 'up'; await api('sheet', T); mode = 'slow'; const ts = Date.now(), fast = await api('sheet', T); assert.ok(fast.ok && fast.stale && Date.now() - ts < 900, 'slow net: saved copy shown at once: ' + (Date.now() - ts) + 'ms'); await wait(1500); mode = 'up'; ok('slow network: saved copy shown in <0.9s, fresh copy fetched behind');
    /* ----- ວັນໃໝ່ທີ່ບໍ່ເຄີຍໂຫຼດ + ບໍ່ມີເນັດ: ແຜ່ນເປົ່າສ້າງໃນເຄື່ອງ, ຂໍນ້ຳມັນໄດ້, ສົ່ງເມື່ອມີເນັດ ----- */
    store.fuel_tk = hd; const nd = new Date(Date.now() + 7 * 36e5 + 3 * 864e5).toISOString().slice(0, 10), N = { site: 's1', date: nd };
    mode = 'up'; assert.ok((await api('init')).ok); assert.ok((await api('sheet', { site: 's1', date: nd.slice(0, 8) + '01' > nd ? nd : new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10) })).ok); mode = 'down'; const bl = await api('sheet', N); assert.ok(bl.ok && bl.blank && bl.data.rows.length === 2 && bl.data.rqOn, 'blank sheet for a never-loaded day: ' + JSON.stringify(bl).slice(0, 100));
    assert.strictEqual((await api('photos', N)).ok, true); assert.strictEqual(JSON.stringify((await api('rqAhead', N)).data), '[]');
    const bq = await api('rqNew', Object.assign({ lines: [{ v: 'v1', lit: 12 }] }, N)); assert.ok(bq.ok && bq.queued, 'request on a never-loaded day offline: ' + JSON.stringify(bq).slice(0, 100));
    await wait(300); mode = 'up'; await ctx.flush(); assert.strictEqual((await q()).length, 0, 'queue drained'); const sv = (await call('sheet', Object.assign({ token: hd }, N))).data; assert.strictEqual(sv.reqs.length, 1); assert.strictEqual(sv.reqs[0].lit, 12); ok('never-loaded day offline: blank sheet built on the device, request saved and synced');
    /* ----- service worker ເບື້ອງຫຼັງ (ເຮັດຕໍ່ເມື່ອອອກຈາກແອັບ): ໂຫຼດຂໍ້ມູນທຸກໜ້າ + ສົ່ງຄິວ — ແລ່ນ sw.js ໃນ vm ກັບບ່ອນເກັບຈຳລອງ ----- */
    const fake = {}, idbMock = { open: function () { const req = {}; setTimeout(function () { const db = { createObjectStore: function () { }, transaction: function () { const tx = {}; tx.objectStore = function () { return { get: function (k) { const r = {}; setTimeout(function () { r.result = fake[k]; r.onsuccess && r.onsuccess(); }, 0); return r; }, put: function (v, k) { fake[k] = v; setTimeout(function () { tx.oncomplete && tx.oncomplete(); }, 0); } }; }; return tx; } }; req.result = db; req.onupgradeneeded && req.onupgradeneeded(); req.onsuccess && req.onsuccess(); }, 0); return req; } };
    const swc = { self: { addEventListener: function () { }, clients: { matchAll: function () { return Promise.resolve([]); }, claim: function () { } }, navigator: {} }, indexedDB: idbMock, caches: {}, AbortController: AbortController, fetch: function (u, o) { return fetch(H + u, o); }, setTimeout: setTimeout, clearTimeout: clearTimeout, Date: Date, JSON: JSON, Promise: Promise, Object: Object, Array: Array, Math: Math, navigator: {}, console: console }; swc.self.navigator = swc.navigator;
    vm.createContext(swc); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8'), swc);
    const gv = function (k) { return fake[k]; }; mode = 'up'; store.fuel_tk = hd;
    assert.ok((await api('init')).ok); await api('me'); for (const k of await vm.runInContext('kv.keys()', ctx)) fake[k] = await vm.runInContext('kv.get(' + JSON.stringify(k) + ')', ctx); fake.tk = hd; delete fake['ledger|s1|']; Object.keys(fake).filter(function (k) { return k.indexOf('dash|') === 0; }).forEach(function (k) { delete fake[k]; });
    await vm.runInContext('warmSW()', swc); assert.ok(gv('ledger|s1|'), 'SW warm fills the missing ledger'); assert.ok(Object.keys(fake).some(function (k) { return k.indexOf('dash|') === 0; }), 'SW warm fills the missing dash'); assert.ok(gv('warmts'), 'SW warm remembers when it ran');
    const bd = new Date(Date.now() + 7 * 36e5 + 4 * 864e5).toISOString().slice(0, 10), ent = { action: 'rqNew', body: { site: 's1', date: bd, cid: 'bswtest01', lines: [{ v: 'v1', lit: 9 }] }, token: hd, ts: Date.now() };
    fake.q = [ent]; await vm.runInContext('flushSW()', swc); assert.strictEqual(fake.q.length, 0, 'SW flush drained the queue'); const bs = (await call('sheet', { token: hd, site: 's1', date: bd })).data; assert.strictEqual(bs.reqs.length, 1);
    fake.q = [Object.assign({}, ent, { maybe: true })]; await vm.runInContext('flushSW()', swc); assert.strictEqual((await call('sheet', { token: hd, site: 's1', date: bd })).data.reqs.length, 1, 'SW resend is deduplicated'); assert.strictEqual((fake.failed || []).length, 0);
    ok('service worker: background warm + background flush (no duplicates)');
    /* ----- ຄິວບໍ່ຕິດຄ້າງ: token ເກົ່າໝົດອາຍຸ (ໃຊ້ token ໃໝ່ຂອງຄົນດຽວກັນ) + ຂໍ້ມູນໃຫຍ່ເກີນ ----- */
    store.fuel_tk = hd; mode = 'up'; const fd2 = new Date(Date.now() + 7 * 36e5 + 5 * 864e5).toISOString().slice(0, 10);
    await vm.runInContext('kv.set("q", ' + JSON.stringify([{ action: 'rqNew', body: { site: 's1', date: fd2, cid: 'btokold01', lines: [{ v: 'v1', lit: 3 }] }, token: hd.slice(0, -3) + 'AAA', ts: Date.now() }]) + ')', ctx);
    await ctx.flush(); assert.strictEqual((await q()).length, 0, 'entry with an old/expired token is sent with the new token of the same user'); assert.strictEqual((await call('sheet', { token: hd, site: 's1', date: fd2 })).data.reqs.length, 1);
    const huge = await api('rqNew', Object.assign({ lines: [{ v: 'v1', lit: 1 }], note: 'x'.repeat(1.6e6) }, { site: 's1', date: fd2 })); assert.ok(!huge.ok && huge.error === 'toolarge', 'oversized request is refused at once'); assert.strictEqual((await q()).length, 0, 'and does not block the queue');
    ok('queue never sticks: expired token replaced by the same user new one; oversized data refused');
    console.log('offline: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); setTimeout(function () { process.exit(process.exitCode || 0); }, 100); }
})();
