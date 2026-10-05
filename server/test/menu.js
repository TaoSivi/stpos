/* ທົດສອບໄລຍະ 2 — ເມນູ ແລະ ລາຄາກາງ: ກົດ 3 ແບບ, ເມນູຂອງສາຂາເອງບໍ່ຫາຍ, ວັດຖຸດິບໃໝ່, ເຄື່ອງທີ່ຖືເມນູເກົ່າຂຽນທັບບໍ່ໄດ້ (ທັງເຕັມ ແລະ delta) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert');
const D = require('../delta');
const PORT = 3600 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-menu-')), T = 'menu-master-token-1';
const H = function (o) { return crypto.createHash('sha256').update(D.canon(o)).digest('hex').slice(0, 32); };
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'menu-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
const items = function (s) { const o = {}; Object.values(s.catalog).forEach(function (c) { Object.values(c).forEach(function (a) { a.forEach(function (m) { o[m.c] = m; }); }); }); return o; };
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'HQ ສາຂາແມ່', users: [], tables: {}, bills: [], orders: [],
      catalog: { 'ອາຫານ': { 'ຜັດ': [{ c: 'A', n: 'ເຂົ້າຜັດ', p: 30000, k: 'food', bom: [['RICE', 200]] }, { c: 'B', n: 'ເຝີ', p: 35000, k: 'food', bom: [] }, { c: 'C', n: 'ລາບ', p: 40000, k: 'food', bom: [] }] } },
      modGroups: [{ id: 'g1', title: 'ຂະໜາດ', type: 'size', opts: [{ n: 'L', p: 5000 }] }], menuImg: {},
      ingredients: { RICE: { code: 'RICE', name: 'ເຂົ້າ', unit: 'g', cost: 10, locs: { main: 5000 } }, NEW1: { code: 'NEW1', name: 'ກຸ້ງ', unit: 'g', cost: 80, locs: { main: 900 } } } };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=menu-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    for (const nm of ['ສາຂາ 2', 'ສາຂາ 3', 'ສາຂາ 4']) assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent(nm) + '&token=' + T)).ok);
    /* ສາຂາ 2 ເພີ່ມເມນູຂອງຕົນເອງ Z */
    const s2 = await st('b2'); s2.catalog['ອາຫານ']['ຜັດ'].push({ c: 'Z', n: 'ເມນູສາຂາ 2', p: 1, k: 'food', bom: [] }); assert.strictEqual(await save('b2', s2), 'ok');
    let stale2 = await st('b2');                         /* ເຄື່ອງຂອງສາຂາ 2 ທີ່ຖືສະບັບກ່ອນ HQ ສົ່ງເມນູ */
    const dz0 = await jp('b2', 'dz=&gz=1&token=' + T);  /* ສະບັບພື້ນຂອງເຄື່ອງທີ່ໃຊ້ delta */
    const base2 = JSON.parse(zlib.gunzipSync(Buffer.from(dz0.gz, 'base64')));
    await test('status: source = b1, nothing pushed yet (dirty), rules default "hq"', async function () {
      const m = await jp('b1', 'hq=menu&token=' + T); assert.ok(m.ok && m.src === 'b1' && m.dirty && m.items === 3, JSON.stringify(m)); assert.ok(m.branches.every(function (b) { return b.mode === 'hq'; }));
      assert.strictEqual((await jp('b1', 'hq=menu')).err, 'token');
    });
    await test('rules saved by POST (CORS, token required): b3 except (B off, A=99000), b4 own', async function () {
      const bad = await (await fetch(ROOT + '/b1/?hq=menuRule', { method: 'POST', body: JSON.stringify({ id: 'b3', mode: 'except' }) })).json(); assert.strictEqual(bad.err, 'token');
      const r = await fetch(ROOT + '/b1/?hq=menuRule&token=' + T, { method: 'POST', headers: { Origin: 'https://stpos.store' }, body: JSON.stringify({ id: 'b3', mode: 'except', off: { B: 1 }, price: { A: 99000 } }) });
      assert.strictEqual(r.headers.get('access-control-allow-origin'), 'https://stpos.store'); const j = await r.json(); assert.ok(j.ok && j.saved === 'b3');
      await fetch(ROOT + '/b1/?hq=menuRule&token=' + T, { method: 'POST', body: JSON.stringify({ id: 'b4', mode: 'own' }) });
      const it = await jp('b1', 'hq=menuItems&id=b3&token=' + T); assert.strictEqual(it.items.length, 3); assert.strictEqual(it.rule.price.A, 99000);
    });
    /* ສາຂາແມ່ແກ້ເມນູ: A ລາຄາໃໝ່, ເພີ່ມ D (ສູດໃຊ້ NEW1), ລຶບ C */
    const s1 = await st('b1'); const f = s1.catalog['ອາຫານ']['ຜັດ'];
    f[0].p = 32000; f.push({ c: 'D', n: 'ຜັດກຸ້ງ', p: 50000, k: 'food', bom: [['NEW1', 100]] }); s1.catalog['ອາຫານ']['ຜັດ'] = f.filter(function (m) { return m.c !== 'C'; });
    assert.strictEqual(await save('b1', s1), 'ok');
    /* ສາຂາ 2 ບໍ່ມີວັດຖຸດິບ NEW1 (ຈຳລອງ: ລຶບອອກ) */
    const s2b = await st('b2'); delete s2b.ingredients.NEW1; await save('b2', s2b); stale2 = await st('b2');
    let push;
    await test('push: b2 = master + its own Z, C removed, new ingredient added with stock 0; b3 exceptions; b4 untouched', async function () {
      const r = await jp('b1', 'hq=menuPush&ids=all&by=Owner&token=' + T); assert.ok(r.ok, JSON.stringify(r)); push = r.push;
      const b2 = await st('b2'), i2 = items(b2); assert.deepStrictEqual(Object.keys(i2).sort(), ['A', 'B', 'D', 'Z']); assert.strictEqual(i2.A.p, 32000);
      assert.deepStrictEqual(b2.ingredients.NEW1.locs, { main: 0 }); assert.strictEqual(b2.menuHQ.src, 'b1'); assert.ok(b2.menuV > 0);
      const i3 = items(await st('b3')); assert.deepStrictEqual(Object.keys(i3).sort(), ['A', 'D']); assert.strictEqual(i3.A.p, 99000);
      const i4 = items(await st('b4')); assert.deepStrictEqual(Object.keys(i4).sort(), ['A', 'B', 'C']); assert.strictEqual(i4.A.p, 30000);
      const r4 = push.res.filter(function (x) { return x.id === 'b4'; })[0]; assert.ok(r4.skip);
      assert.strictEqual((await jp('b1', 'hq=menu&token=' + T)).dirty, false);
    });
    await test('stale device (full save, old menu) cannot bring the old menu back — its new bill is kept', async function () {
      stale2.bills.push({ receipt: 'S1', ts: Date.now(), total: 1, items: [] }); stale2.catalog['ອາຫານ']['ຜັດ'].push({ c: 'C', n: 'ລາບ', p: 40000, k: 'food' });
      assert.strictEqual(await save('b2', stale2), 'ok');
      const b2 = await st('b2'); assert.deepStrictEqual(Object.keys(items(b2)).sort(), ['A', 'B', 'D', 'Z']); assert.ok(b2.bills.some(function (b) { return b.receipt === 'S1'; }));
    });
    await test('stale device using delta (base before push) keeps the pushed menu', async function () {
      const nb = JSON.parse(JSON.stringify(base2)); nb.bills.push({ receipt: 'S2', ts: Date.now(), total: 2, items: [] }); nb._v = Date.now() + 99;
      const body = 'DZ:' + zlib.gzipSync(JSON.stringify({ b: dz0.h, p: D.diff(base2, nb), h: H(nb) })).toString('base64');
      assert.strictEqual(await (await fetch(ROOT + '/b2/?token=' + T, { method: 'POST', body: body })).text(), 'ok');
      const b2 = await st('b2'); assert.deepStrictEqual(Object.keys(items(b2)).sort(), ['A', 'B', 'D', 'Z']); assert.ok(b2.bills.some(function (b) { return b.receipt === 'S2'; }) && b2.bills.some(function (b) { return b.receipt === 'S1'; }));
    });
    await test('up-to-date branch device may still edit its own item; second push keeps Z, does not revive C', async function () {
      const b2 = await st('b2'); items(b2).Z.p = 7777; assert.strictEqual(await save('b2', b2), 'ok'); assert.strictEqual(items(await st('b2')).Z.p, 7777);
      assert.ok((await jp('b1', 'hq=menuPush&ids=b2&token=' + T)).ok);
      const i2 = items(await st('b2')); assert.deepStrictEqual(Object.keys(i2).sort(), ['A', 'B', 'D', 'Z']); assert.strictEqual(i2.Z.p, 7777);
    });
    await test('change rule b3 → hq and push only b3: B back, master price', async function () {
      await fetch(ROOT + '/b1/?hq=menuRule&token=' + T, { method: 'POST', body: JSON.stringify({ id: 'b3', mode: 'hq' }) });
      const r = await jp('b1', 'hq=menuPush&ids=b3&token=' + T); assert.deepStrictEqual(r.push.res.map(function (x) { return x.id; }), ['b3']);
      const i3 = items(await st('b3')); assert.deepStrictEqual(Object.keys(i3).sort(), ['A', 'B', 'D']); assert.strictEqual(i3.A.p, 32000);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
