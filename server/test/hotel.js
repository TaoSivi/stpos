/* ST Hotel ໄລຍະ 1: ປະເພດຫ້ອງ/ຫ້ອງ/ກົດລາຄາ/ແຜນ merge ຈາກຫຼາຍເຄື່ອງ · ສາຂາໃໝ່ເລີ່ມເປົ່າ (ຫ້ອງແຕ່ລະທີ່ພັກເປັນຂອງຕົນ) · ບໍ່ເສຍຕັ້ງຄ່າ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert');
const D = require('../delta');
const PORT = 3800 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-hotel-')), T = 'hotel-master-token-1';
const H = function (o) { return crypto.createHash('sha256').update(D.canon(o)).digest('hex').slice(0, 32); };
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'hotel-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }

async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'Hotel HQ', bizType: 'hotel', users: [], tables: {}, bills: [], orders: [], catalog: {}, menuImg: {}, modGroups: [], ingredients: {},
      htTypes: [{ id: 'T1', name: 'ມາດຕະຖານ', cap: 2, baseRate: 500000, upd: 1000 }], htRooms: [{ id: 'R0', no: '100', type: 'T1', upd: 1000 }], htRates: [], htPlans: [],
      htCfg: { ci: '14:00', co: '12:00', bizDate: '2026-11-10', lastAudit: { date: '2026-11-09' }, taxes: [{ id: 'x', name: 'VAT', kind: 'pct', pct: 10 }] } };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=hotel-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    await test('two devices add rooms / edit rates at the same time: all kept, newer row wins', async function () {
      const a = await st('b1'), b = await st('b1');
      a.htRooms = a.htRooms.concat([{ id: 'R1', no: '101', type: 'T1', upd: 2000 }]);
      b.htRooms = b.htRooms.concat([{ id: 'R2', no: '102', type: 'T1', upd: 2100 }]);
      b.htTypes = [{ id: 'T1', name: 'ມາດຕະຖານ', cap: 2, baseRate: 520000, upd: 3000 }];
      b.htRates = [{ id: 'RT1', name: 'ທ້າຍອາທິດ', type: '*', days: [5, 6], price: 650000, upd: 2200 }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      const s = await st('b1');
      assert.deepStrictEqual(s.htRooms.map(function (r) { return r.id; }).sort(), ['R0', 'R1', 'R2']);
      assert.strictEqual(s.htTypes.length, 1); assert.strictEqual(s.htTypes[0].baseRate, 520000);
      assert.strictEqual(s.htRates.length, 1);
    });
    await test('stale device with an OLDER type row cannot overwrite the newer price', async function () {
      const s0 = await st('b1'); const stale = JSON.parse(JSON.stringify(s0));
      stale.htTypes = [{ id: 'T1', name: 'ມາດຕະຖານ', cap: 2, baseRate: 400000, upd: 500 }];
      assert.strictEqual(await save('b1', stale), 'ok');
      const s = await st('b1'); assert.strictEqual(s.htTypes[0].baseRate, 520000);
    });
    await test('ST Hotel P2: two devices book the SAME room at the same time: both bookings kept (client flags the overlap), guests/promos merge', async function () {
      const a = await st('b1'), b = await st('b1');
      const ln = function (id) { return [{ id: 'l' + id, room: 'R1', type: 'T1', from: '2026-11-10', to: '2026-11-12', adults: 2, kids: 0 }]; };
      a.htBookings = (a.htBookings || []).concat([{ id: 'BKA', no: 'BK-2611-0001', status: 'conf', guest: { name: 'A' }, lines: ln('a'), upd: 5000 }]);
      b.htBookings = (b.htBookings || []).concat([{ id: 'BKB', no: 'BK-2611-0001', status: 'tent', guest: { name: 'B' }, lines: ln('b'), upd: 5100 }]);
      a.htGuests = [{ id: 'G1', name: 'A', phone: '020 1', upd: 5000 }]; b.htGuests = [{ id: 'G2', name: 'B', phone: '020 2', upd: 5100 }];
      b.htPromos = [{ id: 'P1', code: 'SAVE10', kind: 'pct', val: 10, upd: 5100 }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      const s = await st('b1');
      assert.deepStrictEqual(s.htBookings.map(function (x) { return x.id; }).sort(), ['BKA', 'BKB']);
      assert.strictEqual(s.htGuests.length, 2); assert.strictEqual(s.htPromos.length, 1);
    });
    await test('ST Hotel P2: a stale OLDER copy cannot revive a cancelled booking; cancel on one device wins over older edit', async function () {
      const a = await st('b1'); const bk = a.htBookings.find(function (x) { return x.id === 'BKB'; });
      bk.status = 'cancel'; bk.upd = 9000; assert.strictEqual(await save('b1', a), 'ok');
      const stale = JSON.parse(JSON.stringify(a)); stale.htBookings.find(function (x) { return x.id === 'BKB'; }).status = 'conf'; stale.htBookings.find(function (x) { return x.id === 'BKB'; }).upd = 5200;
      assert.strictEqual(await save('b1', stale), 'ok');
      const s = await st('b1'); assert.strictEqual(s.htBookings.find(function (x) { return x.id === 'BKB'; }).status, 'cancel');
    });
    await test('ST Hotel P3: two devices add charges / payments to the SAME folio at once → all kept; night-audit rows (fixed ids) do not duplicate; newer void wins', async function () {
      const a = await st('b1'), b = await st('b1');
      const aud = function () { return { id: 'hc_BKA_l_2026-11-10_room', bk: 'BKA', date: '2026-11-10', dept: 'room', desc: 'room', qty: 1, amt: 500000, payer: 'A', void: false, upd: 6000 }; };
      a.htChg = (a.htChg || []).concat([aud(), { id: 'hx1', bk: 'BKA', dept: 'fnb', desc: 'food', qty: 1, amt: 45000, payer: 'A', void: false, upd: 6001 }]);
      b.htChg = (b.htChg || []).concat([aud(), { id: 'hx2', bk: 'BKA', dept: 'svc', desc: 'laundry', qty: 1, amt: 30000, payer: 'B', void: false, upd: 6002 }]);
      a.htPay = [{ id: 'hy1', bk: 'BKA', amt: 100000, method: 'cash', payer: 'A', void: false, upd: 6003 }]; b.htPay = [{ id: 'hy2', bk: 'BKA', amt: 50000, method: 'card', payer: 'A', void: false, upd: 6004 }];
      a.htAcc = [{ id: 'AC1', name: 'ACME', terms: 30, upd: 6005 }]; b.htImg = [{ id: 'IM1', guest: 'G1', img: 'data:image/jpeg;base64,AAAA', void: false, upd: 6006 }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      let s = await st('b1');
      assert.deepStrictEqual(s.htChg.map(function (x) { return x.id; }).sort(), ['hc_BKA_l_2026-11-10_room', 'hx1', 'hx2']);
      assert.deepStrictEqual(s.htPay.map(function (x) { return x.id; }).sort(), ['hy1', 'hy2']);
      assert.strictEqual(s.htAcc.length, 1); assert.strictEqual(s.htImg.length, 1);
      const v = await st('b1'); const r = v.htChg.find(function (x) { return x.id === 'hx1'; }); r.void = true; r.upd = 9000; assert.strictEqual(await save('b1', v), 'ok');
      const stale = JSON.parse(JSON.stringify(s)); stale.htChg.find(function (x) { return x.id === 'hx1'; }).amt = 1; assert.strictEqual(await save('b1', stale), 'ok');
      s = await st('b1'); const f = s.htChg.find(function (x) { return x.id === 'hx1'; }); assert.strictEqual(f.void, true); assert.strictEqual(f.amt, 45000);
    });
    await test('ST Hotel P4: housekeeping tasks (fixed ids), maintenance, lost&found merge across devices; newer done/void wins over stale copy', async function () {
      const a = await st('b1'), b = await st('b1');
      const tk = function (u) { return { id: 'hk_R1_2026-11-12_clean', room: 'R1', date: '2026-11-12', kind: 'clean', status: 'todo', void: false, upd: u }; };
      a.htTask = (a.htTask || []).concat([tk(7000)]); b.htTask = (b.htTask || []).concat([tk(7000), { id: 'hk_R2_2026-11-12_clean', room: 'R2', date: '2026-11-12', kind: 'clean', status: 'todo', void: false, upd: 7001 }]);
      a.htMt = [{ id: 'M1', room: 'R1', title: 'ac', status: 'open', upd: 7002 }]; b.htLf = [{ id: 'L1', item: 'phone', status: 'kept', upd: 7003 }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      let s = await st('b1');
      assert.deepStrictEqual(s.htTask.map(function (x) { return x.id; }).sort(), ['hk_R1_2026-11-12_clean', 'hk_R2_2026-11-12_clean']);
      assert.strictEqual(s.htMt.length, 1); assert.strictEqual(s.htLf.length, 1);
      const v = await st('b1'); const t = v.htTask.find(function (x) { return x.id === 'hk_R1_2026-11-12_clean'; }); t.status = 'ok'; t.upd = 9100; assert.strictEqual(await save('b1', v), 'ok');
      const stale = JSON.parse(JSON.stringify(s)); stale.htTask.find(function (x) { return x.id === 'hk_R1_2026-11-12_clean'; }).status = 'doing'; assert.strictEqual(await save('b1', stale), 'ok');
      s = await st('b1'); assert.strictEqual(s.htTask.find(function (x) { return x.id === 'hk_R1_2026-11-12_clean'; }).status, 'ok');
    });
    await test('ST Hotel P5: service catalog + orders merge across devices; fixed-id folio rows from POS/service do not duplicate; newer void wins', async function () {
      const a = await st('b1'), b = await st('b1');
      const row = function () { return { id: 'hx_pos_0000000001', bk: 'BKA', dept: 'fnb', desc: 'POS', qty: 1, amt: 50000, payer: 'A', void: false, upd: 8000 }; };
      a.htChg = (a.htChg || []).concat([row()]); b.htChg = (b.htChg || []).concat([row(), { id: 'hx_so_O1', bk: 'BKA', dept: 'svc', desc: 'laundry', qty: 2, amt: 15000, payer: 'A', void: false, upd: 8001 }]);
      a.htSvc = [{ id: 'SV1', cat: 'spa', name: 'massage', price: 180000, cap: 2, mins: 60, upd: 8002 }]; b.htSvcOrd = [{ id: 'O1', item: 'SV1', bk: 'BKA', qty: 2, status: 'req', upd: 8003 }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      let s = await st('b1');
      assert.strictEqual(s.htChg.filter(function (x) { return x.id === 'hx_pos_0000000001'; }).length, 1);
      assert.strictEqual(s.htSvc.length, 1); assert.strictEqual(s.htSvcOrd.length, 1);
      const v = await st('b1'); const o = v.htSvcOrd[0]; o.status = 'void'; o.upd = 9500; assert.strictEqual(await save('b1', v), 'ok');
      const stale = JSON.parse(JSON.stringify(s)); stale.htSvcOrd[0].status = 'done'; assert.strictEqual(await save('b1', stale), 'ok');
      s = await st('b1'); assert.strictEqual(s.htSvcOrd[0].status, 'void');
    });
    await test('new branch starts with NO rooms / types / rates / plans / bookings / guests / promos but keeps settings (times, taxes)', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ທີ່ພັກ 2') + '&token=' + T)).ok);
      const s = await st('b2');
      ['htTypes', 'htRooms', 'htRates', 'htPlans', 'htBookings', 'htGuests', 'htPromos', 'htChg', 'htPay', 'htAcc', 'htImg', 'htTask', 'htMt', 'htLf', 'htSvc', 'htSvcOrd'].forEach(function (k) { assert.deepStrictEqual(s[k] || [], [], k + ' not reset'); });
      assert.strictEqual(s.htCfg.ci, '14:00'); assert.strictEqual(s.htCfg.bizDate, undefined); assert.strictEqual(s.htCfg.lastAudit, undefined); assert.strictEqual(s.htCfg.taxes.length, 1);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
