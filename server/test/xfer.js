/* ທົດສອບໄລຍະ 5 — ເບີກ/ໂອນ ຂ້າມສາຂາ: ຂໍ → ສົ່ງ (ຕັດສະຕ໋ອກສາງ) → ຮັບ (ເພີ່ມສະຕ໋ອກສາຂາ), ສິດ, ເຄື່ອງເກົ່າບໍ່ລົບລ້າງສະຕ໋ອກ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3800 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-xf-')), T = 'xf-master-token-1';
const ph = function (p) { p = 'stpos:' + p; let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; let h2 = 52711; for (let j = p.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + p.charCodeAt(j)) | 0; return 'h' + (h >>> 0).toString(16) + '.' + (h2 >>> 0).toString(16); };
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'xf-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br) { const r = await jp(br, 'gz=1&token=' + T); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function xf(br, act, o, tk) { return (await fetch(ROOT + '/' + br + '/?xf=' + act + '&token=' + encodeURIComponent(tk || T), { method: 'POST', body: JSON.stringify(o || {}) })).json(); }
const at = function (s, code, loc) { const i = s.ingredients[code]; return i && i.locs ? (+i.locs[loc || 'main'] || 0) : null; };
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'ສາຂາ 1', tables: {}, bills: [], orders: [], catalog: { A: { B: [] } }, locations: [{ id: 'main', name: 'ສາຂາ 1', type: 'branch' }],
      users: [{ id: 'u1', name: 'Owner', role: 'superadmin', pinH: ph('1111') }, { id: 'u2', name: 'Store', role: 'storekeeper', pinH: ph('2222') }, { id: 'u3', name: 'Waiter', role: 'waiter', pinH: ph('3333') }],
      ingredients: { RICE: { code: 'RICE', name: 'ເຂົ້າ', unit: 'kg', cost: 12000, locs: { main: 50 } }, OIL: { code: 'OIL', name: 'ນ້ຳມັນ', unit: 'L', cost: 30000, locs: { main: 10 } } }, stockLog: [] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=xf-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາງກາງ') + '&type=warehouse&token=' + T)).ok);   /* b2 = ສາງ */
    const w = await st('b2'); w.ingredients.RICE.locs.main = 500; w.ingredients.OIL.locs.main = 80; w.ingredients.MEAT = { code: 'MEAT', name: 'ຊີ້ນ', unit: 'kg', cost: 90000, locs: { main: 40 } }; assert.strictEqual(await save('b2', w), 'ok');
    const stale1 = await st('b1');
    let id;
    await test('branch requests from warehouse (session of storekeeper); waiter / bad token refused; GET actions refused', async function () {
      const sk = await jp('b1', 'login=pin&uid=u2&pin=2222'), wt = await jp('b1', 'login=pin&uid=u3&pin=3333');
      assert.strictEqual((await xf('b1', 'create', { branch: 'b2', items: [{ code: 'RICE', qty: 20 }] }, wt.tk)).ok, false, 'waiter cannot');
      assert.strictEqual((await xf('b1', 'create', {}, 'nope')).err, 'token');
      assert.strictEqual((await jp('b1', 'xf=create&token=' + T)).err, 'post');
      const r = await xf('b1', 'create', { branch: 'b2', items: [{ code: 'RICE', qty: 20 }, { code: 'OIL', qty: 5 }, { code: 'MEAT', qty: 0 }], note: 'ເຕີມອາທິດນີ້' }, sk.tk);
      assert.ok(r.ok, JSON.stringify(r)); id = r.id; assert.strictEqual(r.no, 'XB-0001'); assert.strictEqual(r.list[0].status, 'req'); assert.strictEqual(r.list[0].items.length, 2);
      const l2 = await jp('b2', 'xf=list&token=' + T); assert.ok(l2.list.some(function (x) { return x.id === id && x.from === 'b2' && x.to === 'b1'; }));
      assert.strictEqual(at(await st('b2'), 'RICE'), 500, 'request does not move stock');
    });
    await test('only the source branch can send; send edits qty and deducts warehouse stock', async function () {
      assert.strictEqual((await xf('b1', 'send', { id: id })).ok, false);
      const r = await xf('b2', 'send', { id: id, items: [{ code: 'RICE', qty: 18 }] }); assert.ok(r.ok, JSON.stringify(r));
      const s2 = await st('b2'); assert.strictEqual(at(s2, 'RICE'), 482); assert.strictEqual(at(s2, 'OIL'), 75);
      assert.ok(s2.stockLog.some(function (l) { return l.reason === 'ໂອນອອກ' && l.code === 'RICE' && l.delta === -18 && /XB-0001/.test(l.ref); }));
      assert.strictEqual(at(await st('b1'), 'RICE'), 50, 'not received yet');
      assert.strictEqual((await xf('b2', 'send', { id: id })).ok, false, 'cannot send twice');
    });
    await test('device of branch 1 holding old stock saves → nothing lost after receive', async function () {
      const r = await xf('b1', 'receive', { id: id, items: [{ code: 'RICE', qty: 17 }] }); assert.ok(r.ok, JSON.stringify(r)); assert.deepStrictEqual(r.diff.length, 1);
      let s1 = await st('b1'); assert.strictEqual(at(s1, 'RICE'), 67); assert.strictEqual(at(s1, 'OIL'), 15);
      stale1._srcLoc = 'main'; stale1.ingredients.RICE.locs.main = 49; stale1.stockLog.push({ ts: Date.now(), code: 'RICE', delta: -1, reason: 'ຂາຍ', loc: 'main' }); assert.strictEqual(await save('b1', stale1), 'ok');
      s1 = await st('b1'); assert.strictEqual(at(s1, 'RICE'), 66, 'receive kept + sale applied'); assert.strictEqual(at(s1, 'OIL'), 15);
      const l = (await jp('b1', 'xf=list&token=' + T)).list.filter(function (x) { return x.id === id; })[0]; assert.strictEqual(l.status, 'received'); assert.ok(/ຂາດ/.test(l.diff[0]));
      assert.strictEqual((await xf('b1', 'receive', { id: id })).ok, false, 'cannot receive twice');
    });
    await test('warehouse pushes without request; new ingredient created at branch; reject / cancel', async function () {
      const p = await xf('b2', 'create', { branch: 'b1', send: true, items: [{ code: 'MEAT', qty: 4 }] }); assert.ok(p.ok, JSON.stringify(p)); assert.strictEqual(at(await st('b2'), 'MEAT'), 36);
      assert.ok((await xf('b1', 'receive', { id: p.id })).ok); const s1 = await st('b1'); assert.strictEqual(at(s1, 'MEAT'), 4); assert.strictEqual(s1.ingredients.MEAT.cost, 90000);
      const a = await xf('b1', 'create', { branch: 'b2', items: [{ code: 'OIL', qty: 1 }] }), b = await xf('b1', 'create', { branch: 'b2', items: [{ code: 'OIL', qty: 2 }] });
      assert.ok((await xf('b2', 'reject', { id: a.id, note: 'ໝົດ' })).ok); assert.strictEqual((await xf('b2', 'cancel', { id: b.id })).ok, false); assert.ok((await xf('b1', 'cancel', { id: b.id })).ok);
      const L = (await jp('b2', 'xf=list&token=' + T)).list; assert.strictEqual(L.filter(function (x) { return x.id === a.id; })[0].status, 'rejected'); assert.strictEqual(L.filter(function (x) { return x.id === b.id; })[0].status, 'void');
      assert.strictEqual(at(await st('b2'), 'OIL'), 75, 'reject/cancel move nothing');
    });
    await test('third branch only sees its own documents', async function () {
      assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 3') + '&token=' + T)).ok);
      assert.strictEqual((await jp('b3', 'xf=list&token=' + T)).list.length, 0); assert.ok((await jp('b3', 'xf=list&all=1&token=' + T)).list.length >= 4, 'HQ sees all');
      assert.strictEqual((await xf('b3', 'receive', { id: id })).ok, false);
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
