/* ທົດສອບໄລຍະ 3 — ລາຍງານລວມທຸກສາຂາ + ຄັງບິນເກົ່າ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3500 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-rep-')), T = 'report-master-token-1';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'report-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
const D = 86400000, now = Date.now(), lao = function (ts) { return new Date(ts + 7 * 3600000).toISOString().slice(0, 10); };
const today = lao(now), old = now - 200 * D, oldDay = lao(old);
/* ເວລາບິນ "ມື້ນີ້" ຢູ່ລະຫວ່າງທ່ຽງຄືນ (ເວລາລາວ) ກັບດຽວນີ້ສະເໝີ — ທົດສອບບໍ່ພັງຫຼັງທ່ຽງຄືນ */
const t0 = Date.parse(today + 'T00:00:00+07:00'), tt = function (k) { return t0 + Math.floor((now - t0) * k); };
const item = function (code, price, qty, extra) { return Object.assign({ id: code + Math.random(), code: code, name: 'ເມນູ ' + code, price: price, qty: qty, modPrice: 0, disc: 0 }, extra || {}); };
(async function () {
  try {
    await start();
    const b1 = { shopName: 'ສາຂາ 1', users: [], tables: {}, orders: [], catalog: { A: { B: [{ c: 'X', n: 'X', p: 10000, k: 'food' }] } },
      ingredients: { RICE: { code: 'RICE', cost: 10, locs: { main: 0 } } },
      bills: [
        { receipt: '1', ts: tt(0.2), total: 30000, cogs: 12000, pay: 'ເງິນສົດ', items: [item('X', 10000, 3)] },
        { receipt: '2', ts: tt(0.4), total: 50000, refundAmt: 10000, cogs: 20000, payParts: [{ type: 'ເງິນສົດ', amt: 20000 }, { type: 'BCEL', amt: 30000 }], items: [item('Y', 25000, 2)] },
        { receipt: '3', ts: tt(0.5), total: 99000, voided: true, items: [item('X', 99000, 1)] },
        { receipt: '9', ts: old, total: 70000, cogs: 30000, pay: 'BCEL', items: [item('X', 10000, 7)] },
        { receipt: '8', ts: old - D, total: 40000, cogs: 10000, pay: 'ຕິດໜີ້', credit: true, items: [item('Y', 20000, 2)] }],
      expenses: [{ ts: tt(0.6), amount: 5000 }, { ts: old, amount: 999 }],
      stockLog: [{ ts: tt(0.7), code: 'RICE', delta: -100, reason: 'ເສຍຫາຍ' }, { ts: tt(0.75), code: 'RICE', delta: -50, reason: 'ນັບປັບສະຕ໋ອກ' }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=report-admin-key-1', { method: 'POST', body: JSON.stringify(b1) })).json()).ok);
    assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + T)).ok);
    const s2 = await st('b2'); s2.bills.push({ receipt: '1', ts: tt(0.8), total: 20000, cogs: 5000, pay: 'BCEL', items: [item('X', 10000, 2)] }); assert.strictEqual(await save('b2', s2), 'ok');
    await test('report today: per-branch and total sales/bills/cogs/refund/void/expenses/waste, payment split, top items', async function () {
      assert.strictEqual((await jp('b1', 'hq=report&from=' + today + '&to=' + today)).err, 'token');
      const r = await jp('b1', 'hq=report&from=' + today + '&to=' + today + '&token=' + T); assert.ok(r.ok, JSON.stringify(r));
      const a = r.branches.filter(function (x) { return x.id === 'b1'; })[0], b = r.branches.filter(function (x) { return x.id === 'b2'; })[0];
      assert.strictEqual(a.sales, 30000 + 40000); assert.strictEqual(a.bills, 2); assert.strictEqual(a.cogs, 32000); assert.strictEqual(a.refunds, 10000);
      assert.strictEqual(a.voids, 1); assert.strictEqual(a.voidAmt, 99000); assert.strictEqual(a.expenses, 5000); assert.strictEqual(a.waste, 1000); assert.strictEqual(a.shortage, 500);
      assert.strictEqual(Math.round(a.pay['ເງິນສົດ']), 30000 + 16000); assert.strictEqual(Math.round(a.pay.BCEL), 24000);
      assert.strictEqual(b.sales, 20000); assert.strictEqual(r.total.sales, 90000); assert.strictEqual(r.total.bills, 3); assert.strictEqual(r.total.gp, 90000 - 37000);
      const x = r.top.filter(function (t) { return t.c === 'X'; })[0]; assert.strictEqual(x.q, 5); assert.strictEqual(x.v, 50000); assert.deepStrictEqual(Object.keys(x.by).sort(), ['b1', 'b2']);
    });
    await test('archive (>90 days): old bill moved, open credit bill kept, info per branch', async function () {
      const c = await jp('b1', 'hq=archCfg&days=90&token=' + T); assert.strictEqual(c.days, 90);
      const r = await jp('b1', 'hq=archive&token=' + T); const a = r.ran.filter(function (x) { return x.id === 'b1'; })[0]; assert.strictEqual(a.archived, 1, JSON.stringify(r));
      const s = await st('b1'); assert.deepStrictEqual(s.bills.map(function (x) { return x.receipt; }).sort(), ['1', '2', '3', '8']); assert.ok(s.archInfo && s.archInfo.count === 1);
      const i = r.branches.filter(function (x) { return x.id === 'b1'; })[0]; assert.strictEqual(i.archived, 1); assert.strictEqual(i.hot, 4);
    });
    await test('device still holding the archived bill cannot bring it back; its new bill is kept', async function () {
      const s = await st('b1'); s.bills.push({ receipt: '9', ts: old, total: 70000, cogs: 30000, pay: 'BCEL', items: [] }, { receipt: '10', ts: tt(0.9), total: 1000, pay: 'ເງິນສົດ', items: [] }); delete s.archInfo;
      assert.strictEqual(await save('b1', s), 'ok');
      const r = (await st('b1')).bills.map(function (x) { return x.receipt; }); assert.ok(r.indexOf('9') < 0, 'archived bill came back'); assert.ok(r.indexOf('10') >= 0);
    });
    await test('report over the old period still includes archived bills; bill export reads archive', async function () {
      const r = await jp('b1', 'hq=report&from=' + lao(old - 2 * D) + '&to=' + today + '&token=' + T), a = r.branches.filter(function (x) { return x.id === 'b1'; })[0];
      assert.strictEqual(a.sales, 30000 + 40000 + 70000 + 40000 + 1000); assert.strictEqual(a.days[oldDay], 70000);
      const e = await jp('b1', 'hq=archBills&id=b1&from=' + lao(old - 2 * D) + '&to=' + today + '&token=' + T); assert.ok(e.bills.some(function (x) { return x.receipt === '9'; }) && e.bills.length === 6, JSON.stringify(e).slice(0, 200));
    });
    await test('archive is idempotent; bad dates refused', async function () {
      const r = await jp('b1', 'hq=archive&token=' + T); assert.strictEqual(r.ran.filter(function (x) { return x.id === 'b1'; })[0].archived, 0);
      assert.strictEqual((await jp('b1', 'hq=report&from=2026-13-01&to=x&token=' + T)).err, 'date');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
