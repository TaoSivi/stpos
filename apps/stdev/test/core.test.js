/* ທົດສອບ ST Fuel (fuel.js): ສູດຖັງ, ສິດຕາມບົດບາດ/ສະໜາມ, ຄົນຂັບຮັບຮູ້, ລັອກຫຼັງຮັບຮູ້/ອະນຸມັດ, ຍອດແທ່ງ */
'use strict';
const assert = require('assert'), F = require('../fuel-core');
const mem = {}, store = { read: function (n) { return mem[n] ? JSON.parse(mem[n]) : null; }, write: function (n, v) { mem[n] = JSON.stringify(v); }, list: function (p) { return Object.keys(mem).filter(function (k) { return k.indexOf(p) === 0; }); } };
const U = { boss: { id: 'u1', role: 'owner', name: 'Boss' }, adm: { id: 'u2', role: 'admin', sites: ['s1'], name: 'Admin' }, head: { id: 'u3', role: 'head', sites: ['s1', 'nope'], name: 'Head' }, drv: { id: 'u4', role: 'driver', name: 'ລົມ' }, drv2: { id: 'u5', role: 'driver', name: 'ສອນ' }, off: { id: 'u6', role: 'office', name: 'Office' }, other: { id: 'u7', role: 'admin', sites: [], name: 'X' } };
store.now = function () { return Date.parse('2026-11-20T12:00:00+07:00'); }; /* ໂມງທົດສອບ: ວັນທີໃນເທສຢູ່ໃນຂອບເຂດ 7 ມື້ */
const rawCall = function (u, o) { return F.handle(store, U[u], o); };
const call = function (u, o) { return rawCall(u, o.action === 'row' && o.reason === undefined ? Object.assign({ reason: 'ທົດສອບ' }, o) : o); }; /* ແກ້ຄ່າທີ່ບັນທຶກແລ້ວຕ້ອງມີເຫດຜົນ — ເທສທົ່ວໄປໃສ່ໃຫ້ເອງ; ເທສເລື່ອງເຫດຜົນໃຊ້ rawCall */
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
assert.strictEqual(call('adm', Object.assign({ action: 'photo', key: 'tank', data: '' }, S)).error, 'auth', 'a saved bill photo is removed by Admin / Super admin only');
assert.ok(call('boss', Object.assign({ action: 'photo', key: 'tank', data: '' }, S)).ok);
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
/* ເຕີມຈາກຮ້ານ/ປໍ້າອື່ນ: ນັບລິດເຕີມ ແຕ່ບໍ່ຫັກຈາກແທ່ງຂອງສະໜາມ */
const sb = call('adm', { action: 'sheet', site: 's1', date: '2026-11-18' }).data.tank, outB = sb.out;
call('adm', { action: 'row', site: 's1', date: '2026-11-18', v: 'v2', cm0: 10, cm1: 40, src: 'shop', shop: 'ປໍ້າ ABC' });
const sa = call('adm', { action: 'sheet', site: 's1', date: '2026-11-18' }).data, v2 = sa.rows.filter(function (x) { return x.v === 'v2'; })[0];
assert.deepStrictEqual([v2.add, v2.src, v2.shop, sa.tank.out], [150, 'shop', 'ປໍ້າ ABC', outB], 'shop fill is counted for the car (+150 L) but not deducted from the site tank');
assert.strictEqual(call('off', { action: 'ledger', site: 's1' }).data.filter(function (x) { return x.date === '2026-11-18'; })[0].shop, 150, 'ledger shows the shop litres separately');
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
/* ເຕີມຫຼາຍຮອບຕໍ່ມື້: ຮອບ 2 ເກັບເປັນ v1_r2 · ໃຊ້ຕົວຈິງ = Σ(ຫຼັງເຕີມ − ກ່ອນເຕີມຮອບຖັດໄປ) + (ຫຼັງເຕີມຮອບສຸດທ້າຍ − ຕອນແລງ) · ຄົນຂັບຮັບຮູ້ທຸກຮອບ */
const DR = '2026-11-15', SR = { site: 's1', date: DR };
call('adm', Object.assign({ action: 'row', v: 'v1', cm0: 10, cm1: 30, cm2: 15 }, SR));
assert.strictEqual(call('adm', Object.assign({ action: 'row', v: 'v1_r3', cm0: 1 }, SR)).error, 'vehicle', 'round 3 needs round 2 first');
assert.strictEqual(call('drv', Object.assign({ action: 'row', v: 'v1_r2', cm0: 12 }, SR)).error, 'auth', 'a driver cannot start another fill');
call('adm', Object.assign({ action: 'row', v: 'v1_r2', cm0: 12, cm1: 32, src: 'shop', shop: 'ປໍ້າ B' }, SR));
const rr = call('adm', Object.assign({ action: 'sheet' }, SR)).data, r1 = rr.rows.filter(function (x) { return x.v === 'v1'; })[0], r2 = rr.rows.filter(function (x) { return x.v === 'v1_r2'; })[0];
assert.deepStrictEqual([r2.base, r2.round, r1.add, r2.add, r1.used, r2.used, rr.tank.out], ['v1', 2, 100, 100, 175, null, 100], 'two fills (200 L), chain used 175 L, only the tank fill (100 L) is deducted from the site tank');
assert.ok(call('head', Object.assign({ action: 'approve', yes: 1 }, SR)).error === 'unacked', 'every round must be acknowledged before approval');
assert.ok(call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, SR)).ok && call('drv', Object.assign({ action: 'ack', v: 'v1_r2', yes: 1 }, SR)).ok, 'the driver acknowledges each round');
assert.strictEqual(call('drv', Object.assign({ action: 'sheet' }, SR)).data.rows.length, 2, 'the driver sees both rounds');
assert.ok(call('adm', Object.assign({ action: 'row', v: 'v1_r2', del: 1 }, SR)).error === 'acked', 'an acknowledged round cannot be deleted by staff without the fix right');
/* ຫົວໜ້າທີ່ເປັນຄົນຂັບຂອງລົດຄັນໜຶ່ງ ຮັບຮູ້ລົດຂອງຕົນໄດ້ (ບໍ່ຕ້ອງຕິກສິດ ack) ແຕ່ຮັບຮູ້ລົດຂອງຄົນອື່ນບໍ່ໄດ້ */
call('boss', { action: 'assign', site: 's1', v: 'v2', driver: 'u3' });
call('adm', Object.assign({ action: 'row', v: 'v2', cm0: 5, cm1: 25 }, SR));
assert.ok(call('head', Object.assign({ action: 'ack', v: 'v2', yes: 1 }, SR)).ok, 'a head who is assigned as the driver can acknowledge his own car');
assert.strictEqual(call('head', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, SR)).error, 'auth', 'but not a car assigned to someone else');
/* ===== ຂັ້ນຕອນຄຳຂໍນ້ຳມັນ: ວິຊາການຂໍ → ບໍລິຫານອະນຸມັດ (ແຫຼ່ງ + ລິດ) → ເຕີມ → ຄົນຂັບຮັບຮູ້ → ອະນຸມັດໃບ ===== */
(function () {
  const cfgQ = { sites: [{ id: 's1', name: 'ນາເລີດ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }, { id: 's2', name: 'ກິ່ວເກຍ', tank: { t: 'lpc', k: 10 } }], vehicles: [{ id: 'v1', name: 'ລົດເກດ', site: 's1', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'v2', name: 'ລົດຈົກ', site: 's1', driver: 'u5', tank: { t: 'lpc', k: 5 } }] };
  call('boss', { action: 'cfgSave', cfg: cfgQ });
  U.tech = { id: 'u9', role: 'tech', sites: ['s1'], name: 'ວິຊາການ' };
  const DQ = '2026-11-13', SQ = { site: 's1', date: DQ};
  assert.strictEqual(call('adm', Object.assign({ action: 'row', v: 'v1', cm0: 10 }, SQ)).error, 'norq', 'on a request-site a fill cannot start without an approved request');
  assert.strictEqual(call('drv', Object.assign({ action: 'rqNew', v: 'v1', lit: 100 }, SQ)).error, 'auth', 'a driver cannot ask for fuel');
  const ti = call('tech', { action: 'init' }).data; assert.deepStrictEqual([ti.me.rights.s1, ti.cfg.vehicles.length], [['request'], 2], 'technical staff see the cars to ask for');
  assert.strictEqual(call('tech', Object.assign({ action: 'sheet' }, SQ)).data.rows.length, 0, 'technical staff do not see issue sheets');
  assert.strictEqual(call('tech', { action: 'ledger', site: 's1' }).error, 'auth', 'nor the tank ledger');
  assert.strictEqual(call('tech', Object.assign({ action: 'rqNew', v: 'v1', lit: 0 }, SQ)).error, 'lit');
  const n1 = call('tech', Object.assign({ action: 'rqNew', v: 'v1', lit: 200, note: 'ຂຸດດິນ' }, SQ)).data.reqs; assert.strictEqual(n1.length, 1);
  const id1 = n1[0].id, st = function (x) { return call('head', Object.assign({ action: 'sheet' }, SQ)).data.reqs.filter(function (r) { return r.id === x; })[0]; };
  assert.strictEqual(st(id1).state, 'pending');
  assert.strictEqual(call('tech', Object.assign({ action: 'rqDecide', id: id1, yes: 1 }, SQ)).error, 'auth', 'technical staff cannot approve their own request');
  assert.strictEqual(call('adm', Object.assign({ action: 'rqStart', id: id1 }, SQ)).error, 'rqstate', 'a pending request cannot be filled');
  assert.strictEqual(call('head', Object.assign({ action: 'approve', yes: 1 }, SQ)).error, 'openrq', 'the day cannot be approved while a request is still open');
  assert.ok(call('head', Object.assign({ action: 'rqDecide', id: id1, yes: 1, lit: 150, src: 'shop', shop: 'ປໍ້າ ABC' }, SQ)).ok);
  assert.deepStrictEqual([st(id1).state, st(id1).ok.lit, st(id1).ok.src], ['approved', 150, 'shop'], 'the approver may change the litres and picks the source');
  assert.ok(call('adm', Object.assign({ action: 'rqStart', id: id1 }, SQ)).ok);
  let rw = call('adm', Object.assign({ action: 'sheet' }, SQ)).data.rows.filter(function (x) { return x.v === 'v1'; })[0]; assert.deepStrictEqual([rw.src, rw.shop, rw.rqi.ask, rw.rqi.ok], ['shop', 'ປໍ້າ ABC', 200, 150], 'the fill row carries the approved source');
  call('adm', Object.assign({ action: 'row', v: 'v1', cm0: 10, cm1: 40, src: 'tank' }, SQ));
  rw = call('adm', Object.assign({ action: 'sheet' }, SQ)).data.rows.filter(function (x) { return x.v === 'v1'; })[0]; assert.strictEqual(rw.src, 'shop', 'staff without the fix right cannot change the approved source');
  assert.strictEqual(st(id1).state, 'done');
  /* ຕ້ອງຄົນຂັບຮັບຮູ້ ແລ້ວຈຶ່ງອະນຸມັດໃບ; ຄຳຂໍທີ່ປະຕິເສດ/ຍົກເລີກ ບໍ່ກີດ */
  const n2 = call('tech', Object.assign({ action: 'rqNew', v: 'v2', lit: 50 }, SQ)).data.reqs.filter(function (r) { return r.v === 'v2'; })[0];
  assert.ok(call('head', Object.assign({ action: 'rqDecide', id: n2.id, yes: 0, why: 'ບໍ່ຈຳເປັນ' }, SQ)).ok); assert.strictEqual(call('head', Object.assign({ action: 'rqStart', id: n2.id }, SQ)).error, 'rqstate');
  assert.strictEqual(call('head', Object.assign({ action: 'approve', yes: 1 }, SQ)).error, 'unacked');
  assert.ok(call('drv', Object.assign({ action: 'ack', v: 'v1', yes: 1 }, SQ)).ok);
  assert.ok(call('head', Object.assign({ action: 'approve', yes: 1 }, SQ)).ok, 'all acknowledged and no open request → the day can be approved');
  /* ເຕີມດ່ວນ: ສິດ urgent ເທົ່ານັ້ນ, ເກັບເປັນຄຳຂໍ "ດ່ວນ" */
  call('head', Object.assign({ action: 'approve', yes: 0 }, SQ));
  assert.strictEqual(call('adm', Object.assign({ action: 'rqUrgent', v: 'v2' }, SQ)).error, 'auth', 'admin without the urgent right cannot start an urgent fill');
  const ur = call('head', Object.assign({ action: 'rqUrgent', v: 'v2', src: 'tank' }, SQ)).data; const ux = ur.reqs.filter(function (r) { return r.urgent; })[0];
  assert.deepStrictEqual([ux.urgent, ux.state === 'filling', ur.rows.filter(function (x) { return x.v === 'v2'; })[0].rqi.urgent], [true, true, true], 'urgent fill is recorded as an urgent request');
  /* ຄຳຂໍທີ່ຍົກເລີກ: ຜູ້ຂໍຍົກເລີກໄດ້ສະເພາະທີ່ລໍ */
  const n3 = call('tech', Object.assign({ action: 'rqNew', v: 'v1', lit: 30 }, SQ)).data.reqs.filter(function (r) { return r.lit === 30; })[0];
  assert.ok(call('tech', Object.assign({ action: 'rqCancel', id: n3.id }, SQ)).ok); assert.strictEqual(st(n3.id).state, 'cancel');
  assert.strictEqual(call('boss', { action: 'rqNew', v: 'v1', lit: 10, site: 's2', date: DQ }).error, 'rqoff', 'sites without the switch keep the old way');
  console.log('fuel: request workflow passed');
})();
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
  const expect = { init: 'YYYYYY', cfgSave: 'Y.....', sheet: 'YYYYY.', photos: 'YYYYY.', ledger: 'YYYY..', row: 'YYY...', tank: 'Y.Y...', photo: 'Y.Y...', ack: '....Y.', approve: 'YY....', assign: 'YY....' };
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
  const ri = call('aView', { action: 'init' }).data.me.rights; assert.deepStrictEqual(ri.s1, ['view', 'tank'], 'init tells the UI the rights per site'); assert.deepStrictEqual(call('drv', { action: 'init' }).data.me.rights.s1, ['ack']); assert.strictEqual(call('boss', { action: 'init' }).data.me.rights.s1.length, F.KEYS.length);
  console.log('fuel: tick rights passed');
})();

/* ຮັບເຂົ້າແທ່ງຫຼາຍຄັ້ງຕໍ່ມື້ */
(function () {
  const S2 = { site: 's1', date: '2026-11-16' };
  call('boss', Object.assign({ action: 'tank', recv: 4000 }, S2)); /* ຂໍ້ມູນເກົ່າ: recv ຄ່າດຽວ */
  let t = call('boss', Object.assign({ action: 'tank', add: { lit: 2000, from: 'ແທ່ງສະໜາມອື່ນ' } }, S2)).data.tank;
  assert.strictEqual(t.recv, 6000, 'legacy 4000 migrated + 2000 added'); assert.strictEqual(t.recvs.length, 2);
  assert.strictEqual(call('boss', Object.assign({ action: 'tank', add: { lit: 0 } }, S2)).error, 'lit');
  assert.ok(call('boss', Object.assign({ action: 'photo', key: 'tank_' + t.recvs[1].id, data: 'data:image/jpeg;base64,AAAA' }, S2)).ok, 'photo per receipt');
  assert.strictEqual(call('boss', Object.assign({ action: 'tank', del: t.recvs[1].id }, S2)).error, 'reason', 'a correction needs a reason');
  t = call('boss', Object.assign({ action: 'tank', del: t.recvs[1].id, reason: 'ພິມຜິດ' }, S2)).data.tank;
  assert.strictEqual(t.recv, 4000); assert.strictEqual(call('boss', { action: 'ledger', site: 's1' }).data.filter(function (x) { return x.date === '2026-11-16'; })[0].recv, 4000, 'ledger uses the sum');
  console.log('fuel: multi receipts passed');
})();

/* ໃບຂໍຫຼາຍຄັນ: ອະນຸມັດລາຍຄັນ / ທັງໝົດ · ຫ້າມອະນຸມັດຂອງຕົນເອງ · ນ້ຳມັນເຫຼືອໃນລົດ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's1', name: 'ນາເລີດ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }], vehicles: [{ id: 'v1', name: 'ລົດເກດ', site: 's1', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'v2', name: 'ລົດຈົກ', site: 's1', driver: 'u5', tank: { t: 'lpc', k: 5 } }, { id: 'v3', name: 'ລົດ 3', site: 's1', driver: 'u6', tank: { t: 'lpc', k: 5 } }] } });
  const day = function (n) { return new Date(store.now() + 7 * 3600e3 - n * 864e5).toISOString().slice(0, 10); }; /* ວັນທີທຽບກັບມື້ນີ້ ເພື່ອໃຫ້ທົດສອບໄດ້ທຸກມື້ */
  store.write('d_s1_' + day(4), { rows: { v1: { cm0: 5, cm1: 25, cm2: 20 } }, tank: {} }); /* ມື້ວານ: ແທກເລີກວຽກ 20 cm = 100 L */
  const SQ = { site: 's1', date: day(3) };
  assert.strictEqual(call('tech', Object.assign({ action: 'rqNew', lines: [{ v: 'v1', lit: 50 }, { v: 'v1', lit: 20 }] }, SQ)).error, 'dup', 'a car twice in one sheet is refused');
  assert.strictEqual(call('tech', Object.assign({ action: 'rqNew', lines: [{ v: 'v1', lit: 50 }, { v: 'v2', lit: 0 }] }, SQ)).error, 'lit', 'one bad line refuses the whole sheet');
  assert.strictEqual(call('tech', Object.assign({ action: 'sheet' }, SQ)).data.reqs.length, 0, 'nothing was saved by the refused sheets');
  const sh = call('tech', Object.assign({ action: 'rqNew', lines: [{ v: 'v1', lit: 50 }, { v: 'v2', lit: 80 }, { v: 'v3', lit: 30 }], note: 'ຂຸດໜອງ' }, SQ)).data;
  assert.strictEqual(sh.reqs.length, 3); assert.deepStrictEqual([sh.reqs[0].bno, sh.reqs[1].bno, sh.reqs[2].bno, sh.reqs[0].bid === sh.reqs[2].bid], [1, 1, 1, true], 'three lines share one sheet');
  assert.deepStrictEqual([sh.left.v1 && sh.left.v1.L, sh.left.v2], [100, null], 'fuel left in the car comes from the last end-of-work reading');
  const sh2 = call('tech', Object.assign({ action: 'rqNew', v: 'v3', lit: 10 }, SQ)).data.reqs; assert.strictEqual(sh2[3].bno, 2, 'the old single-car call still works and is the next sheet');
  /* ອະນຸມັດລາຍຄັນ ແລະ ທາງລັດທັງໝົດ */
  assert.ok(call('head', Object.assign({ action: 'rqDecide', id: sh.reqs[0].id, yes: 1, lit: 45, src: 'tank' }, SQ)).ok);
  const ids = sh.reqs.slice(1).map(function (r) { return r.id; });
  const all = call('head', Object.assign({ action: 'rqDecideMany', ids: ids, src: 'shop' }, SQ)).data.reqs;
  assert.deepStrictEqual(all.slice(0, 3).map(function (r) { return r.state + ':' + r.ok.lit; }), ['approved:45', 'approved:80', 'approved:30'], 'approve-all keeps each line\'s litres');
  /* ຫ້າມອະນຸມັດຂອງຕົນເອງ */
  const own = call('head', Object.assign({ action: 'rqNew', lines: [{ v: 'v2', lit: 5 }] }, SQ)).data.reqs.filter(function (r) { return r.by === U.head.id && r.state === 'pending'; })[0];
  assert.strictEqual(call('head', Object.assign({ action: 'rqDecide', id: own.id, yes: 1 }, SQ)).error, 'self', 'nobody approves their own request');
  const own2 = call('head', Object.assign({ action: 'rqDecideMany', ids: [own.id] }, SQ)).data.reqs.filter(function (r) { return r.id === own.id; })[0]; assert.strictEqual(own2.state, 'pending', 'approve-all skips the caller\'s own lines');
  assert.strictEqual(call('tech', Object.assign({ action: 'rqDecideMany', ids: [own.id] }, SQ)).error, 'auth', 'technical staff cannot approve');
  console.log('fuel: multi-car request sheet passed');
})();

/* ເບີກຈາກແທ່ງ: ອະນຸມັດໄດ້ບໍ່ເກີນຍອດແທ່ງເຫຼືອ; ຊື້ທີ່ປໍ້າບໍ່ຈຳກັດ; ຮູບບິນປໍ້າຫຼາຍຮູບ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's9', name: 'ທົດລອງແທ່ງ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }], vehicles: [{ id: 'w1', name: 'ລົດ W1', site: 's9', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'w2', name: 'ລົດ W2', site: 's9', driver: 'u5', tank: { t: 'lpc', k: 5 } }, { id: 'w3', name: 'ລົດ W3', site: 's9', driver: 'u6', tank: { t: 'lpc', k: 5 } }] } });
  const D = new Date(store.now() + 7 * 3600e3 - 2 * 864e5).toISOString().slice(0, 10), S9 = { site: 's9', date: D }, ask = function (n, lit) { return call('boss', Object.assign({ action: 'rqNew', lines: [{ v: n, lit: lit }] }, S9)).data.reqs; };
  U.t9 = { id: 'u19', role: 'tech', sites: ['s9'], name: 'ວິຊາການ 9' }; /* ຄົນຂໍ ≠ ຄົນອະນຸມັດ */
  const askT = function (lines) { const z = call('t9', Object.assign({ action: 'rqNew', lines: lines }, S9)); assert.ok(z.ok, 'tech request: ' + z.error); return z.data.reqs; };
  let r = askT([{ v: 'w1', lit: 100 }]); const e1 = call('boss', Object.assign({ action: 'rqDecide', id: r[0].id, yes: 1, src: 'tank' }, S9));
  assert.deepStrictEqual([e1.error, e1.have], ['stock', 0], 'an empty tank cannot approve a tank request');
  assert.ok(call('boss', Object.assign({ action: 'rqDecide', id: r[0].id, yes: 1, lit: 500, src: 'shop', shop: 'ປໍ້າ A' }, S9)).ok, 'pump purchase is not limited by the tank');
  call('boss', Object.assign({ action: 'tank', add: { lit: 150 } }, S9)); /* ຮັບເຂົ້າແທ່ງ 150 L */
  r = askT([{ v: 'w2', lit: 100 }, { v: 'w3', lit: 100 }]);
  const e2 = call('boss', Object.assign({ action: 'rqDecide', id: r[1].id, yes: 1, lit: 160, src: 'tank' }, S9)); assert.strictEqual(e2.error, 'stock', 'more than the tank has is refused');
  assert.ok(call('boss', Object.assign({ action: 'rqDecide', id: r[0].id, yes: 1, src: 'tank' }, S9)).ok, '100 of 150 is fine');
  const st = call('boss', Object.assign({ action: 'sheet' }, S9)).data.stock; assert.deepStrictEqual([st.have, st.pend], [150, 100], 'the approver sees stock and approved-but-not-filled (no automatic reservation)');
  const rr = askT([{ v: 'w1', lit: 60 }, { v: 'w2', lit: 60 }, { v: 'w3', lit: 60 }]);
  const m = call('boss', Object.assign({ action: 'rqDecideMany', ids: rr.slice(-3).map(function (x) { return x.id; }), src: 'tank' }, S9)).data;
  assert.strictEqual(m.skipped, 1, 'approve-all counts the stock cumulatively and skips the line that does not fit'); assert.strictEqual(m.reqs.filter(function (x) { return x.lit === 60 && x.state === 'pending'; }).length, 1);
  const rs0 = call('boss', Object.assign({ action: 'rqStart', id: r[0].id }, S9)); assert.ok(rs0.ok, 'start fill: ' + rs0.error);
  ['p1', 'p2', 'p3'].forEach(function (k) { assert.ok(call('boss', Object.assign({ action: 'photo', key: 'w2_' + k, data: 'data:image/jpeg;base64,AAAA' }, S9)).ok, 'pump bill photo ' + k); });
  /* ເຕີມເກີນທີ່ອະນຸມັດ: ອະນຸມັດ 100 L ຖັງ 5 L/cm ເຕີມໄດ້ສູງສຸດ 110 L (10%) — ເກີນນັ້ນກັນ */
  const w2 = call('boss', Object.assign({ action: 'sheet' }, S9)).data.reqs.filter(function (x) { return x.v === 'w2' && x.lit === 100; })[0];
  assert.ok(call('boss', Object.assign({ action: 'rqDecide', id: w2.id, yes: 1, src: 'tank' }, S9)).ok); assert.ok(call('boss', Object.assign({ action: 'rqStart', id: w2.id }, S9)).ok);
  const rw = call('boss', Object.assign({ action: 'row', v: 'w2', cm0: 10 }, S9)); assert.ok(rw.ok, 'start of the fill is saved: ' + rw.error);
  assert.strictEqual(rw.data.rows.filter(function (x) { return x.v === 'w2'; })[0].rqi.max, 110, 'the UI gets the most that may be filled');
  const over = call('boss', Object.assign({ action: 'row', v: 'w2', cm1: 33 }, S9)); assert.deepStrictEqual([over.error, over.max], ['overcap', 110], '115 L is over the approved 100 + 10%');
  assert.ok(call('boss', Object.assign({ action: 'row', v: 'w2', cm1: 32 }, S9)).ok, '110 L (the limit) is accepted');
  console.log('fuel: tank stock check passed');
})();

/* ຄົນຂັບແທນສະເພາະມື້ · ລົດບໍ່ມີຄົນຂັບ = ບໍ່ເຕີມ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's8', name: 'ທົດລອງແທນ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }], vehicles: [{ id: 'x1', name: 'ລົດ X1', site: 's8', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'x2', name: 'ລົດ X2', site: 's8', tank: { t: 'lpc', k: 5 } }, { id: 'x3', name: 'ລົດ X3', site: 's8', driver: 'u5', tank: { t: 'lpc', k: 5 } }] } });
  const day = function (n) { return new Date(store.now() + 7 * 3600e3 + n * 864e5).toISOString().slice(0, 10); }, D = day(0), S8 = { site: 's8', date: D };
  U.t8 = { id: 'u28', role: 'tech', sites: ['s8'], name: 'ວິຊາການ 8' }; U.d7 = { id: 'u7', role: 'driver', sites: [], name: 'ຄົນແທນ' }; U.d5 = { id: 'u5', role: 'driver', sites: [], name: 'ຄົນຂັບ 5' };
  assert.strictEqual(call('t8', Object.assign({ action: 'rqNew', lines: [{ v: 'x2', lit: 50 }] }, S8)).error, 'nodriver', 'a car with no driver cannot be requested');
  assert.strictEqual(call('d7', Object.assign({ action: 'subDriver', v: 'x2', driver: 'u7' }, S8)).error, 'auth', 'a driver cannot pick the substitute');
  assert.strictEqual(call('t8', Object.assign({ action: 'subDriver', v: 'x2', driver: 'u7' }, { site: 's8', date: day(-1) })).error, 'date', 'substitutes are for today or later');
  assert.ok(call('t8', Object.assign({ action: 'subDriver', v: 'x2', driver: 'u7' }, S8)).ok, 'technical staff set today\'s driver');
  const sh = call('t8', Object.assign({ action: 'sheet' }, S8)).data; assert.deepStrictEqual([sh.drv.x2.d, sh.drv.x2.sub, sh.drv.x1.d], ['u7', true, 'u4']);
  assert.ok(call('t8', Object.assign({ action: 'rqNew', lines: [{ v: 'x2', lit: 50 }] }, S8)).ok, 'now the car can be requested');
  /* ຄົນຂັບປະຈຳລາ ບໍ່ມີຄົນແທນ → ຈອດ; ຍົກເລີກການແທນ → ກັບເປັນຄົນຂັບປະຈຳ */
  assert.ok(call('t8', Object.assign({ action: 'subDriver', v: 'x1', driver: '' }, S8)).ok); assert.strictEqual(call('t8', Object.assign({ action: 'rqNew', lines: [{ v: 'x1', lit: 30 }] }, S8)).error, 'nodriver', 'regular driver on leave and no substitute: parked');
  assert.ok(call('t8', Object.assign({ action: 'subDriver', v: 'x1', reset: 1 }, S8)).ok); assert.ok(call('t8', Object.assign({ action: 'rqNew', lines: [{ v: 'x1', lit: 30 }] }, S8)).ok, 'back to the regular driver');
  /* ຄົນຂັບຂອງມື້: ຄົນແທນຮັບຮູ້ໄດ້ ຄົນຂັບປະຈຳບໍ່ໄດ້ */
  assert.ok(call('t8', Object.assign({ action: 'subDriver', v: 'x3', driver: 'u7' }, S8)).ok);
  const q = call('t8', Object.assign({ action: 'rqNew', lines: [{ v: 'x3', lit: 50 }] }, S8)).data.reqs.filter(function (x) { return x.v === 'x3'; })[0];
  assert.ok(call('boss', Object.assign({ action: 'rqDecide', id: q.id, yes: 1, src: 'shop' }, S8)).ok); assert.ok(call('boss', Object.assign({ action: 'rqStart', id: q.id }, S8)).ok);
  assert.ok(call('boss', Object.assign({ action: 'row', v: 'x3', cm0: 10, cm1: 20 }, S8)).ok);
  assert.strictEqual(call('d5', Object.assign({ action: 'ack', v: 'x3', yes: 1 }, S8)).error, 'auth', 'the regular driver is on leave that day');
  const mine = call('d7', Object.assign({ action: 'sheet' }, S8)); assert.ok(mine.ok && mine.data.rows.some(function (r) { return r.v === 'x3' && r.mine && r.sub; }), 'the substitute sees the car as his own');
  assert.ok(call('d7', Object.assign({ action: 'ack', v: 'x3', yes: 1 }, S8)).ok, 'the substitute acknowledges');
  assert.strictEqual(call('t8', Object.assign({ action: 'subDriver', v: 'x3', driver: 'u5' }, S8)).error, 'subacked', 'cannot swap the driver after the acknowledgement');
  console.log('fuel: substitute driver passed');
})();

/* ຮັບເຂົ້າແທ່ງ: ບໍລິຫານແກ້ເອງບໍ່ໄດ້ · Admin ແກ້ໄດ້ພ້ອມເຫດຜົນ + log */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's7', name: 'ທົດລອງຮັບເຂົ້າ', tank: { t: 'hcyl', d: 120, len: 250 } }], vehicles: [{ id: 'y1', name: 'ລົດ Y1', site: 's7', driver: 'u4', tank: { t: 'lpc', k: 5 } }] } });
  U.a7 = { id: 'u17', role: 'admin', sites: ['s7'], name: 'ບໍລິຫານ 7' };
  const D7 = new Date(store.now() + 7 * 3600e3 - 864e5).toISOString().slice(0, 10), S7 = { site: 's7', date: D7 };
  const t1 = call('a7', Object.assign({ action: 'tank', add: { lit: 3000, from: 'ຜູ້ຂາຍ' } }, S7)).data.tank; assert.strictEqual(t1.recv, 3000, 'the administrator records a receipt');
  const id = t1.recvs[0].id;
  assert.strictEqual(call('a7', Object.assign({ action: 'tank', edit: { id: id, lit: 300 }, reason: 'x' }, S7)).error, 'auth', 'the administrator cannot change a saved receipt');
  assert.strictEqual(call('a7', Object.assign({ action: 'tank', del: id, reason: 'x' }, S7)).error, 'auth', 'nor remove it');
  assert.strictEqual(call('a7', Object.assign({ action: 'tank', recv: 1 }, S7)).data.tank.recv, 3000, 'nor overwrite the total with the old single-value field');
  assert.strictEqual(call('a7', { action: 'adjlog', site: 's7' }).error, 'auth', 'the correction log is for Admin / Super admin');
  assert.strictEqual(call('boss', Object.assign({ action: 'tank', edit: { id: id, lit: 300 } }, S7)).error, 'reason');
  const t2 = call('boss', Object.assign({ action: 'tank', edit: { id: id, lit: 300, from: 'ປໍ້າ', note: 'ແກ້ຕາມບິນ' }, reason: 'ພິມຜິດ 3000 → 300' }, S7)).data.tank;
  assert.deepStrictEqual([t2.recv, t2.recvs[0].edited.reason, t2.recvs[0].from], [300, 'ພິມຜິດ 3000 → 300', 'ປໍ້າ'], 'Admin corrects, the total follows, the receipt is marked');
  assert.ok(call('a7', Object.assign({ action: 'tank', add: { lit: 200 } }, S7)).ok, 'adding another receipt is still free');
  const lg = call('boss', { action: 'adjlog', site: 's7' }).data; assert.deepStrictEqual([lg.length, lg[0].kind, lg[0].from.lit, lg[0].to.lit, lg[0].reason], [1, 'edit', 3000, 300, 'ພິມຜິດ 3000 → 300'], 'the correction is logged with old and new values');
  assert.ok(call('a7', Object.assign({ action: 'photo', key: 'tank_' + id, data: 'data:image/jpeg;base64,AAAA' }, S7)).ok, 'a receipt photo needs only the tank right');
  assert.strictEqual(call('a7', Object.assign({ action: 'photo', key: 'tank_' + id, data: '' }, S7)).error, 'auth', 'a saved bill photo cannot be removed by the administrator');
  /* ຫຼັງອະນຸມັດໃບ (ລັອກ): ບໍລິຫານແກ້ບໍ່ໄດ້ ແຕ່ Admin ແກ້ໄດ້ (ມີ log) */
  assert.strictEqual(call('boss', Object.assign({ action: 'approve', yes: 1 }, S7)).error, 'nobill', 'approval needs a bill photo on every receipt');
  call('boss', Object.assign({ action: 'tank', site: 's7' }, S7)).data.tank.recvs.forEach(function (r) { call('a7', Object.assign({ action: 'photo', key: 'tank_' + r.id, data: 'data:image/jpeg;base64,AAAA' }, S7)); });
  assert.ok(call('boss', Object.assign({ action: 'approve', yes: 1 }, S7)).ok);
  assert.strictEqual(call('a7', Object.assign({ action: 'tank', add: { lit: 5 } }, S7)).error, 'locked');
  assert.ok(call('boss', Object.assign({ action: 'tank', del: t2.recvs[0].id, reason: 'ບິນຊ້ຳ' }, S7)).ok, 'Admin may still void on a locked day');
  assert.strictEqual(call('boss', { action: 'adjlog', site: 's7' }).data.length, 2);
  console.log('fuel: receipts immutable passed');
})();

/* ອະນຸມັດໃບປະຈຳວັນ: ຕ້ອງມີການເຕີມຢ່າງໜ້ອຍ 1 ຄັ້ງ — ມື້ບໍ່ມີຄຳຂໍ ບໍ່ຕ້ອງອະນຸມັດ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's6', name: 'ທົດລອງອະນຸມັດໃບ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }, { id: 's5', name: 'ແບບເກົ່າ', tank: { t: 'hcyl', d: 120, len: 250 } }], vehicles: [{ id: 'z1', name: 'ລົດ Z1', site: 's6', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'z5', name: 'ລົດ Z5', site: 's5', driver: 'u4', tank: { t: 'lpc', k: 5 } }] } });
  U.t6 = { id: 'u26', role: 'tech', sites: ['s6'], name: 'ວິຊາການ 6' };
  const day = function (n) { return new Date(store.now() + 7 * 3600e3 - n * 864e5).toISOString().slice(0, 10); }, D = day(1), S6 = { site: 's6', date: D };
  assert.strictEqual(call('boss', Object.assign({ action: 'approve', yes: 1 }, S6)).error, 'nofill', 'an empty day cannot be approved on a request-site');
  const lg = call('boss', { action: 'ledger', site: 's6' }); assert.ok(!lg.ok || lg.data.every(function (x) { return x.approved || x.idle; }), 'idle days are marked, not left "waiting"');
  const q = call('t6', Object.assign({ action: 'rqNew', lines: [{ v: 'z1', lit: 50 }] }, S6)).data.reqs[0];
  assert.strictEqual(call('boss', Object.assign({ action: 'approve', yes: 1 }, S6)).error, 'openrq', 'a pending request blocks the approval');
  assert.ok(call('boss', Object.assign({ action: 'rqDecide', id: q.id, yes: 1, src: 'shop' }, S6)).ok);
  assert.strictEqual(call('boss', Object.assign({ action: 'approve', yes: 1 }, S6)).error, 'openrq', 'approved but not yet filled still blocks');
  assert.ok(call('boss', Object.assign({ action: 'rqStart', id: q.id }, S6)).ok); assert.ok(call('boss', Object.assign({ action: 'row', v: 'z1', cm0: 10, cm1: 20 }, S6)).ok);
  U.d4 = { id: 'u4', role: 'driver', sites: [], name: 'ຄົນຂັບ 4' }; assert.ok(call('d4', Object.assign({ action: 'ack', v: 'z1', yes: 1 }, S6)).ok);
  assert.ok(call('boss', Object.assign({ action: 'approve', yes: 1 }, S6)).ok, 'a day with a filled, acknowledged request can be approved');
  /* ສະໜາມແບບເກົ່າ (ບໍ່ໃຊ້ຄຳຂໍ) ບໍ່ປ່ຽນ */
  assert.ok(call('boss', Object.assign({ action: 'approve', yes: 1 }, { site: 's5', date: D })).ok, 'old-style sites still approve as before');
  const lg2 = call('boss', { action: 'ledger', site: 's6' }).data.filter(function (x) { return x.date === D; })[0]; assert.deepStrictEqual([lg2.approved, lg2.idle], [true, false]);
  console.log('fuel: approval needs a fill passed');
})();

/* ແກ້ຄ່າ cm ທີ່ບັນທຶກແລ້ວ: ຕ້ອງມີເຫດຜົນ · ມີປະຫວັດ · ເຂົ້າລາຍງານການປັບປຸງ · ຮູບລັອກຫຼັງຄົນຂັບຮັບຮູ້ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's4', name: 'ທົດລອງແກ້ cm', tank: { t: 'hcyl', d: 120, len: 250 } }], vehicles: [{ id: 'k1', name: 'ລົດ K1', site: 's4', driver: 'u4', tank: { t: 'lpc', k: 5 } }] } });
  U.i4 = { id: 'u14', role: 'admin', sites: ['s4'], name: 'ຜູ້ເບີກ 4' }; U.h4 = { id: 'u24', role: 'head', sites: ['s4'], name: 'ຫົວໜ້າ 4' }; U.d4b = { id: 'u4', role: 'driver', sites: [], name: 'ຄົນຂັບ' };
  const D = new Date(store.now() + 7 * 3600e3 - 864e5).toISOString().slice(0, 10), S4 = { site: 's4', date: D };
  assert.ok(rawCall('i4', Object.assign({ action: 'row', v: 'k1', cm0: 10, cm1: 30 }, S4)).ok, 'the first entry needs no reason');
  assert.strictEqual(rawCall('i4', Object.assign({ action: 'row', v: 'k1', cm1: 31 }, S4)).error, 'reason', 'changing a saved cm needs a reason');
  assert.ok(rawCall('i4', Object.assign({ action: 'row', v: 'k1', cm2: 12 }, S4)).ok, 'adding the evening reading is not an edit');
  assert.ok(rawCall('i4', Object.assign({ action: 'row', v: 'k1', cm1: 31, reason: 'ກອກເລກຜິດ' }, S4)).ok);
  const h = call('i4', Object.assign({ action: 'sheet' }, S4)).data.rows[0].h; assert.deepStrictEqual([h.length, h[0].k, h[0].from, h[0].to, h[0].why, h[0].name], [1, 'cm1', 30, 31, 'ກອກເລກຜິດ', 'ຜູ້ເບີກ 4'], 'the history keeps who, what and why');
  const lg = call('boss', { action: 'adjlog', site: 's4' }).data; assert.deepStrictEqual([lg.length, lg[0].kind, lg[0].car, lg[0].from.txt, lg[0].to.txt, lg[0].reason], [1, 'row', 'ລົດ K1', 'ຫຼັງເຕີມ 30 cm', 'ຫຼັງເຕີມ 31 cm', 'ກອກເລກຜິດ'], 'the edit appears in the adjustment report');
  const img = 'data:image/jpeg;base64,AAAA';
  assert.ok(rawCall('i4', Object.assign({ action: 'photo', key: 'k1_b', data: img }, S4)).ok); assert.ok(rawCall('i4', Object.assign({ action: 'photo', key: 'k1_b', data: img }, S4)).ok, 'a photo can be retaken before the acknowledgement');
  assert.ok(rawCall('d4b', Object.assign({ action: 'ack', v: 'k1', yes: 1 }, S4)).ok);
  assert.strictEqual(rawCall('i4', Object.assign({ action: 'photo', key: 'k1_b', data: img }, S4)).error, 'photolock', 'after the acknowledgement the photo is locked for the operator');
  assert.ok(rawCall('i4', Object.assign({ action: 'photo', key: 'k1_a', data: img }, S4)).ok, 'a photo that does not exist yet can still be added');
  assert.ok(rawCall('h4', Object.assign({ action: 'photo', key: 'k1_b', data: img }, S4)).ok, 'the chief may replace it');
  console.log('fuel: cm edit reason + log + photo lock passed');
})();

/* ຂໍ / ອະນຸມັດ ລ່ວງໜ້າ (ມື້ອື່ນ → +7 ມື້); ເລີ່ມເຕີມ ແລະເຕີມດ່ວນ = ມື້ນີ້ເທົ່ານັ້ນ */
(function () {
  call('boss', { action: 'cfgSave', cfg: { sites: [{ id: 's3', name: 'ທົດລອງລ່ວງໜ້າ', tank: { t: 'hcyl', d: 120, len: 250 }, rq: true }], vehicles: [{ id: 'a1', name: 'ລົດ A1', site: 's3', driver: 'u4', tank: { t: 'lpc', k: 5 } }, { id: 'a2', name: 'ລົດ A2', site: 's3', tank: { t: 'lpc', k: 5 } }] } });
  U.t3 = { id: 'u33', role: 'tech', sites: ['s3'], name: 'ວິຊາການ 3' };
  const day = function (n) { return new Date(store.now() + 7 * 3600e3 + n * 864e5).toISOString().slice(0, 10); }, T = { site: 's3', date: day(0) }, N1 = { site: 's3', date: day(1) }, N8 = { site: 's3', date: day(8) };
  assert.strictEqual(call('t3', Object.assign({ action: 'rqNew', lines: [{ v: 'a1', lit: 50 }] }, N8)).error, 'future', 'more than 7 days ahead is refused');
  const q = call('t3', Object.assign({ action: 'rqNew', lines: [{ v: 'a1', lit: 50 }] }, N1)); assert.ok(q.ok, 'a request for tomorrow is accepted'); const id = q.data.reqs[0].id;
  assert.strictEqual(call('t3', Object.assign({ action: 'rqNew', lines: [{ v: 'a2', lit: 20 }] }, N1)).error, 'nodriver', 'the driver rule applies to the chosen day');
  assert.ok(call('t3', Object.assign({ action: 'subDriver', v: 'a2', driver: 'u7' }, N1)).ok); assert.ok(call('t3', Object.assign({ action: 'rqNew', lines: [{ v: 'a2', lit: 20 }] }, N1)).ok, 'a substitute set for tomorrow lets tomorrow\'s request through');
  assert.strictEqual(call('t3', Object.assign({ action: 'sheet' }, T)).data.reqs.length, 0, 'today stays empty');
  call('boss', Object.assign({ action: 'tank', add: { lit: 500 } }, T));
  assert.strictEqual(call('boss', Object.assign({ action: 'rqDecide', id: id, yes: 1, src: 'shop' }, N1)).data.reqs.filter(function (x) { return x.id === id; })[0].state, 'approved', 'the approver can approve tomorrow\'s request today');
  assert.strictEqual(call('boss', Object.assign({ action: 'rqStart', id: id }, N1)).error, 'future', 'but the fill cannot start before that day');
  assert.strictEqual(call('boss', Object.assign({ action: 'rqUrgent', v: 'a1', src: 'tank' }, N1)).error, 'future', 'nor an urgent fill');
  const ah = call('boss', Object.assign({ action: 'rqAhead' }, T)).data; assert.deepStrictEqual([ah.length, ah[0].date, ah[0].total, ah[0].pending, ah[0].approved], [1, day(1), 2, 1, 1], 'the approver sees what is waiting ahead');
  const mine = call('t3', Object.assign({ action: 'rqAhead' }, T)).data; assert.strictEqual(mine[0].total, 2, 'technical staff see their own');
  console.log('fuel: advance requests passed');
})();

(function () { /* ສະໜາມຂໍ້ມູນເກົ່າທີ່ບໍ່ມີ rq = ໃຊ້ລະບົບຄຳຂໍ (ຄືກັນທຸກເຄື່ອງ); ຕັ້ງ rq:false ຈຶ່ງປິດ */
  store.write('cfg', { company: '', sites: [{ id: 'o1', name: 'ເກົ່າ', tank: { t: 'lpc', k: 5 } }, { id: 'o2', name: 'ປິດ', rq: false, tank: { t: 'lpc', k: 5 } }], vehicles: [] });
  const c = call('boss', { action: 'init' }).data.cfg.sites; assert.deepStrictEqual([c[0].rq, c[1].rq], [true, false]);
  console.log('fuel: legacy site without rq defaults to the request workflow');
})();

(function () { /* Dashboard ຊ່ວງວັນ: ສະຫຼຸບຕໍ່ວັນ, ຕ້ອງມີສິດເບິ່ງ, ຈຳກັດຊ່ວງ */
  store.write('cfg', { company: '', sites: [{ id: 'z1', name: 'ສະໜາມ Z', tank: { t: 'lpc', k: 5 }, rq: false }], vehicles: [{ id: 'zv1', name: 'ລົດ Z', site: 'z1', driver: 'u4', tank: { t: 'lpc', k: 5 } }] });
  const Z = { site: 'z1' }, d1 = '2026-11-18', d2 = '2026-11-19';
  call('boss', Object.assign({ action: 'tank', date: d1, add: { lit: 500 } }, Z));
  call('boss', Object.assign({ action: 'row', date: d1, v: 'zv1', cm0: 10, cm1: 30, src: 'tank' }, Z));
  const r = call('boss', Object.assign({ action: 'dash', from: d1, to: d2 }, Z)).data;
  assert.deepStrictEqual([r.days.length, r.days[0].date, r.days[0].recv, r.days[0].fl.n, r.days[0].fl.lit, r.days[0].out, r.close], [1, d1, 500, 1, 100, 100, 400]);
  assert.strictEqual(call('boss', Object.assign({ action: 'dash', from: d2, to: d1 }, Z)).error, 'date');
  assert.strictEqual(call('boss', Object.assign({ action: 'dash', from: '2026-01-01', to: d2 }, Z)).error, 'range');
  assert.strictEqual(call('drv', Object.assign({ action: 'dash', from: d1, to: d2 }, Z)).error, 'auth', 'drivers have no dashboard');
  console.log('fuel: dashboard range summary');
})();

(function () { /* ສົ່ງຊ້ຳຫຼັງເນັດຫຼຸດ/ຊ້າ (ຄິວອອບລາຍ): ຄຳຂໍ + ຮັບເຂົ້າແທ່ງ ບໍ່ຊ້ຳ, id ຄົງທີ່ */
  store.write('cfg', { company: '', sites: [{ id: 'y1', name: 'ສະໜາມ Y', tank: { t: 'lpc', k: 5 }, rq: true }], vehicles: [{ id: 'yv1', name: 'ລົດ Y', site: 'y1', driver: 'u4', tank: { t: 'lpc', k: 5 } }] });
  const Y = { site: 'y1', date: '2026-11-19' }, rq = Object.assign({ action: 'rqNew', cid: 'b1abc2def', lines: [{ v: 'yv1', lit: 80 }] }, Y);
  const a = call('boss', rq), b = call('boss', rq);
  assert.ok(a.ok && b.ok, 'both calls succeed');
  assert.strictEqual(b.data.reqs.length, 1, 'resending the same cid does not duplicate');
  assert.strictEqual(b.data.reqs[0].id, 'r1abc2def0', 'id is derived from cid so offline ops can reference it');
  const t1 = Object.assign({ action: 'tank', add: { id: 'rzz123', lit: 300 } }, Y); call('boss', t1); const t2 = call('boss', t1);
  assert.strictEqual(t2.data.tank.recv, 300, 'resent receive is not counted twice');
  const u = Object.assign({ action: 'rqUrgent', cid: 'b9urg9', v: 'yv1', src: 'tank' }, Y); call('boss', u); const u2 = call('boss', u);
  if (u2.ok) assert.strictEqual(u2.data.reqs.filter(function (r) { return r.urgent; }).length, 1, 'urgent resend is not duplicated');
  console.log('fuel: idempotent resend (offline queue)');
})();
