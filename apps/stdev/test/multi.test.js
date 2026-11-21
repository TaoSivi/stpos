/* ທົດສອບຫຼາຍເຄື່ອງພ້ອມກັນ: 5 "ເຄື່ອງ" ຈຳລອງ (offline.js ແທ້ ໃນ vm ແຍກກັນ ແຕ່ລະເຄື່ອງມີບ່ອນເກັບ/ຄິວຂອງຕົນເອງ) ຕໍ່ server ດຽວ
 * A) ພ້ອມກັນຕອນມີເນັດ: ຂໍ/ອະນຸມັດ/ຮັບເຂົ້າແທ່ງ ຈາກຫຼາຍເຄື່ອງ → ບໍ່ຊ້ຳ ບໍ່ຫາຍ ຍອດຖືກ
 * B) ອອບລາຍຫຼາຍເຄື່ອງ ແລ້ວມີເນັດພ້ອມກັນ: ທຸກຄິວສົ່ງຄົບ ບໍ່ຊ້ຳ; ຂັດແຍ້ງ (ອະນຸມັດເກີນແທ່ງ / ຍົກເລີກຄຳຂໍທີ່ອະນຸມັດແລ້ວ) ຕ້ອງໄປ "ສົ່ງບໍ່ໄດ້" ບໍ່ຫາຍງຽບ ແລະ ຍອດແທ່ງບໍ່ຕິດລົບ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const PORT = 4400 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-m-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: JSON.stringify(o || {}) }).then(function (r) { return r.json(); }); };
const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const D = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), S = { site: 's1', date: D }, D2 = new Date(Date.now() + 7 * 36e5 + 2 * 864e5).toISOString().slice(0, 10), S2 = { site: 's1', date: D2 };
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };

function device(name, token) { /* ເຄື່ອງຈຳລອງ 1 ເຄື່ອງ */
  const d = { name: name, mode: 'up', store: { fuel_tk: token } };
  const ctx = {
    fetch: function (url, opt) { if (d.mode === 'down') return Promise.reject(new TypeError('offline')); return fetch(H + url, { method: 'POST', body: opt.body }); },
    atob: function (x) { return Buffer.from(x, 'base64').toString('binary'); }, AbortController: AbortController, crypto: require('crypto').webcrypto, TextEncoder: TextEncoder, Uint8Array: Uint8Array, CustomEvent: function () { },
    ls: function (k, v) { if (v === undefined) return d.store[k]; if (v === null) delete d.store[k]; else d.store[k] = v; }, toast: function () { }, ERR: {}, TOASTN: 0, bzy: function () { }, modal: function () { return { querySelector: function () { return {}; } }; }, esc: String, Tank: require('../public/tank.js'), navigator: { onLine: true }, location: {}, console: console,
    document: { createElement: function () { return { setAttribute: function () { }, remove: function () { } }; }, addEventListener: function () { }, getElementById: function () { return null; }, dispatchEvent: function () { }, hidden: false, body: { appendChild: function () { } } },
    setInterval: function () { }, setTimeout: function (f, ms) { return setTimeout(f, ms >= 10000 ? 150 : ms); }, clearTimeout: clearTimeout, Promise: Promise, JSON: JSON, Date: Date, Math: Math, Object: Object, Array: Array, String: String, Number: Number, isFinite: isFinite
  };
  ctx.window = ctx; ctx.addEventListener = function () { }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'offline.js'), 'utf8'), ctx);
  d.api = function (a, b) { return ctx.api(a, b); }; d.flush = function () { return ctx.flush(); }; d.q = function () { return vm.runInContext('getQ()', ctx); }; d.failed = function () { return vm.runInContext("kv.get('failed')", ctx).then(function (f) { return f || []; }); };
  return d;
}
const reqs = async function (tk) { return (await call('sheet', Object.assign({ token: tk }, S))).data.reqs; };

(async function () {
  try {
    const U = { sa: ['02055550001', '4321', 'superadmin'], head: ['02055550005', '9753', 'user', '--fuel=head', '--sites=s1'], adm: ['02055550006', '5555', 'user', '--fuel=admin', '--sites=s1'], t1: ['02055550007', '1111', 'user', '--fuel=tech', '--sites=s1'], t2: ['02055550008', '2222', 'user', '--fuel=tech', '--sites=s1'], drv: ['02055550003', '1357', 'user', '--fuel=driver', '--sites=s1'] };
    for (const k of Object.keys(U)) assert.strictEqual(cli.apply(null, ['adduser', U[k][0], 'ຄົນ ' + k, U[k][1]].concat(U[k].slice(2))).status, 0, 'adduser ' + k);
    proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await wait(900);
    const T = {}; for (const k of Object.keys(U)) T[k] = (await call('login', { phone: U[k][0], pin: U[k][1] })).token;
    const cars = []; for (let i = 1; i <= 12; i++) cars.push({ id: 'v' + i, name: 'ລົດ ' + i, site: 's1', driver: U.drv[0], tank: { t: 'lpc', k: 5 } });
    assert.ok((await call('cfgSave', { token: T.sa, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 }, rq: true }], vehicles: cars } })).ok);
    assert.ok((await call('tank', Object.assign({ token: T.sa, add: { id: 'rseed1', lit: 300 } }, S))).ok); /* ແທ່ງ 300 L */

    /* ===== A) ພ້ອມກັນຕອນມີເນັດ ===== */
    const dev = { t1: device('t1', T.t1), t2: device('t2', T.t2), head: device('head', T.head), adm: device('adm', T.adm), sa: device('sa', T.sa) };
    for (const k of Object.keys(dev)) { assert.ok((await dev[k].api('init')).ok, k + ' init'); assert.ok((await dev[k].api('sheet', S)).ok, k + ' sheet'); }
    await Promise.all([1, 2, 3, 4, 5, 6].map(function (i) { return dev.t1.api('rqNew', Object.assign({ lines: [{ v: 'v' + i, lit: 20 }] }, S)); }).concat([7, 8, 9, 10, 11, 12].map(function (i) { return dev.t2.api('rqNew', Object.assign({ lines: [{ v: 'v' + i, lit: 20 }] }, S)); })));
    let all = await reqs(T.sa); assert.strictEqual(all.length, 12, 'A: 12 requests from 2 devices at the same time'); assert.strictEqual(new Set(all.map(function (r) { return r.id; })).size, 12, 'A: unique ids');
    const ids = all.map(function (r) { return r.id; });
    const [r1, r2] = await Promise.all([dev.head.api('rqDecideMany', Object.assign({ ids: ids.slice(0, 8), src: 'tank' }, S)), dev.adm.api('rqDecideMany', Object.assign({ ids: ids.slice(4, 12), src: 'tank' }, S))]);
    all = await reqs(T.sa); const appr = all.filter(function (r) { return r.state === 'approved'; });
    const reserved = appr.reduce(function (t, r) { return t + (r.ok && r.ok.lit || 0); }, 0); assert.ok(reserved <= 300 + 0.01, 'A: reserved ' + reserved + ' L never above the 300 L in the tank'); assert.ok(appr.length > 0 && appr.every(function (r) { return r.ok && r.ok.by; }), 'A: every approved request has one approver');
    ok('A1: 12 requests from 2 devices at once — none lost, none duplicated; two approvers at once — reserved ' + reserved + ' L ≤ 300 L stock');
    const [ta, tb] = await Promise.all([dev.adm.api('tank', Object.assign({ add: { lit: 100, from: 'A' } }, S)), dev.sa.api('tank', Object.assign({ add: { lit: 150, from: 'B' } }, S))]);
    const tk = (await call('sheet', Object.assign({ token: T.sa }, S))).data.tank; assert.strictEqual(tk.recv, 550, 'A: two receipts at the same time both counted (300+100+150)'); ok('A2: two tank receipts from two devices at once — total 550 L, both kept');

    /* ===== B) ອອບລາຍຫຼາຍເຄື່ອງ ແລ້ວມີເນັດພ້ອມກັນ ===== */
    for (const k of Object.keys(dev)) { await dev[k].api('sheet', S2); } /* ແຕ່ລະເຄື່ອງເຄີຍເປີດວັນນີ້ຕອນມີເນັດ */
    const stock2 = (await call('sheet', Object.assign({ token: T.sa }, S2))).data.stock.have;
    for (const k of Object.keys(dev)) await dev[k].api('sheet', S2); for (const k of Object.keys(dev)) dev[k].mode = 'down';
    for (let i = 1; i <= 4; i++) assert.ok((await dev.t1.api('rqNew', Object.assign({ lines: [{ v: 'v' + i, lit: 25 }] }, S2))).queued, 't1 offline new');
    for (let i = 5; i <= 8; i++) assert.ok((await dev.t2.api('rqNew', Object.assign({ lines: [{ v: 'v' + i, lit: 25 }] }, S2))).queued, 't2 offline new');
    const toApprove = (await dev.t1.api('sheet', S2)).data.reqs.map(function (r) { return r.id; });
    assert.strictEqual(toApprove.length, 4); /* ແຕ່ລະເຄື່ອງເຫັນສະເພາະຂອງຕົນເອງຕອນອອບລາຍ */
    for (const k of ['t1', 't2']) assert.strictEqual((await dev[k].q()).length, 4);
    for (const k of Object.keys(dev)) dev[k].mode = 'up';
    await Promise.all([dev.t1.flush(), dev.t2.flush()]);
    for (const k of ['t1', 't2']) assert.strictEqual((await dev[k].q()).length, 0, k + ' queue drained');
    let all2 = await reqs2(T.sa); assert.strictEqual(all2.length, 8, 'B: 8 requests from two offline devices after they reconnect together'); assert.strictEqual(new Set(all2.map(function (r) { return r.id; })).size, 8);
    ok('B1: two devices offline create 4 requests each, reconnect together — all 8 on the server once each');

    /* ຂັດແຍ້ງ: ສອງເຄື່ອງອະນຸມັດຄຳຂໍເກີນແທ່ງຕອນອອບລາຍ (ແຕ່ລະເຄື່ອງເຫັນແທ່ງເຕັມ) */
    const big = all2.map(function (r) { return r.id; });
    for (const k of Object.keys(dev)) { await dev[k].api('sheet', S2); dev[k].mode = 'down'; }
    const sheetH = (await dev.head.api('sheet', S2)).data, sheetA = (await dev.adm.api('sheet', S2)).data; assert.ok(sheetH.reqs.length === 8 && sheetA.reqs.length === 8, 'head and admin both see all 8');
    const rH = await dev.head.api('rqDecide', Object.assign({ id: big[0], yes: true, lit: Math.floor(stock2 * 0.8), src: 'tank' }, S2)), rA = await dev.adm.api('rqDecide', Object.assign({ id: big[1], yes: true, lit: Math.floor(stock2 * 0.8), src: 'tank' }, S2));
    assert.ok(rH.ok && rA.ok, 'both approve offline (each sees the full tank)');
    const rC = await dev.t1.api('rqCancel', Object.assign({ id: big[2] }, S2)); assert.ok(rC.ok, 't1 cancels own pending request offline');
    const rD = await dev.head.api('rqDecide', Object.assign({ id: big[2], yes: true, lit: 25, src: 'tank' }, S2)); assert.ok(rD.ok, 'head approves the same request offline (it is cancelled by t1 on the other device)');
    for (const k of Object.keys(dev)) dev[k].mode = 'up'; await Promise.all([dev.head.flush(), dev.adm.flush(), dev.t1.flush()]);
    const fin = await reqs2(T.sa); const approved = fin.filter(function (r) { return r.state === 'approved'; }), resv = approved.reduce(function (t, r) { return t + (r.ok.lit || 0); }, 0);
    const st = (await call('sheet', Object.assign({ token: T.sa }, S2))).data.stock; assert.ok(st.have >= 0, 'actual tank balance is never negative: ' + st.have); /* ອະນຸມັດບໍ່ຈອງແທ່ງ (ອອກແບບໄວ້): ຍອດ ລໍເຕີມ ເກີນແທ່ງໄດ້ ແຕ່ແອັບສະແດງ ແທ່ງ − ລໍເຕີມ ເປັນສີແດງ ແລະ ຕອນເຕີມຈິງຖືກກວດ */ console.log('    note: reserved (approved, not yet filled) ' + st.pend + ' L vs tank ' + st.have + ' L — approvals do not reserve stock by design');
    const fh = await dev.head.failed(), fa = await dev.adm.failed(), ft = await dev.t1.failed(); const nfail = fh.length + fa.length + ft.length;
    assert.ok(nfail >= 1, 'conflicting changes are reported as "send failed", not lost silently (' + nfail + ' reported)');
    for (const k of Object.keys(dev)) assert.strictEqual((await dev[k].q()).length, 0, k + ' queue empty — nothing stuck');
    ok('B2: over-approval + cancel-vs-approve conflicts across 3 offline devices — tank balance never negative (' + st.have + ' L), ' + nfail + ' conflict(s) shown as "failed", queues empty');

    /* ===== C) ໂຫຼດຫຼາຍ: 5 ເຄື່ອງ ອ່ານ/ຂຽນພ້ອມກັນ 200 ຄຳຂໍ ====== */
    const t0 = Date.now(); let errs = 0, cnt = 0;
    await Promise.all(Object.keys(dev).map(async function (k) { for (let i = 0; i < 40; i++) { const r = await call(i % 3 ? 'sheet' : 'dash', Object.assign({ token: T[k] }, i % 3 ? S : { site: 's1', from: D, to: D2 })); cnt++; if (!r.ok && r.error !== 'auth') errs++; } }));
    assert.strictEqual(errs, 0, 'C: ' + errs + ' errors in ' + cnt + ' concurrent reads'); ok('C: ' + cnt + ' concurrent reads from 5 devices in ' + (Date.now() - t0) + ' ms — no errors');
    console.log('multi: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); setTimeout(function () { process.exit(process.exitCode || 0); }, 100); }
  async function reqs2(tk) { return (await call('sheet', Object.assign({ token: tk }, S2))).data.reqs; }
})();
