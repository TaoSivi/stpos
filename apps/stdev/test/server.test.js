/* ທົດສອບ server ທັງໝົດ: ບັນຊີກາງ (ເບີ+PIN, ລັອກ, token), ລະດັບສິດ superadmin/admin/user, ສິດຕໍ່ໂມດູນ (ນ້ຳມັນ / HR), ການເຂົ້າ HR ດ້ວຍບັນຊີດຽວ, static ປອດໄພ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3950 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-t-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: JSON.stringify(o || {}) }).then(function (r) { return r.json(); }); };
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
const P = { sa: '02055550001', ad: '02055550002', drv: '02055550003', hronly: '02055550004', head: '02055550005' };
const T = {}; const login = async function (k, pin) { const r = await call('login', { phone: P[k], pin: pin }); assert.ok(r.ok, k + ' ' + JSON.stringify(r)); T[k] = r.token; return r; };
(async function () {
  try {
    /* ----- ສ້າງຜ່ານ CLI ----- */
    assert.ok(cli('adduser', '020 5555 0001', 'ຊູບເປີ', '4321', 'superadmin').stdout.indexOf('ok 02055550001') === 0);
    assert.ok(cli('adduser', P.ad, 'ແອດມິນ', '1111', 'admin').status === 0);
    assert.ok(cli('adduser', P.drv, 'ລົມ', '1357', 'user', '--fuel=driver').status === 0);
    assert.ok(cli('adduser', P.hronly, 'ບັນຊີ HR', '2468', 'user', '--hr').status === 0);
    assert.ok(cli('adduser', P.head, 'ຫົວໜ້າ', '9753', 'user', '--fuel=head', '--hr', '--sites=s1').status === 0);
    assert.ok(cli('adduser', '123', 'x', '1234', 'user', '--hr').status === 1, 'short phone');
    assert.ok(cli('adduser', '02055550009', 'x', '12', 'user', '--hr').status === 1, 'short pin');
    assert.ok(cli('adduser', '02055550009', 'x', '1234', 'user').status === 1, 'user with no module');
    assert.ok(cli('adduser', '02055550009', 'x', '1234', 'user', '--fuel=king').status === 1, 'bad fuel role');
    assert.ok(cli('adduser', '02055550009', 'x', '1234', 'boss', '--hr').status === 1, 'bad level');
    proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await new Promise(function (r) { setTimeout(r, 900); });

    /* ----- ເຂົ້າລະບົບ ----- */
    const o = await login('sa', '4321'); assert.deepStrictEqual([o.level, o.fuel, o.hr], ['superadmin', 'owner', false /* HR ຍັງບໍ່ສ້າງ */]); ok('login with phone (any formatting) + PIN; reply says which modules the account has');
    assert.ok(!fs.readFileSync(path.join(DATA, 'users.json'), 'utf8').match(/4321|1357|2468/), 'PIN is stored hashed'); ok('PIN is never stored in plain text');
    await login('ad', '1111'); await login('drv', '1357'); await login('hronly', '2468'); await login('head', '9753');
    assert.strictEqual((await call('me', {})).error, 'auth'); assert.strictEqual((await call('me', { token: T.sa + 'x' })).error, 'auth'); ok('no / forged token refused');

    /* ----- ສິດຕາມໂມດູນ (ກ່ອນມີ HR) ----- */
    assert.strictEqual((await call('init', { token: T.hronly })).error, 'noapp'); assert.strictEqual((await call('sheet', { token: T.hronly, site: 's1', date: '2026-11-20' })).error, 'noapp'); assert.strictEqual((await call('drivers', { token: T.hronly })).error, 'noapp'); ok('HR-only account cannot use any fuel function');
    assert.strictEqual((await call('hrlogin', { token: T.drv })).error, 'noapp'); ok('fuel-only account cannot enter HR');
    assert.ok((await call('init', { token: T.sa })).ok && (await call('init', { token: T.ad })).ok); ok('superadmin and admin get the fuel module without being listed');
    assert.strictEqual((await call('cfgSave', { token: T.head, cfg: {} })).error, 'auth'); assert.strictEqual((await call('cfgSave', { token: T.drv, cfg: {} })).error, 'auth'); assert.ok((await call('cfgSave', { token: T.ad, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 } }], vehicles: [{ id: 'v1', name: 'ລົດ', site: 's1', driver: P.drv, tank: { t: 'lpc', k: 5 } }] } })).ok); ok('fuel settings: admin level yes, head / driver no');
    assert.strictEqual((await call('drivers', { token: T.drv })).error, 'auth'); assert.deepStrictEqual((await call('drivers', { token: T.head })).data.map(function (x) { return x.phone; }), [P.drv]); ok('driver list: staff yes, driver no');

    /* ----- ຈັດການບັນຊີ: ໃຜແກ້ໃຜໄດ້ ----- */
    assert.strictEqual((await call('userList', { token: T.drv })).error, 'auth'); assert.strictEqual((await call('userList', { token: T.head })).error, 'auth'); assert.ok((await call('userList', { token: T.ad })).ok); ok('user list: superadmin / admin only');
    const mk = function (tk, u) { return call('userSave', { token: tk, user: u }); };
    assert.ok((await mk(T.ad, { phone: '02055550006', name: 'ໃໝ່', pin: '2222', level: 'user', fuel: 'admin', sites: ['s1'] })).ok); ok('admin can create a user-level account with chosen modules');
    assert.strictEqual((await mk(T.ad, { phone: '02055550007', name: 'x', pin: '2222', level: 'admin' })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: '02055550007', name: 'x', pin: '2222', level: 'superadmin' })).error, 'auth'); ok('admin cannot create admin / superadmin');
    assert.strictEqual((await mk(T.ad, { phone: P.sa, name: 'x', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: P.ad, role: 'x', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: P.sa, active: false })).error, 'auth'); ok('admin cannot edit, demote or disable a superadmin or an admin');
    assert.strictEqual((await mk(T.drv, { phone: '02055550008', name: 'x', pin: '2222', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.head, { phone: P.drv, hr: true })).error, 'auth'); ok('plain users cannot create or change accounts');
    assert.ok((await mk(T.sa, { phone: '02055550007', name: 'ແອດມິນ 2', pin: '3333', level: 'admin' })).ok); ok('superadmin can create an admin');
    assert.strictEqual((await mk(T.ad, { phone: '02055550006', level: 'user', fuel: '', hr: false })).error, 'nomodule', 'cannot strip all modules'); assert.strictEqual((await mk(T.sa, { phone: '02055550009', name: 'x', pin: '12', level: 'user', hr: true })).error, 'pin'); assert.strictEqual((await mk(T.sa, { phone: '02055550009', name: 'x', pin: '1234', level: 'user', fuel: 'king' })).error, 'role'); ok('bad module set / PIN / role refused');
    assert.strictEqual((await mk(T.sa, { phone: P.sa, level: 'admin' })).error, 'lastsuper'); assert.strictEqual((await mk(T.sa, { phone: P.sa, active: false })).error, 'lastsuper'); ok('the last superadmin cannot be demoted or disabled');
    const pl = (await call('userList', { token: T.ad })).data, ed = {}; pl.forEach(function (u) { ed[u.phone] = u.editable; }); assert.deepStrictEqual([ed[P.sa], ed[P.ad], ed[P.drv]], [false, false, true]); ok('list tells the admin which rows are editable');
    assert.ok((await mk(T.ad, { phone: P.drv, hr: true })).ok); const drvAfter = (await login('drv', '1357')); assert.deepStrictEqual([drvAfter.fuel, drvAfter.level], ['driver', 'user']); ok('one account, modules added later without re-creating it');

    /* ----- PIN ----- */
    assert.strictEqual((await call('pin', { token: T.drv, old: '9999', pin: '8642' })).error, 'oldpin');
    const np = await call('pin', { token: T.drv, old: '1357', pin: '8642' }); assert.ok(np.ok);
    assert.strictEqual((await call('me', { token: T.drv })).error, 'auth', 'old token dies'); assert.ok((await call('me', { token: np.token })).ok); ok('changing PIN needs the old PIN and ends old sessions');
    await mk(T.sa, { phone: '02055550006', active: false }); assert.strictEqual((await call('login', { phone: '02055550006', pin: '2222' })).ok, false); ok('disabled account cannot log in');
    let last; for (let i = 0; i < 5; i++) last = await call('login', { phone: P.drv, pin: '0000' });
    assert.strictEqual(last.error, 'login'); assert.strictEqual((await call('login', { phone: P.drv, pin: '8642' })).error, 'locked'); ok('5 wrong PINs lock the phone for 15 minutes');
    assert.strictEqual((await call('login', { phone: '09999999999', pin: '1111' })).error, 'login'); ok('unknown phone gives the same error as a wrong PIN');

    /* ----- ໂມດູນ HR (ໂຄ້ດເດີມ) ----- */
    const hrOn = fs.existsSync(path.join(__dirname, '..', '..', '..', 'server', 'hr.js')) && fs.existsSync(path.join(__dirname, '..', '..', 'hr', 'index.html'));
    if (!hrOn) console.log('  (skip HR: ຫາ server/hr.js ຫຼື apps/hr ບໍ່ເຫັນ)');
    else {
      assert.strictEqual((await call('hrlogin', { token: T.sa })).error, 'nohr', 'before setup'); ok('HR not set up yet → clear error');
      proc.kill(); await new Promise(function (r) { setTimeout(r, 300); });
      const s = cli('hr-setup', 'ບໍລິສັດທົດລອງ', 'ເຈົ້າຂອງ HR', '7777'); assert.ok(s.stdout.indexOf('ok HR') === 0, s.stdout + s.stderr);
      proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await new Promise(function (r) { setTimeout(r, 1200); });
      await login('sa', '4321'); await login('ad', '1111'); await login('head', '9753'); await login('hronly', '2468');
      assert.strictEqual((await call('me', { token: T.sa })).data.hr, true); assert.strictEqual((await call('me', { token: T.hronly })).data.fuel, ''); ok('me: shows which modules this account can open');
      const hs = await call('hrlogin', { token: T.sa }); assert.ok(hs.ok && hs.data.hr.token && hs.data.hr.member, JSON.stringify(hs).slice(0, 200)); ok('superadmin enters HR with no HR PIN');
      const hu = await call('hrlogin', { token: T.hronly }); assert.ok(hu.ok && hu.data.hr.token); assert.notStrictEqual(hu.data.hr.member.id || hu.data.hr.member.employeeId, hs.data.hr.member.id || hs.data.hr.member.employeeId); ok('HR-only user enters HR as their own employee (auto-created)');
      const again = await call('hrlogin', { token: T.hronly }); assert.strictEqual(again.data.hr.member.id || again.data.hr.member.employeeId, hu.data.hr.member.id || hu.data.hr.member.employeeId); ok('second entry reuses the same HR employee');
      assert.strictEqual((await call('hrlogin', { token: np.token })).ok, true, 'driver was given hr above'); await mk(T.ad, { phone: P.hronly, hr: false, fuel: 'office' }); assert.strictEqual((await call('hrlogin', { token: T.hronly })).error, 'noapp', 'hr switched off'); ok('switching a user\'s HR access off blocks new HR entries');
      const info = await (await fetch(H + '/api/hr', { method: 'POST', body: JSON.stringify({ action: 'info' }) })).json(); assert.ok(info.ok, JSON.stringify(info)); ok('/api/hr speaks the HR protocol');
      const pg = await fetch(H + '/hr/'); assert.strictEqual(pg.status, 200); assert.ok((await pg.text()).indexOf('<') >= 0);
      for (const p of ['/hr/..%2f..%2f..%2fserver%2fapp.js', '/hr/../index.html', '/hr/%2e%2e/%2e%2e/stdev/server.js']) assert.ok((await fetch(H + p)).status !== 200 || !(await (await fetch(H + p)).text()).includes('createServer'), p); ok('/hr/ serves the HR app and cannot escape its folder');
    }
    for (const p of ['/..%2f..%2fserver.js', '/../server.js', '/%2e%2e/accounts.js']) assert.ok((await fetch(H + p)).status >= 400, p);
    assert.strictEqual((await fetch(H + '/')).status, 200); assert.ok((await fetch(H + '/app.js')).headers.get('content-security-policy')); ok('static files cannot escape public/, pages carry CSP');
    console.log('server: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); }
})();
