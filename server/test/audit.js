/* ທົດສອບ audit: ບັນທຶກເພີ່ມຢ່າງດຽວ, hash chain (ແກ້/ລຶບ/ຕັດທ້າຍ ຈັບໄດ້), ການປ່ຽນຂໍ້ມູນຫຼັກ ກ່ອນ→ຫຼັງ, login/ຜິດ PIN, ບິນຫາຍ/void, ສະຕ໋ອກຕິດລົບ, ສິດອ່ານ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3800 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-audit-')), T = 'audit-master-token-1';
const ph = function (p) { p = 'stpos:' + p; let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; let h2 = 52711; for (let j = p.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + p.charCodeAt(j)) | 0; return 'h' + (h >>> 0).toString(16) + '.' + (h2 >>> 0).toString(16); };
let proc, passed = 0, cashTk;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'audit-admin-key-1' }), stdio: ['ignore', 'pipe', 'pipe'] }); proc.stdout.on('data', function (d) { if (/ST POS server on/.test(String(d))) ok(); }); proc.stderr.on('data', function (d) { process.stderr.write(d); }); setTimeout(function () { bad(new Error('start timeout')); }, 15000); }); }
async function jp(qs) { const t = await (await fetch(ROOT + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st() { const r = await jp('gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function list(qs) { return jp('audit=list&token=' + T + '&' + (qs || '')); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
const now = Date.now();
(async function () {
  try {
    await start();
    const base = { shopName: 'ທົດສອບ', tables: { A1: { name: 'A1', status: 'free', items: [] } }, bills: [{ receipt: 'R1', ts: now - 1000, total: 50000, table: 'A1', items: [] }, { receipt: 'R2', ts: now - 900, total: 900000, table: 'A1', items: [] }], orders: [],
      catalog: { C: { S: [{ c: 'M1', n: 'ກາເຟ', p: 25000, bom: [['ING1', 18]] }] } }, ingredients: { ING1: { code: 'ING1', name: 'ເມັດກາເຟ', unit: 'g', cost: 300, yield: 100, reorder: 100, locs: { main: 500 } } },
      users: [{ id: 'u1', name: 'Owner', role: 'superadmin', pinH: ph('1111') }, { id: 'u2', name: 'Cash', role: 'cashier', pinH: ph('2222') }], orderLog: [], cancelLog: [], stockLog: [], discLimit: 10, bankQR: 'QR-A' };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=audit-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    let s0 = await st();
    await test('access: no token refused; plain cashier session refused; API token ok', async function () {
      assert.strictEqual((await jp('audit=list')).err, 'token');
      const cs = await jp('login=pin&uid=u2&pin=2222'); assert.ok(cs.ok); cashTk = cs.tk;
      assert.strictEqual((await jp('audit=list&token=' + encodeURIComponent(cs.tk))).err, 'token', 'cashier cannot read audit');
      assert.ok((await list()).ok);
      const os_ = await jp('login=pin&uid=u1&pin=1111'); assert.ok((await jp('audit=list&token=' + encodeURIComponent(os_.tk))).ok, 'superadmin can');
    });
    await test('login success and failed PIN are recorded with ip; lock after many fails', async function () {
      await jp('login=pin&uid=u2&pin=0000'); await jp('login=pin&uid=u2&pin=0001');
      const r = await list('ty=login,login_fail'); const ts = r.items.map(function (e) { return e.t; });
      assert.ok(ts.indexOf('login') >= 0 && ts.filter(function (x) { return x === 'login_fail'; }).length >= 2, ts.join());
      assert.ok(r.items.every(function (e) { return e.ip; }));
      for (let i = 0; i < 10; i++) await jp('login=pin&uid=u2&pin=9999');
      assert.ok((await list('ty=login_lock')).total >= 1);
    });
    await test('new log lines (orderLog/cancelLog/stockLog) are captured once, even if the device later trims them', async function () {
      s0 = await st(); s0.orderLog.push({ ts: now + 1, table: 'A1', action: 'ຮັບເງິນ', detail: 'ບິນ R3', by: 'Cash' }); s0.cancelLog.push({ ts: now + 2, type: 'ລຶບລາຍການ', code: 'M1', name: 'ກາເຟ', qty: 1, amt: 25000, reason: 'ຄີຜິດ', by: 'Cash' }); s0.stockLog.push({ ts: now + 3, code: 'ING1', delta: -18, after: 482, reason: 'ຂາຍ', ref: '1× ກາເຟ' });
      await save(s0); await save(s0);
      let r = await list('ty=log,cancel,stock'); assert.strictEqual(r.items.filter(function (e) { return e.t === 'log' && /R3/.test(e.d.x); }).length, 1);
      assert.ok(r.items.some(function (e) { return e.t === 'cancel' && e.d.why === 'ຄີຜິດ'; })); assert.ok(r.items.some(function (e) { return e.t === 'stock' && e.d.d === -18; }));
      s0 = await st(); s0.orderLog = []; s0.cancelLog = []; s0.stockLog = []; await save(s0);
      r = await list('ty=log'); assert.strictEqual(r.items.filter(function (e) { return /R3/.test(e.d.x || ''); }).length, 1, 'trimming state does not remove the audit record');
    });
    await test('master data changes keep before → after: price, recipe, cost, yield, user role/perm/pin, settings; bankQR is hashed', async function () {
      s0 = await st(); s0.catalog.C.S[0].p = 30000; s0.catalog.C.S[0].bom = [['ING1', 20]]; s0.ingredients.ING1.cost = 350; s0.ingredients.ING1.yield = 90;
      s0.users[1].role = 'manager'; s0.users[1].perm = { a: { pay: true } }; s0.users[1].pinH = ph('7777'); s0.discLimit = 50; s0.bankQR = 'QR-B-SECRET'; await save(s0);
      const m = (await list('ty=master,user,setting')).items.map(function (e) { return e.d; });
      const has = function (k, f) { return m.some(function (d) { return d.k === k && (!f || f(d)); }); };
      assert.ok(has('menu.price', function (d) { return d.from === 25000 && d.to === 30000; })); assert.ok(has('menu.recipe')); assert.ok(has('ing.cost', function (d) { return d.from === 300 && d.to === 350; })); assert.ok(has('ing.yield', function (d) { return d.to === 90; }));
      assert.ok(has('user.role', function (d) { return d.from === 'cashier' && d.to === 'manager'; })); assert.ok(has('user.perm')); assert.ok(has('user.pin', function (d) { return !('from' in d) && !('to' in d); }), 'PIN value never stored');
      assert.ok(has('discLimit', function (d) { return d.from === '10' && d.to === '50'; })); const q = m.filter(function (d) { return d.k === 'bankQR'; })[0]; assert.ok(q && q.to.indexOf('QR-B-SECRET') < 0, 'QR is hashed'); assert.ok(!JSON.stringify(m).includes('QR-B-SECRET'));
    });
    await test('void bill and new negative stock are recorded as events + alerts; a device cannot drop a bill', async function () {
      s0 = await st(); s0.bills[1].voided = true; s0.bills[1].voidReason = 'ທົດສອບ'; s0.bills[1].voidBy = 'Cash';
      s0.bills = s0.bills.filter(function (b) { return b.receipt !== 'R1'; }); s0.ingredients.ING1.locs.main = -5; await save(s0);
      const r = await list('ty=bill_void,bill_removed,neg_stock,alert');
      assert.ok(r.items.some(function (e) { return e.t === 'bill_void' && e.d.receipt === 'R2' && e.d.why === 'ທົດສອບ'; })); assert.ok((await st()).bills.some(function (b) { return b.receipt === 'R1'; }), 'server merge keeps a bill a device tries to drop'); assert.ok(r.items.some(function (e) { return e.t === 'neg_stock' && e.d.code === 'ING1'; }));
      const al = r.items.filter(function (e) { return e.t === 'alert'; }).map(function (e) { return e.d.msg; }).join('|'); assert.ok(/Void/.test(al) && /ຕິດລົບ/.test(al), al);
    });
    await test('hash chain verifies; editing / deleting / truncating the files is detected', async function () {
      const v = await jp('audit=verify&token=' + T); assert.ok(v.ok && v.count > 10, JSON.stringify(v));
      const dir = path.join(DATA, 'audit'), f = fs.readdirSync(dir).filter(function (x) { return /\.jsonl$/.test(x); })[0], fp = path.join(dir, f), orig = fs.readFileSync(fp, 'utf8');
      const lines = orig.split('\n').filter(Boolean);
      fs.writeFileSync(fp, orig.replace('"t":"login"', '"t":"loginX"').replace(/"msg":"[^"]*"/, '"msg":"edited"')); let bad = await jp('audit=verify&token=' + T); assert.ok(!bad.ok && bad.bad, 'edit detected');
      fs.writeFileSync(fp, lines.slice(0, 2).concat(lines.slice(3)).join('\n') + '\n'); bad = await jp('audit=verify&token=' + T); assert.ok(!bad.ok, 'deleted line detected');
      fs.writeFileSync(fp, lines.slice(0, lines.length - 2).join('\n') + '\n'); bad = await jp('audit=verify&token=' + T); assert.ok(!bad.ok && /ຕັດທ້າຍ/.test(bad.bad.why || ''), 'truncation detected');
      fs.writeFileSync(fp, orig); assert.ok((await jp('audit=verify&token=' + T)).ok, 'restored file verifies again');
    });
    await test('no write endpoint: audit calls with POST/other params cannot add or remove records', async function () {
      const before = (await list()).total; await jp('audit=append&token=' + T + '&t=x'); await jp('audit=delete&token=' + T); await jp('audit=list&token=' + T + '&limit=0');
      assert.strictEqual((await list()).total, before);
    });
    await test('WhatsApp setup: owner only, format checked, key never returned, clear works', async function () {
      assert.strictEqual((await jp('notify=status')).err, 'token');
      assert.strictEqual((await jp('notify=wa_set&wa=8562012345678:abc123&token=' + encodeURIComponent(cashTk))).err, 'token', 'non-owner refused');
      assert.strictEqual((await jp('notify=wa_set&wa=bad&token=' + T)).err, 'format');
      const r = await jp('notify=wa_set&wa=%2B856%2020123456:abc123&token=' + T); assert.ok(r.ok && r.wa === 1 && r.last4 === '3456' && !JSON.stringify(r).includes('abc123'));
      assert.strictEqual((await jp('notify=status&token=' + T)).wa, 1);
      assert.strictEqual((await jp('notify=wa_clear&token=' + T)).wa, 0);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { try { proc.kill(); } catch (e) {} setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} process.exit(process.exitCode || 0); }, 300); }
})();
