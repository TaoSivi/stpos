/* ທົດສອບ ST Fuel (fuel.js): ສູດຖັງ, ສິດຕາມບົດບາດ/ສະໜາມ, ຄົນຂັບຮັບຮູ້, ລັອກຫຼັງຮັບຮູ້/ອະນຸມັດ, ຍອດແທ່ງ */
'use strict';
const assert = require('assert'), F = require('../fuel-core');
const mem = {}, store = { read: function (n) { return mem[n] ? JSON.parse(mem[n]) : null; }, write: function (n, v) { mem[n] = JSON.stringify(v); }, list: function (p) { return Object.keys(mem).filter(function (k) { return k.indexOf(p) === 0; }); } };
const U = { boss: { id: 'u1', role: 'owner', name: 'Boss' }, adm: { id: 'u2', role: 'admin', sites: ['s1'], name: 'Admin' }, head: { id: 'u3', role: 'head', sites: ['s1', 'nope'], name: 'Head' }, drv: { id: 'u4', role: 'driver', name: 'ລົມ' }, drv2: { id: 'u5', role: 'driver', name: 'ສອນ' }, off: { id: 'u6', role: 'office', name: 'Office' }, other: { id: 'u7', role: 'admin', sites: [], name: 'X' } };
store.now = function () { return Date.parse('2026-11-20T12:00:00+07:00'); }; /* ໂມງທົດສອບ: ວັນທີໃນເທສຢູ່ໃນຂອບເຂດ 7 ມື້ */
const call = function (u, o) { return F.handle(store, U[u], o); };
const D = '2026-11-16', S = { site: 's1', date: D };

/* ສູດຖັງ: ລົດໃນລາຍງານ 10cm = 50L · ຖັງ 6086 ສີ່ຫຼ່ຽມ 104×61 → 6.344 L/cm · ຖັງກົມນອນ ເຄິ່ງຖັງ = ເຄິ່ງບໍລິມາດ, ເຕັມ = πr²L */
assert.strictEqual(F.liters({ t: 'lpc', k: 5 }, 10), 50);
assert.strictEqual(F.liters({ t: 'box', l: 104, w: 61 }, 10), 63);
assert.strictEqual(F.liters({ t: 'hcyl', d: 100, len: 200 }, 100), Math.round(Math.PI * 2500 * 200 / 1000));
assert.strictEqual(F.liters({ t: 'hcyl', d: 100, len: 200 }, 50), Math.round(Math.PI * 2500 * 200 / 2000));
assert.ok(F.liters({ t: 'hcyl', d: 100, len: 200 }, 10) < F.liters({ t: 'hcyl', d: 100, len: 200 }, 100) / 10, 'bottom 10cm of a round tank holds less than a tenth');
assert.strictEqual(F.liters({ t: 'hcyl', d: 100, len: 200 }, 150), F.liters({ t: 'hcyl', d: 100, len: 200 }, 100), 'over the top = full');
assert.strictEqual(F.liters({ t: 'lpc', k: 5 }, null), null);

const cfg = { sites: [{ id: 's1', name: 'ນາເລີດ', tank: { t: 'hcyl', d: 120, len: 250 } }, { id: 's2', name: 'ກິ່ວເກຍ', tank: { t: 'lpc', k: 10 } }, { id: 'BAD ID', name: 'x' }],
  vehicles: [{ id: 'v1', name: 'ລົດເກດ', site: 's1', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'v2', name: 'ລົດຈົກ', site: 's1', driver: 'u5', tank: { t: 'lpc', k: 5 } }, { id: 'v9', name: 'no tank', site: 's1' }, { id: 'v3', name: 'ລົດ s2', site: 's2', driver: 'u4', tank: { t: 'box', l: 104, w: 61 } }]};
assert.strictEqual(call('adm', { action: 'cfgSave', cfg: cfg }).error, 'auth', 'only the company boss saves settings');
const saved = call('boss', { action: 'cfgSave', cfg: cfg }).data;
assert.deepStrictEqual([saved.sites.length, saved.vehicles.length], [2, 3], 'bad rows dropped');

assert.deepStrictEqual(call('adm', { action: 'init' }).data.me.roles, { s1: 'admin' });
assert.deepStrictEqual(call('drv', { action: 'init' }).data.me.roles, { s1: 'driver', s2: 'driver' });
assert.deepStrictEqual(call('off', { action: 'init' }).data.me.roles, { s1: 'office', s2: 'office' });
assert.deepStrictEqual(call('other', { action: 'init' }).data.cfg.sites, []);
assert.strictEqual(call('other', Object.assign({ action: 'sheet' }, S)).error, 'auth');
assert.strictEqual(call('adm', { action: 'sheet', site: 's2', date: D }).error, 'auth', 'admin of s1 cannot open s2');
assert.strictEqual(call('adm', { action: 'sheet', site: 's1', date: '../x' }).error, 'date');

/* ບໍລິຫານກອກ cm → server ຄິດລິດ (ແຖວ 1 ຂອງລາຍງານ: 10cm=50L, ເຕີມຮອດ 40cm=200L → ເຕີມ 150L, ແລງ 32cm=160L → ໃຊ້ 40L) */
call('boss', Object.assign({ action: 'tank', recv: 1000 }, S));
let r = call('adm', Object.assign({ action: 'row', v: 'v1', cm0: 10, cm1: 40, src: 'jug' }, S)).data.rows[0];
assert.deepStrictEqual([r.L0, r.L1, r.add, r.src], [50, 200, 150, 'jug']);
assert.strictEqual(call('drv', Object.assign({ action: 'row', v: 'v1', cm0: 1 }, S)).error, 'auth', 'driver cannot edit');
assert.strictEqual(call('off', Object.assign({ action: 'row', v: 'v1', cm0: 1 }, S)).error, 'auth', 'office is read-only');
assert.strictEqual(call('adm', Object.assign({ action: 'row', v: 'v3', cm0: 1 }, S)).error, 'vehicle', 'vehicle of another site');

/* ຄົນຂັບເຫັນແຕ່ລົດຕົນ ແລະ ຮັບຮູ້ໄດ້ແຕ່ລົດຕົນ */
const dv = call('drv', Object.assign({ action: 'sheet' }, S)).data;
assert.deepStrictEqual([dv.rows.length, dv.rows[0].v, dv.tank], [1, 'v1', null]);
assert.strictEqual(call('drv', { action: 'ledger', site: 's1' }).error, 'auth');
assert.strictEqual(call('drv2', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, S)).error, 'auth', 'another driver');
assert.strictEqual(call('adm', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, S)).error, 'auth', 'admin cannot acknowledge for the driver');
assert.strictEqual(call('drv2', Object.assign({ action: 'ack', v: 'v2', yes: 1 }, S)).error, 'empty', 'nothing filled yet');
r = call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 0, why: 'ບໍ່ກົງ' }, S)).data.rows[0];
assert.strictEqual(r.rej.why, 'ບໍ່ກົງ');
r = call('adm', Object.assign({ action: 'row', v: 'v1', cm1: 42 }, S)).data.rows[0];
assert.ok(!r.rej && r.add === 160, 'fixing the fill clears the rejection');
call('adm', Object.assign({ action: 'row', v: 'v1', cm1: 40 }, S));
r = call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, S)).data.rows[0];
assert.deepStrictEqual([r.ack.by, r.ack.add, r.ack.cm1], ['u4', 150, 40]);

/* ຫຼັງຮັບຮູ້: ບໍລິຫານແກ້ຕົວເລກເຕີມບໍ່ໄດ້ (ແລງຍັງກອກໄດ້) · ຫົວໜ້າແກ້ໄດ້ ແຕ່ຄົນຂັບຕ້ອງຮັບຮູ້ໃໝ່ */
assert.strictEqual(call('adm', Object.assign({ action: 'row', v: 'v1', cm1: 50 }, S)).error, 'acked');
r = call('adm', Object.assign({ action: 'row', v: 'v1', cm2: 32, note: 'ok<b>' }, S)).data.rows[0];
assert.deepStrictEqual([r.L2, r.used, r.note, !!r.ack], [160, 40, 'okb', true]);
r = call('head', Object.assign({ action: 'row', v: 'v1', cm1: 41 }, S)).data.rows[0];
assert.ok(!r.ack && r.add === 155, 'head edit clears the acknowledgement');
assert.strictEqual(call('adm', Object.assign({ action: 'approve', yes: 1 }, S)).error, 'auth');
assert.strictEqual(call('head', Object.assign({ action: 'approve', yes: 1 }, S)).error, 'unacked');
call('head', Object.assign({ action: 'row', v: 'v1', cm1: 40 }, S)); call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, S));
assert.ok(call('head', Object.assign({ action: 'approve', yes: 1 }, S)).data.approved.by === 'u3', 'unfilled vehicles do not block approval');
assert.strictEqual(call('adm', Object.assign({ action: 'row', v: 'v1', cm2: 1 }, S)).error, 'locked');
assert.strictEqual(call('adm', Object.assign({ action: 'tank', cm: 1 }, S)).error, 'locked');
assert.strictEqual(call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 0 }, S)).error, 'locked');

/* ຮູບ: jpeg ເທົ່ານັ້ນ, key ຂອງລົດໃນສະໜາມ, ຄົນຂັບເຫັນແຕ່ຮູບລົດຕົນ */
call('head', Object.assign({ action: 'approve', yes: 0 }, S));
const img = 'data:image/jpeg;base64,AAAA';
assert.strictEqual(call('adm', Object.assign({ action: 'photo', key: 'v1_b', data: 'data:text/html;base64,AAAA' }, S)).error, 'image');
assert.strictEqual(call('adm', Object.assign({ action: 'photo', key: 'v3_b', data: img }, S)).error, 'key');
assert.strictEqual(call('drv', Object.assign({ action: 'photo', key: 'v1_b', data: img }, S)).error, 'auth');
['v1_b', 'v2_e', 'tank'].forEach(function (k) { assert.ok(call('adm', Object.assign({ action: 'photo', key: k, data: img }, S)).ok); });
assert.deepStrictEqual(Object.keys(call('drv', Object.assign({ action: 'photos' }, S)).data), ['v1_b']);
assert.strictEqual(Object.keys(call('off', Object.assign({ action: 'photos' }, S)).data).length, 3);
call('adm', Object.assign({ action: 'photo', key: 'tank', data: '' }, S));
assert.strictEqual(Object.keys(call('adm', Object.assign({ action: 'photos' }, S)).data).length, 2);

/* ຍອດແທ່ງ: ຮັບ 1000, ຈ່າຍ 150 → ເຫຼືອ 850 · ມື້ຕໍ່ໄປຈ່າຍ 100 → 750 · ວັດແທ່ງ (ຖັງກົມ) ຄືນເປັນລິດ */
call('adm', { action: 'row', site: 's1', date: '2026-11-17', v: 'v2', cm0: 5, cm1: 25 });
const t = call('adm', { action: 'tank', site: 's1', date: '2026-11-17', cm: 60 }).data.tank;
assert.deepStrictEqual([t.out, t.bal, t.measured], [100, 750, F.liters({ t: 'hcyl', d: 120, len: 250 }, 60)]);
assert.deepStrictEqual(call('off', { action: 'ledger', site: 's1' }).data.map(function (x) { return [x.date, x.recv, x.out, x.bal]; }), [[D, 1000, 150, 850], ['2026-11-17', 0, 100, 750]]);
assert.strictEqual(call('adm', { action: 'sheet', site: 's1', date: '2026-11-18' }).data.tank.bal, 750, 'a new day starts from the last balance');
/* ຕ່າງຈາກບັນຊີ: ຖານ = ແທກຄັ້ງທຳອິດ (ບໍ່ມີຄ່າຕ່າງ) · ຄັ້ງຕໍ່ໄປ = ແທກຈິງ − (ແທກຄັ້ງກ່ອນ + ຮັບ − ຈ່າຍ) */
const TK = { t: 'hcyl', d: 120, len: 250 }, LL = function (cm) { return F.liters(TK, cm); };
const lg0 = call('off', { action: 'ledger', site: 's1' }).data; assert.deepStrictEqual([lg0[0].diff, lg0[1].diff], [null, null], 'first measurement is only a baseline');
call('adm', { action: 'tank', site: 's1', date: '2026-11-19', cm: 65 });
const lg1 = call('off', { action: 'ledger', site: 's1' }).data.filter(function (x) { return x.date === '2026-11-19'; })[0]; assert.deepStrictEqual([lg1.exp, lg1.diff], [LL(60), LL(65) - LL(60)], 'no fuel moved, level rose → positive difference');
call('adm', { action: 'tank', site: 's1', date: '2026-11-20', recv: 500, cm: 65 });
const lg2 = call('off', { action: 'ledger', site: 's1' }).data.filter(function (x) { return x.date === '2026-11-20'; })[0]; assert.deepStrictEqual([lg2.exp, lg2.diff], [LL(65) + 500, -500], 'received 500 but level did not move → -500');
assert.strictEqual(call('adm', { action: 'sheet', site: 's1', date: '2026-11-20' }).data.tank.diff, -500, 'the day sheet carries the same difference');
/* ມິເຕີທີ່ແທ່ງ: ເລກຄັ້ງທຳອິດເປັນຖານ · ໃຊ້ = ເລກນີ້ − ເລກຄັ້ງກ່ອນ · ຕ່າງ = ໃຊ້ − ລິດທີ່ເບີກຕາມໃບ ໃນຊ່ວງນັ້ນ */
call('adm', { action: 'tank', site: 's1', date: D, mtr: 1000 }); call('adm', { action: 'tank', site: 's1', date: '2026-11-17', mtr: 1100 });
const mg = call('off', { action: 'ledger', site: 's1' }).data.filter(function (x) { return x.mtr != null; });
assert.deepStrictEqual([mg[0].mused, mg[0].mdiff, mg[1].mused, mg[1].mdiff], [null, null, 100, 0], 'meter +100 and the issue sheet said 100 → difference 0');
const mt3 = call('adm', { action: 'tank', site: 's1', date: '2026-11-19', mtr: 1140 }).data.tank;
assert.deepStrictEqual([mt3.mprev, mt3.mused, mt3.mdiff, mt3.mbase], [1100, 40, 40, 0], 'meter moved 40 with nothing issued → +40');
/* ກວດ cm / ປະຫວັດແກ້ / ຂອບເຂດວັນທີ / ຮູບມີເວລາ+ຜູ້ອັບ */
const DW = '2026-11-20', rw = function (u, d, o) { return call(u, Object.assign({ action: 'row', site: 's1', date: d, v: 'v2' }, o)); };
assert.strictEqual(rw('adm', DW, { cm0: 10, cm1: 5 }).error, 'cmorder', 'level after filling cannot be lower than before');
assert.strictEqual(rw('adm', DW, { cm0: 10, cm1: 900 }).error, 'cmrange', 'cm above any tank height is refused');
assert.strictEqual(require('../public/tank.js').check({ t: 'hcyl', d: 120, len: 250 }, { cm1: 130 }), 'cmrange', 'a round tank 120 cm wide cannot read 130'); assert.strictEqual(require('../public/tank.js').check({ t: 'lpc', k: 5 }, { cm0: 10, cm1: 40 }), null);
assert.ok(rw('adm', DW, { cm0: 10, cm1: 40 }).ok); assert.ok(rw('adm', DW, { cm1: 50 }).ok);
const hrow = call('adm', { action: 'sheet', site: 's1', date: DW }).data.rows.filter(function (x) { return x.v === 'v2'; })[0];
assert.ok(hrow.at === store.now() && hrow.h.length === 1 && hrow.h[0].k === 'cm1' && hrow.h[0].from === 40 && hrow.h[0].to === 50 && hrow.h[0].by === 'u2', 'edit history keeps old value, new value, who and when');
assert.strictEqual(rw('adm', '2026-11-21', { cm0: 1 }).error, 'future', 'no entries for tomorrow');
assert.strictEqual(rw('adm', '2026-11-10', { cm0: 1 }).error, 'old', 'admin cannot back-date beyond 7 days');
assert.ok(rw('head', '2026-11-10', { cm0: 1, cm1: 2 }).ok, 'head can correct older sheets (60 days)'); assert.strictEqual(rw('head', '2026-08-01', { cm0: 1 }).error, 'old');
const jp = 'data:image/jpeg;base64,AAAA', tk0 = store.now() - 3600e3;
assert.ok(call('adm', { action: 'photo', site: 's1', date: DW, key: 'v2_b', data: jp, takenAt: tk0, how: 'file' }).ok);
const pmeta = call('adm', { action: 'photometa', site: 's1', date: DW }).data; assert.ok(pmeta.v2_b.at === store.now() && pmeta.v2_b.taken === tk0 && pmeta.v2_b.how === 'file' && pmeta.v2_b.by === 'u2' && !pmeta._log, 'photo carries server time, taken time, who and source');
assert.ok(call('adm', { action: 'photo', site: 's1', date: DW, key: 'v2_b' }).ok); assert.strictEqual(call('adm', { action: 'photometa', site: 's1', date: DW }).data.v2_b, undefined, 'deleting a photo removes its meta');
assert.strictEqual(call('drv', { action: 'photometa', site: 's1', date: DW }).data.v2_b, undefined);
/* ສ່ວນຕ່າງຂ້າມຄືນ: cm ຫຼັງເລີກວຽກມື້ກ່ອນ ທຽບ ກ່ອນເຕີມມື້ນີ້ (ຍັງຕ້ອງແທກກ່ອນເຕີມທຸກຄັ້ງ) */
const PG = function (d, o) { return call('adm', Object.assign({ action: 'row', site: 's1', date: d, v: 'v1' }, o)); }, rowOf = function (u, d) { return call(u, { action: 'sheet', site: 's1', date: d }).data.rows.filter(function (x) { return x.v === 'v1'; })[0]; };
assert.ok(PG('2026-11-14', { cm0: 10, cm1: 40, cm2: 30 }).ok);
let g0 = rowOf('adm', '2026-11-15'); assert.ok(g0.prev && g0.prev.cm2 === 30 && g0.prev.date === '2026-11-14' && g0.prev.L2 === 150 && g0.gap === null, 'yesterday evening is shown as a reference, no difference until "before" is measured');
assert.ok(PG('2026-11-15', { cm0: 25 }).ok); g0 = rowOf('adm', '2026-11-15'); assert.strictEqual(g0.gap, 125 - 150, 'overnight difference = today before-fill − yesterday evening (litres)');
assert.ok(PG('2026-11-15', { cm0: 30 }).ok); assert.strictEqual(rowOf('adm', '2026-11-15').gap, 0, 'same level = no difference');
assert.ok(rowOf('drv', '2026-11-15').prev === null, 'drivers do not see the comparison');
assert.strictEqual(rowOf('adm', '2026-11-14').prev, null, 'first day has nothing to compare with');
console.log('fuel: all passed');

/* ມອບລົດ: ຫົວໜ້າ/ເຈົ້າຂອງເທົ່ານັ້ນ · ຄົນຂັບໃໝ່ເຫັນລົດທັນທີ, ຄົນເກົ່າບໍ່ເຫັນ · ບໍລິຫານ/ຫ້ອງການເຫັນລາຍການລົດ+ຄົນຂັບ (ບໍ່ເຫັນຂະໜາດຖັງ) */
(function () {
  const A = { site: 's1', action: 'assign', v: 'v2', driver: 'u4' };
  assert.strictEqual(call('adm', A).error, 'auth'); assert.strictEqual(call('drv', A).error, 'auth'); assert.strictEqual(call('off', A).error, 'auth'); assert.strictEqual(call('head', Object.assign({}, A, { v: 'v3' })).error, 'vehicle', 'car of another site');
  assert.deepStrictEqual(call('drv', { action: 'sheet', site: 's1', date: '2026-11-20' }).data.rows.map(function (r) { return r.v; }), ['v1']);
  assert.ok(call('head', A).ok);
  assert.deepStrictEqual(call('drv', { action: 'sheet', site: 's1', date: '2026-11-20' }).data.rows.map(function (r) { return r.v; }), ['v1', 'v2'], 'new driver sees the car');
  assert.strictEqual(call('drv2', { action: 'sheet', site: 's1', date: '2026-11-20' }).error, 'auth', 'old driver has no car here any more');
  assert.ok(call('boss', Object.assign({}, A, { driver: '' })).ok);
  const cars = call('adm', { action: 'init' }).data.cfg.vehicles; assert.ok(cars.length === 2 && cars.every(function (v) { return !!v.tank; }) && cars.every(function (v) { return v.site === 's1'; }));
  assert.strictEqual(call('drv', { action: 'init' }).data.cfg.vehicles.length, 0);
  console.log('fuel: assignment passed');
})();

/* ===== ຕາຕະລາງສິດ: ທຸກຟັງຊັນ × ທຸກບົດບາດ (Y = ໄດ້, . = ຖືກປະຕິເສດ 'auth') — ແກ້ສິດແລ້ວ ຕ້ອງແກ້ຕາຕະລາງນີ້ຢ່າງຕັ້ງໃຈ ===== */
(function () {
  const D1 = '2026-12-01', D2 = '2026-12-02', who = ['boss', 'head', 'adm', 'off', 'drv', 'other'];
  call('adm', { action: 'row', site: 's1', date: D1, v: 'v1', cm0: 10, cm1: 40 }); /* ໃຫ້ມີການເຕີມ ເພື່ອທົດສອບ ack */
  const body = { init: {}, cfgSave: { cfg: { company: 'x', sites: [{ id: 's1', name: 'a', tank: { t: 'lpc', k: 5 } }], vehicles: [{ id: 'v1', name: 'a', site: 's1', driver: 'u4', tank: { t: 'lpc', k: 5 } }] } }, sheet: { site: 's1', date: D1 }, photos: { site: 's1', date: D1 }, ledger: { site: 's1' },
    row: { site: 's1', date: D1, v: 'v1', note: 'n' }, tank: { site: 's1', date: D1, recv: 5 }, photo: { site: 's1', date: D1, key: 'tank', data: 'data:image/jpeg;base64,AAAA' }, ack: { site: 's1', date: D1, v: 'v1', yes: 1 }, approve: { site: 's1', date: D2, yes: 1 }, assign: { site: 's1', v: 'v1', driver: 'u4' } };
  /* ບັນດາສະໜາມ s1 ມີຢູ່ກ່ອນ cfgSave ນີ້ — cfgSave ຂອງຕາຕະລາງກັບໄປໃຊ້ຄ່າເກົ່າ (v1→u4) ແຕ່ຕັດ s2/v2/v3 ອອກ */
  const expect = { init: 'YYYYYY', cfgSave: 'Y.....', sheet: 'YYYYY.', photos: 'YYYYY.', ledger: 'YYYY..', row: 'YYY...', tank: 'YYY...', photo: 'YYY...', ack: '....Y.', approve: 'YY....', assign: 'YY....' };
  const order = ['init', 'sheet', 'photos', 'ledger', 'row', 'tank', 'photo', 'ack', 'approve', 'assign', 'cfgSave'];
  order.forEach(function (a) {
    who.forEach(function (w, i) {
      const r = call(w, Object.assign({ action: a }, body[a])), got = r.ok || (r.error !== 'auth') ? 'Y' : '.';
      assert.strictEqual(got, expect[a][i], a + ' as ' + w + ' → ' + JSON.stringify(r).slice(0, 120));
    });
    if (a === 'ack') call('head', { action: 'approve', site: 's1', date: D1, yes: 0 });
  });
  /* ຄົນຂັບເຫັນແຕ່ຂອງຕົນ; office ອ່ານໄດ້ແຕ່ແກ້ບໍ່ໄດ້ (ເປັນ 'auth' ດ້ານເທິງແລ້ວ) */
  assert.deepStrictEqual(call('drv', { action: 'sheet', site: 's1', date: D1 }).data.rows.map(function (r) { return r.v; }), ['v1']);
  assert.strictEqual(call('drv', { action: 'sheet', site: 's2', date: D1 }).error, 'auth');
  console.log('fuel: permission matrix passed (' + order.length * who.length + ' checks)');
})();

/* ຜູ້ອະນຸມັດທີ່ເຈົ້າຂອງເລືອກ: ບໍລິຫານ/ຫ້ອງການ + approver = ອະນຸມັດໄດ້; ບໍ່ມີ flag = ບໍ່ໄດ້; ຄົນຂັບບໍ່ໄດ້ຕໍ່ໃຫ້ມີ flag */
(function () {
  U.admA = { id: 'u8', role: 'admin', sites: ['s1'], approver: true, name: 'AdminA' }; U.offA = { id: 'u9', role: 'office', approver: true, name: 'OfficeA' }; U.drvA = { id: 'u4', role: 'driver', approver: true, name: 'ລົມ' };
  const D = '2026-12-05', ap = { action: 'approve', site: 's1', date: D, yes: 1 };
  assert.strictEqual(call('adm', ap).error, 'auth'); assert.strictEqual(call('off', ap).error, 'auth');
  assert.ok(call('admA', ap).ok, 'admin flagged as approver'); assert.ok(call('admA', Object.assign({}, ap, { yes: 0 })).ok);
  assert.ok(call('offA', ap).ok, 'office flagged as approver'); assert.ok(call('offA', Object.assign({}, ap, { yes: 0 })).ok);
  assert.strictEqual(call('drvA', ap).error, 'auth', 'a driver can never approve');
  console.log('fuel: approver flag passed');
})();


/* ສິດແບບຕິກ: ແມ່ແບບ + user.rights ແທນທີ່ໄດ້ · ຂອບເຂດສະໜາມຍັງຖືກບັງຄັບ · ຄົນຂັບຂອງລົດ (ບໍ່ມີສະໜາມ) ເຮັດໄດ້ແຕ່ຮັບຮູ້ */
(function () {
  store.now = function () { return Date.parse('2026-12-10T12:00:00+07:00'); };
  const D = '2026-12-10', row = { action: 'row', site: 's1', date: D, v: 'v1', cm0: 10, cm1: 40 };
  const mk = function (id, role, rights, sites) { U[id] = { id: id, role: role, rights: rights, sites: sites || ['s1'], name: id }; return id; };
  /* ບໍລິຫານ + ຕິກ "ມອບລົດ" = ມອບລົດໄດ້ (ແມ່ແບບປົກກະຕິບໍ່ໄດ້) */
  mk('aAssign', 'admin', ['view', 'issue', 'tank', 'assign']); assert.ok(call('aAssign', { action: 'assign', site: 's1', v: 'v1', driver: 'u4' }).ok); assert.strictEqual(call('adm', { action: 'assign', site: 's1', v: 'v1', driver: 'u4' }).error, 'auth');
  /* ບໍລິຫານ ເອົາຕິກ "ເບີກ" ອອກ = ແກ້ cm ບໍ່ໄດ້ ແຕ່ເບິ່ງໄດ້ */
  mk('aView', 'admin', ['view', 'tank']); assert.strictEqual(call('aView', row).error, 'auth'); assert.ok(call('aView', { action: 'sheet', site: 's1', date: D }).ok); assert.ok(call('aView', { action: 'tank', site: 's1', date: D, recv: 1 }).ok);
  /* ຫ້ອງການ + ຕິກ "ເບີກ" = ແກ້ cm ໄດ້ ທຸກສະໜາມ */
  mk('oIssue', 'office', ['view', 'issue'], []); assert.ok(call('oIssue', row).ok); assert.strictEqual(call('oIssue', { action: 'tank', site: 's1', date: D, recv: 1 }).error, 'auth');
  /* ຫົວໜ້າ ເອົາ "ອະນຸມັດ" ອອກ = ອະນຸມັດບໍ່ໄດ້ */
  mk('hNoAppr', 'head', ['view', 'issue', 'tank', 'assign', 'fixAck']); assert.strictEqual(call('hNoAppr', { action: 'approve', site: 's1', date: D, yes: 1 }).error, 'auth');
  /* ຫົວໜ້າ ເອົາ "ແກ້ຫຼັງຮັບຮູ້" ອອກ = ແກ້ cm ຫຼັງຄົນຂັບຮັບຮູ້ບໍ່ໄດ້ (ລະຫັດ 'acked') */
  mk('hNoFix', 'head', ['view', 'issue', 'tank', 'assign', 'approve']); call('hNoFix', row); assert.ok(call('drv', { action: 'ack', site: 's1', date: D, v: 'v1', yes: 1 }).ok);
  assert.strictEqual(call('hNoFix', Object.assign({}, row, { cm1: 41 })).error, 'acked'); assert.ok(call('head', Object.assign({}, row, { cm1: 41 })).ok, 'preset head can fix after ack');
  call('head', { action: 'approve', site: 's1', date: D, yes: 0 });
  /* ຄົນຂັບ + ຕິກເພີ່ມ + ມີສະໜາມ = ເບິ່ງລາຍງານ/ຍອດແທ່ງໄດ້ ແລະ ຍັງຮັບຮູ້ລົດຕົນໄດ້ */
  mk('dView', 'driver', ['ack', 'view'], ['s1']); assert.ok(call('dView', { action: 'ledger', site: 's1' }).ok); assert.strictEqual(call('dView', row).error, 'auth');
  /* ຄົນຂັບຂອງລົດທີ່ບໍ່ມີສະໜາມ: ຕິກ "ເບີກ" ກໍບໍ່ໄດ້ຜົນ (ຂອບເຂດລົດ = ຮັບຮູ້ເທົ່ານັ້ນ) */
  U.u4x = { id: 'u4', role: 'driver', rights: ['ack', 'issue', 'view'], sites: [], name: 'ລົມ' }; assert.strictEqual(call('u4x', row).error, 'auth'); assert.strictEqual(call('u4x', { action: 'ledger', site: 's1' }).error, 'auth');
  /* ບໍ່ມີຕິກຫຍັງ = ເຂົ້າສະໜາມບໍ່ໄດ້ຫຍັງ; init ບອກສິດຕໍ່ສະໜາມ */
  mk('none', 'admin', []); assert.strictEqual(call('none', { action: 'sheet', site: 's1', date: D }).data.rows.length, 0, 'no ticks = sees only own cars (none)'); assert.strictEqual(call('none', { action: 'ledger', site: 's1' }).error, 'auth');
  const ri = call('aView', { action: 'init' }).data.me.rights; assert.deepStrictEqual(ri.s1, ['view', 'tank'], 'init tells the UI the rights per site'); assert.deepStrictEqual(call('drv', { action: 'init' }).data.me.rights.s1, ['ack']); assert.strictEqual(call('boss', { action: 'init' }).data.me.rights.s1.length, 7);
  console.log('fuel: tick rights passed');
})();
