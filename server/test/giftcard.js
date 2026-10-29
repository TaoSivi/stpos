/* ບັດຂອງຂວັນ: ຫຼາຍເຄື່ອງຂາຍ/ໃຊ້ບັດພ້ອມກັນ ຕ້ອງບໍ່ເສຍລາຍການ (ledger gcTx ເພີ່ມຢ່າງດຽວ) · ສາຂາໃໝ່ບໍ່ສຳເນົາບັດ/ຍອດຂອງແມ່ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3800 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-gc-')), T = 'gc-master-token-1';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'gc-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'GC HQ', users: [], tables: {}, bills: [], orders: [], catalog: {}, menuImg: {}, modGroups: [], ingredients: {}, giftCards: [{ id: 'gc0', code: 'GC-000', init: 100000, ts: 1, upd: 1 }], gcTx: [{ id: 'tx0', card: 'gc0', amt: 100000, type: 'sell', ts: 1 }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=gc-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    await test('two devices: one sells a card, the other redeems the old one at the same time → both kept', async function () {
      const a = await st('b1'), b = await st('b1');
      a.giftCards.push({ id: 'gc1', code: 'GC-001', init: 500000, ts: 10, upd: 10 }); a.gcTx.push({ id: 'tx1', card: 'gc1', amt: 500000, type: 'sell', ts: 10 });
      b.gcTx.push({ id: 'tx2', card: 'gc0', amt: -30000, type: 'use', ref: '0000000001', ts: 11 });
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      const s = await st('b1');
      assert.deepStrictEqual(s.giftCards.map(function (x) { return x.id; }).sort(), ['gc0', 'gc1']);
      assert.deepStrictEqual(s.gcTx.map(function (x) { return x.id; }).sort(), ['tx0', 'tx1', 'tx2']);
      const bal = function (id) { return s.gcTx.filter(function (x) { return x.card === id; }).reduce(function (n, x) { return n + x.amt; }, 0); };
      assert.strictEqual(bal('gc0'), 70000); assert.strictEqual(bal('gc1'), 500000);
    });
    await test('a branch created from the template starts with NO gift cards / ledger', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + T)).ok);
      const s = await st('b2'); assert.deepStrictEqual(s.giftCards || [], []); assert.deepStrictEqual(s.gcTx || [], []);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
