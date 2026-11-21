/* ທົດສອບເຂັ້ມ (fuzz): ສົ່ງຂໍ້ມູນຜິດຮູບແບບ/ແປກໆ ໃຫ້ທຸກ API ແລະ ໜ້າເວັບ — server ຕ້ອງບໍ່ລົ້ມ, ບໍ່ມີ error 'server' (ຄືຂໍ້ຜິດພາດທີ່ບໍ່ໄດ້ດັກ), ແລະ ຕອບ JSON ສະເໝີ */
'use strict';
const assert = require('assert'), { spawn, spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const PORT = 4300 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-f-'));
const env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA }), srv = path.join(__dirname, '..', 'server.js');
const cli = function () { return spawnSync(process.execPath, [srv].concat([].slice.call(arguments)), { env: env, encoding: 'utf8' }); };
const call = function (a, o) { return fetch(H + '/api/' + a, { method: 'POST', body: typeof o === 'string' ? o : JSON.stringify(o || {}) }).then(function (r) { return r.text().then(function (t) { return { status: r.status, text: t, json: (function () { try { return JSON.parse(t); } catch (e) { return null; } })() }; }); }); };
const raw = function (p, method) { return new Promise(function (res) { const q = http.request({ host: '127.0.0.1', port: PORT, path: p, method: method || 'GET' }, function (r) { let b = ''; r.on('data', function (c) { b += c; }); r.on('end', function () { res({ status: r.statusCode, body: b }); }); }); q.on('error', function (e) { res({ status: 0, body: String(e) }); }); q.end(); }); };
const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const ACTIONS = ['login', 'me', 'init', 'sheet', 'row', 'tank', 'photo', 'photos', 'photometa', 'ack', 'approve', 'assign', 'drivers', 'ledger', 'dash', 'pending', 'approvers', 'rqNew', 'rqDecide', 'rqDecideMany', 'rqCancel', 'rqStart', 'rqUrgent', 'rqAhead', 'subDriver', 'cfgSave', 'userList', 'userSave', 'catalog', 'schema', 'pin', 'adjlog', 'hrlogin', 'hrreport.info', 'hrreport.build', 'sop.me', 'sop.tpls', 'sop.open', 'sop.new', 'sop.mark', 'sop.markMany', 'sop.submit', 'sop.approve', 'sop.reopen', 'sop.board', 'sop.assignSet', 'sop.tplSave', 'sop.tplReset', 'sop.hdr', 'sop.hdrSet', 'nope', '__proto__', 'constructor', 'sop.'];
const JUNK = [null, true, 0, -1, 1e308, NaN, '', 'x'.repeat(5000), '<script>alert(1)</script>', '../../etc/passwd', '2026-02-30', '2026-11-21', [], [1, 2, 3], {}, { a: { b: { c: 1 } } }, [[[]]], { __proto__: { admin: true } }, JSON.parse('{"__proto__":{"polluted":1}}'), 'v1', 's1', 99999999999, '\u0000', '😀'];
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
(async function () {
  try {
    assert.strictEqual(cli('adduser', '02055550001', 'ເຈົ້າຂອງ', '4321', 'superadmin').status, 0);
    assert.strictEqual(cli('adduser', '02055550003', 'ຄົນຂັບ', '1357', 'user', '--fuel=driver', '--sites=s1').status, 0);
    assert.strictEqual(cli('adduser', '02055550005', 'ຫົວໜ້າ', '9753', 'user', '--fuel=head', '--sites=s1').status, 0);
    proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await wait(900);
    const tk = {}; for (const [k, ph, pin] of [['sa', '02055550001', '4321'], ['drv', '02055550003', '1357'], ['head', '02055550005', '9753']]) tk[k] = (await call('login', { phone: ph, pin: pin })).json.token;
    assert.ok((await call('cfgSave', { token: tk.sa, cfg: { sites: [{ id: 's1', name: 'ສະໜາມ', tank: { t: 'lpc', k: 5 }, rq: true }], vehicles: [{ id: 'v1', name: 'ລົດ', site: 's1', driver: '02055550003', tank: { t: 'lpc', k: 5 } }] } })).json.ok);

    /* ----- 1) URL ແປກໆ: server ຕ້ອງຕອບ ບໍ່ລົ້ມ ----- */
    for (const p of ['/%E0%A4%A', '/..%2f..%2fetc%2fpasswd', '/api/', '/api/%', '//', '/' + 'a'.repeat(9000), '/hr/%E0%A4%A', '/index.html%00', '/.env', '/accounts.js', '/../server.js']) { const r = await raw(p); assert.ok(r.status > 0, 'server answered ' + p.slice(0, 30) + ' ' + r.body.slice(0, 60)); assert.ok(r.status !== 200 || !/scrypt|SECRET|require\(/.test(r.body), 'no source leak ' + p.slice(0, 30)); }
    assert.strictEqual((await raw('/index.html')).status, 200); ok('weird URLs: always answered, no source leak, server alive');

    /* ----- 2) JSON ຜິດຮູບແບບ ແລະ ໃຫຍ່ເກີນ ----- */
    for (const body of ['', '{', 'null', '[]', '"x"', '123', '{"token":', '{"token":{"a":1}}', '\u0000', 'x'.repeat(2e6)]) { const r = await call('me', body); assert.ok(r.status === 200 || r.status === 413 || r.status === 0, 'status ' + r.status); if (r.status === 200) assert.ok(r.json && r.json.ok === false, 'me with bad body is refused'); }
    assert.ok((await call('me', { token: tk.sa })).json.ok, 'still alive after bad bodies'); ok('malformed JSON / huge body: refused cleanly');

    /* ----- 3) fuzz: ທຸກ action × ຄ່າແປກໆ × ຫຼາຍຜູ້ໃຊ້ → ບໍ່ມີ error "server" ----- */
    const bad = [], seen = {}; let calls = 0;
    for (const who of ['sa', 'drv', 'head', null]) for (const a of ACTIONS) {
      const keys = ['site', 'date', 'v', 'id', 'item', 'driver', 'lit', 'cm0', 'cm1', 'cm2', 'lines', 'ids', 'tpl', 'label', 'note', 'src', 'add', 'del', 'edit', 'yes', 'why', 'cid', 'from', 'to', 'key', 'data', 'user', 'cfg', 'items', 'users', 'phone', 'pin'];
      const bodies = [{}]; for (const j of JUNK) { const o = {}; keys.forEach(function (k) { o[k] = j; }); bodies.push(o); }
      for (let i = 0; i < 6; i++) { const o = {}; keys.forEach(function (k) { if (Math.random() < 0.35) o[k] = JUNK[Math.floor(Math.random() * JUNK.length)]; }); o.site = Math.random() < 0.6 ? 's1' : o.site; o.date = Math.random() < 0.6 ? '2026-11-21' : o.date; bodies.push(o); }
      for (const o of bodies) { if (who) o.token = tk[who]; let r; try { r = await call(a, o); } catch (e) { bad.push(a + ' threw ' + e.message); continue; } calls++; if (!r.json) { bad.push(a + ' non-JSON ' + r.status + ' ' + r.text.slice(0, 60)); continue; } if (r.json.error === 'server') { const k = a + '/' + (who || 'anon'); if (!seen[k]) { seen[k] = 1; bad.push(k + ' error:server body=' + JSON.stringify(o).slice(0, 160)); } } }
      const alive = await call('me', { token: tk.sa }); if (!alive.json || !alive.json.ok) { bad.push('SERVER DEAD after ' + a); break; }
    }
    if (bad.length) console.log('FUZZ FINDINGS (' + calls + ' calls):\n - ' + bad.slice(0, 40).join('\n - '));
    assert.strictEqual(bad.length, 0, bad.length + ' problems (see above)'); ok('fuzz: ' + calls + ' hostile calls over ' + ACTIONS.length + ' actions × 4 users — no crash, no unhandled error');

    /* ----- 4) ຂໍ້ມູນຍັງຖືກຕ້ອງຫຼັງ fuzz (ບໍ່ເສຍຫາຍ) ----- */
    assert.ok((await call('init', { token: tk.sa })).json.ok); assert.ok(Array.isArray((await call('sheet', { token: tk.sa, site: 's1', date: '2026-11-21' })).json.data.rows)); ok('data still readable after the fuzz');
    console.log('fuzz: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); fs.rmSync(DATA, { recursive: true, force: true }); setTimeout(function () { process.exit(process.exitCode || 0); }, 100); }
})();
