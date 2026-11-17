/* ທົດສອບ Super admin ຂອງແພລດຟອມ: PIN ດຽວ → ລາຍຊື່ບໍລິສັດ → ເຂົ້າ POS / HR / ERP ຂອງບໍລິສັດໃດກໍໄດ້ ໂດຍບໍ່ໃສ່ PIN ອີກ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const PORT = 3800 + Math.floor(Math.random() * 90), HOST = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-super-')), AK = 'super-admin-key-12';
let proc, passed = 0;
function start() {
  return new Promise(function (ok, bad) {
    proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', ADMIN_KEY: AK, CRON_KEY: 'super-cron-key-1', API_TOKEN: 'super-master-token-1' }), stdio: ['ignore', 'pipe', 'pipe'] });
    let up = false; proc.stdout.on('data', function (d) { if (!up && /server on/.test(String(d))) { up = true; ok(); } });
    proc.stderr.on('data', function (d) { process.stderr.write(d); });
    setTimeout(function () { if (!up) bad(new Error('server did not start')); }, 15000);
  });
}
const post = async function (qs, body) { const r = await fetch(HOST + '/api/?' + qs, { method: 'POST', body: JSON.stringify(body || {}) }); return { status: r.status, j: await r.json().catch(function () { return null; }) }; };
const adm = async function (a, body) { return (await post('admin=' + a + '&key=' + AK, body)).j; };
const sup = async function (a, body) { return (await post('super=' + a, body)).j; };
const hr = async function (code, body) { return (await fetch(HOST + '/api/t/' + code + '/hr', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })).json(); };
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    assert.ok((await adm('tenant_add', { code: 'co1', name: 'ບໍລິສັດ 1', apps: ['stpos-fnb', 'sthr', 'laobooks'], ownerName: 'ເຈົ້າຂອງ 1', ownerPin: '4321' })).ok);
    assert.ok((await adm('tenant_add', { code: 'co2', name: 'ບໍລິສັດ 2', apps: ['stpos-mart'], ownerName: 'ເຈົ້າຂອງ 2', ownerPin: '8765' })).ok);
    let stk;
    await test('no PIN set yet → login refused; only ADMIN_KEY sets it (4-8 digits)', async function () {
      assert.deepStrictEqual(await sup('status'), { ok: true, set: false });
      assert.strictEqual((await sup('login', { pin: '1234' })).err, 'notset');
      assert.strictEqual((await post('admin=tenant_super_pin&key=wrong', { pin: '2468' })).status, 403);
      assert.strictEqual((await adm('tenant_super_pin', { pin: '12' })).err, 'pin');
      assert.ok((await adm('tenant_super_pin', { pin: '2468' })).ok);
      assert.strictEqual((await sup('status')).set, true);
    });
    await test('wrong PIN refused and counted; right PIN gives a platform token', async function () {
      const w = await sup('login', { pin: '0000' }); assert.strictEqual(w.err, 'pin'); assert.strictEqual(w.left, 4);
      const r = await sup('login', { pin: '2468' }); assert.ok(r.ok && /^p1\./.test(r.stk)); stk = r.stk;
    });
    await test('the token lists every company; a forged / missing token gets nothing', async function () {
      assert.strictEqual((await sup('list', {})).err, 'stk');
      assert.strictEqual((await sup('list', { stk: stk.slice(0, -2) + 'xx' })).err, 'stk');
      const l = await sup('list', { stk: stk }); assert.deepStrictEqual(l.companies.map(function (c) { return c.code; }).sort(), ['co1', 'co2']);
    });
    await test('entering a company gives a POS session of its owner that works there only, plus a Super admin HR session', async function () {
      const e = await sup('enter', { stk: stk, code: 'co1' }); assert.ok(e.ok && e.pos && e.pos.tk, JSON.stringify(e));
      assert.strictEqual(e.company.name, 'ບໍລິສັດ 1');
      const ok1 = await (await fetch(HOST + '/api/t/co1/erp', { method: 'POST', body: JSON.stringify({ action: 'loadAll', token: e.pos.tk }) })).json(); assert.ok(ok1.ok, JSON.stringify(ok1));
      const no2 = await (await fetch(HOST + '/api/t/co2/erp', { method: 'POST', body: JSON.stringify({ action: 'loadAll', token: e.pos.tk }) })).json(); assert.strictEqual(no2.ok, false, 'a co1 session does not open co2');
      assert.ok(e.hr && e.hr.token && e.hr.member.roles.indexOf('owner') >= 0, JSON.stringify(e.hr));
      const me = await hr('co1', { action: 'me', token: e.hr.token }); assert.ok(me.ok, JSON.stringify(me));
      const e2 = await sup('enter', { stk: stk, code: 'co2' }); assert.ok(e2.pos && !e2.hr, 'no HR app → no HR session');
      assert.strictEqual((await sup('enter', { stk: stk, code: 'nope' })).err, 'company');
    });
    await test('changing the platform PIN logs every device out', async function () {
      assert.ok((await adm('tenant_super_pin', { pin: '1357' })).ok);
      assert.strictEqual((await sup('list', { stk: stk })).err, 'stk');
      assert.strictEqual((await sup('login', { pin: '2468' })).err, 'pin');
      assert.ok((await sup('login', { pin: '1357' })).ok);
    });
    await test('five wrong PINs lock the login for a while', async function () {
      for (let i = 0; i < 5; i++) await sup('login', { pin: '9999' });
      assert.strictEqual((await sup('login', { pin: '1357' })).err, 'locked');
    });
    console.log('super: ' + passed + ' passed');
  } catch (e) { console.error('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { try { proc.kill(); } catch (e) {} try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }
})();
