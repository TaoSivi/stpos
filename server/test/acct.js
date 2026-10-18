/* ທົດສອບ ?hq=acct — ສະຫຼຸບບັນຊີລາຍມື້ໃຫ້ ERP (ອ່ານຢ່າງດຽວ) */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const PORT = 3600 + Math.floor(Math.random() * 90), ROOT = 'http://127.0.0.1:' + PORT + '/api';
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stpos-acct-')), T = 'acct-master-token-1234', AT = 'acct-readonly-token-5678';
let proc, passed = 0;
function start() { return new Promise(function (ok, bad) { proc = spawn(process.execPath, [path.join(__dirname, '..', 'app.js')], { env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: DATA, STPOS_NO_SECRETS: '1', API_TOKEN: T, ACCT_TOKEN: AT, ADMIN_KEY: 'acct-admin-key-1' }) }); let e = ''; proc.stderr.on('data', function (d) { e += d; }); proc.stdout.on('data', function (d) { if (/server on/.test(String(d))) ok(); }); proc.on('exit', function (c) { if (c) bad(new Error('exit ' + c + e)); }); }); }
async function jp(br, qs) { const t = await (await fetch(ROOT + '/' + br + '/?callback=c&' + qs)).text(); return JSON.parse(t.slice(2, -1)); }
async function test(n, fn) { await fn(); passed++; console.log('  ✓ ' + n); }
const D = 86400000, lao = function (ts) { return new Date(ts + 7 * 3600000).toISOString().slice(0, 10); };
const now = Date.now(), today = lao(now), d1 = lao(now - 2 * D), d2 = lao(now - D);
const at = function (day, hh) { return Date.parse(day + 'T' + String(hh).padStart(2, '0') + ':00:00+07:00'); };
const it = function (code, price, qty, extra) { return Object.assign({ id: code + Math.random(), code: code, name: 'ເມນູ ' + code, price: price, qty: qty, modPrice: 0, disc: 0 }, extra || {}); };

(async function () {
  try {
    await start();
    /* service 5% + VAT 10%: 100,000 → svc 5,000 → vat 10,500 → total 115,500 */
    const st = { shopName: 'ຕ່າວ', users: [], tables: {}, orders: [], serviceChargePct: 5, vatPct: 10,
      catalog: { 'ອາຫານ': { 'ຈານຫຼັກ': [{ c: 'F1', n: 'ເຂົ້າຜັດ', p: 50000, k: 'food' }] }, 'ເຄື່ອງດື່ມ': { 'ເບຍ': [{ c: 'D1', n: 'ເບຍ', p: 20000, k: 'drink' }] } },
      ingredients: { RICE: { code: 'RICE', cost: 10, locs: { main: 0 } } },
      bills: [
        /* 1: cash + tip, food 60k + beer 40k */
        { receipt: '1', ts: at(d1, 12), total: 115500, tip: 5000, cogs: 30000, pay: 'ເງິນສົດ', items: [it('F1', 30000, 2), it('D1', 20000, 2)] },
        /* 2: split cash + BCEL, card fee 1,000 */
        { receipt: '2', ts: at(d1, 13), total: 115500, cardFee: 1000, cogs: 25000, payParts: [{ type: 'ເງິນສົດ', amt: 50000 }, { type: 'BCEL', amt: 66500 }], items: [it('F1', 100000, 1)] },
        /* 3: refund 11,550 of 115,500 (10%) → every component shrinks 10% */
        { receipt: '3', ts: at(d1, 14), total: 115500, refundAmt: 11550, cogs: 20000, pay: 'ເງິນສົດ', items: [it('F1', 100000, 1)] },
        /* 4: void */
        { receipt: '4', ts: at(d1, 15), total: 99000, voided: true, items: [it('F1', 99000, 1)] },
        /* 5: on credit (owed 115,500) */
        { receipt: '5', ts: at(d1, 16), total: 115500, credit: true, creditOwed: 115500, creditPaid: 115500, creditSettled: true, cogs: 10000, pay: 'ຕິດໜີ້', items: [it('D1', 100000, 1)],
          creditPays: [{ ts: at(d2, 10), amt: 115500, pay: 'BCEL' }] },
        /* 6: table reservation deposit (a liability, not sales) */
        { receipt: '6', ts: at(d1, 9), total: 200000, pay: 'BCEL', deposit: true, table: 'ຈອງ A', items: [it('DEPOSIT', 200000, 1)] },
        /* 7: the deposit is used: bill total is 100k lower than its lines */
        { receipt: '7', ts: at(d2, 20), total: 115500, cogs: 40000, pay: 'ເງິນສົດ', items: [it('F1', 200000, 1), it('DEPOSIT-USE', -100000, 1)] }],
      expenses: [{ ts: at(d1, 11), cat: 'ວັດຖຸດິບ/ສິນຄ້າ', amount: 70000 }, { ts: at(d1, 12), cat: 'ວັດຖຸດິບ/ສິນຄ້າ', amount: 30000 }, { ts: at(d1, 17), cat: 'ຄ່າເຊົ່າ', amount: 500000 }, { ts: at(d2, 9), cat: 'ອື່ນໆ', amount: 8000 }],
      stockLog: [{ ts: at(d1, 18), code: 'RICE', delta: -100, reason: 'ເສຍຫາຍ' }, { ts: at(d1, 19), code: 'RICE', delta: -50, reason: 'ນັບປັບສະຕ໋ອກ' }],
      shiftLog: [{ id: 's1', name: 'ກະເຊົ້າ', closeTs: at(d1, 22), expectedCash: 400000, countedCash: 393000 }, { id: 's2', name: 'ກະແລງ', closeTs: at(d2, 22), expectedCash: 300000, countedCash: 302000 }] };
    assert.ok((await (await fetch(ROOT + '/?admin=import&key=acct-admin-key-1', { method: 'POST', body: JSON.stringify(st) })).json()).ok);

    await test('auth: no token refused; the read-only ACCT_TOKEN and the main token both work; bad dates / huge range refused', async function () {
      assert.strictEqual((await jp('b1', 'hq=acct&from=' + d1 + '&to=' + d2)).err, 'token');
      assert.strictEqual((await jp('b1', 'hq=acct&from=' + d1 + '&to=' + d2 + '&token=nope')).err, 'token');
      assert.ok((await jp('b1', 'hq=acct&from=' + d1 + '&to=' + d2 + '&token=' + AT)).ok);
      assert.ok((await jp('b1', 'hq=acct&from=' + d1 + '&to=' + d2 + '&token=' + T)).ok);
      assert.strictEqual((await jp('b1', 'hq=acct&from=x&to=' + d2 + '&token=' + AT)).err, 'date');
      assert.strictEqual((await jp('b1', 'hq=acct&from=2020-01-01&to=2026-12-31&token=' + AT)).err, 'range');
    });
    await test('the read-only token does NOT open other HQ actions', async function () {
      assert.strictEqual((await jp('b1', 'hq=list&token=' + AT)).err, 'token');
    });
    let a;
    await test('day 1: sales split (net / service / VAT), tips, card fee, refund factor, credit, deposits, payments add up', async function () {
      const r = await jp('b1', 'hq=acct&from=' + d1 + '&to=' + d2 + '&token=' + AT); assert.ok(r.ok, JSON.stringify(r)); assert.strictEqual(r.v, 1); assert.strictEqual(r.today, today);
      a = r.branches[0].days;
      const o = a[d1];
      /* bills 1,2: 100k/5k/10.5k each · bill 3: ×0.9 → 90k/4.5k/9.45k=9,450 · bill 5 (credit) counts as sales too */
      assert.strictEqual(o.bills, 4);
      assert.strictEqual(o.sales, 100000 + 100000 + 90000 + 100000);
      assert.strictEqual(o.svc, 5000 + 5000 + 4500 + 5000);
      assert.strictEqual(o.sales + o.svc + o.vat, 115500 * 3 + (115500 - 11550), 'sales + service + VAT = billed total after refund');
      assert.strictEqual(o.tips, 5000); assert.strictEqual(o.fees, 1000); assert.strictEqual(o.refunds, 11550); assert.strictEqual(o.cogs, 30000 + 25000 + 20000 + 10000);
      assert.strictEqual(o.credit, 115500); assert.deepStrictEqual(o.deposits, { BCEL: 200000 });
      assert.strictEqual(o.pay['ເງິນສົດ'], 115500 + 5000 + 50000 + 115500); assert.strictEqual(o.pay.BCEL, 66500);
      /* everything collected == what the bills charged (excluding the credit bill) + tips + fees */
      const collected = Object.keys(o.pay).reduce(function (s, k) { return s + o.pay[k]; }, 0);
      assert.strictEqual(collected + o.credit, o.sales + o.svc + o.vat + o.refunds + o.tips + o.fees);
      assert.deepStrictEqual(o.voids, { n: 1, amt: 99000 });
    });
    await test('sales by menu category add up to sales exactly', async function () {
      const o = a[d1], sum = Object.keys(o.byCat).reduce(function (s, k) { return s + o.byCat[k]; }, 0);
      assert.strictEqual(sum, o.sales); assert.ok(o.byCat['ອາຫານ'] > 0 && o.byCat['ເຄື່ອງດື່ມ'] > 0, JSON.stringify(o.byCat));
    });
    await test('expenses by category, waste / count shortage valued at cost, cash over-short per shift', async function () {
      const o = a[d1]; assert.deepStrictEqual(o.expenses, { 'ວັດຖຸດິບ/ສິນຄ້າ': 100000, 'ຄ່າເຊົ່າ': 500000 });
      assert.strictEqual(o.waste, 1000); assert.strictEqual(o.shortage, 500); assert.strictEqual(o.cashDiff, -7000); assert.strictEqual(a[d2].cashDiff, 2000);
    });
    await test('day 2: credit repayment arrives by its own date and method; deposit use becomes revenue', async function () {
      const o = a[d2]; assert.deepStrictEqual(o.creditPays, { BCEL: 115500 }); assert.strictEqual(o.depUsed, 100000);
      assert.strictEqual(o.sales, 100000, 'bill total 115,500 = 100k + 5k + 10.5k; the 100k deposit is released separately');
      assert.strictEqual(o.expenses['ອື່ນໆ'], 8000);
    });
    await test('branch filter (ids) and an empty period', async function () {
      assert.strictEqual((await jp('b1', 'hq=acct&ids=zz&from=' + d1 + '&to=' + d2 + '&token=' + AT)).branches.length, 0);
      const e = await jp('b1', 'hq=acct&from=2020-01-01&to=2020-01-02&token=' + AT); assert.deepStrictEqual(e.branches[0].days, {});
    });
    console.log('\n' + passed + ' passed');
  } catch (e) { console.error('\n✗ FAILED:', e && e.stack || e); process.exitCode = 1; }
  finally { proc && proc.kill(); setTimeout(function () { try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) {} }, 400); }
})();
