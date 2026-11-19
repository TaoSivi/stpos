/* ທົດສອບໂມດູນ SOP ເຊັກລິດ: ແມ່ແບບຈາກ PDF, ມອບໝາຍ (ຕາມເຊັກລິດ/ຕາມຄົນ) + ເປີດແອັບໃຫ້ອັດຕະໂນມັດ, ເຮັດ/ສົ່ງ/ຮັບຮອງ, ສິດ, ແກ້ລາຍການ */
'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-s-')), accounts = require('../accounts').create(DATA);
let NOW = Date.parse('2026-11-20T09:00:00+07:00');
let VEH = [];
const sop = require('../mod-sop').create(DATA, accounts, { now: function () { return NOW; }, vehicles: function () { return VEH; } });
let n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
const mk = function (o) { const r = accounts.save(o, null); assert.ok(r.ok, JSON.stringify(r)); return r.phone; };
const sa = mk({ phone: '02011110001', name: 'ເຈົ້າຂອງ', pin: '1111', level: 'superadmin' });
const ad = mk({ phone: '02011110002', name: 'ແອດມິນ', pin: '2222', level: 'admin' });
const d1 = mk({ phone: '02011110003', name: 'ຄົນຂັບ ກ', pin: '3333', level: 'user', fuel: 'driver' });
const d2 = mk({ phone: '02011110004', name: 'ຄົນຂັບ ຂ', pin: '4444', level: 'user', fuel: 'driver' });
const U = function (ph) { return accounts.get ? accounts.get(ph) : null; };
const user = function (ph) { const u = accounts.users()[ph]; return { id: ph, name: u.name, level: u.level, apps: u.apps || [] }; };
const call = function (ph, a, o) { return sop.handle(a, o || {}, user(ph)); };
VEH = [{ id: 'v1', name: 'ລົດຈິກ 1', site: 's1', driver: d1 }, { id: 'v2', name: 'ລົດດ້າມ 2', site: 's1', driver: d1 }, { id: 'v3', name: 'ລົດເກດ 3', site: 's1', driver: d2 }];

(function () {
  /* ແມ່ແບບ */
  const t = call(sa, 'tpls').data; assert.deepStrictEqual(t.tpls.map(function (x) { return x.id; }), ['cl01', 'cl02', 'cl03', 'cl03w', 'cl03m', 'cl04', 'f01', 'f02', 'f03', 'f03w', 'f03c', 'f04', 'f04h', 'f05']);
  assert.ok(t.tpls.every(function (x) { return x.items.length && x.items.every(function (i) { return i.id && i.text; }); }) && t.tpls.filter(function (x) { return x.sop === 'SOP-FLD-03'; }).length === 3);
  assert.ok(t.tpls.find(function (x) { return x.id === 'f04'; }).items.length === 17 && t.tpls.find(function (x) { return x.id === 'cl01'; }).items.length === 17); assert.deepStrictEqual(t.tpls.map(function (x) { return x.freq + ':' + x.per; }), ['event:', 'event:', 'daily:', 'weekly:', 'monthly:', 'event:', 'event:', 'daily:all', 'daily:', 'weekly:', 'event:', 'daily:own', 'daily:all', 'monthly:all']); ok('14 checklists from the 3 SOP files: daily / weekly / monthly / per-event are separate, vehicle ones flagged');
  assert.strictEqual(call(d1, 'tpls').error, 'auth'); assert.strictEqual(call(d1, 'assignSet', { tpl: 'f04', users: [d1] }).error, 'auth'); assert.strictEqual(call(d1, 'board').error, 'auth'); assert.strictEqual(call(d1, 'tplSave', { id: 'f04', items: [{ text: 'x' }] }).error, 'auth'); ok('ordinary users cannot assign, edit or see the board');
  assert.deepStrictEqual(call(d1, 'me').data.mine, []); ok('nothing assigned = nothing shown');

  /* ມອບໝາຍຕາມເຊັກລິດ → ຄົນຂັບໄດ້ແອັບ sop ອັດຕະໂນມັດ */
  assert.ok(accounts.users()[d1].apps.indexOf('sop') < 0);
  assert.ok(call(ad, 'assignSet', { tpl: 'f04', users: [d1, d2, '09999999999'] }).ok); assert.deepStrictEqual(call(sa, 'tpls').data.assign.map(function (a) { return a.user; }).sort(), [d1, d2]);
  assert.ok(accounts.users()[d1].apps.indexOf('sop') >= 0 && accounts.users()[d2].apps.indexOf('sop') >= 0); ok('assign by checklist (unknown phone ignored) and the SOP app is opened for the people picked');
  assert.ok(call(sa, 'assignSet', { user: d1, tpls: ['f04', 'f05', 'f02', 'nope'] }).ok); const mine = call(d1, 'me').data.mine; assert.deepStrictEqual(mine.map(function (x) { return x.tpl.id; }).sort(), ['f02', 'f04', 'f05']);
  assert.deepStrictEqual(call(d2, 'me').data.mine.map(function (x) { return x.tpl.id; }), ['f04']); ok('assign by person replaces that person only, bad ids dropped');
  assert.strictEqual(call(sa, 'assignSet', { user: '08888888888', tpls: ['f04'] }).error, 'people'); assert.strictEqual(call(sa, 'assignSet', { tpl: 'zzz', users: [] }).error, 'tpl');

  /* ເຮັດເຊັກລິດ ປະຈຳວັນ */
  const keyDay = '2026-11-20', f04 = mine.find(function (x) { return x.tpl.id === 'f04'; }); assert.deepStrictEqual(f04.veh.map(function (v) { return v.key; }), [keyDay + '@v1', keyDay + '@v2'], 'a driver sees one checklist per vehicle he drives');
  assert.deepStrictEqual(call(d2, 'me').data.mine[0].veh.map(function (v) { return v.name; }), ['ລົດເກດ 3'], 'another driver sees only his own vehicle');
  assert.strictEqual(call(d1, 'open', { tpl: 'f04' }).error, 'veh', 'vehicle checklist needs a vehicle'); assert.strictEqual(call(d1, 'open', { tpl: 'f04', veh: 'v3' }).error, 'veh', 'not my vehicle');
  const r = call(d1, 'open', { tpl: 'f04', veh: 'v1' }).data; assert.ok(r.id.indexOf('2026-11~f04~' + d1 + '~' + keyDay + '@v1') === 0 && r.items.length === 17 && r.status === 'open' && r.veh.id === 'v1' && r.label === 'ລົດຈິກ 1');
  assert.notStrictEqual(call(d1, 'open', { tpl: 'f04', veh: 'v2' }).data.id, r.id, 'each vehicle has its own run');
  assert.strictEqual(call(d2, 'open', { id: r.id }).error, 'auth', 'another user cannot open my run'); assert.strictEqual(call(d2, 'open', { tpl: 'f02' }).error, 'auth', 'not assigned = cannot open'); assert.strictEqual(call(d1, 'open', { tpl: 'cl01' }).error, 'run', 'event checklists are not opened by template (start a new one)');
  assert.strictEqual(call(d1, 'open', { tpl: 'f04', veh: 'v1' }).data.id, r.id, 'same day + same vehicle = same run'); ok('daily run is created once per person per day, only the assigned person can open it');
  assert.strictEqual(call(d1, 'submit', { id: r.id }).error, 'open', 'cannot submit with unanswered items');
  assert.ok(r.items.every(function (i) { return i.sec; }) && new Set(r.items.map(function (i) { return i.sec; })).size === 3, 'F-04 is split into 3 sections');
  const mm = call(d1, 'markMany', { id: r.id, items: r.items.slice(0, 7).map(function (i) { return i.id; }) }); assert.ok(mm.ok && r.items.slice(0, 7).every(function (i) { return mm.data.a[i.id].v === 1; }));
  assert.ok(call(d1, 'mark', { id: r.id, item: r.items[0].id, v: 0, note: 'x' }).ok); const mm2 = call(d1, 'markMany', { id: r.id, items: r.items.slice(0, 7).map(function (i) { return i.id; }) }); assert.strictEqual(mm2.data.a[r.items[0].id].v, 0, 'pass-all does not overwrite answered items');
  assert.strictEqual(call(d1, 'markMany', { id: r.id, items: ['bogus'] }).error, 'item'); assert.strictEqual(call(d2, 'markMany', { id: r.id, items: [r.items[0].id] }).error, 'auth');
  call(d1, 'mark', { id: r.id, item: r.items[0].id, v: 1 }); ok('pass-all marks only unanswered items, validates ids and ownership');
  r.items.slice(0, 16).forEach(function (i) { assert.ok(call(d1, 'mark', { id: r.id, item: i.id, v: 1 }).ok); });
  assert.strictEqual(call(d1, 'mark', { id: r.id, item: 'bogus', v: 1 }).error, 'item'); assert.strictEqual(call(d2, 'mark', { id: r.id, item: r.items[0].id, v: 1 }).error, 'auth');
  assert.ok(call(d1, 'mark', { id: r.id, item: r.items[16].id, v: 0 }).ok); assert.strictEqual(call(d1, 'submit', { id: r.id }).error, 'note', 'a failed item needs a reason');
  assert.ok(call(d1, 'mark', { id: r.id, item: r.items[16].id, v: 0, note: 'ເບກຜິດປົກກະຕິ' }).ok); const done = call(d1, 'submit', { id: r.id }); assert.ok(done.ok && done.data.status === 'done' && done.data.doneAt === NOW);
  assert.strictEqual(call(d1, 'mark', { id: r.id, item: r.items[0].id, v: 0 }).error, 'locked'); ok('submit needs every item answered and a reason on failures; locked afterwards');
  assert.strictEqual(call(d1, 'approve', { id: r.id }).error, 'auth'); assert.ok(call(ad, 'approve', { id: r.id }).data.appr.by === ad); assert.ok(call(ad, 'approve', { id: r.id, yes: false }).data.appr === null); call(ad, 'approve', { id: r.id });
  assert.ok(call(ad, 'reopen', { id: r.id }).data.status === 'open' && call(ad, 'reopen', { id: r.id }).data.appr === null); ok('admin approves / un-approves / reopens; staff cannot');
  r.items.forEach(function (i) { call(d1, 'mark', { id: r.id, item: i.id, v: 1 }); }); call(d1, 'submit', { id: r.id });

  /* ກະດານ */
  const b = call(ad, 'board').data, f4 = b.rows.filter(function (x) { return x.tpl.id === 'f04'; });
  assert.deepStrictEqual(f4.map(function (x) { return [x.name, x.veh, x.run ? x.run.status : null]; }).sort(function (p, q) { return (p[0] + p[1]).localeCompare(q[0] + q[1]); }), [['ຄົນຂັບ ກ', 'ລົດຈິກ 1', 'done'], ['ຄົນຂັບ ກ', 'ລົດດ້າມ 2', 'open'], ['ຄົນຂັບ ຂ', 'ລົດເກດ 3', null]]);
  assert.ok(b.day === keyDay); ok('board lists every driver x vehicle: done / working / not started');
  /* ມື້ໃໝ່ = ໃບໃໝ່ */
  NOW += 86400e3; assert.notStrictEqual(call(d1, 'open', { tpl: 'f04', veh: 'v1' }).data.id, r.id); assert.strictEqual(call(d1, 'me').data.mine.find(function (x) { return x.tpl.id === 'f04'; }).veh[1].run, null); ok('a new day starts a fresh checklist');
  /* ລາຍເດືອນ */
  assert.ok(call(d1, 'open', { tpl: 'f05', veh: 'v1' }).data.key === '2026-11@v1'); assert.strictEqual(call(d1, 'open', { tpl: 'f05', veh: 'v3' }).data.label, 'ລົດເກດ 3', '"all" checklists cover every vehicle'); NOW += 12 * 86400e3; assert.strictEqual(call(d1, 'open', { tpl: 'f05', veh: 'v1' }).data.key, '2026-12@v1'); ok('monthly checklist keyed by month, one per vehicle');
  /* ປະຈຳອາທິດ (ISO, ຈັນ–ອາທິດ): ອາທິດໜຶ່ງ = ໃບໜຶ່ງ; ອາທິດທີ່ຂ້າມປີເກັບຕາມເດືອນຂອງວັນຈັນ */
  assert.ok(call(sa, 'assignSet', { user: d1, tpls: ['f04', 'f05', 'f02', 'cl03w', 'f03w'] }).ok); const keepNow = NOW;
  NOW = Date.parse('2026-11-20T09:00:00+07:00'); const w1 = call(d1, 'open', { tpl: 'cl03w' }).data; assert.strictEqual(w1.key, '2026-W47'); NOW = Date.parse('2026-11-22T20:00:00+07:00'); assert.strictEqual(call(d1, 'open', { tpl: 'cl03w' }).data.id, w1.id, 'Sunday is still the same week');
  NOW = Date.parse('2026-11-23T08:00:00+07:00'); assert.strictEqual(call(d1, 'open', { tpl: 'cl03w' }).data.key, '2026-W48', 'Monday starts a new week');
  NOW = Date.parse('2026-01-01T09:00:00+07:00'); const wy = call(d1, 'open', { tpl: 'f03w' }).data; assert.ok(wy.key === '2026-W01' && wy.id.indexOf('2025-12~') === 0, 'week 1 of 2026 starts on 29 Dec 2025 → stored with December'); assert.strictEqual(call(d1, 'open', { id: wy.id }).data.id, wy.id);
  NOW = keepNow; assert.deepStrictEqual(call(d1, 'me').data.mine.filter(function (x) { return x.tpl.freq === 'weekly'; }).map(function (x) { return x.tpl.id + ':' + x.key.slice(0, 5); }).sort(), ['cl03w:2026-', 'f03w:2026-']); ok('weekly checklists: one per ISO week, Monday starts a new one');
  /* ຄົນທີ່ຍັງບໍ່ໄດ້ຮັບມອບລົດ */
  const d3 = mk({ phone: '02011110005', name: 'ຄົນຂັບ ຄ', pin: '5555', level: 'user', fuel: 'driver' }); assert.ok(call(sa, 'assignSet', { user: d3, tpls: ['f04'] }).ok); assert.deepStrictEqual(call(d3, 'me').data.mine[0].veh, [], 'no vehicle yet = nothing to check'); const nb = call(ad, 'board').data.rows.filter(function (x) { return x.user === d3; }); assert.ok(nb.length === 1 && nb[0].noveh === true); ok('assigned driver without a vehicle shows an explicit "no vehicle" row'); call(sa, 'assignSet', { user: d3, tpls: [] });
  VEH = VEH.concat({ id: 'v4', name: 'ລົດໃໝ່ 4', site: 's1', driver: d3 }); assert.ok(call(sa, 'assignSet', { user: d3, tpls: ['f04'] }).ok); assert.deepStrictEqual(call(d3, 'me').data.mine[0].veh.map(function (v) { return v.id; }), ['v4'], 'a new vehicle assignment in the fuel app shows up with no re-assignment'); ok('vehicle changes in the fuel app flow through automatically'); call(sa, 'assignSet', { user: d3, tpls: [] }); VEH = VEH.slice(0, 3);

  /* ເປັນຄັ້ງ (event) */
  assert.ok(call(sa, 'assignSet', { tpl: 'f01', users: [d2] }).ok); assert.strictEqual(call(d2, 'new', { tpl: 'f01', label: '' }).error, 'label'); assert.strictEqual(call(d2, 'new', { tpl: 'f04', label: 'x' }).error, 'tpl');
  const ev1 = call(d2, 'new', { tpl: 'f01', label: 'ໂຄງການ ກ' }).data; NOW += 1000; const ev2 = call(d2, 'new', { tpl: 'f01', label: 'ໂຄງການ ຂ' }).data; assert.notStrictEqual(ev1.id, ev2.id);
  const lst = call(d2, 'me').data.mine.find(function (x) { return x.tpl.id === 'f01'; }); assert.deepStrictEqual(lst.runs.map(function (q) { return q.label; }), ['ໂຄງການ ຂ', 'ໂຄງການ ກ']); assert.strictEqual(call(d1, 'new', { tpl: 'f01', label: 'x' }).error, 'auth'); ok('event checklists are started per project / delivery, several can be open');

  /* ແກ້ລາຍການ ບໍ່ກະທົບໃບທີ່ມີຢູ່ */
  const before = call(d2, 'open', { id: ev1.id }).data.items.length;
  const tpl = call(sa, 'tpls').data.tpls.find(function (x) { return x.id === 'f01'; }), items = tpl.items.slice(0, 3).map(function (i) { return { id: i.id, code: i.code, text: i.text + ' (ແກ້)' }; }).concat({ text: 'ຂໍ້ໃໝ່' });
  const sv = call(ad, 'tplSave', { id: 'f01', title: 'ຮັບນ້ຳມັນ (ແກ້)', items: items }); assert.ok(sv.ok && sv.data.items.length === 4 && sv.data.edited && sv.data.title === 'ຮັບນ້ຳມັນ (ແກ້)' && /^x/.test(sv.data.items[3].id));
  assert.strictEqual(call(d2, 'open', { id: ev1.id }).data.items.length, before, 'existing runs keep their own copy'); assert.strictEqual(call(d2, 'new', { tpl: 'f01', label: 'ໃໝ່' }).data.items.length, 4, 'new runs use the edited list');
  assert.strictEqual(call(ad, 'tplSave', { id: 'f01', items: [{ text: '  ' }] }).error, 'noitems'); assert.strictEqual(call(ad, 'tplSave', { id: 'nope', items: [{ text: 'x' }] }).error, 'tpl');
  assert.strictEqual(call(ad, 'tplSave', { id: 'f01', items: [{ id: 'aa', text: 'a' }, { id: 'aa', text: 'b' }] }).error, 'item', 'duplicate ids refused');
  assert.strictEqual(call(ad, 'tplReset', { id: 'f01' }).data.items.length, 8); ok('admin edits the list; old runs are unaffected; reset restores the original');
  assert.strictEqual(call(d2, 'hdrSet', { company: 'x' }).error, 'auth', 'only admins set the report header');
  const hs = call(ad, 'hdrSet', { company: 'Co <b>', hdr: 'a\nb', nat: false, logo: 'data:image/png;base64,AAAA' }).data; assert.deepStrictEqual([hs.company, hs.hdr, hs.nat, hs.logo.length > 0], ['Co b', 'a\nb', false, true]);
  assert.strictEqual(call(ad, 'hdrSet', { company: 'y', logo: 'javascript:1' }).data.logo, '', 'bad logo dropped'); assert.strictEqual(call(d2, 'hdr').data.company, 'y', 'everyone reads the header'); ok('report header: admin-only write, sanitised, readable by all');
  console.log('sop: ' + n + ' passed');
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { }
})();
