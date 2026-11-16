/* ທົດສອບບໍລິສັດລູກຄ້າ (tenant): ສ້າງ, ແຍກຂໍ້ມູນ/token/session/ສາຂາ/HQ, ຮ້ານເດີມ (/api) ບໍ່ປ່ຽນ, cron ທຸກບໍລິສັດ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const PORT = 3800 + Math.floor(Math.random() * 90), HOST = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-ten-')), T = 'tenant-master-token-1', AK = 'tenant-admin-key-1';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ADMIN_KEY: AK, CRON_KEY: 'tenant-cron-key-1', TG_BOT: 'LEAK-BOT', TG_CHAT: 'LEAK-CHAT' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
const base = function (pre) { return HOST + (pre || '') + '/api'; };
async function jp(pre, qs) { const t = await (await fetch(base(pre) + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function st(pre, tok) { const r = await jp(pre, 'gz=1&token=' + encodeURIComponent(tok)); assert.ok(r.ok, JSON.stringify(r)); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))); }
async function save(pre, s, tok) { s._v = Date.now() + Math.floor(Math.random() * 1000); return (await fetch(base(pre) + '/?token=' + encodeURIComponent(tok), { method: 'POST', body: JSON.stringify(s) })).text(); }
async function adm(qs, body) { return (await fetch(HOST + '/api/?admin=' + qs + '&key=' + AK, { method: 'POST', body: JSON.stringify(body || {}) })).json(); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
(async function () {
  try {
    await start();
    const shop = { shopName: 'LaoFe Cafe', catalog: { A: { B: [{ c: 'F1', n: 'x', p: 1, k: 'food' }] } }, users: [{ id: 'u1', name: 'Owner', role: 'superadmin', pinH: 'h1.1' }], bills: [{ receipt: '1', ts: 1, total: 5, items: [] }] };
    assert.ok((await (await fetch(HOST + '/api/?admin=import&key=' + AK, { method: 'POST', body: JSON.stringify(shop) })).json()).ok);
    await test('creating a company needs the admin key; bad code / missing owner / short PIN refused', async function () {
      assert.strictEqual((await fetch(HOST + '/api/?admin=tenant_add&key=wrong', { method: 'POST', body: '{}' })).status, 403);
      const ok = { code: 'clinic1', name: 'ຄລີນິກ A', apps: ['stpos-medical'], ownerName: 'ໝໍ', ownerPin: '4321' };
      for (const bad of [{ code: 'API' }, { code: 'default' }, { code: 'x' }, { code: '../x' }, { ownerPin: '12' }, { ownerName: '' }, { name: '' }]) assert.strictEqual((await adm('tenant_add', Object.assign({}, ok, bad))).ok, false, JSON.stringify(bad));
    });
    let tk1, tk2;
    await test('create two companies; the PIN login of each works only for its own company', async function () {
      const a = await adm('tenant_add', { code: 'clinic1', name: 'ຄລີນິກ A', apps: ['stpos-medical'], ownerName: 'ໝໍ', ownerPin: '4321' });
      assert.ok(a.ok, JSON.stringify(a)); assert.strictEqual(a.path, '/t/clinic1/api'); assert.ok(!JSON.stringify(a).match(/token/i), 'no token in the reply');
      assert.ok((await adm('tenant_add', { code: 'resto2', name: 'ຮ້ານອາຫານ B', apps: ['stpos-fnb'], ownerName: 'ເຈົ້າຂອງ', ownerPin: '8765' })).ok);
      assert.strictEqual((await adm('tenant_add', { code: 'clinic1', name: 'dup', ownerName: 'x', ownerPin: '1234' })).ok, false, 'duplicate code');
      const l1 = await jp('/t/clinic1', 'login=pin&uid=u1&pin=4321'); assert.ok(l1.ok, JSON.stringify(l1)); tk1 = l1.tk;
      const l2 = await jp('/t/resto2', 'login=pin&uid=u1&pin=8765'); assert.ok(l2.ok); tk2 = l2.tk;
      assert.strictEqual((await jp('/t/clinic1', 'login=pin&uid=u1&pin=8765')).ok, false, 'PIN of resto2 does not open clinic1');
    });
    await test('company data isolated from each other and from the original shop', async function () {
      const s1 = await st('/t/clinic1', tk1); assert.strictEqual(s1.shopName, 'ຄລີນິກ A'); s1.bills = [{ receipt: 'C1', ts: Date.now(), total: 99, items: [] }]; assert.strictEqual(await save('/t/clinic1', s1, tk1), 'ok');
      assert.strictEqual(((await st('/t/resto2', tk2)).bills || []).length, 0);
      assert.deepStrictEqual((await st('', T)).bills.map(function (b) { return b.receipt; }), ['1'], 'original shop untouched');
      assert.deepStrictEqual((await st('/t/clinic1', tk1)).bills.map(function (b) { return b.receipt; }), ['C1']);
    });
    await test('a company session or the shop master token cannot open another company', async function () {
      assert.strictEqual((await jp('/t/resto2', 'gz=1&token=' + encodeURIComponent(tk1))).err, 'token', 'clinic session on resto2');
      assert.strictEqual((await jp('/t/resto2', 'gz=1&token=' + encodeURIComponent(T))).err, 'token', 'LaoFe master token on resto2');
      assert.strictEqual((await jp('', 'gz=1&token=' + encodeURIComponent(tk1))).err, 'token', 'clinic session on the original shop');
      assert.strictEqual((await jp('/t/clinic1', 'gz=1&token=' + encodeURIComponent(T))).err, 'token', 'LaoFe master token on clinic1');
    });
    await test('branches, HQ list and links stay inside the company', async function () {
      const r = await jp('/t/clinic1', 'hq=add&name=' + encodeURIComponent('ສາຂາ 2') + '&token=' + encodeURIComponent(tk1)); assert.ok(r.ok, JSON.stringify(r));
      assert.ok(/\/api\/t\/clinic1\/b2$/.test(r.url), r.url);
      assert.strictEqual((await jp('/t/clinic1', 'hq=list&token=' + encodeURIComponent(tk1))).branches.length, 2);
      assert.strictEqual((await jp('', 'hq=list&token=' + T)).branches.length, 1, 'original shop has still 1 branch');
      const nb = JSON.parse((await (await fetch(HOST + '/t/resto2/api/b2/?callback=c&gz=1&token=x')).text()).slice(2, -1)); assert.strictEqual(nb.err, 'branch', 'resto2 has no b2');
    });
    await test('company settings (Telegram etc.) do not inherit the main server env; list/set apps', async function () {
      const r = await jp('/t/clinic1', 'notify=status&token=' + encodeURIComponent(tk1)); assert.strictEqual(r.tg, false);
      assert.strictEqual((await jp('', 'notify=status&token=' + T)).tg, true, 'original shop still has its own');
      const set = await adm('tenant_set', { code: 'clinic1', apps: ['stpos-medical', 'laobooks'] }); assert.deepStrictEqual(set.apps, ['stpos-medical', 'laobooks']);
      const l = await adm('tenant_list'); assert.deepStrictEqual(l.tenants.map(function (t) { return t.code; }).sort(), ['clinic1', 'resto2']);
    });
    await test('no token in a company = closed, never open; unknown company = 404', async function () {
      fs.writeFileSync(path.join(DATA, 't', 'resto2', 'props.json'), '{}'); /* token lost and no env fallback */
      assert.strictEqual((await fetch(base('/t/resto2') + '/?callback=c&gz=1')).status, 503);
      assert.strictEqual((await jp('/t/nope', 'gz=1')).err, 'company'); assert.strictEqual((await fetch(base('/t/nope') + '/')).status, 404);
    });
    await test('login=company shows only name + apps; unlicensed POS type cannot be saved (server enforces)', async function () {
      const c = await jp('/t/clinic1', 'login=company'); assert.deepStrictEqual(c.company, { code: 'clinic1', name: 'ຄລີນິກ A', apps: ['stpos-medical', 'laobooks'] });
      assert.strictEqual((await st('/t/clinic1', tk1)).bizType, 'medical', 'starts as the first licensed POS');
      assert.deepStrictEqual((await jp('', 'login=company')).company.apps, ['*']);
      const s1 = await st('/t/clinic1', tk1); s1.bizType = 'hotel'; assert.strictEqual(await save('/t/clinic1', s1, tk1), 'denied', 'clinic cannot switch to hotel');
      s1.bizType = 'mart'; s1.martKind = 'jewelry'; assert.strictEqual(await save('/t/clinic1', s1, tk1), 'denied', 'nor jewelry');
      s1.bizType = 'medical'; delete s1.martKind; assert.strictEqual(await save('/t/clinic1', s1, tk1), 'ok');
      assert.ok((await adm('tenant_add', { code: 'erponly', name: 'ERP only', apps: ['laobooks'], ownerName: 'A', ownerPin: '1357' })).ok);
      const tk3 = (await jp('/t/erponly', 'login=pin&uid=u1&pin=1357')).tk, s3 = await st('/t/erponly', tk3); s3.shopName = 'x'; assert.strictEqual(await save('/t/erponly', s3, tk3), 'denied', 'no POS licence at all');
    });
    const erp = async function (pre, token, action, payload) { return (await fetch(HOST + pre + '/erp', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8', Origin: 'https://example.github.io' }, body: JSON.stringify({ action: action, payload: payload || {}, token: token }) })).json(); };
    await test('ERP endpoint: needs company session + licence; append/update/remove/loadAll; companies isolated', async function () {
      assert.strictEqual((await erp('/t/clinic1', '', 'loadAll')).error, 'auth');
      assert.strictEqual((await erp('/t/clinic1', T, 'loadAll')).error, 'auth', 'shop master token is not a company session');
      assert.ok((await erp('/t/clinic1', tk1, 'append', { sheet: 'accounts', row: { id: 'a1', name: 'Cash' } })).ok);
      assert.ok((await erp('/t/clinic1', tk1, 'update', { sheet: 'accounts', id: 'a1', row: { name: 'Cash2' } })).ok);
      assert.ok((await erp('/t/clinic1', tk1, 'append', { sheet: 'accounts', row: { id: 'a2', name: 'Bank' } })).ok);
      assert.deepStrictEqual((await erp('/t/clinic1', tk1, 'loadAll')).data.accounts, [{ id: 'a1', name: 'Cash2' }, { id: 'a2', name: 'Bank' }]);
      assert.ok((await erp('/t/clinic1', tk1, 'remove', { sheet: 'accounts', id: 'a2' })).ok);
      assert.strictEqual((await erp('/t/clinic1', tk1, 'loadAll')).data.accounts.length, 1);
      assert.ok((await adm('tenant_add', { code: 'posonly', name: 'POS only', apps: ['stpos-fnb'], ownerName: 'A', ownerPin: '2468' })).ok);
      const tk4 = (await jp('/t/posonly', 'login=pin&uid=u1&pin=2468')).tk; assert.ok(/LaoBooks/.test((await erp('/t/posonly', tk4, 'loadAll')).error), 'no LaoBooks licence');
      assert.strictEqual((await erp('/t/clinic1', tk4, 'loadAll')).error, 'auth', 'other company session refused');
      assert.strictEqual((await erp('/t/clinic1', tk1, 'append', { sheet: '../x', row: { id: 1 } })).ok, false, 'bad collection name');
      assert.strictEqual((await fetch(HOST + '/erp', { method: 'POST', body: '{}' })).status, 404, 'no ERP on the original shop path');
      const pre = await fetch(HOST + '/t/clinic1/erp', { method: 'OPTIONS', headers: { Origin: 'https://example.github.io' } }); assert.strictEqual(pre.status, 204);
      assert.strictEqual(pre.headers.get('access-control-allow-origin'), 'https://example.github.io');
    });
    await test('cPanel-style addresses /api/t/<company>[/<branch>|/erp] reach the same company', async function () {
      const j = async function (p) { return JSON.parse((await (await fetch(HOST + p)).text()).slice(2, -1)); };
      assert.strictEqual((await j('/api/t/clinic1/?callback=c&login=company')).company.code, 'clinic1');
      assert.strictEqual((await j('/api/t/clinic1/b2/?callback=c&login=company')).company.code, 'clinic1');
      assert.strictEqual((await j('/api/t/clinic1/b2/?callback=c&gz=1&token=x')).err, 'token', 'branch of a company is protected by the company token (not open, not 503)');
      assert.strictEqual((await j('/api/t/clinic1/b2/?callback=c&gz=1&token=' + encodeURIComponent(tk1))).ok, true, 'owner session works in the company branch b2');
      assert.strictEqual((await j('/api/t/nope/?callback=c&login=company')).err, 'company');
      assert.strictEqual((await erp('/api/t/clinic1', tk1, 'loadAll')).ok, true);
    });
    await test('cron runs every company (and still the original shop)', async function () {
      const r = await (await fetch(HOST + '/api/?cron=tenant-cron-key-1')).json(); assert.ok(r.ok);
    });
    await test('admin: list users, reset a PIN in every branch; old PIN and old sessions stop working; rename + apps change', async function () {
      const us = await adm('tenant_users', { code: 'clinic1' }); assert.deepStrictEqual(us.users.map(function (u) { return u.id; }), ['u1']);
      assert.strictEqual((await adm('tenant_pin', { code: 'clinic1', uid: 'u1', pin: '12' })).ok, false, 'short PIN refused');
      assert.strictEqual((await adm('tenant_pin', { code: 'clinic1', uid: 'nobody', pin: '5555' })).ok, false, 'unknown user');
      assert.strictEqual((await adm('tenant_pin', { code: 'nope', uid: 'u1', pin: '5555' })).err, 'company');
      const r = await adm('tenant_pin', { code: 'clinic1', uid: 'u1', pin: '5555' }); assert.ok(r.ok && r.updated === 2, JSON.stringify(r));
      assert.strictEqual((await jp('/t/clinic1', 'login=pin&uid=u1&pin=4321')).ok, false, 'old PIN refused');
      assert.ok((await jp('/t/clinic1', 'login=pin&uid=u1&pin=5555')).ok, 'new PIN works');
      assert.strictEqual((await jp('/t/clinic1', 'gz=1&token=' + encodeURIComponent(tk1))).err, 'token', 'old session expired');
      assert.ok((await jp('/api/t/clinic1/b2', 'login=pin&uid=u1&pin=5555')).ok, 'new PIN works in branch b2 too');
      assert.strictEqual((await fetch(base('/t/resto2') + '/?callback=c&login=pin&uid=u1&pin=5555')).status, 503, 'other company untouched (resto2 is closed in this test)');
      const set = await adm('tenant_set', { code: 'clinic1', name: 'ຄລີນິກ A ໃໝ່', apps: ['stpos-medical'] }); assert.ok(set.ok);
      assert.deepStrictEqual((await jp('/t/clinic1', 'login=company')).company, { code: 'clinic1', name: 'ຄລີນິກ A ໃໝ່', apps: ['stpos-medical'] });
      assert.strictEqual((await erp('/t/clinic1', (await jp('/t/clinic1', 'login=pin&uid=u1&pin=5555')).tk, 'loadAll')).error, 'ບໍລິສັດນີ້ບໍ່ມີສິດໃຊ້ LaoBooks', 'licence removal takes effect at once');
    });
    console.log('tenants: ' + passed + ' passed');
  } catch (e) { console.error('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { try { proc.kill(); } catch (e) {} try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }
})();
