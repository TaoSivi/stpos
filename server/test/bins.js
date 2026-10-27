/* ຊັ້ນວາງ / ຈຳນວນຕໍ່ຊັ້ນ: ເຄື່ອງຂອງບ່ອນເກັບອື່ນ (ຂໍ້ມູນເກົ່າ) ບໍ່ຕ້ອງທັບຊັ້ນຂອງສາງໃຫຍ່ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert');
const D = require('../delta');
const PORT = 3800 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-bins-')), T = 'bins-master-token-1';
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
    const base = { shopName: 'Bins HQ', users: [], tables: {}, bills: [], orders: [], catalog: {}, menuImg: {}, modGroups: [], _srcLoc: 'wh',
      locations: [{ id: 'wh', name: 'ສາງໃຫຍ່', type: 'warehouse' }, { id: 'kt', name: 'ຄົວ', type: 'kitchen' }],
      ingredients: { ZW: { code: 'ZW', name: 'ນ້ຳ', unit: 'box', locs: { wh: 100, kt: 10 }, bins: { wh: { 'A-02': 60, 'B-05': 40 } }, rack: { wh: 'A-02', kt: 'T-1' } } } };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=hotel-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    await test('kitchen device with a STALE copy (no bins/rack of the warehouse) cannot erase the warehouse shelves', async function () {
      const s0 = await st('b1'); const stale = JSON.parse(JSON.stringify(s0));
      stale._srcLoc = 'kt'; delete stale.ingredients.ZW.bins; stale.ingredients.ZW.rack = { kt: 'T-2' }; stale.ingredients.ZW.locs.kt = 8;
      assert.strictEqual(await save('b1', stale), 'ok');
      const z = (await st('b1')).ingredients.ZW;
      assert.deepStrictEqual(z.bins, { wh: { 'A-02': 60, 'B-05': 40 } }, 'warehouse bins kept');
      assert.strictEqual(z.rack.wh, 'A-02', 'warehouse rack kept'); assert.strictEqual(z.rack.kt, 'T-2', "kitchen's own rack updated");
      assert.strictEqual(z.locs.wh, 100); assert.strictEqual(z.locs.kt, 8);
    });
    await test('the warehouse device itself (source) can change its shelves and the new value wins', async function () {
      const s0 = await st('b1'); s0._srcLoc = 'wh';
      s0.ingredients.ZW.bins = { wh: { 'A-02': 50, 'C-09': 50 } }; s0.ingredients.ZW.rack = { wh: 'C-09', kt: 'T-2' };
      assert.strictEqual(await save('b1', s0), 'ok');
      const z = (await st('b1')).ingredients.ZW;
      assert.deepStrictEqual(z.bins, { wh: { 'A-02': 50, 'C-09': 50 } }); assert.strictEqual(z.rack.wh, 'C-09'); assert.strictEqual(z.rack.kt, 'T-2');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
