/* ໃບຍິນຍອມຄົນເຈັບ: ຫຼາຍເຄື່ອງເຮັດໃບຍິນຍອມພ້ອມກັນ ຕ້ອງບໍ່ເສຍໃບໃດ ໃບ · ສາຂາໃໝ່ບໍ່ສຳເນົາໃບຍິນຍອມຂອງແມ່ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3900 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-cs-')), T = 'cs-master-token-1';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'cs-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'CS HQ', users: [], tables: {}, bills: [], orders: [], catalog: {}, menuImg: {}, modGroups: [], ingredients: {}, consents: [{ id: 'cs0', no: 'CS-2610-0001', patient: 'A', tplName: 'T', text: 'x', sig: 'data:image/png;base64,AA', ts: 1, upd: 1 }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=cs-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    await test('two devices each add a signed consent at the same time → both kept (and the old one)', async function () {
      const a = await st('b1'), b = await st('b1');
      a.consents.push({ id: 'cs1', no: 'CS-2610-0002', patient: 'B', tplName: 'T', text: 'y', sig: 'data:image/png;base64,AB', ts: 10, upd: 10 });
      b.consents.push({ id: 'cs2', no: 'CS-2610-0003', patient: 'C', tplName: 'T', text: 'z', sig: 'data:image/png;base64,AC', ts: 11, upd: 11 });
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      const s = await st('b1');
      assert.deepStrictEqual(s.consents.map(function (x) { return x.id; }).sort(), ['cs0', 'cs1', 'cs2']);
    });
    await test('voiding on one device (newer upd) wins over the old copy', async function () {
      const a = await st('b1'); a.consents.find(function (x) { return x.id === 'cs1'; }).voided = true; a.consents.find(function (x) { return x.id === 'cs1'; }).upd = 99;
      assert.strictEqual(await save('b1', a), 'ok');
      const s = await st('b1'); assert.strictEqual(s.consents.find(function (x) { return x.id === 'cs1'; }).voided, true);
    });
    await test('a branch created from the template starts with NO consents', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + T)).ok);
      const s = await st('b2'); assert.deepStrictEqual(s.consents || [], []);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
