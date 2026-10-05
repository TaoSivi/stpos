/* ທົດສອບຫຼາຍສາຂາ (ໄລຍະ 1): ສ້າງສາຂາ, ແຍກຂໍ້ມູນ, session ຕໍ່ສາຂາ, ສິດ HQ, QR/delta/cron ຕໍ່ສາຂາ, ລິ້ງເກົ່າ /api = ສາຂາ 1 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3700 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-br-')), T = 'branch-master-token-1';
let proc, passed = 0;
const ph = function (p) { p = 'stpos:' + p; let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; let h2 = 52711; for (let j = p.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + p.charCodeAt(j)) | 0; return 'h' + (h >>> 0).toString(16) + '.' + (h2 >>> 0).toString(16); };
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'branch-admin-key-1', CRON_KEY: 'branch-cron-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + (br ? '/' + br : '') + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br, tok) { const r = await jp(br, 'gz=1&token=' + encodeURIComponent(tok || T)); assert.ok(r.ok, JSON.stringify(r)); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s, tok) { s._v = Date.now() + Math.floor(Math.random() * 1000); return (await fetch(ROOT + (br ? '/' + br : '') + '/?token=' + encodeURIComponent(tok || T), { method: 'POST', body: JSON.stringify(s) })).text(); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'LaoFe Cafe & Beer', shopAddr: 'ວຽງຈັນ', vatPct: 10, payTypes: ['ເງິນສົດ', 'BCEL'], receiptSeq: 120, orderNo: 50,
      catalog: { 'ອາຫານ': { 'ຜັດ': [{ c: 'F1', n: 'ເຂົ້າຜັດ', p: 30000, k: 'food', bom: [['RICE', 200]] }] } }, modGroups: [{ id: 'g1', title: 'ຫວານ', opts: [] }],
      ingredients: { RICE: { code: 'RICE', name: 'ເຂົ້າ', unit: 'g', cost: 10, locs: { main: 5000, wh: 900 }, reorder: 100 } },
      locations: [{ id: 'main', name: 'ສາຂາຫຼັກ', type: 'branch' }, { id: 'wh', name: 'ສາງ', type: 'warehouse' }],
      tables: { A1: { name: 'A1', floor: 'F1', status: 'busy', items: [{ id: 1, code: 'F1', price: 30000, qty: 1 }], fx: 10, fy: 20, shape: 'round', seats: 4, dv: 1, upd: 1 }, 'FP-1': { name: 'FP-1', floor: 'Delivery', status: 'busy', items: [], dl: { app: 'fp' } } },
      users: [{ id: 'u1', name: 'Owner', role: 'superadmin', pinH: ph('1111') }, { id: 'u2', name: 'Cashier', role: 'cashier', pinH: ph('2222') }],
      bills: [{ receipt: '119', ts: 1, total: 5, items: [] }], orders: [{ id: 1, table: 'A1', status: 'wait' }], stockLog: [{ ts: 1, code: 'RICE', delta: -1 }], customers: [{ id: 'm1', name: 'ສະມາຊິກ' }],
      qr: { A1: { pin: '1234', expiry: Date.now() + 9e6 } }, curShift: { name: 'ກະເຊົ້າ' }, procWorkflows: [{ id: 'w1' }], prs: [{ id: 'pr1' }] };
    const imp = await (await fetch(ROOT + '/?admin=import&key=branch-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json(); assert.ok(imp.ok);
    await test('registry: 1 branch named after the shop; /api and /api/b1 are the same data', async function () {
      const l = await jp('', 'hq=list&token=' + T); assert.strictEqual(l.branches.length, 1); assert.strictEqual(l.branches[0].id, 'b1'); assert.strictEqual(l.branches[0].name, 'LaoFe Cafe & Beer');
      assert.strictEqual((await st('')).shopName, (await st('b1')).shopName);
    });
    await test('only master token / superadmin can manage branches', async function () {
      assert.strictEqual((await jp('', 'hq=add&name=X')).err, 'token');
      const cs = await jp('b1', 'login=pin&uid=u2&pin=2222'); assert.ok(cs.ok);
      assert.strictEqual((await jp('b1', 'hq=add&name=X&token=' + encodeURIComponent(cs.tk))).err, 'token', 'cashier cannot add');
      const os2 = await jp('b1', 'login=pin&uid=u1&pin=1111'); assert.ok((await jp('b1', 'hq=list&token=' + encodeURIComponent(os2.tk))).ok, 'superadmin session can list');
    });
    let b2;
    await test('add branch 2: copies setup, starts operations empty, stock 0, layout kept, delivery tables dropped', async function () {
      const r = await jp('', 'hq=add&name=' + encodeURIComponent('LaoFe ສາຂາ 2') + '&token=' + T); assert.ok(r.ok, JSON.stringify(r)); b2 = r.id; assert.strictEqual(b2, 'b2'); assert.ok(/\/api\/b2$/.test(r.url));
      const s = await st(b2);
      assert.strictEqual(s.shopName, 'LaoFe ສາຂາ 2'); assert.deepStrictEqual(s.catalog, base.catalog); assert.strictEqual(s.vatPct, 10); assert.strictEqual(s.users.length, 2);
      assert.strictEqual(s.bills.length, 0); assert.strictEqual(s.orders.length, 0); assert.strictEqual(s.stockLog.length, 0); assert.strictEqual(s.customers.length, 0); assert.strictEqual(s.prs.length, 0);
      assert.strictEqual(s.receiptSeq, 0); assert.ok(!s.curShift); assert.deepStrictEqual(s.qr, {}); assert.strictEqual(s.procWorkflows.length, 1);
      assert.deepStrictEqual(s.ingredients.RICE.locs, { main: 0 }); assert.strictEqual(s.ingredients.RICE.cost, 10); assert.strictEqual(s.locations.length, 1);
      assert.deepStrictEqual(Object.keys(s.tables), ['A1']); assert.strictEqual(s.tables.A1.status, 'free'); assert.strictEqual(s.tables.A1.items.length, 0); assert.strictEqual(s.tables.A1.shape, 'round'); assert.strictEqual(s.tables.A1.fx, 10);
      assert.strictEqual((await jp('', 'hq=add&name=' + encodeURIComponent('LaoFe ສາຂາ 2') + '&token=' + T)).ok, false, 'duplicate name refused');
    });
    await test('branch data isolated: bills saved in b2 never appear in b1 and vice versa', async function () {
      const s2 = await st(b2); s2.bills.push({ receipt: '1', ts: Date.now(), total: 30000, items: [] }); assert.strictEqual(await save(b2, s2), 'ok');
      const s1 = await st('b1'); s1.bills.push({ receipt: '120', ts: Date.now(), total: 9, items: [] }); assert.strictEqual(await save('', s1), 'ok');
      const a = await st('b1'), b = await st(b2);
      assert.deepStrictEqual(a.bills.map(function (x) { return x.receipt; }), ['119', '120']); assert.deepStrictEqual(b.bills.map(function (x) { return x.receipt; }), ['1']);
    });
    await test('device session works only in branches where the same user (same PIN) exists', async function () {
      const l2 = await jp(b2, 'login=pin&uid=u2&pin=2222'); assert.ok(l2.ok);
      assert.strictEqual((await st(b2, l2.tk)).shopName, 'LaoFe ສາຂາ 2');
      const s2 = await st(b2); s2.users.push({ id: 'u7', name: 'Only b2', role: 'cashier', pinH: ph('7777') }); assert.strictEqual(await save(b2, s2), 'ok');
      const l7 = await jp(b2, 'login=pin&uid=u7&pin=7777'); assert.ok(l7.ok);
      assert.strictEqual((await jp('b1', 'gz=1&token=' + encodeURIComponent(l7.tk))).err, 'token', 'b2-only user refused on b1');
      const o2 = await jp(b2, 'login=pin&uid=u1&pin=1111'); assert.ok(o2.ok);
      assert.strictEqual((await st('b1', o2.tk)).shopName, 'LaoFe Cafe & Beer', 'superadmin session works in other branch');
      assert.ok((await jp('b1', 'sum=1&token=' + encodeURIComponent(o2.tk))).ok, 'branch summary with owner session');
    });
    await test('QR ordering, delta and version check work per branch', async function () {
      const s2 = await st(b2); s2.qr = { A1: { pin: '5555', expiry: Date.now() + 9e6, enabled: true } }; s2.stockBlock = false; await save(b2, s2);
      const r = await jp(b2, 'action=order&payload=' + encodeURIComponent(JSON.stringify({ action: 'order', table: 'A1', pin: '5555', items: [{ code: 'F1', qty: 1 }] }))); assert.ok(r.ok, JSON.stringify(r));
      assert.strictEqual((await jp('b1', 'action=order&payload=' + encodeURIComponent(JSON.stringify({ action: 'order', table: 'A1', pin: '5555', items: [{ code: 'F1', qty: 1 }] })))).ok, false, 'b2 QR PIN not valid in b1');
      const v1 = await jp('b1', 'ver=1&token=' + T), v2 = await jp(b2, 'ver=1&token=' + T); assert.notStrictEqual(v1.h, v2.h);
      const d = await jp(b2, 'dz=&gz=1&token=' + T); assert.ok(d.dz && d.h === v2.h);
      assert.strictEqual((await st(b2)).tables.A1.items.length, 1); assert.strictEqual((await st('b1')).tables.A1.items.length, 1);
    });
    await test('unknown branch refused; cron runs every branch; status per branch', async function () {
      assert.strictEqual((await jp('b9', 'ver=1&token=' + T)).err, 'branch');
      const c = JSON.parse(await (await fetch(ROOT + '/?cron=branch-cron-key-1')).text()); assert.ok(c.ok && c.branches === 2, JSON.stringify(c)); assert.ok(!c.ran.some(function (x) { return x.err; }), JSON.stringify(c.ran));
      const s = JSON.parse(await (await fetch(ROOT + '/b2/?admin=status&key=branch-admin-key-1')).text()); assert.strictEqual(s.branch, 'b2'); assert.ok(s.triggers.some(function (t) { return t.fn === 'backupDaily'; }));
    });
    await test('third branch from branch 2 as template; rename', async function () {
      const r = await jp(b2, 'hq=add&name=' + encodeURIComponent('ສາງກາງ') + '&type=warehouse&from=' + b2 + '&token=' + T); assert.ok(r.ok); assert.strictEqual(r.id, 'b3');
      const s = await st('b3'); assert.strictEqual(s.locations[0].type, 'warehouse'); assert.strictEqual(s.bills.length, 0);
      const rn = await jp('', 'hq=rename&id=b3&name=' + encodeURIComponent('ຄົວກາງ') + '&token=' + T); assert.ok(rn.ok && rn.branches[2].name === 'ຄົວກາງ');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
