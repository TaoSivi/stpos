/* ທົດສອບແບບຫຼາຍເຄື່ອງພ້ອມກັນ (ຂໍ້ 7): ຈຳລອງ POS 2 ເຄື່ອງ + ຈໍຄົວ + ຈໍບາ + ຈໍເສີບ + ລູກຄ້າ QR ເຮັດວຽກພ້ອມກັນ
 * ທຸກເຄື່ອງ sync ແບບດຽວກັບແອັບ: ກວດເວີຊັນ → ດຶງສ່ວນຕ່າງ (delta) → ບັນທຶກແບບ DZ: (ຜິດ → ສົ່ງເຕັມ)
 * ກວດ: ບິນທຸກໃບທີ່ຂາຍຢູ່ server ຄົບ · ອໍເດີ QR ທຸກອັນເຂົ້າ · ທຸກເຄື່ອງສຸດທ້າຍມີຂໍ້ມູນຄືກັນ (hash) · ບໍ່ມີ JSON ເສຍ
 * ໃຊ້: node test/soak.js [ວິນາທີ=120] [ໄຟລ໌ state ຈິງ (ທາງເລືອກ)] */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib'), crypto = require('crypto'), assert = require('assert');
const D = require('../delta');
const SECS = +(process.argv[2] || 120), REAL = process.argv[3];
const PORT = 3800 + Math.floor(Math.random() * 90), BASE = 'http://127.0.0.1:' + PORT + '/api/';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-soak-')), TOKEN = 'soak-master-token-1';
const H = function (o) { return crypto.createHash('sha256').update(D.canon(o)).digest('hex').slice(0, 32); };
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
const lag = function () { return sleep(40 + Math.random() * 300); };            /* ເນັດຊ້າ/ບໍ່ຄົງທີ່ */
let perKey = {}, dl = { same: 0, delta: 0, full: 0, fullWhy: {} }, srv, bytesUp = 0, bytesDown = 0, fullUp = 0, dzUp = 0, resends = 0;

function start() {
  return new Promise(function (ok, bad) {
    srv = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: TOKEN, ADMIN_KEY: 'soak-admin-key-1' }) });
    let e = ''; srv.stderr.on('data', function (d) { e += d; }); srv.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); });
    srv.on('exit', function (c) { if (c) bad(new Error('server exit ' + c + e)); });
  });
}
async function jsonp(qs, helper) { await lag(); const t = await (await fetch(BASE + '?callback=c&' + qs)).text(); if (!helper) bytesDown += t.length; return JSON.parse(t.slice(2, -1)); }
async function post(body) { await lag(); bytesUp += body.length; return (await fetch(BASE + '?token=' + TOKEN, { method: 'POST', body: body })).text(); }

/* ---- 1 ເຄື່ອງ: state + ສະບັບພື້ນ ຄືແອັບ ---- */
function Device(name, role) { this.name = name; this.role = role; this.state = null; this.bStr = null; this.bH = null; this.dirty = false; this.busy = false; this.seq = 0; this.sentV = 0; }
Device.prototype.pull = async function () {
  const r = await jsonp('dz=' + (this.bH || '') + '&gz=1&token=' + TOKEN); let s;
  if (r.same) { s = this.bStr; dl.same++; }
  else if (r.d) { dl.delta++; const pp = JSON.parse(zlib.gunzipSync(Buffer.from(r.d, 'base64'))); Object.keys(pp.s).forEach(function (k) { const e = pp.s[k]; const t = (e.$v !== undefined ? 'v' : e.$s ? 's' : e.$o ? 'o' : '?'); const kk = k + ':' + t; perKey[kk] = (perKey[kk] || 0) + JSON.stringify(e).length; }); const res = D.apply(JSON.parse(this.bStr), pp); if (H(res) !== r.h) { this.bH = null; return this.pull(); } s = JSON.stringify(res); }
  else { dl.full++; const why = !this.bH ? 'no-base' : 'server-full'; dl.fullWhy[why] = (dl.fullWhy[why] || 0) + 1; s = zlib.gunzipSync(Buffer.from(r.gz, 'base64')).toString('utf8'); }
  this.bStr = s; this.bH = r.h || H(JSON.parse(s));
  const ns = JSON.parse(s); if (!this.state || (+ns._v || 0) > (+this.state._v || 0)) { if (!this.dirty) this.state = ns; }
};
Device.prototype.save = async function () {
  this.state._v = Math.max(Date.now(), (+this.state._v || 0) + 1); this.dirty = false;
  const json = JSON.stringify(this.state), cur = JSON.parse(json), h = H(cur); this.sentV = this.state._v;
  let res;
  if (this.bH) {
    const ps = JSON.stringify({ b: this.bH, p: D.diff(JSON.parse(this.bStr), cur), h: h });
    if (ps.length < json.length * 0.6) { res = await post('DZ:' + zlib.gzipSync(ps).toString('base64')); dzUp++; if (res === 'resend') resends++; }
  }
  if (res !== 'ok') { res = await post('GZ:' + zlib.gzipSync(json).toString('base64')); fullUp++; }
  assert.strictEqual(res, 'ok', this.name + ' save ' + res);
  const v = await jsonp('ver=1&token=' + TOKEN); if (v.h === h) { this.bStr = json; this.bH = h; }
};
Device.prototype.poll = async function () {
  const v = await jsonp('ver=1&token=' + TOKEN);
  if (v.v > (+this.state._v || 0) && !this.dirty) await this.pull();
};
/* ການກະທຳຄືກັບແອັບ (stampUpd: ແກ້ໂຕະ/ອໍເດີ → upd = ດຽວນີ້; dv=1) */
function freeTable(st) { const ks = Object.keys(st.tables || {}).filter(function (k) { const t = st.tables[k]; return t.status === 'free' || t.status === 'busy'; }); return ks[Math.floor(Math.random() * ks.length)]; }
function menuItem(st) { const L = []; Object.values(st.catalog || {}).forEach(function (c) { Object.values(c).forEach(function (a) { (a || []).forEach(function (m) { L.push(m); }); }); }); return L[Math.floor(Math.random() * L.length)]; }
const created = { bills: new Set(), items: new Set() };
Device.prototype.act = async function () {
  const st = this.state, now = Date.now();
  if (this.role === 'pos') {
    const k = freeTable(st); if (!k) return; const t = st.tables[k];
    if ((t.items || []).length && Math.random() < 0.45) {                         /* ຊຳລະ */
      const items = t.items.slice(), rc = this.name + '-' + (++this.seq);
      st.bills.push({ receipt: rc, ts: now, table: k, total: items.reduce(function (a, i) { return a + (i.price || 0) * (i.qty || 1); }, 0), pay: 'ເງິນສົດ', items: items, by: this.name });
      created.bills.add(rc);
      t.items = []; t.status = 'free'; t.billTs = null; t.upd = now; t.dv = 1;
      const ids = {}; items.forEach(function (i) { ids[String(i.id)] = 1; }); st.orders = (st.orders || []).filter(function (o) { return !ids[String(o.id)]; });
    } else {                                                                       /* ສັ່ງອາຫານ */
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { const m = menuItem(st); if (!m) return; const id = now + Math.random(); t.items = t.items || []; t.items.push({ id: id, code: m.c, name: m.n, price: m.p, qty: 1, disc: 0, modPrice: 0, k: m.k, ts: now }); st.orders = st.orders || []; st.orders.push({ id: id, table: k, code: m.c, name: m.n, qty: 1, k: m.k, status: 'wait', ts: now, upd: now }); created.items.add(String(id)); }
      t.status = 'busy'; t.upd = now; t.dv = 1;
    }
    this.dirty = true; await this.save();
  } else if (this.role === 'kds' || this.role === 'bar' || this.role === 'serve') {
    const want = this.role === 'serve' ? 'ready' : null, kind = this.role === 'bar' ? 'drink' : 'food';
    const os2 = (st.orders || []).filter(function (o) { return want ? o.status === want : ((o.k === 'drink') === (kind === 'drink') && (o.status === 'wait' || o.status === 'cooking')); });
    if (!os2.length) return; const o = os2[Math.floor(Math.random() * os2.length)];
    if (this.role === 'serve') { o.status = 'served'; o.servedTs = now; } else if (o.status === 'wait') { o.status = 'cooking'; o.cookTs = now; } else { o.status = 'ready'; o.readyTs = now; }
    o.upd = now; this.dirty = true; await this.save();
  }
};
async function qrCustomer() {
  const st = JSON.parse(zlib.gunzipSync(Buffer.from((await jsonp('gz=1&token=' + TOKEN, 1)).gz, 'base64'))); /* ຕົວຊ່ວຍທົດສອບ (ບໍ່ນັບ) */
  const ks = Object.keys(st.qr || {}).filter(function (k) { return st.tables[k] && st.qr[k].expiry > Date.now() && st.tables[k].status !== 'merged'; }); if (!ks.length) return 0;
  const k = ks[Math.floor(Math.random() * ks.length)], m = menuItem(st); if (!m) return 0;
  const r = await jsonp('action=order&payload=' + encodeURIComponent(JSON.stringify({ action: 'order', table: k, pin: st.qr[k].pin, rid: 'r' + Date.now() + Math.random(), items: [{ code: m.c, qty: 1 }] })));
  return r && r.ok ? r.n : 0;
}

(async function () {
  let failed = false;
  try {
    await start();
    /* ຂໍ້ມູນ: ສຳເນົາຈິງ (ຖ້າມີ) ຫຼື ສ້າງ */
    let st0;
    if (REAL && fs.existsSync(REAL)) st0 = JSON.parse(fs.readFileSync(REAL, 'utf8'));
    else { st0 = { shopName: 'Soak', bills: [], orders: [], tables: {}, catalog: { A: { B: [] } }, ingredients: {}, qr: {} }; for (let i = 0; i < 20; i++) st0.tables['T' + i] = { name: 'T' + i, status: 'free', items: [], dv: 1, upd: 1 }; for (let i = 0; i < 50; i++) st0.catalog.A.B.push({ c: 'M' + i, n: 'ເມນູ ' + i, p: 10000 + i, k: i % 2 ? 'drink' : 'food' }); }
    const tk = Object.keys(st0.tables).slice(0, 6); st0.qr = st0.qr || {}; tk.forEach(function (k) { st0.qr[k] = { pin: '4321', expiry: Date.now() + 86400000, enabled: true }; }); st0.qrGlobal = true; st0.stockBlock = false;
    st0._v = Date.now();
    const imp = await (await fetch(BASE + '?admin=import&key=soak-admin-key-1', { method: 'POST', body: JSON.stringify(st0) })).json(); assert.ok(imp.ok, JSON.stringify(imp));
    const billsBefore = (st0.bills || []).length;
    const devs = [new Device('POS1', 'pos'), new Device('POS2', 'pos'), new Device('KDS', 'kds'), new Device('BAR', 'bar'), new Device('SERVE', 'serve')];
    for (const d of devs) await d.pull();
    console.log('soak ' + SECS + 's · ' + devs.length + ' devices + QR customers · data ' + Math.round(devs[0].bStr.length / 1024) + ' KB · bills before ' + billsBefore);
    let qrItems = 0, actions = 0; const end = Date.now() + SECS * 1000;
    const loops = devs.map(async function (d) { while (Date.now() < end) { await d.poll(); if (Math.random() < 0.5) { await d.act(); actions++; } await sleep(500 + Math.random() * 1500); } });
    loops.push((async function () { while (Date.now() < end) { qrItems += await qrCustomer(); await sleep(3000 + Math.random() * 4000); } })());
    await Promise.all(loops);
    /* ທຸກເຄື່ອງ sync ສຸດທ້າຍ */
    await sleep(500); for (const d of devs) { d.dirty = false; await d.pull(); }
    const fin = JSON.parse(zlib.gunzipSync(Buffer.from((await jsonp('gz=1&token=' + TOKEN)).gz, 'base64'))), fh = H(fin);
    const have = new Set((fin.bills || []).map(function (b) { return b.receipt; }));
    const lost = [...created.bills].filter(function (r) { return !have.has(r); });
    const qrInState = (fin.bills || []).reduce(function (a, b) { return a + (b.items || []).filter(function (i) { return i.qr; }).length; }, 0) + Object.values(fin.tables).reduce(function (a, t) { return a + (t.items || []).filter(function (i) { return i.qr; }).length; }, 0);
    const devH = devs.map(function (d) { return H(JSON.parse(d.bStr)); });
    console.log('  actions ' + actions + ' · bills sold ' + created.bills.size + ' · items ordered ' + created.items.size + ' · QR items ' + qrItems);
    console.log('  download: ' + dl.delta + ' delta / ' + dl.same + ' same / ' + dl.full + ' full ' + JSON.stringify(dl.fullWhy));
    console.log('  delta bytes by key: ' + Object.entries(perKey).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8).map(function (e) { return e[0] + '=' + Math.round(e[1] / 1024) + 'KB'; }).join(' '));
    console.log('  upload: ' + dzUp + ' delta / ' + fullUp + ' full (' + resends + ' delta resend) · ' + Math.round(bytesUp / 1024) + ' KB up · ' + Math.round(bytesDown / 1024) + ' KB down');
    assert.strictEqual(lost.length, 0, 'LOST BILLS: ' + lost.join(','));
    console.log('  ✓ all ' + created.bills.size + ' sold bills on server (total ' + fin.bills.length + ')');
    assert.ok(qrInState >= qrItems, 'QR items in state ' + qrInState + ' < ordered ' + qrItems); console.log('  ✓ all ' + qrItems + ' QR items kept (' + qrInState + ' in tables/bills)');
    devH.forEach(function (h, i) { assert.strictEqual(h, fh, devs[i].name + ' differs from server'); }); console.log('  ✓ all ' + devs.length + ' devices end identical to server (hash ' + fh.slice(0, 8) + ')');
    const dupR = fin.bills.length - have.size; assert.strictEqual(dupR, 0, 'duplicate receipts ' + dupR); console.log('  ✓ no duplicate receipts');
  } catch (e) { failed = true; console.error('✗ FAILED:', e && e.message || e); }
  finally { srv && srv.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 500); if (failed) process.exitCode = 1; }
})();
