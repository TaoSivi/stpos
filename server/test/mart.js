/* ST Mart: ສົ່ງສິນຄ້າ (ມີ wp / ຊັ່ງ / ແພັກ / ຊຸດ / ບາໂຄດ) ໄປສາຂາໃໝ່ ບໍ່ເສຍຂໍ້ມູນ · ວັດຖຸດິບໃໝ່ບໍ່ເອົາລັອດ/ຜູ້ສະໜອງຂອງສາຂາແມ່ · ໜີ້ຜູ້ສະໜອງ/ຄືນສິນຄ້າ ລວມຈາກຫຼາຍເຄື່ອງ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert');
const D = require('../delta');
const PORT = 3700 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-mart-')), T = 'mart-master-token-1';
const H = function (o) { return crypto.createHash('sha256').update(D.canon(o)).digest('hex').slice(0, 32); };
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'mart-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }

async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const M = [
      { c: 'W1', n: 'ນ້ຳດື່ມ', p: 4000, k: 'food', bom: [['W1', 1]], man: 1, wp: 3500 },
      { c: 'W1-X12', n: 'ນ້ຳດື່ມ (ແພັກ 12)', p: 45000, k: 'food', bom: [['W1', 12]], u: { of: 'W1', q: 12, n: 'ແພັກ' }, bc: '8850000000099', man: 1 },
      { c: 'K1', n: 'ໝູ', p: 14000, k: 'food', bom: [['K1', 1]], wt: 1, wu: 'kg', man: 1 },
      { c: 'B0001', n: 'ຊຸດ', p: 6000, k: 'food', bom: [['W1', 1], ['K1', 1]], bundle: 1, bc: '8850000000101', man: 1 }];
    const base = { shopName: 'Mart HQ', bizType: 'mart', users: [], tables: {}, bills: [], orders: [], catalog: { 'ສິນຄ້າ': { 'ທັງໝົດ': M } }, menuImg: {}, modGroups: [],
      ingredients: { W1: { code: 'W1', name: 'ນ້ຳດື່ມ', unit: 'ຕຸກ', cost: 2500, bc: '8850000000017', vendor: 'vdX', lots: [{ id: 'l1', no: 'A', exp: '2027-01-01', qty: 5 }], locs: { main: 40 } }, K1: { code: 'K1', name: 'ໝູ', unit: 'kg', cost: 10000, locs: { main: 9 } } },
      apl: [], vrets: [], holds: [{ id: 'H1', items: [] }], vendors: [{ id: 'vdX', name: 'ຜູ້ສະໜອງ X', status: 'ACTIVE', terms: 30 }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=mart-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + T)).ok);
    await test('push to new branch: product fields kept (wholesale, weighed, pack barcode, bundle)', async function () {
      const r = await jp('b1', 'hq=menuPush&ids=all&by=Owner&token=' + T); assert.ok(r.ok, JSON.stringify(r));
      const s = await st('b2'), it = {}; Object.values(s.catalog).forEach(function (c) { Object.values(c).forEach(function (a) { a.forEach(function (m) { it[m.c] = m; }); }); });
      assert.strictEqual(it.W1.wp, 3500); assert.strictEqual(it.K1.wt, 1); assert.strictEqual(it.K1.wu, 'kg');
      assert.strictEqual(it['W1-X12'].bc, '8850000000099'); assert.deepStrictEqual(it['W1-X12'].u, { of: 'W1', q: 12, n: 'ແພັກ' });
      assert.strictEqual(it.B0001.bundle, 1); assert.deepStrictEqual(it.B0001.bom, [['W1', 1], ['K1', 1]]);
    });
    await test('new branch from template: barcode + cost kept, stock 0, NO lots, suppliers copied so product supplier stays valid, held bills reset', async function () {
      const s = await st('b2'), w = s.ingredients.W1; assert.ok(w, 'W1 missing');
      assert.strictEqual(w.bc, '8850000000017'); assert.strictEqual(w.cost, 2500); assert.strictEqual(w.stock, 0);
      assert.ok(!w.lots, 'lots copied'); assert.strictEqual(w.vendor, 'vdX'); assert.ok((s.vendors || []).some(function (v) { return v.id === 'vdX'; })); assert.deepStrictEqual(s.holds || [], []); assert.strictEqual(s.ingredients.K1.unit, 'kg');
    });
    await test('two devices add payables/returns at the same time: both kept (merge by id)', async function () {
      const a = await st('b1'), b = await st('b1');
      a.apl = (a.apl || []).concat([{ id: 'ap1', ts: Date.now(), vendor: 'vdX', type: 'inv', amt: 100000, upd: Date.now() }]);
      b.apl = (b.apl || []).concat([{ id: 'ap2', ts: Date.now(), vendor: 'vdX', type: 'pay', amt: 30000, upd: Date.now() }]); b.vrets = [{ id: 'vr1', no: 'VR-1', ts: Date.now(), vendor: 'vdX', total: 5000, lines: [], upd: Date.now() }];
      assert.strictEqual(await save('b1', a), 'ok'); assert.strictEqual(await save('b1', b), 'ok');
      const s = await st('b1'); const ids = (s.apl || []).map(function (x) { return x.id; }).sort();
      assert.deepStrictEqual(ids, ['ap1', 'ap2']); assert.strictEqual((s.vrets || []).length, 1);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
