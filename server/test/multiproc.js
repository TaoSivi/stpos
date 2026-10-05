/* ທົດສອບ 2 process ໃຊ້ໂຟນເດີຂໍ້ມູນດຽວກັນ (ໂຮສອາດເປີດຫຼາຍ process): ບັນທຶກສະລັບກັນ ບິນຕ້ອງບໍ່ຫາຍ */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), assert = require('assert');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-mp-'));
const ports = [3990, 3991], procs = [];
function start(port) { return new Promise(function (ok, bad) { const p = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(port), DATA_DIR: DATA, STPOS_NO_SECRETS: '1' }) }); procs.push(p); p.stderr.on('data', function (d) { process.stderr.write('[srv' + port + '] ' + d); }); p.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); p.on('exit', function (c) { if (c) bad(new Error('exit ' + c)); }); }); }
async function get(port) { const t = await (await fetch('http://127.0.0.1:' + port + '/?callback=c&gz=1&token=')).text(); const r = JSON.parse(t.slice(2, -1)); return r.gz ? JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64'))) : null; }
(async function () {
  try {
    await start(ports[0]); await start(ports[1]);
    const now = Date.now(), s0 = { _v: now, shopName: 'MP', bills: [], catalog: {}, tables: {} };
    await fetch('http://127.0.0.1:' + ports[0] + '/', { method: 'POST', body: JSON.stringify(s0) });
    const jobs = [];
    for (let i = 0; i < 40; i++) {
      const s = JSON.parse(JSON.stringify(s0)); s.bills = [{ receipt: String(i + 1), ts: now + i, total: 1000 + i, items: [] }]; s._v = now + 1 + i;
      jobs.push(fetch('http://127.0.0.1:' + ports[i % 2] + '/', { method: 'POST', body: JSON.stringify(s) }).then(function (r) { return r.text(); }));
    }
    const res = await Promise.all(jobs); assert.ok(res.every(function (x) { return x === 'ok'; }), res.join(','));
    const a = await get(ports[0]), b = await get(ports[1]);
    assert.strictEqual(a.bills.length, 40, 'bills via proc A: ' + a.bills.length); assert.strictEqual(b.bills.length, 40);
    assert.ok(!fs.readdirSync(path.join(DATA, 'locks')).length, 'no stale locks');
    assert.ok(!fs.readdirSync(path.join(DATA, 'sheets')).some(function (f) { return /\.tmp$/.test(f); }), 'no temp files left');
    console.log('  ✓ 40 saves across 2 processes: all bills kept, no stale locks/temp files');
  } catch (e) { console.error('✗', e && e.stack || e); process.exitCode = 1; }
  finally { procs.forEach(function (p) { p.kill(); }); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 500); }
})();
