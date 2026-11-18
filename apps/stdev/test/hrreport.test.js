/* ທົດສອບລາຍງານ HR Excel: ສະຖານະລາຍວັນ (ປົກກະຕິ/ມາຊ້າ/ຂາດ/ລາ/ວັນຢຸດ/ເຮັດວຽກວັນຢຸດ), ກະຂ້າມຄືນ, OT, ຮອບເດືອນ 26→25, ຕົວຂຽນ xlsx */
'use strict';
const assert = require('assert'), R = require('../hr-report'), X = require('../xlsx');
let n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
const iso = function (date, hm) { return new Date(Date.parse(date + 'T' + hm + ':00Z') - 7 * 36e5).toISOString(); }; /* ເວລາລາວ → UTC */
const scan = function (emp, kind, date, hm, extra) { return Object.assign({ id: emp + kind + date, employeeId: emp, kind: kind, deviceTime: iso(date, hm), status: 'ok' }, extra); };

const snap = {
  settings: { graceMinutes: 5, otRate: 1.5, holidays: ['2026-06-03'] },
  branches: [{ id: 'b1', name: 'ສາຂາຫຼັກ' }],
  shifts: [{ id: 'day', name: 'ກະກາງວັນ', start: '09:00', end: '17:00' }, { id: 'night', name: 'ກະກາງຄືນ', start: '22:00', end: '06:00' }],
  employees: [
    { id: 'e1', code: 'A-1', name: 'ຄົນ ໜຶ່ງ', dept: 'ບໍລິຫານ', position: 'ພະນັກງານ', homeBranchId: 'b1', shiftId: 'day', startDate: '2026-01-01', dayOff: [0] },
    { id: 'e2', code: 'A-2', name: 'ຄົນ ສອງ', dept: 'ບໍລິຫານ', position: 'ພະນັກງານ', homeBranchId: 'b1', shiftId: 'day', startDate: '2026-01-01' },
    { id: 'e3', code: 'A-3', name: 'ຄົນ ສາມ', dept: 'ຍາມ', position: 'ຍາມ', homeBranchId: 'b1', shiftId: 'night', startDate: '2026-01-01' }
  ],
  scans: [
    scan('e1', 'in', '2026-06-01', '08:11', { branchId: 'b1', lat: 17.9, lng: 102.6, faceScore: 90 }), scan('e1', 'out', '2026-06-01', '17:07'),
    scan('e1', 'in', '2026-06-02', '09:20'), scan('e1', 'out', '2026-06-02', '17:00'),
    scan('e1', 'in', '2026-06-04', '09:00'),
    scan('e1', 'in', '2026-06-06', '09:00'), scan('e1', 'out', '2026-06-06', '17:00'),
    scan('e2', 'in', '2026-06-03', '09:00'), scan('e2', 'out', '2026-06-03', '17:00'),
    scan('e3', 'in', '2026-06-01', '21:58'), scan('e3', 'out', '2026-06-02', '06:05')
  ],
  leaves: [
    { employeeId: 'e1', type: 'annual', from: '2026-06-05', to: '2026-06-05', status: 'approved', reason: 'ພັກຜ່ອນ' },
    { employeeId: 'e1', type: 'personal', from: '2026-06-06', to: '2026-06-06', status: 'approved', part: 'hours', hours: 2, reason: 'ທຸລະ' },
    { employeeId: 'e1', type: 'sick', from: '2026-06-09', to: '2026-06-09', status: 'pending' }
  ],
  ots: [{ employeeId: 'e1', date: '2026-06-01', minutes: 90, status: 'approved' }, { employeeId: 'e1', date: '2026-06-02', minutes: 60, status: 'pending' }],
  overrides: []
};
const ctx = R.buildContext(snap, { today: '2026-06-10' }), day = function (e, d) { return R.computeDay(ctx, snap.employees.filter(function (x) { return x.id === e; })[0], d); };

(function () {
  let d = day('e1', '2026-06-01'); assert.deepStrictEqual(d.status, ['ປົກກະຕິ']); assert.strictEqual(Math.round((d.sIn - d.inMs) / 60000), 49); assert.strictEqual(d.actual, 536); assert.strictEqual(d.normalMin, 480); assert.strictEqual(d.otMin, 90); ok('normal day: early in, 8:56 on site, full 8h pay hours, approved OT counted');
  d = day('e1', '2026-06-02'); assert.deepStrictEqual(d.status, ['ມາຊ້າ']); assert.strictEqual(d.lateMin, 20); assert.strictEqual(d.normalMin, 460); assert.strictEqual(d.deduct, 20); assert.strictEqual(d.otMin, 0); ok('late beyond grace: status, minutes, deduction; pending OT ignored');
  d = day('e1', '2026-06-03'); assert.deepStrictEqual(d.status, ['ວັນຢຸດ']); assert.strictEqual(d.working, false); ok('company holiday with no scans = day off');
  d = day('e2', '2026-06-03'); assert.deepStrictEqual(d.status, ['ເຮັດວຽກວັນຢຸດ']); ok('worked on a holiday');
  d = day('e1', '2026-06-04'); assert.deepStrictEqual(d.status, ['ຂາດງານ']); assert.strictEqual(d.absentMin, 480); assert.strictEqual(d.stOut, 'ບໍ່ລົງເວລາ'); ok('in without out = absent (same rule as the sample report)');
  d = day('e1', '2026-06-05'); assert.deepStrictEqual(d.status, ['ລາ']); assert.strictEqual(d.leaveMinPaid, 480); assert.strictEqual(d.normalMin, 0); ok('approved full-day leave');
  d = day('e1', '2026-06-06'); assert.ok(d.status.indexOf('ລາບໍ່ເຕັມວັນ') >= 0); assert.strictEqual(d.leaveMinPaid, 120); assert.strictEqual(d.normalMin, 360); ok('2-hour partial leave reduces pay hours');
  d = day('e1', '2026-06-07'); assert.deepStrictEqual(d.status, ['ວັນຢຸດ']); ok('Sunday off by default');
  d = day('e1', '2026-06-08'); assert.deepStrictEqual(d.status, ['ຂາດງານ']); d = day('e1', '2026-06-09'); assert.deepStrictEqual(d.status, ['ຂາດງານ'], 'pending leave does not count'); ok('no scans on a working day = absent; pending leave is not applied');
  d = day('e1', '2026-06-10'); assert.deepStrictEqual(d.status, [], 'today / future stays blank'); ok('today is not marked absent yet');
  d = day('e3', '2026-06-01'); assert.ok(d.outMs > d.inMs && d.actual === 487 && d.sched === 480 && d.sOut > d.sIn && d.status[0] === 'ປົກກະຕິ'); assert.strictEqual(day('e3', '2026-06-02').inMs, null, 'the 06:05 out belongs to the previous day'); ok('night shift crossing midnight stays on the day it started');
  const c = R.cycles('2026-11-18'); assert.deepStrictEqual([c.current.from, c.current.to, c.previous.from, c.previous.to], ['2026-10-26', '2026-11-25', '2026-09-26', '2026-10-25']); const c2 = R.cycles('2026-11-27'); assert.deepStrictEqual([c2.current.from, c2.previous.to], ['2026-11-26', '2026-11-25']); ok('26th→25th pay cycles (current and previous)');
  const out = R.build(snap, { from: '2026-06-01', to: '2026-06-07', today: '2026-06-10' }); assert.ok(out.buffer.slice(0, 2).toString() === 'PK' && out.employees === 3 && out.rows === 21 && /\.xlsx$/.test(out.name)); assert.strictEqual(out.summary.e1.lateN, 1); assert.strictEqual(out.summary.e1.absent, 1); assert.ok(Math.abs(out.summary.e1.leave.annual - 1) < 1e-9 && Math.abs(out.summary.e1.leave.personal - 0.25) < 1e-9); ok('workbook builds: 3 people × 7 days, per-person summary counts');
  assert.strictEqual(R.build(snap, { from: '2026-06-01', to: '2026-06-07', branchId: 'nope', today: '2026-06-10' }).employees, 0); assert.strictEqual(R.build(snap, { from: '2026-06-01', to: '2026-06-07', dept: 'ຍາມ', today: '2026-06-10' }).employees, 1); assert.throws(function () { R.build(snap, { from: '2026-01-01', to: '2026-12-31' }); }); ok('branch / department filters; over-long range refused');
  const z = X.zip([{ name: 'a.txt', data: Buffer.from('hello') }]); assert.strictEqual(z.readUInt32LE(0), 0x04034b50); assert.strictEqual(X.crc32(Buffer.from('123456789')), 0xCBF43926); ok('zip + CRC32 are correct');
  console.log('hrreport: ' + n + ' passed');
})();
