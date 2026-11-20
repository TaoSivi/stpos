/* ທົດສອບ server ທັງໝົດ: ບັນຊີກາງ (ເບີ+PIN, ລັອກ, token), ລະດັບສິດ superadmin/admin/user, ສິດຕໍ່ໂມດູນ (ນ້ຳມັນ / HR), ການເຂົ້າ HR ດ້ວຍບັນຊີດຽວ, static ປອດໄພ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3950 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-t-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: JSON.stringify(o || {}) }).then(function (r) { return r.json(); }); };
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
const P = { sa: '02055550001', ad: '02055550002', drv: '02055550003', hronly: '02055550004', head: '02055550005' };
const login2 = function (ph, pin) { return call('login', { phone: ph, pin: pin }); };
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
    const stored = JSON.parse(fs.readFileSync(path.join(DATA, 'users.json'), 'utf8')); Object.keys(stored).forEach(function (k) { assert.ok(/^[0-9a-f]{16}:[0-9a-f]{64}$/.test(stored[k].pinH), 'scrypt salt:hash'); assert.ok(!('pin' in stored[k]), 'no plain PIN field'); }); ok('PIN is never stored in plain text');
    await login('ad', '1111'); await login('drv', '1357'); await login('hronly', '2468'); await login('head', '9753');
    assert.strictEqual((await call('me', {})).error, 'auth'); assert.strictEqual((await call('me', { token: T.sa + 'x' })).error, 'auth'); ok('no / forged token refused');
    const mm = (await call('me', { token: T.sa })).data; assert.deepStrictEqual(mm.apps.map(function (x) { return x.id; }), ['fuel', 'people', 'sop']); assert.deepStrictEqual((await call('me', { token: T.drv })).data.apps.map(function (x) { return x.id; }), ['fuel'], 'plain users never see the people app'); assert.strictEqual(mm.apps[0].href, 'office.html'); assert.strictEqual((await call('me', { token: T.drv })).data.apps[0].href, 'driver.html'); assert.strictEqual((await call('me', { token: T.hronly })).data.apps.length, 0, 'HR not set up yet'); assert.strictEqual(o.napps, 3); ok('launcher registry: me.apps lists only the apps this account can open, with the right entry page');
    assert.deepStrictEqual((await call('catalog', { token: T.sa })).data.map(function (x) { return x.id; }), ['sop'], 'only generic apps are offered for ticking'); assert.strictEqual((await call('catalog', { token: T.drv })).error, 'auth'); assert.strictEqual((await call('sop.list', { token: T.sa })).error, 'action', 'registered app, unknown action'); assert.strictEqual((await call('nope.x', { token: T.sa })).error, 'noapp'); ok('<app>.<action> routes only to registered apps; unknown app is refused');
    assert.ok((await call('userSave', { token: T.sa, user: { phone: '02055550031', name: 'ອາ', pin: '1212', level: 'user', apps: ['sop', 'fuel', 'BAD ID', 'sop'] } })).ok); const g = (await call('userList', { token: T.sa })).data.filter(function (u) { return u.phone === '02055550031'; })[0]; assert.deepStrictEqual(g.apps, ['sop'], 'apps are validated, deduped, fuel/hr excluded'); assert.strictEqual((await call('login', { phone: '02055550031', pin: '1212' })).napps, 1, 'a ticked registered app gives a launcher tile'); ok('generic per-user apps are stored (validated) for future apps like SOP');
    const sch = (await call('schema', { token: T.sa })).data; assert.deepStrictEqual(sch.fuel.rights.map(function (x) { return x.k; }), ['view', 'issue', 'tank', 'assign', 'approve', 'ack', 'fixAck', 'request', 'reqOk', 'urgent']); assert.deepStrictEqual(sch.fuel.presets.head, ['view', 'issue', 'assign', 'approve', 'fixAck', 'request', 'reqOk', 'urgent']); assert.deepStrictEqual(sch.fuel.presets.tech, ['request']); assert.strictEqual((await call('schema', { token: T.drv })).error, 'auth'); ok('schema: fuel functions + role presets are served to admins only');
    assert.ok((await call('userSave', { token: T.sa, user: { phone: '02055550051', name: 'ບໍລິຫານ+ມອບລົດ', pin: '5151', level: 'user', fuel: 'admin', sites: ['s1'], fuelRights: ['view', 'issue', 'tank', 'assign', 'bad key!', 'view'] } })).ok);
    const tk = await login2('02055550051', '5151'); assert.deepStrictEqual(tk.fuelRights, ['view', 'issue', 'tank', 'assign'], 'ticks validated + deduped'); assert.strictEqual(tk.approver, false, 'no approve tick = not an approver');
    assert.strictEqual((await call('me', { token: tk.token })).data.apps[0].href, 'office.html');
    assert.ok((await call('userSave', { token: T.sa, user: { phone: '02055550051', fuelRights: ['view', 'approve'] } })).ok); assert.strictEqual((await login2('02055550051', '5151')).approver, true, 'ticking approve makes the person an approver');
    assert.ok((await call('userSave', { token: T.sa, user: { phone: '02055550052', name: 'ຄົນຂັບ+ເບິ່ງ', pin: '5252', level: 'user', fuel: 'driver', fuelRights: ['ack', 'view'], sites: ['s1'] } })).ok); assert.strictEqual((await call('me', { token: (await login2('02055550052', '5252')).token })).data.apps[0].href, 'office.html', 'a driver with extra ticks gets the office page');
    ok('tick rights: stored, validated, drive the entry page and the approver flag');

    /* ----- ສິດຕາມໂມດູນ (ກ່ອນມີ HR) ----- */
    assert.strictEqual((await call('init', { token: T.hronly })).error, 'noapp'); assert.strictEqual((await call('sheet', { token: T.hronly, site: 's1', date: '2026-11-20' })).error, 'noapp'); assert.strictEqual((await call('drivers', { token: T.hronly })).error, 'noapp'); ok('HR-only account cannot use any fuel function');
    assert.strictEqual((await call('hrlogin', { token: T.drv })).error, 'noapp'); ok('fuel-only account cannot enter HR');
    assert.ok((await call('init', { token: T.sa })).ok && (await call('init', { token: T.ad })).ok); ok('superadmin and admin get the fuel module without being listed');
    assert.strictEqual((await call('cfgSave', { token: T.head, cfg: {} })).error, 'auth'); assert.strictEqual((await call('cfgSave', { token: T.drv, cfg: {} })).error, 'auth'); assert.ok((await call('cfgSave', { token: T.ad, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 } }], vehicles: [{ id: 'v1', name: 'ລົດ', site: 's1', driver: P.drv, tank: { t: 'lpc', k: 5 } }] } })).ok); ok('fuel settings: admin level yes, head / driver no');
    assert.strictEqual((await call('approvers', { token: T.drv, site: 's1' })).error, 'auth', 'drivers cannot list approvers'); const apv = (await call('approvers', { token: T.head, site: 's1' })).data; assert.ok(Array.isArray(apv) && apv.some(function (x) { return x.me; }) && apv.some(function (x) { return x.phone === P.sa; }), 'head (reqOk) and Super admin are approvers');
    assert.strictEqual((await call('drivers', { token: T.drv })).error, 'auth'); assert.deepStrictEqual((await call('drivers', { token: T.head })).data.map(function (x) { return x.phone; }).sort(), [P.drv, P.head, '02055550051', '02055550052']); ok('driver list: every active fuel user (a driver cannot list)');
    const ra = await call('assign', { token: T.head, site: 's1', v: 'v1', driver: '02055550051' }); assert.ok(ra.ok); assert.ok((await login2('02055550051', '5151')).fuelRights.indexOf('ack') >= 0, 'assigning a car gives the person the acknowledge right'); ok('assign car to a non-driver adds the acknowledge right');

    /* ----- ຈັດການບັນຊີ: ໃຜແກ້ໃຜໄດ້ ----- */
    assert.strictEqual((await call('userList', { token: T.drv })).error, 'auth'); assert.strictEqual((await call('userList', { token: T.head })).error, 'auth'); assert.ok((await call('userList', { token: T.ad })).ok); ok('user list: superadmin / admin only');
    const mk = function (tk, u) { return call('userSave', { token: tk, user: u }); };
    assert.ok((await mk(T.ad, { phone: '02055550006', name: 'ໃໝ່', pin: '2222', level: 'user', fuel: 'admin', sites: ['s1'] })).ok); ok('admin can create a user-level account with chosen modules');
    assert.ok((await mk(T.ad, { phone: '02055550006', approver: true })).ok); assert.strictEqual((await call('userList', { token: T.ad })).data.filter(function (u) { return u.phone === '02055550006'; })[0].approver, true); assert.strictEqual((await call('login', { phone: '02055550006', pin: '2222' })).approver, true); assert.strictEqual((await login('ad', '1111')).approver, true, 'admin level always approves'); assert.strictEqual((await login('drv', '1357')).approver, false); ok('approver flag: set by admin, shown in list + login, admins always approve');
    assert.strictEqual((await mk(T.ad, { phone: '02055550007', name: 'x', pin: '2222', level: 'admin' })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: '02055550007', name: 'x', pin: '2222', level: 'superadmin' })).error, 'auth'); ok('admin cannot create admin / superadmin');
    assert.strictEqual((await mk(T.ad, { phone: P.sa, name: 'x', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: P.ad, role: 'x', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.ad, { phone: P.sa, active: false })).error, 'auth'); ok('admin cannot edit, demote or disable a superadmin or an admin');
    assert.strictEqual((await mk(T.drv, { phone: '02055550008', name: 'x', pin: '2222', level: 'user', hr: true })).error, 'auth'); assert.strictEqual((await mk(T.head, { phone: P.drv, hr: true })).error, 'auth'); ok('plain users cannot create or change accounts');
    assert.ok((await mk(T.sa, { phone: '02055550007', name: 'ແອດມິນ 2', pin: '3333', level: 'admin' })).ok); ok('superadmin can create an admin');
    assert.strictEqual((await mk(T.ad, { phone: '02055550006', level: 'user', fuel: '', hr: false })).error, 'nomodule', 'cannot strip all modules'); assert.strictEqual((await mk(T.sa, { phone: '02055550009', name: 'x', pin: '12', level: 'user', hr: true })).error, 'pin'); assert.strictEqual((await mk(T.sa, { phone: '02055550009', name: 'x', pin: '1234', level: 'user', fuel: 'king' })).error, 'role'); ok('bad module set / PIN / role refused');
    assert.strictEqual((await mk(T.sa, { phone: P.sa, level: 'admin' })).error, 'lastsuper'); assert.strictEqual((await mk(T.sa, { phone: P.sa, active: false })).error, 'lastsuper'); ok('the last superadmin cannot be demoted or disabled');
    const pl = (await call('userList', { token: T.ad })).data, ed = {}; pl.forEach(function (u) { ed[u.phone] = u.editable; }); assert.deepStrictEqual([ed[P.sa], ed[P.ad], ed[P.drv]], [false, false, true]); ok('list tells the admin which rows are editable');
    assert.ok((await mk(T.ad, { phone: P.drv, hr: true })).ok); const drvAfter = (await login('drv', '1357')); assert.deepStrictEqual([drvAfter.fuel, drvAfter.level], ['driver', 'user']); ok('one account, modules added later without re-creating it');

    /* ----- ຕົວເລກລໍຮັບຮູ້ ເທິງໄອຄອນ + ສຳຮອງຂໍ້ມູນ ----- */
    { const pd = await call('pending', { token: T.drv }); assert.ok(pd.ok && typeof pd.data.n === 'number' && pd.data.n === pd.data.wait + pd.data.rej, JSON.stringify(pd)); assert.strictEqual((await call('pending', { token: T.hronly })).error, 'noapp'); ok('pending counter answers for fuel users and is refused for HR-only accounts');
      const bk = require('../backup'), r1 = bk.run(DATA, true); assert.ok(fs.existsSync(path.join(r1.dest, 'users.json')) && fs.existsSync(path.join(r1.dest, 'fuel')) && !fs.existsSync(path.join(r1.dest, 'backups')), 'backup copies data, not itself');
      assert.strictEqual(bk.run(DATA).skipped, true, 'once a day'); ok('daily backup copies the data folder (not itself) and runs once a day'); }
    /* ----- ໜຶ່ງຄົນ ສອງໜ້າວຽກ: ຄົນເບີກ + ຄົນຂັບ ----- */
    assert.ok((await mk(T.sa, { phone: '02055550061', name: 'ເບີກ+ຂັບ', pin: '5151', level: 'user', fuel: 'admin', sites: ['s1'], fuelRights: ['view', 'issue', 'tank', 'ack'] })).ok);
    assert.ok((await call('drivers', { token: T.head })).data.some(function (x) { return x.phone === '02055550061'; })); ok('a clerk who also ticked "acknowledge" appears in the driver list (one person, two jobs)');
    await mk(T.sa, { phone: '02055550061', active: false });
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
      /* ໃບໜ້າ: ລົງທະບຽນຄັ້ງດຽວ ຕ້ອງຢູ່ຖາວອນໃນ server ເຖິງຈະເຂົ້າ HR ໃໝ່ ຫຼື ແອດມິນບັນທຶກຄົນນີ້ */
      { const hid = hu.data.hr.member.employeeId || hu.data.hr.member.id, tk = hu.data.hr.token;
        const hp = async function (o) { return (await (await fetch(H + '/api/hr', { method: 'POST', body: JSON.stringify(o) })).json()); };
        const desc = Array.from({ length: 128 }, function (_, i) { return i / 1000; });
        const cur = (await hp({ action: 'get', token: tk, collection: 'employees', id: hid })); assert.ok(cur.ok, JSON.stringify(cur).slice(0, 200)); const e0 = cur.data.data || cur.data;
        const r1 = await hp({ action: 'upsert', token: tk, collection: 'employeeSecret', id: hid, data: { faceEnrolled: desc, facePoses: [desc, desc] } }); assert.ok(r1.ok, 'secret save: ' + JSON.stringify(r1).slice(0, 200));
        const r2 = await hp({ action: 'upsert', token: tk, collection: 'employees', id: hid, data: Object.assign({}, e0, { faceCount: 3, faceConsentAt: new Date().toISOString(), deviceId: 'd-test' }) }); assert.ok(r2.ok, 'employee save: ' + JSON.stringify(r2).slice(0, 200));
        /* ພະນັກງານທີ່ມີເງິນເດືອນຢູ່ໃນ record ເດີມ: ບັນທຶກໃບໜ້າຕ້ອງບໍ່ຕິດ "ແກ້ຂໍ້ມູນນີ້ເອງບໍ່ໄດ້: baseSalary" ແລະເງິນເດືອນຕ້ອງບໍ່ຫາຍ ຫຼື ແກ້ເອງໄດ້ */
        const base0 = Object.assign({}, (await hp({ action: 'get', token: tk, collection: 'employees', id: hid })).data.data, { baseSalary: 5000000 });
        const hsTk = (await call('hrlogin', { token: T.sa })).data.hr.token; assert.ok((await hp({ action: 'upsert', token: hsTk, collection: 'employees', id: hid, data: base0 })).ok, 'owner seeds a legacy pay field');
        const noPay = Object.assign({}, base0); delete noPay.baseSalary;
        const rp1 = await hp({ action: 'upsert', token: tk, collection: 'employees', id: hid, data: Object.assign({}, noPay, { faceCount: 3 }) }); assert.ok(rp1.ok, 'self save without pay keys: ' + JSON.stringify(rp1).slice(0, 200));
        assert.strictEqual(((await hp({ action: 'get', token: hsTk, collection: 'employees', id: hid })).data.data || {}).baseSalary, 5000000, 'stored pay is kept');
        assert.ok((await hp({ action: 'upsert', token: tk, collection: 'employeePay', id: hid, data: { baseSalary: 5000000, allowance: 0, payMethod: 'cash' } })).ok, 'unchanged own pay is a no-op');
        assert.ok(!(await hp({ action: 'upsert', token: tk, collection: 'employeePay', id: hid, data: { baseSalary: 9000000, allowance: 0, payMethod: 'cash' } })).ok, 'raising own pay is still refused');
        assert.ok(!(await hp({ action: 'upsert', token: tk, collection: 'employees', id: hid, data: Object.assign({}, noPay, { baseSalary: 9000000 }) })).ok, 'changing own pay in the employee record is still refused');
        ok('saving a face as an employee whose pay is stored in the old place works, keeps the pay, and cannot be used to change it');
        await call('userSave', { token: T.sa, user: { phone: P.hronly, hrRole: 'head' } });
        const again2 = await call('hrlogin', { token: T.hronly }); const tk2 = again2.data.hr.token;
        const sec = await hp({ action: 'list', token: tk2, collection: 'employeeSecret' }); assert.ok(sec.ok && sec.data.length === 1 && (sec.data[0].data.faceEnrolled || []).length === 128, 'face template survives re-login + admin save: ' + JSON.stringify(sec).slice(0, 200));
        const emp2 = await hp({ action: 'get', token: tk2, collection: 'employees', id: hid }); const ed = emp2.data.data || emp2.data; assert.ok(ed.faceCount === 3 && ed.deviceId === 'd-test', 'public face fields survive admin save: ' + JSON.stringify(ed).slice(0, 300));
        ok('face enrolment is stored on the server and survives re-login and an admin save'); }
      const hrList = async function () { const r = await (await fetch(H + '/api/hr', { method: 'POST', body: JSON.stringify({ action: 'list', token: hs.data.hr.token, collection: 'employees' }) })).json(); assert.ok(r.ok, JSON.stringify(r).slice(0, 200)); return r.data; };
      const find = function (rows, ph) { return rows.map(function (x) { return x.data || x; }).filter(function (e) { return e && e.posUid === ph; })[0]; };
      const pv = await call('userSave', { token: T.sa, user: { phone: '02055550041', name: 'ພະນັກງານ HR', pin: '3434', level: 'user', hr: true, hrRole: 'head' } }); assert.ok(pv.ok && pv.data.hr === 'ok', JSON.stringify(pv));
      let emp = find(await hrList(), '02055550041'); assert.ok(emp, 'HR employee created at once, no second entry'); assert.strictEqual(emp.name, 'ພະນັກງານ HR'); assert.ok(emp.roles.indexOf('head') >= 0 && emp.roles.indexOf('employee') >= 0); ok('one form: the person appears in HR immediately, with the HR role chosen');
      const pv2 = await call('userSave', { token: T.sa, user: { phone: '02055550041', name: 'ຊື່ໃໝ່', hrRole: 'accountant' } }); assert.strictEqual(pv2.data.hr, 'ok'); emp = find(await hrList(), '02055550041'); assert.strictEqual(emp.name, 'ຊື່ໃໝ່'); assert.ok(emp.roles.indexOf('accountant') >= 0 && emp.roles.indexOf('head') < 0); ok('renaming / changing the HR role in the one form updates HR too');
      assert.strictEqual((await call('userSave', { token: T.sa, user: { phone: '02055550041', hrRole: 'owner' } })).error, 'role'); assert.strictEqual((await call('userSave', { token: T.sa, user: { phone: '02055550042', name: 'x', pin: '3434', level: 'user', fuel: 'driver' } })).data.hr, 'skip'); ok('HR role is validated (cannot grant owner); no HR access = nothing created in HR');
      const hsc = (await call('schema', { token: T.sa })).data.hr; assert.ok(hsc && hsc.groups.length === 3 && hsc.groups.reduce(function (n, g) { return n + g.items.length; }, 0) === 29, 'all 29 HR rights are listed'); assert.ok(hsc.presets.head.indexOf('scan.review') >= 0 && hsc.presets.employee.length === 0); ok('schema: HR serves all 29 rights (menus / functions / scope) with role presets');
      const base = hsc.presets.head, want = base.filter(function (k) { return k !== 'override'; }).concat('p.pay');
      await call('userSave', { token: T.sa, user: { phone: '02055550041', hrRole: 'head', hrRights: want } }); emp = find(await hrList(), '02055550041'); assert.deepStrictEqual(emp.perm, { 'p.pay': true, override: false }, 'only the difference from the role preset is written to HR'); assert.ok(emp.roles.indexOf('head') >= 0);
      await call('userSave', { token: T.sa, user: { phone: '02055550041', name: 'ຊື່ອື່ນອີກ' } }); emp = find(await hrList(), '02055550041'); assert.deepStrictEqual(emp.perm, { 'p.pay': true, override: false }, 'a save that does not touch HR ticks leaves them alone');
      await call('userSave', { token: T.sa, user: { phone: '02055550041', hrRights: base } }); emp = find(await hrList(), '02055550041'); assert.ok(!emp.perm, 'ticks equal to the preset = no per-person overrides');
      ok('HR function ticks become employee.perm (difference from the role preset), untouched saves keep them, resetting clears them');
      assert.strictEqual((await call('login', { phone: '02055550041', pin: '3434' })).hrRole, 'head', 'login reply carries the HR role');
      assert.strictEqual((await call('hrlogin', { token: np.token })).ok, true, 'driver was given hr above'); await mk(T.ad, { phone: P.hronly, hr: false, fuel: 'office' }); assert.strictEqual((await call('hrlogin', { token: T.hronly })).error, 'noapp', 'hr switched off'); ok('switching a user\'s HR access off blocks new HR entries');
      const info = await (await fetch(H + '/api/hr', { method: 'POST', body: JSON.stringify({ action: 'info' }) })).json(); assert.ok(info.ok, JSON.stringify(info)); ok('/api/hr speaks the HR protocol');
      { const ri = await call('hrreport.info', { token: T.sa }); assert.ok(ri.ok && ri.data.cycles.previous.from < ri.data.cycles.previous.to && Array.isArray(ri.data.branches), JSON.stringify(ri).slice(0, 200));
        const rb = await call('hrreport.build', { token: T.sa, from: ri.data.cycles.current.from, to: ri.data.cycles.current.to }); assert.ok(rb.ok && Buffer.from(rb.data.b64, 'base64').slice(0, 2).toString() === 'PK' && rb.data.employees >= 1 && /\.xlsx$/.test(rb.data.name), JSON.stringify(rb).slice(0, 200));
        assert.strictEqual((await call('hrreport.build', { token: T.sa, from: 'x', to: 'y' })).error, 'date'); assert.strictEqual((await call('hrreport.build', { token: T.sa, from: '2026-01-01', to: '2026-12-31' })).error, 'range'); assert.strictEqual((await call('hrreport.build', { token: T.sa, from: '2026-01-01', to: '2026-01-31', dept: 'ບໍ່ມີພະແນກນີ້' })).error, 'noemp');
        assert.strictEqual((await call('hrreport.info', { token: np.token })).error, 'noapp'); assert.ok(!(await call('me', { token: T.sa })).data.apps.some(function (x) { return x.id === 'hrreport'; })); /* ຢູ່ໃນ HR ແລ້ວ ບໍ່ແມ່ນແອັບແຍກໃນໜ້າຫຼັກ */ ok('HR Excel report: API builds a real .xlsx for admins, validates dates/range/filters, hidden from plain users'); }
      const pg = await fetch(H + '/hr/'); assert.strictEqual(pg.status, 200); assert.ok((await pg.text()).indexOf('<') >= 0);
      for (const p of ['/hr/..%2f..%2f..%2fserver%2fapp.js', '/hr/../index.html', '/hr/%2e%2e/%2e%2e/stdev/server.js']) assert.ok((await fetch(H + p)).status !== 200 || !(await (await fetch(H + p)).text()).includes('createServer'), p); ok('/hr/ serves the HR app and cannot escape its folder');
    }
    for (const p of ['/..%2f..%2fserver.js', '/../server.js', '/%2e%2e/accounts.js']) assert.ok((await fetch(H + p)).status >= 400, p);
    assert.strictEqual((await fetch(H + '/')).status, 200); assert.ok((await fetch(H + '/app.js')).headers.get('content-security-policy')); ok('static files cannot escape public/, pages carry CSP');
    console.log('server: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); }
})();
