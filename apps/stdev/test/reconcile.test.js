/* ກວດຕົວເລກ ຮັບເຂົ້າ / ເບີກຈ່າຍ / ຍອດເຫຼືອ ໃຫ້ກົງກັນທຸກບ່ອນ (ທີ່ເຮັດໃນແບບຟອມ): sheet · ledger · ໃບຕິດຕາມ · ມື້ຕໍ່ມື້ ຍົກຍອດ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 4300 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-r-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: JSON.stringify(o || {}) }).then(function (r) { return r.json(); }); };
const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
(async function () {
  try {
    assert.strictEqual(cli('adduser', '02055550001', 'ເຈົ້າຂອງ', '4321', 'superadmin').status, 0);
    assert.strictEqual(cli('adduser', '02055550007', 'ຊ່າງ', '1111', 'user', '--fuel=tech', '--sites=s1').status, 0);
    assert.strictEqual(cli('adduser', '02055550003', 'ຄົນຂັບ', '1357', 'user', '--fuel=driver', '--sites=s1').status, 0);
    proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await wait(900);
    const sa = (await call('login', { phone: '02055550001', pin: '4321' })).token, dr = (await call('login', { phone: '02055550003', pin: '1357' })).token, tc = (await call('login', { phone: '02055550007', pin: '1111' })).token;
    const car = function (i) { return { id: 'v' + i, name: 'ລົດ ' + i, site: 's1', driver: '02055550003', tank: { t: 'lpc', k: 5 } }; };
    assert.ok((await call('cfgSave', { token: sa, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 }, rq: true }], vehicles: [car(1), car(2), car(3)] } })).ok);
    const D1 = '2026-11-23', D2 = '2026-11-24', S1 = { site: 's1', date: D1 }, S2 = { site: 's1', date: D2 };
    const sheet = async function (S) { return (await call('sheet', Object.assign({ token: sa }, S))).data; };

    /* ----- ມື້ 1: ຮັບເຂົ້າ 1000 + 500; ເບີກ 3 ຄັນ (ຂໍ → ອະນຸມັດ → ເລີ່ມເຕີມ → cm) ----- */
    assert.ok((await call('tank', Object.assign({ token: sa, add: { id: 'ra1', lit: 1000, from: 'ຜູ້ຂາຍ' } }, S1))).ok);
    assert.ok((await call('tank', Object.assign({ token: sa, add: { id: 'ra2', lit: 500 } }, S1))).ok);
    const want = { v1: { ask: 40, cm0: 4, cm1: 12, cm2: 10 }, v2: { ask: 30, cm0: 2, cm1: 8, cm2: 6 }, v3: { ask: 20, cm0: 5, cm1: 9, cm2: 7 } }; /* ເຕີມ = (cm1 − cm0) × 5 = 40 / 30 / 20 */
    for (const v of Object.keys(want)) assert.ok((await call('rqNew', Object.assign({ token: tc, lines: [{ v: v, lit: want[v].ask }] }, S1))).ok, 'rqNew ' + v);
    let s = await sheet(S1); const ids = s.reqs.map(function (r) { return r.id; });
    assert.strictEqual(ids.length, 3);
    assert.ok((await call('rqDecideMany', Object.assign({ token: sa, ids: ids, src: 'tank' }, S1))).ok, 'approve all');
    for (const id of ids) { const r = await call('rqStart', Object.assign({ token: sa, id: id }, S1)); assert.ok(r.ok, 'rqStart ' + JSON.stringify(r)); }
    for (const v of Object.keys(want)) { const w = want[v], r = await call('row', Object.assign({ token: sa, v: v, cm0: w.cm0, cm1: w.cm1, cm2: w.cm2 }, S1)); assert.ok(r.ok, 'row ' + v + ' ' + JSON.stringify(r)); }
    s = await sheet(S1);
    const rows = s.rows.filter(function (r) { return !r.base; });
    const adds = rows.map(function (r) { return r.add; }), used = rows.map(function (r) { return r.used; });
    assert.deepStrictEqual(adds.sort(), [20, 30, 40], 'each car add = (cm1 − cm0) × 5: ' + adds);
    assert.deepStrictEqual(used.sort(), [10, 10, 10], 'used = L1 − L2: ' + used);
    ok('ເຕີມແຕ່ລະຄັນ = (cm ຫຼັງ − cm ກ່ອນ) × 5 → 40 / 30 / 20 · ໃຊ້ຈິງ 10 / 10 / 10');
    assert.strictEqual(s.tank.recv, 1500, 'tank.recv = 1000 + 500');
    const lg1 = (await call('ledger', { token: sa, site: 's1' })).data.filter(function (x) { return x.date === D1; })[0];
    assert.strictEqual(lg1.recv, 1500); assert.strictEqual(lg1.out, 90, 'ເບີກຈ່າຍລວມ = 40 + 30 + 20'); assert.strictEqual(lg1.bal, 1410, 'ຍອດເຫຼືອ = 1500 − 90');
    assert.strictEqual(s.stock.have, 1410, 'sheet.stock.have = ledger balance');
    ok('ມື້ 1: ຮັບ 1,500 · ເບີກ 90 · ເຫຼືອ 1,410 — sheet ແລະ ledger ກົງກັນ');

    /* ----- ມື້ 2: ຍົກຍອດ + ຮັບ 200 + ເບີກ 25 → ເຫຼືອ 1,585 ----- */
    assert.ok((await call('tank', Object.assign({ token: sa, add: { id: 'rb1', lit: 200 } }, S2))).ok);
    assert.ok((await call('rqNew', Object.assign({ token: tc, lines: [{ v: 'v1', lit: 25 }] }, S2))).ok);
    const s2 = await sheet(S2); const id2 = s2.reqs[0].id;
    assert.ok((await call('rqDecide', Object.assign({ token: sa, id: id2, yes: true, lit: 25, src: 'tank' }, S2))).ok);
    assert.ok((await call('rqStart', Object.assign({ token: sa, id: id2 }, S2))).ok);
    assert.ok((await call('row', Object.assign({ token: sa, v: 'v1', cm0: 10, cm1: 15 }, S2))).ok); /* (15 − 10) × 5 = 25 */
    const lg = (await call('ledger', { token: sa, site: 's1' })).data, l2 = lg.filter(function (x) { return x.date === D2; })[0];
    assert.strictEqual(l2.recv, 200); assert.strictEqual(l2.out, 25); assert.strictEqual(l2.bal, 1410 + 200 - 25, 'ຍົກຍອດຈາກມື້ກ່ອນ');
    assert.strictEqual((await sheet(S2)).stock.have, 1585);
    ok('ມື້ 2: ຍົກ 1,410 + ຮັບ 200 − ເບີກ 25 = 1,585 (ledger = sheet)');

    /* ----- ໃບຕິດຕາມ (ໜ້າລາຍງານ) ແລະ ຮັບຮູ້: ລວມເບີກ = ຜົນບວກແຕ່ລະແຖວ ----- */
    assert.ok((await call('ack', Object.assign({ token: dr, v: 'v1', yes: 1 }, S1))).ok, 'driver acknowledges');
    const rep = await sheet(S1), sum = rep.rows.reduce(function (t, r) { return t + (r.add || 0); }, 0);
    assert.strictEqual(sum, 90, 'ຜົນບວກຄໍລຳ ເຕີມ ໃນໃບຕິດຕາມ = ຍອດເບີກຈ່າຍໃນ ledger'); assert.strictEqual(sum, lg1.out);
    ok('ໃບຕິດຕາມ: ລວມເຕີມທຸກຄັນ 90 = ເບີກຈ່າຍໃນຍອດເຫຼືອ');
    /* ----- ມື້ 3: ອະນຸມັດ 50 L ແຕ່ cm ແທກໄດ້ 40 L → ບັນຊີ/ລາຍງານໃຊ້ 50 (ເຕີມຈິງ), ສ່ວນຕ່າງ −10 ສະແດງແຍກ ----- */
    const D3 = '2026-11-25', S3 = { site: 's1', date: D3 };
    assert.ok((await call('rqNew', Object.assign({ token: tc, lines: [{ v: 'v2', lit: 50 }] }, S3))).ok);
    const id3 = (await sheet(S3)).reqs[0].id;
    assert.ok((await call('rqDecide', Object.assign({ token: sa, id: id3, yes: true, lit: 50, src: 'tank' }, S3))).ok);
    assert.ok((await call('rqStart', Object.assign({ token: sa, id: id3 }, S3))).ok);
    assert.ok((await call('row', Object.assign({ token: sa, v: 'v2', cm0: 4, cm1: 12, cm2: 9 }, S3))).ok); /* cm: (12 − 4) × 5 = 40; ຕອນແລງ 9 cm = 45 L */
    const r3 = (await sheet(S3)).rows.filter(function (r) { return r.v === 'v2'; })[0];
    assert.strictEqual(r3.add, 50, 'ເຕີມຈິງ = ຈຳນວນທີ່ອະນຸມັດ'); assert.strictEqual(r3.dip, 40, 'cm ແທກ = 40'); assert.strictEqual(r3.diff, -10, 'ສ່ວນຕ່າງ = 40 − 50');
    assert.strictEqual(r3.L1c, 70, 'ລວມໃນລົດ = ກ່ອນ 20 + ເຕີມຈິງ 50'); assert.strictEqual(r3.used, 25, 'ໃຊ້ຕົວຈິງ = 70 − 45');
    const l3 = (await call('ledger', { token: sa, site: 's1' })).data.filter(function (x) { return x.date === D3; })[0];
    assert.strictEqual(l3.out, 50, 'ບັນຊີແທ່ງຫັກ 50 ບໍ່ແມ່ນ 40'); assert.strictEqual(l3.bal, 1585 - 50);
    ok('ອະນຸມັດ 50 · cm ແທກ 40 → ລາຍງານ/ບັນຊີ 50, ສ່ວນຕ່າງ −10 ສະແດງແຍກ, ໃຊ້ຈິງ 25, ແທ່ງເຫຼືອ 1,535');
    /* ----- ໜ້າ login: ຄວາມຍາວ PIN (ສະແດງຈຸດພໍດີ + ເຂົ້າອັດຕະໂນມັດ) ----- */
    assert.strictEqual((await call('pinlen', { phone: '02055550001' })).n, 4, 'PIN 4 ໂຕ → 4 ຈຸດ'); assert.strictEqual((await call('pinlen', { phone: '02099999999' })).n, 0, 'ເບີທີ່ບໍ່ມີ → 0 (ບໍ່ເປີດເຜີຍ)');
    assert.ok((await call('userSave', { token: sa, user: { phone: '02055550009', name: 'ຫົກໂຕ', pin: '246810'.slice(0, 6), level: 'user', fuel: 'tech', sites: ['s1'] } })).ok);
    assert.strictEqual((await call('pinlen', { phone: '02055550009' })).n, 6, 'PIN 6 ໂຕ → 6 ຈຸດ');
    assert.ok((await call('login', { phone: '02055550009', pin: '246810' })).ok, 'login ດ້ວຍ PIN 6 ໂຕ');
    ok('login: ຮູ້ຄວາມຍາວ PIN ຕໍ່ບັນຊີ (4 → 4 ຈຸດ, 6 → 6 ຈຸດ, ເບີທີ່ບໍ່ມີ → 0)');
    console.log('reconcile: ' + n + ' passed');
  } catch (e) { console.error('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { if (proc) proc.kill(); try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { } process.exit(process.exitCode || 0); }
})();
