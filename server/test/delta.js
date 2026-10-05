/* ທົດສອບ delta: apply(a, diff(a,b)) ຕ້ອງເທົ່າກັບ b (canon) ສຳລັບການປ່ຽນແປງແບບສຸ່ມຫຼາຍພັນຮອບ + ໂຄດໃນ index.html ຕ້ອງຄືກັບ server/delta.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const D = require('../delta');
let seed = 7; const rnd = function (n) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
function rv(d) { const t = rnd(d > 2 ? 4 : 7); if (t === 0) return rnd(1000); if (t === 1) return 'ຂໍ້ຄວາມ' + rnd(99); if (t === 2) return rnd(2) === 0; if (t === 3) return null;
  if (t === 4) { const a = []; for (let i = rnd(30); i > 0; i--) a.push(rv(d + 1)); return a; } const o = {}; for (let i = rnd(30); i > 0; i--) o['k' + rnd(40)] = rv(d + 1); return o; }
function mutate(v, d) {
  if (v === null || typeof v !== 'object' || d > 3 || rnd(5) === 0) return rv(d);
  const c = JSON.parse(JSON.stringify(v));
  if (Array.isArray(c)) { const op = rnd(4); if (op === 0) c.push(rv(d + 1)); else if (op === 1 && c.length) c.splice(rnd(c.length), 1); else if (op === 2 && c.length) { const i = rnd(c.length); c[i] = mutate(c[i], d + 1); } else c.splice(rnd(c.length + 1), 0, rv(d + 1)); return c; }
  const ks = Object.keys(c), op = rnd(3);
  if (op === 0) c['n' + rnd(99)] = rv(d + 1); else if (op === 1 && ks.length) delete c[ks[rnd(ks.length)]]; else if (ks.length) { const k = ks[rnd(ks.length)]; c[k] = mutate(c[k], d + 1); }
  return c;
}
let n = 0;
for (let r = 0; r < 3000; r++) {
  const a = {}; for (let i = 0; i < 12; i++) a['t' + i] = rv(0);
  a.bills = []; for (let i = 0; i < 40 + rnd(40); i++) a.bills.push({ receipt: String(i), ts: i, total: rnd(9999), items: [{ n: 'x', q: rnd(5) }] });
  a.tables = {}; for (let i = 0; i < 25; i++) a.tables['A' + i] = { status: rnd(2) ? 'free' : 'busy', items: [] };
  let b = JSON.parse(JSON.stringify(a));
  for (let m = rnd(6); m >= 0; m--) { const ks = Object.keys(b); const k = rnd(8) === 0 ? 'new' + rnd(9) : ks[rnd(ks.length)]; if (rnd(15) === 0) delete b[k]; else b[k] = mutate(b[k], 0); }
  if (rnd(3) === 0) b.bills.push({ receipt: 'N' + r, ts: 999, total: 1, items: [] });
  if (rnd(3) === 0) b.tables.A3 = { status: 'busy', items: [{ id: r }] };
  const p = JSON.parse(JSON.stringify(D.diff(a, b))); /* ຜ່ານ JSON ຄືກັບສົ່ງຜ່ານເນັດ */
  const out = D.apply(JSON.parse(JSON.stringify(a)), p);
  assert.strictEqual(D.canon(out), D.canon(b), 'round ' + r);
  n++;
}
console.log('  ✓ ' + n + ' random diff/apply round-trips exact');
/* array ທີ່ມີ id (ອໍເດີຄົວ): ສະຫຼັບ/ລຶບ/ແຊກ/ແກ້ສະຖານະ ແບບສຸ່ມ */
let nk = 0, small = 0;
for (let r = 0; r < 2000; r++) {
  const a = { orders: [] }; for (let i = 0; i < 20 + rnd(40); i++) a.orders.push({ id: rnd(2) ? 1791195029059 + i + rnd(1000) / 1000 : 'o' + i, table: 'A' + rnd(9), status: 'wait', ts: i });
  const seen = {}; a.orders = a.orders.filter(function (o) { const k = String(o.id); if (seen[k]) return false; seen[k] = 1; return true; });
  const b = JSON.parse(JSON.stringify(a));
  for (let m = rnd(5); m >= 0; m--) { const op = rnd(4), L = b.orders;
    if (op === 0 && L.length) L[rnd(L.length)].status = ['cooking', 'ready', 'served'][rnd(3)];
    else if (op === 1 && L.length) L.splice(rnd(L.length), 1);
    else if (op === 2) L.splice(rnd(L.length + 1), 0, { id: 'n' + r + '_' + m, table: 'B', status: 'wait', ts: 99 });
    else if (L.length > 1) { const i = rnd(L.length), j = rnd(L.length), t = L[i]; L[i] = L[j]; L[j] = t; } }
  const p = JSON.parse(JSON.stringify(D.diff(a, b)));
  assert.strictEqual(D.canon(D.apply(JSON.parse(JSON.stringify(a)), p)), D.canon(b), 'id round ' + r);
  if (JSON.stringify(p).length < JSON.stringify(b.orders).length / 3) small++;
  nk++;
}
console.log('  ✓ ' + nk + ' id-array round-trips exact (' + Math.round(small / nk * 100) + '% sent < 1/3 of the array)');
/* patch ຂະໜາດນ້ອຍເມື່ອເພີ່ມ 1 ບິນ ໃນຂໍ້ມູນໃຫຍ່ */
const big = { bills: [], tables: {}, ingredients: {} };
for (let i = 0; i < 3000; i++) big.bills.push({ receipt: String(i), ts: i, total: i, items: [{ name: 'ເຂົ້າຜັດ', qty: 1, price: 30000 }] });
for (let i = 0; i < 600; i++) big.ingredients['I' + i] = { name: 'ວັດຖຸ ' + i, locs: { main: i } };
for (let i = 0; i < 30; i++) big.tables['T' + i] = { status: 'free', items: [] };
const nb = JSON.parse(JSON.stringify(big)); nb.bills.push({ receipt: 'x', ts: 1e9, total: 5, items: [] }); nb.ingredients.I5.locs.main = -1; nb.tables.T1.status = 'busy';
const ps = JSON.stringify(D.diff(big, nb)), full = JSON.stringify(nb);
assert.ok(ps.length < 600, 'patch size ' + ps.length);
assert.strictEqual(D.canon(D.apply(JSON.parse(JSON.stringify(big)), JSON.parse(ps))), D.canon(nb));
console.log('  ✓ add 1 bill to ' + Math.round(full.length / 1024) + ' KB state → patch ' + ps.length + ' bytes');
/* ໂຄດໃນ index.html ຕ້ອງຄືກັບ server/delta.js */
const grab = function (s) { const m = /\/\* STPOS-DELTA BEGIN \*\/([\s\S]*?)\/\* STPOS-DELTA END \*\//.exec(s); return m ? m[1].replace(/\r\n/g, '\n').trim() : null; };
const idx = grab(fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')), srv = grab(fs.readFileSync(path.join(__dirname, '..', 'delta.js'), 'utf8'));
assert.ok(idx, 'index.html has STPOS-DELTA block'); assert.strictEqual(idx, srv, 'index.html delta code differs from server/delta.js');
console.log('  ✓ index.html delta code identical to server/delta.js');
