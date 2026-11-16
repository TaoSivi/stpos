/* ທົດສອບ ST HR ຕໍ່ບໍລິສັດ: /t/<code>/hr ແລ່ນ Code.gs ຂອງ HR ເທິງ server — ສິດແອັບ, ການສ້າງບໍລິສັດ HR ດ້ວຍ SIGNUP_CODE, ເຂົ້າລະບົບ, ອ່ານ/ຂຽນ, ແຍກຂໍ້ມູນລະຫວ່າງບໍລິສັດ, CORS, ແລະ POS ບໍ່ຖືກກະທົບ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const PORT = 3900 + Math.floor(Math.random() * 90), HOST = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-hr-')), T = 'hr-master-token-1', AK = 'hr-admin-key-12';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: AK, CRON_KEY: 'hr-cron-key-123' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
const adm = async function (qs, body, key) { return (await fetch(HOST + '/api/?admin=' + qs + '&key=' + (key || AK), { method: 'POST', body: JSON.stringify(body || {}) })).json(); };
/* ຄືກັບແອັບ HR: POST text/plain (ບໍ່ມີ preflight) */
const hr = async function (pre, body) { return (await fetch(HOST + pre, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8', Origin: 'https://taosivi.github.io' }, body: JSON.stringify(body) })).json(); };
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    assert.ok((await adm('tenant_add', { code: 'hrco', name: 'ບໍລິສັດ HR', apps: [], ownerName: 'ເຈົ້າຂອງ', ownerPin: '4321' })).ok); assert.ok((await adm('tenant_set', { code: 'hrco', apps: ['sthr'] })).ok);
    assert.ok((await adm('tenant_add', { code: 'hr2', name: 'ບໍລິສັດ HR 2', apps: [], ownerName: 'ເຈົ້າຂອງ 2', ownerPin: '8765' })).ok); assert.ok((await adm('tenant_set', { code: 'hr2', apps: ['sthr', 'stpos-fnb'] })).ok);
    assert.ok((await adm('tenant_add', { code: 'clinic1', name: 'ຄລີນິກ', apps: ['stpos-medical'], ownerName: 'ໝໍ', ownerPin: '1111' })).ok);
    const A = '/api/t/hrco/hr', B = '/api/t/hr2/hr';
    let su, tokA;
    await test('a company without the HR app is refused; the HR app of a licensed company answers', async function () {
      assert.strictEqual((await hr('/api/t/clinic1/hr', { action: 'info' })).ok, false);
      assert.ok(/ບໍ່ມີສິດ/.test((await hr('/api/t/clinic1/hr', { action: 'info' })).error));
      const r = await hr(A, { action: 'info' }); assert.deepStrictEqual(r, { ok: true, data: { companyId: null, name: null, users: [] } });
      assert.strictEqual((await (await fetch(HOST + A)).json()).ok, true, 'GET ping');
    });
    await test('unknown company is 404, and the ping/JSON error shape is stable', async function () {
      assert.strictEqual((await fetch(HOST + '/api/t/nope/hr', { method: 'POST', body: '{}' })).status, 404);
      assert.strictEqual((await hr(A, { action: 'bogus' })).ok, false);
    });
    await test('only the platform admin key can read the HR signup code; it is stable until reset', async function () {
      assert.strictEqual((await fetch(HOST + '/api/?admin=tenant_hr&key=wrong', { method: 'POST', body: JSON.stringify({ code: 'hrco' }) })).status, 403);
      assert.strictEqual((await adm('tenant_hr', { code: 'clinic1' })).ok, false, 'no HR app → no code');
      su = await adm('tenant_hr', { code: 'hrco' }); assert.ok(su.ok && /^[0-9a-f]{18}$/.test(su.signupCode) && su.created === false, JSON.stringify(su));
      assert.strictEqual((await adm('tenant_hr', { code: 'hrco' })).signupCode, su.signupCode);
      const r = await adm('tenant_hr', { code: 'hrco', reset: true }); assert.notStrictEqual(r.signupCode, su.signupCode); su = r;
      assert.notStrictEqual((await adm('tenant_hr', { code: 'hr2' })).signupCode, su.signupCode, 'each company has its own code');
    });
    await test('creating the HR company needs the right signup code; then Super admin signs in with ST-000 + PIN', async function () {
      const body = function (code) { return { action: 'create', signupCode: code, company: { id: 'c-1', name: 'ບໍລິສັດ HR', plan: 'pro' }, owner: { employeeId: 'e-1', code: 'ST-001' }, pin: '1234', superAdmin: { employeeId: 'e-super', code: 'ST-000', pin: '5678' } }; };
      assert.strictEqual((await hr(A, body('wrong'))).ok, false, 'wrong code');
      assert.strictEqual((await hr(A, body(su.signupCode.replace(/./, 'z')))).ok, false);
      const r = await hr(A, body(su.signupCode)); assert.ok(r.ok, JSON.stringify(r)); assert.ok(r.data.token && r.data.member.roles.indexOf('superadmin') >= 0);
      assert.strictEqual((await hr(A, body(su.signupCode))).ok, false, 'a second company cannot be made in the same HR');
      assert.strictEqual((await adm('tenant_hr', { code: 'hrco' })).created, true);
      const info = await hr(A, { action: 'info' }); assert.strictEqual(info.data.companyId, 'c-1'); assert.deepStrictEqual(info.data.users.map(function (u) { return u.code; }).sort(), ['ST-000', 'ST-001']);
      const l = await hr(A, { action: 'login', code: 'st-001', pin: '1234' }); assert.ok(l.ok, JSON.stringify(l)); tokA = l.data.token;
      assert.strictEqual((await hr(A, { action: 'login', code: 'ST-001', pin: '0000' })).ok, false, 'wrong PIN');
    });
    await test('records are written and read back by the signed-in owner; no token → refused', async function () {
      const up = await hr(A, { action: 'upsert', token: tokA, collection: 'shifts', id: 's1', data: { id: 's1', name: 'ກະເຊົ້າ', start: '08:00', end: '17:00' } }); assert.ok(up.ok, JSON.stringify(up));
      const ls = await hr(A, { action: 'list', token: tokA, collection: 'shifts' }); assert.ok(ls.ok); assert.strictEqual(ls.data.length, 1); assert.strictEqual(ls.data[0].data.name, 'ກະເຊົ້າ');
      assert.strictEqual((await hr(A, { action: 'list', collection: 'shifts' })).ok, false);
      assert.strictEqual((await hr(A, { action: 'list', token: 'forged', collection: 'shifts' })).ok, false);
    });
    await test('another company is separate: it has no HR company, and the first company session does not work there', async function () {
      assert.strictEqual((await hr(B, { action: 'info' })).data.companyId, null);
      assert.strictEqual((await hr(B, { action: 'list', token: tokA, collection: 'shifts' })).ok, false, 'session of hrco on hr2');
      assert.strictEqual((await hr(B, { action: 'login', code: 'ST-001', pin: '1234' })).ok, false);
      const su2 = await adm('tenant_hr', { code: 'hr2' });
      const c = await hr(B, { action: 'create', signupCode: su2.signupCode, company: { id: 'c-2', name: 'ບໍລິສັດ 2', plan: 'pro' }, owner: { employeeId: 'e-9', code: 'ST-001' }, pin: '2222' }); assert.ok(c.ok, JSON.stringify(c));
      assert.strictEqual((await hr(B, { action: 'list', token: c.data.token, collection: 'shifts' })).data.length, 0, 'no shifts leak across');
      assert.strictEqual((await hr(A, { action: 'list', token: tokA, collection: 'shifts' })).data.length, 1);
    });
    await test('works through /t/<code>/hr too, answers the browser pre-flight, and the shop POS keeps working', async function () {
      assert.strictEqual((await hr('/t/hrco/hr', { action: 'info' })).data.companyId, 'c-1');
      const o = await fetch(HOST + A, { method: 'OPTIONS', headers: { Origin: 'https://taosivi.github.io' } });
      assert.strictEqual(o.status, 204); assert.strictEqual(o.headers.get('access-control-allow-origin'), 'https://taosivi.github.io');
      const l = await (await fetch(HOST + '/api/t/hrco/?login=company&callback=c')).text(); assert.ok(/"apps":\["sthr"\]/.test(l), l);
      assert.ok((await (await fetch(HOST + '/api/?callback=c&login=company')).text()).length > 0);
    });
    await test('turning the HR app off for a company refuses it (data is kept), turning it back on restores', async function () {
      assert.ok((await adm('tenant_set', { code: 'hrco', apps: ['stpos-fnb'] })).ok);
      assert.strictEqual((await hr(A, { action: 'list', token: tokA, collection: 'shifts' })).ok, false);
      assert.ok((await adm('tenant_set', { code: 'hrco', apps: ['sthr'] })).ok);
      assert.strictEqual((await hr(A, { action: 'list', token: tokA, collection: 'shifts' })).data.length, 1);
    });
    await test('platform admin seeds a sample HR company (random PINs shown once, 3 staff); a second seed is refused', async function () {
      assert.strictEqual((await fetch(HOST + '/api/?admin=tenant_hr_seed&key=wrong', { method: 'POST', body: JSON.stringify({ code: 'hr2' }) })).status, 403);
      assert.strictEqual((await adm('tenant_hr_seed', { code: 'clinic1' })).ok, false, 'no HR app');
      assert.ok((await adm('tenant_add', { code: 'hr3', name: 'ບໍລິສັດ HR 3', apps: [], ownerName: 'x', ownerPin: '5555' })).ok); assert.ok((await adm('tenant_set', { code: 'hr3', apps: ['sthr'] })).ok); const B3 = '/api/t/hr3/hr'; const r = await adm('tenant_hr_seed', { code: 'hr3', hrName: 'LTGTEST' }); assert.ok(r.ok, JSON.stringify(r));
      assert.ok(/^\d{4}$/.test(r.superAdmin.pin) && /^\d{4}$/.test(r.admin.pin) && r.superAdmin.pin !== r.admin.pin);
      const l = await hr(B3, { action: 'login', code: 'ST-000', pin: r.superAdmin.pin }); assert.ok(l.ok, JSON.stringify(l));
      const emps = (await hr(B3, { action: 'list', token: l.data.token, collection: 'employees' })).data;
      assert.deepStrictEqual(emps.map(function (e) { return e.data.code; }).sort(), ['ST-000', 'ST-001', 'ST-101', 'ST-102', 'ST-103']);
      assert.strictEqual((await hr(B3, { action: 'info' })).data.name, 'LTGTEST');
      assert.strictEqual((await adm('tenant_hr_seed', { code: 'hr3' })).ok, false, 'already created');
    });
    await test('a company created WITH the HR app gets its HR ready: the owner signs in with ST-001 + the same 4-digit PIN', async function () {
      const r = await adm('tenant_add', { code: 'auto1', name: 'LTG Auto', apps: ['sthr'], ownerName: 'ທ້າວ ເຈົ້າຂອງ', ownerPin: '2580' }); assert.ok(r.ok && r.hr === 'ready', JSON.stringify(r));
      const U = '/api/t/auto1/hr', i = (await hr(U, { action: 'info' })).data; assert.strictEqual(i.name, 'LTG Auto'); assert.deepStrictEqual(i.users.map(function (u) { return u.code; }), ['ST-001']);
      assert.strictEqual((await hr(U, { action: 'login', code: 'ST-001', pin: '0000' })).ok, false);
      const l = await hr(U, { action: 'login', code: 'ST-001', pin: '2580' }); assert.ok(l.ok, JSON.stringify(l));
      const emps = (await hr(U, { action: 'list', token: l.data.token, collection: 'employees' })).data; assert.strictEqual(emps.length, 1); assert.strictEqual(emps[0].data.name, 'ທ້າວ ເຈົ້າຂອງ'); assert.ok(!emps[0].data.pinMustChange);
      assert.strictEqual((await hr(U, { action: 'list', token: l.data.token, collection: 'shifts' })).data.length, 3);
      const r6 = await adm('tenant_add', { code: 'auto2', name: 'PIN6', apps: ['sthr'], ownerName: 'x', ownerPin: '258000' }); assert.ok(r6.ok && r6.hr === 'pin4', JSON.stringify(r6));
      assert.strictEqual((await hr('/api/t/auto2/hr', { action: 'info' })).data.companyId, null);
      assert.strictEqual((await adm('tenant_add', { code: 'nohr', name: 'no', apps: ['stpos-fnb'], ownerName: 'x', ownerPin: '2580' })).hr, undefined);
    });
    console.log('hr: ' + passed + ' passed');
  } catch (e) { console.error('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { try { proc.kill(); } catch (e) {} try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }
})();
