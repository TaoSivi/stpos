/* ທົດສອບ bootstrap.json: ສ້າງ Super admin ຄົນທຳອິດ · ກູ້ PIN ທີ່ລືມ (reset) · ຕ້ອງບໍ່ເປີດຊ່ອງໃຫ້ຄົນອື່ນຍຶດບັນຊີ */
'use strict';
const assert = require('assert'), { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const PORT = 3900 + Math.floor(Math.random() * 40), H = 'http://127.0.0.1:' + PORT, DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stdev-b-'));
const srv = path.join(__dirname, '..', 'server.js'), env = Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STDEV_NO_BACKUP: '1' });
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const login = function (phone, pin) { return fetch(H + '/api/login', { method: 'POST', body: JSON.stringify({ phone: phone, pin: pin }) }).then(function (r) { return r.json(); }); };
const boot = function (o) { fs.writeFileSync(path.join(DATA, 'bootstrap.json'), JSON.stringify(o)); };
let proc, n = 0; const ok = function (m) { n++; console.log('  ✓ ' + m); };
const restart = async function () { if (proc) { proc.kill(); await sleep(300); } proc = spawn(process.execPath, [srv], { env: env, stdio: 'ignore' }); await sleep(1000); };
const gone = function () { return !fs.existsSync(path.join(DATA, 'bootstrap.json')); };

(async function () {
  try {
    boot({ phone: '02011110001', name: 'ເຈົ້າຂອງ', pin: '1111' }); await restart();
    assert.ok((await login('02011110001', '1111')).ok && gone()); ok('first Super admin is created from bootstrap.json and the file is removed');
    /* ມີຜູ້ໃຊ້ແລ້ວ — ໄຟລ໌ທຳມະດາ (ບໍ່ມີ reset) ຕ້ອງບໍ່ເຮັດຫຍັງ */
    boot({ phone: '02011119999', name: 'ຄົນແປກໜ້າ', pin: '9999' }); await restart();
    assert.strictEqual((await login('02011119999', '9999')).ok, false); assert.ok(gone()); ok('a plain bootstrap file does nothing once users exist (and is still deleted)');
    /* ລືມ PIN → reset */
    const old = await login('02011110001', '1111'); assert.ok(old.ok);
    boot({ phone: '02011110001', pin: '2222', reset: true }); await restart();
    assert.ok((await login('02011110001', '2222')).ok && gone()); assert.strictEqual((await login('02011110001', '1111')).ok, false);
    assert.strictEqual((await fetch(H + '/api/me', { method: 'POST', body: JSON.stringify({ token: old.token }) }).then(function (r) { return r.json(); })).error, 'auth'); ok('reset sets the new PIN, the old PIN and old sessions stop working');
    /* reset ໃຊ້ຍຶດເບີອື່ນບໍ່ໄດ້ (ເບີທີ່ບໍ່ແມ່ນ Super admin / ບໍ່ມີຢູ່) ຕາບໃດທີ່ຍັງມີ Super admin ທີ່ໃຊ້ໄດ້ */
    boot({ phone: '02011118888', name: 'ຍຶດ', pin: '8888', reset: true }); await restart();
    assert.strictEqual((await login('02011118888', '8888')).ok, false); assert.ok((await login('02011110001', '2222')).ok); ok('reset cannot create or take over another account while a working Super admin exists');
    /* Super admin ຖືກປິດ ແລະບໍ່ມີຄົນອື່ນ — reset ເປີດຄືນໄດ້ */
    proc.kill(); await sleep(300);
    const uf = path.join(DATA, 'users.json'), u = JSON.parse(fs.readFileSync(uf, 'utf8')); u['02011110001'].active = false; fs.writeFileSync(uf, JSON.stringify(u));
    await restart(); assert.strictEqual((await login('02011110001', '2222')).ok, false);
    boot({ phone: '02011110001', pin: '3333', reset: true }); await restart();
    assert.ok((await login('02011110001', '3333')).ok); ok('reset re-enables a disabled Super admin');
    console.log('bootstrap: ' + n + ' passed');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { if (proc) proc.kill(); try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { } }
})();
