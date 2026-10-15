/* ທົດສອບ server: ແລ່ນ app.js ໃນໂຟນເດີຂໍ້ມູນຊົ່ວຄາວ ແລ້ວເອີ້ນແບບດຽວກັບແອັບ (JSONP GET + POST) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const assert = require('assert');

const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-test-'));
const BASE = 'http://127.0.0.1:' + PORT + '/api/';
let proc, passed = 0;

function start(env) {
  return new Promise(function (ok, bad) {
    proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1' }, env || {}), stdio: ['ignore', 'pipe', 'pipe'] });
    let err = ''; proc.stderr.on('data', function (d) { err += d; });
    proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); });
    proc.on('exit', function (c) { if (c) bad(new Error('server exited ' + c + ' ' + err)); });
  });
}
function stop() { return new Promise(function (ok) { if (!proc || proc.exitCode !== null) return ok(); proc.on('exit', function () { ok(); }); proc.kill(); }); }
async function jsonp(params) {
  const r = await fetch(BASE + '?callback=__cb1&' + params); const t = await r.text();
  const m = /^__cb1\(([\s\S]*)\)$/.exec(t); assert.ok(m, 'jsonp shape: ' + t.slice(0, 80)); return JSON.parse(m[1]);
}
async function post(body, qs) { const r = await fetch(BASE + (qs || ''), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body }); return r.text(); }
async function getState(tok) { const r = await jsonp('token=' + (tok || '') + '&gz=1'); assert.ok(r.ok, JSON.stringify(r).slice(0, 100)); return JSON.parse(zlib.gunzipSync(Buffer.from(r.gz, 'base64')).toString('utf8')); }
async function test(name, fn) { await fn(); passed++; console.log('  ✓ ' + name); }


const now = Date.now();
function st(rx){return {_v:now,shopName:'Clinic',receiptSeq:1,orderNo:1,catalog:{},ingredients:{},tables:{},qr:{},orders:[],bills:[],stockLog:[],_srcLoc:'main',rx:rx,customers:[]};}
(async function(){
 await start();
 try{
  await test('two devices add different rx → both kept', async function(){
    const a=st([{id:'r1',no:'Q001',patient:'A',status:'intake',ts:now-5000,upd:now-5000,items:[]}]);
    const b=st([{id:'r2',no:'Q002',patient:'B',status:'intake',ts:now-4000,upd:now-4000,items:[]}]);
    b._v=now+1;
    assert.strictEqual(await post(JSON.stringify(a)),'ok');assert.strictEqual(await post(JSON.stringify(b)),'ok');
    const g=await getState();assert.deepStrictEqual(g.rx.map(function(x){return x.id}).sort(),['r1','r2']);
  });
  await test('same rx: newer upd wins (doctor sent vs nurse stale copy)', async function(){
    const stale=st([{id:'r1',no:'Q001',patient:'A',status:'intake',ts:now-5000,upd:now-5000,items:[]},{id:'r2',no:'Q002',patient:'B',status:'intake',ts:now-4000,upd:now-4000,items:[]}]);stale._v=now+2;
    const doc=st([{id:'r1',no:'Q001',patient:'A',status:'sent',ts:now-5000,upd:now+100,items:[{code:'M1',qty:1}],dx:'ໄຂ້'},{id:'r2',no:'Q002',patient:'B',status:'intake',ts:now-4000,upd:now-4000,items:[]}]);doc._v=now+3;
    await post(JSON.stringify(doc));await post(JSON.stringify(stale));
    const g=await getState();const r1=g.rx.find(function(x){return x.id==='r1'});
    assert.strictEqual(r1.status,'sent');assert.strictEqual(r1.items.length,1);assert.strictEqual(r1.dx,'ໄຂ້');
  });
  await test('device with old list (no rx) cannot erase rx', async function(){
    const old=st([]);old._v=now+4;await post(JSON.stringify(old));
    const g=await getState();assert.ok(g.rx.length>=2,'rx kept: '+g.rx.length);
  });
  await test('rx paid by cashier not reverted by stale doctor copy', async function(){
    const cash=st([{id:'r1',no:'Q001',patient:'A',status:'paid',ts:now-5000,upd:now+500,items:[{code:'M1',qty:1}],receipt:'0001'}]);cash._v=now+5;
    const stale=st([{id:'r1',no:'Q001',patient:'A',status:'sent',ts:now-5000,upd:now+100,items:[{code:'M1',qty:1}]}]);stale._v=now+6;
    await post(JSON.stringify(cash));await post(JSON.stringify(stale));
    const g=await getState();assert.strictEqual(g.rx.find(function(x){return x.id==='r1'}).status,'paid');
  });
  console.log(passed+' passed');
 }catch(e){console.error('FAIL',e.message);process.exitCode=1}
 await stop();
})();
