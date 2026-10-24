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
      htCfg: { ci: '14:00', co: '12:00', taxes: [{ id: 'x', name: 'VAT', kind: 'pct', pct: 10 }] } };
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
    await test('new branch starts with NO rooms / types / rates / plans but keeps settings (times, taxes)', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ທີ່ພັກ 2') + '&token=' + T)).ok);
      const s = await st('b2');
      ['htTypes', 'htRooms', 'htRates', 'htPlans'].forEach(function (k) { assert.deepStrictEqual(s[k] || [], [], k + ' not reset'); });
      assert.strictEqual(s.htCfg.ci, '14:00'); assert.strictEqual(s.htCfg.taxes.length, 1);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
