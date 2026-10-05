/* ທົດສອບ server: ແລ່ນ app.js ໃນໂຟນເດີຂໍ້ມູນຊົ່ວຄາວ ແລ້ວເອີ້ນແບບດຽວກັບແອັບ (JSONP GET + POST) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-test-'));
const BASE = 'http://127.0.0.1:' + PORT + '/api/';
let proc, passed = 0;

function start(env) {
  return new Promise(function (ok, bad) {
    proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }, env || {}), stdio: ['ignore', 'pipe', 'pipe'] });
    let err = ''; proc.stderr.on('data', function (d) { err += d; });
    proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); });
    proc.on('exit', function (c) { if (c) bad(new Error('server exited ' + c + ' ' + err)); });
  });
}
function stop() { return new Promise(function (ok) { if (!proc || proc.exitCode !== null) return ok(); proc.on('exit', function () { ok(); }); proc.kill(); }); }
async function jsonp(params) {
  const r = await fetch(BASE + '?callback=__cb1&' + params); const t = await r.text();
  const m = /^__cb1\(([\s\S]*)\)$/.exec(t); assert.ok(m, 'jsonp shape: ' + t.slice(0, 80)); return JSON.parse(m[1]);
}
async function post(body, qs) { const r = await fetch(BASE + (qs || ''), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }); return r.text(); }
async function getState(tok) { const r = await jsonp('token=' + (tok || '') + '&gz=1'); assert.ok(r.ok, JSON.stringify(r).slice(0, 100)); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64')).toString('utf8')); }
async function test(name, fn) { await fn(); passed++; console.log('  ✓ ' + name); }

const now = Date.now();
function base() {
  return {
    _v: now, shopName: 'Test Cafe', receiptSeq: 1, orderNo: 1, qrGlobal: true, qrPinRequired: true,
    catalog: { 'ອາຫານ': { 'ຜັດ': [{ c: 'F1', n: 'ເຂົ້າຜັດ', p: 30000, k: 'food', bom: [['RICE', 200]] }] }, 'ດື່ມ': { 'ກາເຟ': [{ c: 'D1', n: 'ກາເຟ', p: 20000, k: 'drink' }] } },
    ingredients: { RICE: { code: 'RICE', name: 'ເຂົ້າ', unit: 'g', locs: { main: 10000 }, reorder: 500, cost: 10 } },
    tables: { A1: { name: 'A1', floor: 'F1', status: 'free', items: [], dv: 1, upd: now }, A2: { name: 'A2', floor: 'F1', status: 'free', items: [], dv: 1, upd: now } },
    qr: { A1: { pin: '1234', expiry: now + 3600000, enabled: true } },
    orders: [], bills: [], stockLog: [], _srcLoc: 'main'
  };
}
const bill = function (r, ts, total) { return { receipt: r, ts: ts, total: total, pay: 'ເງິນສົດ', items: [{ id: 'i' + r, code: 'D1', name: 'ກາເຟ', price: total, qty: 1 }] }; };

(async function () {
  console.log('ST POS server tests · data ' + DATA);
  await start({ ADMIN_KEY: 'admin-key-123456', CRON_KEY: 'cron-key-123456' });
  try {
    await test('health', async function () { assert.strictEqual(await (await fetch(BASE)).text(), 'ST POS server OK'); });
    await test('empty server returns empty state', async function () { const r = await jsonp('token='); assert.strictEqual(r.ok, true); assert.strictEqual(r.state, ''); });
    await test('backup trigger installed on first start', async function () { const s = JSON.parse(await (await fetch(BASE + '?admin=status&key=admin-key-123456')).text()); assert.ok(s.triggers.some(function (t) { return t.fn === 'backupDaily' && t.hour === 3; })); });
    await test('save plain + read back (gz)', async function () {
      const s = base(); s.bills = [bill('1', now - 5000, 20000)]; assert.strictEqual(await post(JSON.stringify(s)), 'ok');
      const g = await getState(); assert.strictEqual(g.shopName, 'Test Cafe'); assert.strictEqual(g.bills.length, 1);
      const v = await jsonp('ver=1&token='); assert.strictEqual(v.v, g._v);
    });
    await test('save gzip body (GZ:) like the app', async function () {
      const s = await getState(); s.expenses = [{ ts: now, cat: 'ອື່ນ', amount: 5000 }]; s._v = now + 10;
      assert.strictEqual(await post('GZ:' + zlib.gzipSync(Buffer.from(JSON.stringify(s))).toString('base64')), 'ok');
      assert.strictEqual((await getState()).expenses.length, 1);
    });
    await test('two devices saving at once keep both bills (mergeBills_)', async function () {
      const a = await getState(), b = JSON.parse(JSON.stringify(a));
      a.bills.push(bill('2', now + 1000, 30000)); a._v = now + 20;
      b.bills.push(bill('3', now + 2000, 40000)); b._v = now + 21;
      await post(JSON.stringify(a)); await post(JSON.stringify(b));
      const g = await getState(); assert.deepStrictEqual(g.bills.map(function (x) { return x.receipt; }).sort(), ['1', '2', '3']); assert.strictEqual(g.receiptSeq, 3);
    });
    await test('stock from another device is not lost (mergeStock_ via stockLog)', async function () {
      const a = await getState(), b = JSON.parse(JSON.stringify(a));
      a.ingredients.RICE.locs.main -= 200; a.stockLog.push({ ts: now + 3000, code: 'RICE', delta: -200, loc: 'main', reason: 'ຂາຍ' }); a._v = now + 30;
      b.ingredients.RICE.locs.main -= 400; b.stockLog.push({ ts: now + 3001, code: 'RICE', delta: -400, loc: 'main', reason: 'ຂາຍ' }); b._v = now + 31;
      await post(JSON.stringify(a)); await post(JSON.stringify(b));
      assert.strictEqual((await getState()).ingredients.RICE.locs.main, 10000 - 600);
    });
    await test('QR customer: wrong PIN refused, order accepted, stock cut, duplicate rid ignored', async function () {
      const bad = await jsonp('action=order&payload=' + encodeURIComponent(JSON.stringify({ action: 'order', table: 'A1', pin: '0000', items: [{ code: 'F1', qty: 1 }] })));
      assert.strictEqual(bad.ok, false);
      const pl = { action: 'order', table: 'A1', pin: '1234', rid: 'r-1', items: [{ code: 'F1', qty: 2 }] };
      const r = await jsonp('action=order&payload=' + encodeURIComponent(JSON.stringify(pl))); assert.strictEqual(r.ok, true, JSON.stringify(r)); assert.strictEqual(r.n, 2);
      const d = await jsonp('action=order&payload=' + encodeURIComponent(JSON.stringify(pl))); assert.strictEqual(d.dup, true);
      const g = await getState(); assert.strictEqual(g.tables.A1.items.length, 1); assert.strictEqual(g.tables.A1.status, 'busy'); assert.strictEqual(g.ingredients.RICE.locs.main, 9400 - 400); assert.strictEqual(g.orders.length, 1);
      const c = await jsonp('cust=1&table=A1'); const cs = JSON.parse(c.state); assert.ok(cs.cust && !cs.bills && cs.tables.A1);
    });
    await test('staff device saving an old copy keeps the QR order (mergeQr_)', async function () {
      const g = await getState(); const old = JSON.parse(JSON.stringify(g)); old.tables.A1.items = []; old.orders = []; old.tables.A1.status = 'free'; old.tables.A1.upd = 1; old._v = now + 40;
      old.tables.A2.status = 'busy'; old.tables.A2.upd = Date.now() + 5;
      await post(JSON.stringify(old)); const g2 = await getState();
      assert.strictEqual(g2.tables.A1.items.length, 1); assert.strictEqual(g2.tables.A2.status, 'busy');
    });
    await test('chat: customer join/send, staff poll/reply, close clears', async function () {
      const j = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'join', table: 'A1', pin: '1234' }))); assert.ok(j.ok && j.tk, JSON.stringify(j));
      const s1 = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'csend', tk: j.tk, text: 'ຂໍນ້ຳ', rid: 'x1' }))); assert.strictEqual(s1.msgs.length, 1);
      const sp = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'spoll', token: '', since: 0 }))); assert.strictEqual(sp.msgs.length, 1);
      await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'ssend', token: '', table: 'A1', text: 'ໄດ້ເລີຍ' })));
      const s2 = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'cpoll', tk: j.tk, since: 0 }))); assert.strictEqual(s2.msgs.length, 2);
      const bad = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'cpoll', tk: j.tk.slice(0, -2) + 'xx' }))); assert.strictEqual(bad.ok, false);
      const cl = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'close', token: '', table: 'A1' }))); assert.strictEqual(cl.removed, 2);
      const s3 = await jsonp('chat=1&p=' + encodeURIComponent(JSON.stringify({ a: 'cpoll', tk: j.tk }))); assert.strictEqual(s3.closed, true);
    });
    await test('backup now / list / restore', async function () {
      const b = await jsonp('bak=now&token='); assert.ok(/^BAK_/.test(b.res));
      const before = await getState(); const x = JSON.parse(JSON.stringify(before)); x.shopName = 'CHANGED'; x._v = Date.now() + 50; await post(JSON.stringify(x));
      assert.strictEqual((await getState()).shopName, 'CHANGED');
      const l = await jsonp('bak=list&token='); assert.strictEqual(l.list[0], b.res);
      const r = await jsonp('bak=restore&tag=' + b.res + '&token='); assert.strictEqual(r.res, 'OK');
      assert.strictEqual((await getState()).shopName, 'Test Cafe');
    });
    await test('daily report preview + branch summary', async function () {
      const r = await jsonp('report=preview&token='); assert.ok(r.ok && /ລາຍງານປະຈຳວັນ/.test(r.text), r.text); assert.strictEqual(r.trigger, false);
      const s = await jsonp('sum=1&token='); assert.ok(s.ok && s.sum.shopName === 'Test Cafe');
    });
    await test('admin installDailyReport + cron runs due triggers once a day', async function () {
      assert.ok(/^OK/.test(await (await fetch(BASE + '?admin=installDailyReport&key=admin-key-123456')).text()));
      assert.strictEqual(await (await fetch(BASE + '?cron=wrong')).text(), 'denied');
      const c = JSON.parse(await (await fetch(BASE + '?cron=cron-key-123456')).text()); assert.ok(c.ok);
      const c2 = JSON.parse(await (await fetch(BASE + '?cron=cron-key-123456')).text()); assert.strictEqual(c2.ran.length, 0, 'second run same day does nothing');
    });
    await test('admin import refuses to overwrite without force', async function () {
      const r = await fetch(BASE + '?admin=import&key=admin-key-123456', { method: 'POST', body: JSON.stringify(base()) }); assert.strictEqual(r.status, 409);
      assert.strictEqual((await fetch(BASE + '?admin=status&key=nope')).status, 403);
    });
    await test('20 parallel saves from 2 devices: no lost bills, valid JSON', async function () {
      const g = await getState(), jobs = [];
      for (let i = 0; i < 20; i++) { const s = JSON.parse(JSON.stringify(g)); s.bills.push(bill(String(100 + i), now + 10000 + i, 1000 + i)); s._v = now + 100 + i; jobs.push(post(JSON.stringify(s))); }
      await Promise.all(jobs); const f = await getState();
      for (let i = 0; i < 20; i++) assert.ok(f.bills.some(function (b) { return b.receipt === String(100 + i); }), 'bill ' + (100 + i));
    });
    await stop();
    await start({ API_TOKEN: 'secret-token-1' });
    await test('API_TOKEN set: reads/saves without token are denied', async function () {
      const r = await jsonp('token=&gz=1'); assert.strictEqual(r.err, 'token');
      assert.strictEqual(await post('{"bills":[]}'), 'denied');
      assert.strictEqual(await post('{"bills":[]}', '?token=bad'), 'denied');
      const ok = await getState('secret-token-1'); assert.strictEqual(ok.shopName, 'Test Cafe');
      const qr = await jsonp('cust=1&table=A1'); assert.ok(qr.ok, 'QR customers still work without token');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { await stop(); try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }
})();
