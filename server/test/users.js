/* ທົດສອບໄລຍະ 4 — ພະນັກງານກາງ: ບັນຊີ/PIN ດຽວ ຫຼາຍສາຂາ, ສິດລາຍສາຂາ, ປິດບັນຊີເທື່ອດຽວ ມີຜົນທຸກສາຂາ, ເຄື່ອງເກົ່າຂຽນທັບບໍ່ໄດ້ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3700 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-users-')), T = 'users-master-token-1';
const ph = function (p) { p = 'stpos:' + p; let h = 5381; for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; let h2 = 52711; for (let j = p.length - 1; j >= 0; j--) h2 = ((h2 << 5) + h2 + p.charCodeAt(j)) | 0; return 'h' + (h >>> 0).toString(16) + '.' + (h2 >>> 0).toString(16); };
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: 'users-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(br, tk) { const r = await jp(br, 'gz=1&token=' + encodeURIComponent(tk || T)); if (!r.gz) return r; return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(br, s) { s._v = Math.max(Date.now(), (+s._v || 0) + 1); return (await fetch(ROOT + '/' + br + '/?token=' + T, { method: 'POST', body: JSON.stringify(s) })).text(); }
async function ss(o, tk) { return (await fetch(ROOT + '/b1/?hq=staffSave&by=Owner&token=' + encodeURIComponent(tk || T), { method: 'POST', body: JSON.stringify(o) })).json(); }
const usr = function (s, id) { return (s.users || []).filter(function (u) { return u.id === id; })[0]; };
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const base = { shopName: 'ສາຂາ 1', tables: {}, bills: [], orders: [], catalog: { A: { B: [] } },
      users: [{ id: 'u1', name: 'Owner', role: 'superadmin', pinH: ph('1111') }, { id: 'u2', name: 'Namfon', role: 'cashier', pinH: ph('2222'), perm: { v: { rep: true }, a: {} } }, { id: 'u3', name: 'Pam', role: 'waiter', pinH: ph('3333') }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=users-admin-key-1', { method: 'POST', body: JSON.stringify(base) })).json()).ok);
    for (const nm of ['ສາຂາ 2', 'ສາຂາ 3']) assert.ok((await jp('b1', 'hq=add&name=' + encodeURIComponent(nm) + '&token=' + T)).ok);
    const stale2 = await st('b2');
    await test('staff view merges users of all branches by id (template copies keep ids)', async function () {
      assert.strictEqual((await jp('b1', 'hq=staff')).err, 'token');
      const v = await jp('b1', 'hq=staff&token=' + T); assert.ok(v.ok && v.branches.length === 3);
      const n = v.staff.filter(function (x) { return x.id === 'u2'; })[0]; assert.deepStrictEqual(Object.keys(n.at).sort(), ['b1', 'b2', 'b3']); assert.strictEqual(n.pin, 'same'); assert.ok(v.staff.filter(function (x) { return x.id === 'u1'; })[0].sup);
      const cs = await jp('b1', 'login=pin&uid=u2&pin=2222'); assert.strictEqual((await jp('b1', 'hq=staff&token=' + encodeURIComponent(cs.tk))).err, 'token', 'cashier cannot');
    });
    let mgr;
    await test('new area manager: one PIN, manager in b1 + b2, not in b3', async function () {
      const r = await ss({ name: 'Kham', pin: '4444', roles: { b1: 'manager', b2: 'manager', b3: null } }); assert.ok(r.ok, JSON.stringify(r)); mgr = r.saved;
      assert.deepStrictEqual(r.res.map(function (x) { return x.id + ':' + x.act; }).sort(), ['b1:added', 'b2:added']);
      const a = usr(await st('b1'), mgr), b = usr(await st('b2'), mgr); assert.ok(a && b && !usr(await st('b3'), mgr)); assert.strictEqual(a.pinH, ph('4444')); assert.strictEqual(b.role, 'manager');
    });
    await test('one login works in every branch the user has; refused where not; mybr lists them', async function () {
      const l = await jp('b1', 'login=pin&uid=' + mgr + '&pin=4444'); assert.ok(l.ok);
      assert.strictEqual((await st('b2', l.tk)).shopName, 'ສາຂາ 2'); assert.strictEqual((await st('b3', l.tk)).err, 'token');
      const m = await jp('b2', 'login=mybr&token=' + encodeURIComponent(l.tk)); assert.ok(m.ok); assert.deepStrictEqual(m.branches.map(function (b) { return b.id; }), ['b1', 'b2']);
      assert.strictEqual((await jp('b3', 'login=mybr&token=' + encodeURIComponent(l.tk))).err, 'token');
      assert.strictEqual((await jp('b1', 'hq=list&token=' + encodeURIComponent(l.tk))).err, 'token', 'manager is not HQ');
    });
    await test('validation: duplicate PIN / name in a branch refused, bad PIN, no branch, cannot disable superadmin', async function () {
      assert.ok(/PIN ຊ້ຳ/.test((await ss({ name: 'X', pin: '2222', roles: { b1: 'waiter' } })).err));
      assert.ok(/ຊື່ຊ້ຳ/.test((await ss({ name: 'Pam', pin: '7777', roles: { b2: 'waiter' } })).err));
      assert.ok((await ss({ name: 'X', pin: '12', roles: { b1: 'waiter' } })).err);
      assert.ok((await ss({ name: 'X', pin: '7777', roles: { b1: null } })).err);
      assert.ok((await ss({ id: 'u1', name: 'Owner', active: false })).err);
      assert.ok(!(await ss({ name: 'X', pin: '7777', roles: { b1: 'superadmin' } })).ok, 'superadmin cannot be granted');
    });
    await test('change PIN once → all branches; old sessions end everywhere', async function () {
      const old = await jp('b2', 'login=pin&uid=u2&pin=2222'); assert.ok(old.ok);
      const r = await ss({ id: 'u2', name: 'Namfon', pin: '5555' }); assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.res.length, 3);
      for (const b of ['b1', 'b2', 'b3']) assert.strictEqual(usr(await st(b), 'u2').pinH, ph('5555'));
      assert.strictEqual((await st('b2', old.tk)).err, 'token'); assert.ok((await jp('b3', 'login=pin&uid=u2&pin=5555')).ok);
      assert.ok(usr(await st('b1'), 'u2').perm, 'per-person rights kept when role unchanged');
    });
    await test('disable once → login and sessions refused in all branches; enable again works', async function () {
      const tk = (await jp('b1', 'login=pin&uid=u3&pin=3333')).tk; assert.ok(tk);
      assert.ok((await ss({ id: 'u3', name: 'Pam', active: false })).ok);
      for (const b of ['b1', 'b2', 'b3']) { assert.strictEqual(usr(await st(b), 'u3').active, false); assert.strictEqual((await jp(b, 'login=pin&uid=u3&pin=3333')).ok, false); }
      assert.strictEqual((await st('b1', tk)).err, 'token');
      assert.ok(!(await jp('b1', 'login=info')).users.some(function (u) { return u.id === 'u3'; }));
      assert.ok((await ss({ id: 'u3', name: 'Pam' })).ok); assert.ok((await jp('b2', 'login=pin&uid=u3&pin=3333')).ok); assert.ok(!('active' in usr(await st('b2'), 'u3')));
    });
    await test('role per branch: change in b2 only (rights reset there), remove from b3', async function () {
      const r = await ss({ id: 'u2', name: 'Namfon', roles: { b2: 'manager', b3: null } }); assert.ok(r.ok, JSON.stringify(r));
      assert.strictEqual(usr(await st('b1'), 'u2').role, 'cashier'); const b2u = usr(await st('b2'), 'u2'); assert.strictEqual(b2u.role, 'manager'); assert.ok(!b2u.perm);
      assert.ok(!usr(await st('b3'), 'u2')); assert.strictEqual((await jp('b3', 'login=pin&uid=u2&pin=5555')).ok, false);
      const back = await ss({ id: 'u2', name: 'Namfon', roles: { b3: 'cashier' } }); assert.ok(back.ok); assert.strictEqual(usr(await st('b3'), 'u2').pinH, ph('5555'), 'PIN copied from other branch');
    });
    await test('device holding the old user list cannot bring it back; its bill is kept; local edits after sync still work', async function () {
      stale2.bills.push({ receipt: 'S1', ts: Date.now(), total: 1, items: [] }); assert.strictEqual(await save('b2', stale2), 'ok');
      const b2 = await st('b2'); assert.ok(usr(b2, mgr)); assert.strictEqual(usr(b2, 'u2').pinH, ph('5555')); assert.ok(b2.bills.some(function (b) { return b.receipt === 'S1'; }));
      b2.users.push({ id: 'u9', name: 'Local', role: 'waiter', pinH: ph('9999') }); assert.strictEqual(await save('b2', b2), 'ok'); assert.ok(usr(await st('b2'), 'u9'), 'branch-own user kept');
      const v = await jp('b1', 'hq=staff&token=' + T); assert.deepStrictEqual(Object.keys(v.staff.filter(function (x) { return x.id === 'u9'; })[0].at), ['b2']); assert.ok(v.log.length >= 5);
    });
    await test('superadmin: name + PIN change reaches every branch, role untouched', async function () {
      const r = await ss({ id: 'u1', name: 'Boss', pin: '1212', roles: { b2: 'cashier' } }); assert.ok(r.ok, JSON.stringify(r));
      for (const b of ['b1', 'b2', 'b3']) { const u = usr(await st(b), 'u1'); assert.strictEqual(u.name, 'Boss'); assert.strictEqual(u.role, 'superadmin'); assert.strictEqual(u.pinH, ph('1212')); }
      const l = await jp('b3', 'login=pin&uid=u1&pin=1212'); assert.ok((await jp('b1', 'hq=staff&token=' + encodeURIComponent(l.tk))).ok, 'superadmin session is HQ');
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
