/* ຄົນເຈັບຈອງນັດເອງອອນລາຍ (ຄລີນິກ): ປິດເປັນຄ່າເລີ່ມຕົ້ນ · server ກວດເວລາ/ຫ້ອງ/ມື້ປິດ/ຈຳນວນຄຳຂໍ · ບໍ່ເປີດເຜີຍຂໍ້ມູນຄົນເຈັບອື່ນ · ຈຳກັດຕໍ່ IP */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 4000 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-bk-')), T = 'bk-master-token-1';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'bk-admin-key-1', BOOK_RATE_REQ: '40' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
const bk = function (a, o) { return jp('b1', 'book=1&payload=' + encodeURIComponent(JSON.stringify(Object.assign({ a: a }, o || {})))); };
function laoDay(off) { const d = new Date(Date.now() + 7 * 3600000 + off * 86400000); return d.toISOString().slice(0, 10); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const tb = function (n, fl) { return { name: n, floor: fl, status: 'free', items: [], seats: 1 }; };
    const base = { bizType: 'medical', shopName: 'ຄລີນິກທົດສອບ', users: [], bills: [], orders: [], catalog: {}, menuImg: {}, modGroups: [], ingredients: {}, resv: [], rvClosed: [],
      tables: { 'ແຄັດເຊຍ': tb('ແຄັດເຊຍ', 'ແຄັດເຊຍ'), 'ໝໍ A': tb('ໝໍ A', 'ແພດ'), 'ໝໍ B': tb('ໝໍ B', 'ແພດ') },
      apptTypes: [{ id: 't1', name: 'ກວດທົ່ວໄປ', dur: 30 }, { id: 't2', name: 'ຂູດຫີນປູນ', dur: 60 }],
      customers: [{ id: 'm1', name: 'ຄົນເກົ່າ (ລັບ)', phone: '020 1111 2222', hn: 'HN00001' }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=bk-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    const D1 = laoDay(1), D0 = laoDay(0);
    await test('ປິດເປັນຄ່າເລີ່ມຕົ້ນ: info / slots / req ຖືກປະຕິເສດ', async function () {
      assert.strictEqual((await bk('info')).err, 'off'); assert.strictEqual((await bk('slots', { date: D1 })).err, 'off');
      assert.strictEqual((await bk('req', { name: 'ທົດສອບ', phone: '02055556666', date: D1, time: '09:00', type: 't1' })).err, 'off');
      assert.strictEqual((await st('b1')).resv.length, 0);
    });
    let s = await st('b1'); s.bookOn = true; s.bookCfg = { from: '08:00', to: '10:00', step: 30, lead: 1, days: 14, dow: [0, 1, 2, 3, 4, 5, 6] }; assert.strictEqual(await save('b1', s), 'ok');
    await test('info: ຊື່ຄລີນິກ, ປະເພດນັດ, ແພດ (ບໍ່ມີແຄັດເຊຍ), ບໍ່ມີຂໍ້ມູນຄົນເຈັບ', async function () {
      const r = await bk('info'); assert.ok(r.ok); assert.strictEqual(r.shop, 'ຄລີນິກທົດສອບ');
      assert.deepStrictEqual(r.types.map(function (x) { return x.name; }), ['ກວດທົ່ວໄປ', 'ຂູດຫີນປູນ']); assert.deepStrictEqual(r.rooms.sort(), ['ໝໍ A', 'ໝໍ B'].sort());
      const j = JSON.stringify(r); assert.ok(!/ຄົນເກົ່າ|1111|HN0000/.test(j));
    });
    await test('slots ມື້ອື່ນ: 08:00–10:00 ຂັ້ນ 30 ນາທີ, ປະເພດ 60 ນາທີ ຈົບບໍ່ເກີນ 10:00', async function () {
      const a = await bk('slots', { date: D1, type: 't1' }); assert.deepStrictEqual(a.slots.map(function (x) { return x.t; }), ['08:00', '08:30', '09:00', '09:30']);
      const b = await bk('slots', { date: D1, type: 't2' }); assert.deepStrictEqual(b.slots.map(function (x) { return x.t; }), ['08:00', '08:30', '09:00']);
      assert.ok(a.slots[0].rooms.indexOf('ໝໍ A') >= 0 && a.slots[0].rooms.indexOf('ໝໍ B') >= 0);
    });
    await test('ຄຳຂໍນັດ: ເກັບເປັນ request ພ້ອມ ອາການ/ແພ້ຢາ/ປະເພດ ແລະ ຜູກກັບຄົນເຈັບເກົ່າດ້ວຍເບີ', async function () {
      const r = await bk('req', { name: ' ນາງ  ທົດສອບ ', phone: '+856 20 1111 2222', date: D1, time: '09:00', type: 't1', room: 'ໝໍ A', reason: 'ໄຂ້', allergy: 'Penicillin', first: false });
      assert.ok(r.ok && r.status === 'request' && /^OL-/.test(r.no), JSON.stringify(r));
      const x = (await st('b1')).resv[0];
      assert.strictEqual(x.status, 'request'); assert.strictEqual(x.table, 'ໝໍ A'); assert.strictEqual(x.name, 'ນາງ ທົດສອບ'); assert.strictEqual(x.typeName, 'ກວດທົ່ວໄປ'); assert.strictEqual(x.dur, 30);
      assert.strictEqual(x.reason, 'ໄຂ້'); assert.strictEqual(x.allergy, 'Penicillin'); assert.strictEqual(x.first, false); assert.strictEqual(x.memberId, 'm1'); assert.strictEqual(x.online, true); assert.ok(x.hist.length === 1);
    });
    await test('ຄຳຂໍຊ້ຳ (ເບີ+ມື້+ເວລາ ດຽວກັນ) ບໍ່ສ້າງຊ້ຳ', async function () {
      const r = await bk('req', { name: 'ນາງ ທົດສອບ', phone: '02011112222', date: D1, time: '09:00', type: 't1' }); assert.ok(r.ok && r.dup);
      assert.strictEqual((await st('b1')).resv.length, 1);
    });
    await test('ຊ່ອງທີ່ມີຄົນຂໍແລ້ວ ຫາຍຈາກ slots ຂອງຫ້ອງນັ້ນ; ຫ້ອງອື່ນຍັງວ່າງ; ບໍ່ເລືອກຫ້ອງ → ໄດ້ຫ້ອງທີ່ວ່າງ', async function () {
      const a = await bk('slots', { date: D1, type: 't1' }), at9 = a.slots.find(function (x) { return x.t === '09:00'; }); assert.deepStrictEqual(at9.rooms, ['ໝໍ B']);
      const r = await bk('req', { name: 'ທ້າວ ສອງ', phone: '02022223333', date: D1, time: '09:00', type: 't1' }); assert.ok(r.ok && r.room === 'ໝໍ B', JSON.stringify(r));
      const r3 = await bk('req', { name: 'ທ້າວ ສາມ', phone: '02033334444', date: D1, time: '09:00', type: 't1' }); assert.ok(!r3.ok && /ບໍ່ວ່າງ/.test(r3.err), JSON.stringify(r3));
      const bad = await bk('req', { name: 'ທ້າວ ສີ່', phone: '02044445555', date: D1, time: '09:00', type: 't1', room: 'ໝໍ A' }); assert.ok(!bad.ok);
    });
    await test('ປະເພດ 60 ນາທີ ກີດຂວາງ 2 ຊ່ອງຕິດກັນ', async function () {
      const b = await bk('slots', { date: D1, type: 't2' }); const ts = b.slots.map(function (x) { return x.t; });
      assert.ok(ts.indexOf('08:00') >= 0 && ts.indexOf('09:00') < 0 && ts.indexOf('08:30') < 0, ts.join()); /* 08:30–09:30 ຊົນກັບ 09:00 ທັງສອງຫ້ອງ */
    });
    await test('ກວດຂໍ້ມູນ: ຊື່ສັ້ນ, ເບີຜິດ, ເວລານອກຕາຕະລາງ, ມື້ຜ່ານມາ, ເກີນມື້ລ່ວງໜ້າ, ປະເພດຜິດ', async function () {
      const ok1 = { name: 'ທົດສອບ', phone: '02099998888', date: D1, time: '08:00', type: 't1' };
      for (const o of [{ name: 'ກ' }, { phone: '123' }, { time: '08:10' }, { time: '12:00' }, { date: laoDay(-1) }, { date: laoDay(40) }, { type: 'xx' }, { type: '' }, { date: 'abc' }]) {
        const r = await bk('req', Object.assign({}, ok1, o)); assert.ok(!r.ok, JSON.stringify(o) + ' → ' + JSON.stringify(r));
      }
      assert.strictEqual((await st('b1')).resv.length, 2);
    });
    await test('ມື້ປິດຮ້ານ + ມື້ທີ່ບໍ່ເປີດ: ບໍ່ມີ slot ແລະ ຂໍບໍ່ໄດ້', async function () {
      s = await st('b1'); s.rvClosed = [laoDay(2)]; const dow3 = new Date(laoDay(3) + 'T00:00:00Z').getUTCDay(); s.bookCfg.dow = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return d !== dow3; }); assert.strictEqual(await save('b1', s), 'ok');
      assert.deepStrictEqual((await bk('slots', { date: laoDay(2), type: 't1' })).slots, []); assert.deepStrictEqual((await bk('slots', { date: laoDay(3), type: 't1' })).slots, []);
      assert.ok(!(await bk('req', { name: 'ທົດສອບ', phone: '02099998888', date: laoDay(2), time: '08:00', type: 't1' })).ok);
      assert.ok((await bk('slots', { date: laoDay(4), type: 't1' })).slots.length > 0);
    });
    await test('ມື້ນີ້: ຕ້ອງລ່ວງໜ້າຕາມ lead (ບໍ່ມີ slot ທີ່ຜ່ານໄປແລ້ວ)', async function () {
      s = await st('b1'); s.bookCfg.lead = 72; assert.strictEqual(await save('b1', s), 'ok');
      assert.deepStrictEqual((await bk('slots', { date: D0, type: 't1' })).slots, []); assert.deepStrictEqual((await bk('slots', { date: D1, type: 't1' })).slots, []);
      s = await st('b1'); s.bookCfg.lead = 1; assert.strictEqual(await save('b1', s), 'ok');
    });
    await test('ຊ່ອງດັກບອດ (hp) ມີຄ່າ → ຕອບ ok ແຕ່ບໍ່ບັນທຶກ', async function () {
      const n = (await st('b1')).resv.length; const r = await bk('req', { name: 'ບອດ', phone: '02012345678', date: laoDay(5), time: '08:00', type: 't1', hp: 'x' }); assert.ok(r.ok, JSON.stringify(r));
      assert.strictEqual((await st('b1')).resv.length, n);
    });
    await test('ເບີດຽວກັນຂໍຄ້າງໄດ້ສູງສຸດ 3 ຄຳຂໍ', async function () {
      let last; for (let i = 0; i < 4; i++) last = await bk('req', { name: 'ຄົນຂໍຫຼາຍ', phone: '02055550000', date: laoDay(6 + i), time: '08:00', type: 't1' });
      assert.ok(!last.ok && /ຫຼາຍເກີນໄປ/.test(last.err), JSON.stringify(last));
      assert.strictEqual((await st('b1')).resv.filter(function (x) { return x.phone === '02055550000'; }).length, 3);
    });
    await test('ເປີດ bookAuto → ເຂົ້າສະຖານະ booked ເລີຍ', async function () {
      s = await st('b1'); s.bookAuto = true; assert.strictEqual(await save('b1', s), 'ok');
      const r = await bk('req', { name: 'ອັດຕະໂນມັດ', phone: '02077776666', date: laoDay(8), time: '08:30', type: 't1' }); assert.ok(r.ok && r.status === 'booked', JSON.stringify(r));
      assert.strictEqual((await st('b1')).resv.find(function (x) { return x.phone === '02077776666'; }).status, 'booked');
    });
    await test('ອຸປະກອນພະນັກງານທີ່ຍັງບໍ່ເຫັນຄຳຂໍ ບັນທຶກທັບ ບໍ່ເຮັດໃຫ້ຄຳຂໍຫາຍ', async function () {
      const stale = await st('b1'); stale.resv = stale.resv.filter(function (x) { return x.status !== 'request'; });
      assert.strictEqual(await save('b1', stale), 'ok');
      assert.ok((await st('b1')).resv.some(function (x) { return x.status === 'request'; }));
    });
    await test('ຈຳກັດຕໍ່ IP: ຄຳຂໍນັດ (a=req) ເກີນກຳນົດ/ຊົ່ວໂມງ ຖືກຕັດ (ທົດສອບຕັ້ງ 40; ຄ່າຈິງ 8)', async function () {
      let blocked = false; for (let i = 0; i < 40 && !blocked; i++) { const r = await bk('req', { name: 'ສະແປມ', phone: '0209999' + (1000 + i), date: laoDay(9), time: '08:00', type: 't1' }); if (!r.ok && /ລອງຫຼາຍເກີນໄປ — ກະລຸນາລໍ/.test(r.err)) blocked = true; }
      assert.ok(blocked);
    });
    await test('ສາຂາໃໝ່ເລີ່ມດ້ວຍ bookOn ປິດ', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + T)).ok);
      const r = await jp('b2', 'book=1&payload=' + encodeURIComponent(JSON.stringify({ a: 'info' }))); assert.strictEqual(r.err, 'off');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
