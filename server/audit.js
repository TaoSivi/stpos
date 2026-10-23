/* ບັນທຶກກວດສອບ (Audit trail) ຝັ່ງ server — ເພີ່ມຕໍ່ທ້າຍຢ່າງດຽວ (append-only), ບໍ່ຖືກຕັດ, ເຊື່ອມລາຍການດ້ວຍ hash (ແກ້/ລຶບ/ຕັດທ້າຍ → verify ຈັບໄດ້).
   ເກັບໃນ <ໂຟນເດີສາຂາ>/audit/YYYY-MM.jsonl + head.json. ແອັບເຄື່ອງ (ຫຼື ຄົນທີ່ມີ token) ແກ້ ຫຼື ລຶບ ບັນທຶກນີ້ບໍ່ໄດ້ ເພາະບໍ່ມີ endpoint ຂຽນ ມີແຕ່ server ເພີ່ມເອງ
   ຈາກການປຽບທຽບ state ກ່ອນ/ຫຼັງ ທຸກຄັ້ງທີ່ມີການບັນທຶກ (diffState). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

function create(shim, opt) {
  opt = opt || {};
  const isArchived = opt.isArchived || function () { return false; };
  const dir = function () { const d = path.join(shim.dir(), 'audit'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); return d; };
  const headFile = function () { return path.join(dir(), 'head.json'); };
  const sha = function (s) { return crypto.createHash('sha256').update(s).digest('hex'); };
  const month = function (ts) { const d = new Date(ts + 7 * 3600000); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
  const readHead = function () { try { return JSON.parse(fs.readFileSync(headFile(), 'utf8')); } catch (e) { return { n: 0, h: '0'.repeat(64) }; } };
  const body = function (e) { return [e.n, e.ts, e.t, e.u || '', e.ip || '', JSON.stringify(e.d == null ? null : e.d)].join('|'); };
  const trim = function (v, n) { const s = typeof v === 'string' ? v : JSON.stringify(v == null ? null : v); return s.length > (n || 400) ? s.slice(0, n || 400) + '…' : s; };

  /* ເພີ່ມ events (ຕໍ່ທ້າຍ) — ຄືນ events ທີ່ຂຽນແລ້ວ (ມີ n/h) */
  function append(list) {
    list = (list || []).filter(Boolean); if (!list.length) return [];
    let head = readHead(); const lines = {}, out = [];
    list.forEach(function (x) {
      const e = { n: head.n + 1, ts: x.ts || Date.now(), t: String(x.t || 'log'), u: String(x.u || ''), ip: String(x.ip || ''), d: x.d == null ? null : x.d };
      e.p = head.h; e.h = sha(head.h + '|' + body(e));
      head = { n: e.n, h: e.h };
      const m = month(e.ts); (lines[m] = lines[m] || []).push(JSON.stringify(e)); out.push(e);
    });
    Object.keys(lines).forEach(function (m) { fs.appendFileSync(path.join(dir(), m + '.jsonl'), lines[m].join('\n') + '\n'); });
    fs.writeFileSync(headFile(), JSON.stringify(head));
    return out;
  }
  function files() { try { return fs.readdirSync(dir()).filter(function (f) { return /^\d{4}-\d{2}\.jsonl$/.test(f); }).sort(); } catch (e) { return []; } }
  function readFile(f) { try { return fs.readFileSync(path.join(dir(), f), 'utf8').split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (e) { return { bad: l }; } }); } catch (e) { return []; } }

  /* ກວດຕ່ອງໂສ້: ລາຍການໃດຖືກແກ້/ລຶບ/ຕັດ → ບອກ n ທີ່ເລີ່ມຜິດ */
  function verify() {
    let prev = '0'.repeat(64), n = 0, bad = null;
    files().forEach(function (f) { readFile(f).forEach(function (e) {
      if (bad) return; n++;
      if (e.bad || e.p !== prev || e.n !== n || e.h !== sha(prev + '|' + body(e))) { bad = { n: e.n || n, file: f }; return; }
      prev = e.h;
    }); });
    const head = readHead();
    if (!bad && (head.n !== n || (n && head.h !== prev))) bad = { n: n + 1, file: 'head', why: 'ຖືກຕັດທ້າຍ ຫຼື ຍ້ອນຫຼັງ' };
    return { ok: !bad, count: n, bad: bad, headN: head.n };
  }
  function list(o) {
    o = o || {}; const from = +o.from || 0, to = +o.to || Date.now() + 86400000, lim = Math.min(2000, Math.max(1, +o.limit || 200)), off = Math.max(0, +o.offset || 0);
    const q = String(o.q || '').toLowerCase(), ts = o.t ? String(o.t).split(',') : null, fm = month(from || to - 31 * 86400000), tm = month(to);
    let all = [];
    files().filter(function (f) { const m = f.slice(0, 7); return m >= fm && m <= tm; }).forEach(function (f) { readFile(f).forEach(function (e) { if (!e || e.bad) return; if (e.ts < from || e.ts > to) return; if (ts && ts.indexOf(e.t) < 0) return; if (o.u && e.u !== o.u) return; if (q && (e.t + ' ' + e.u + ' ' + JSON.stringify(e.d)).toLowerCase().indexOf(q) < 0) return; all.push(e); }); });
    all.sort(function (a, b) { return b.n - a.n; });
    return { total: all.length, items: all.slice(off, off + lim) };
  }

  /* ---------- ປຽບທຽບ state ກ່ອນ/ຫຼັງ → events ---------- */
  const SET_KEYS = ['shopName', 'serviceChargePct', 'vatPct', 'billDiscPct', 'discLimit', 'stockBlock', 'yieldCut', 'sod', 'auditCfg', 'tgStock', 'qrGlobal', 'qrPinRequired', 'qrExpires', 'modules', 'navHide', 'payTypes', 'payFee', 'creditCfg', 'roleDefs', 'rateTHB', 'rateUSD', 'pointValue', 'requireShift', 'promos', 'bankQR', 'staffDisc', 'voidPolicy'];
  const logKey = function (l) { return [l.ts, l.action || l.type || l.code || '', l.by || '', String(l.detail || l.reason || l.name || '').slice(0, 40), l.delta == null ? '' : l.delta].join('|'); };
  function newLogs(prev, next, field, t, map) {
    const seen = {}; (prev[field] || []).forEach(function (l) { seen[logKey(l)] = 1; });
    const out = []; (next[field] || []).forEach(function (l) { if (l && !seen[logKey(l)]) out.push({ t: t, ts: l.ts, d: map(l) }); });
    return out.slice(-3000);
  }
  function menuMap(cat) { const m = {}; Object.keys(cat || {}).forEach(function (c) { Object.keys(cat[c] || {}).forEach(function (s) { (cat[c][s] || []).forEach(function (p) { if (p && p.c) m[p.c] = p; }); }); }); return m; }
  function diffState(prev, next, ctx) {
    const ev = [], alerts = []; ctx = ctx || {};
    if (!prev || !next) return { events: [], alerts: [] };
    /* 1) ບັນທຶກຂອງແອັບ: orderLog / cancelLog / stockLog */
    newLogs(prev, next, 'orderLog', 'log', function (l) { return { a: l.action, x: trim(l.detail, 300), tb: l.table || '', by: l.by || '' }; }).forEach(function (e) { ev.push(e); });
    newLogs(prev, next, 'cancelLog', 'cancel', function (l) { return { k: l.type || l.action, code: l.code, name: l.name, qty: l.qty, amt: l.amt, tb: l.table, why: trim(l.reason || l.note || '', 200), by: l.by || l.user || '' }; }).forEach(function (e) { ev.push(e); });
    newLogs(prev, next, 'stockLog', 'stock', function (l) { return { code: l.code, name: l.name, d: l.delta, af: l.after, why: l.reason, ref: trim(l.ref || '', 120), by: l.by || '', loc: l.loc || '' }; }).forEach(function (e) { ev.push(e); });
    /* 2) ບິນ: void / ຄືນເງິນ / ບິນຫາຍ */
    const pb = {}, nb = {}; (prev.bills || []).forEach(function (b) { if (b && b.receipt) pb[b.receipt] = b; }); (next.bills || []).forEach(function (b) { if (b && b.receipt) nb[b.receipt] = b; });
    Object.keys(nb).forEach(function (r) { const b = nb[r], o = pb[r]; if (!o) return;
      if (b.voided && !o.voided) { ev.push({ t: 'bill_void', d: { receipt: r, amt: b.total, tb: b.table, why: trim(b.voidReason || '', 200), by: b.voidBy || '' } }); if ((+b.total || 0) >= ((next.auditCfg && +next.auditCfg.voidAmt) || 200000)) alerts.push('🚫 Void ບິນ ' + r + ' · ' + Math.round(+b.total || 0).toLocaleString('en-US') + ' ກີບ · ' + trim(b.voidReason || '', 80) + ' · ' + (b.voidBy || ctx.u || '')); }
      if ((+b.refundAmt || 0) !== (+o.refundAmt || 0)) ev.push({ t: 'bill_refund', d: { receipt: r, from: +o.refundAmt || 0, to: +b.refundAmt || 0 } }); });
    Object.keys(pb).forEach(function (r) { if (nb[r]) return; if (ctx.arch) return; try { if (isArchived(pb[r])) return; } catch (e) {} ev.push({ t: 'bill_removed', d: { receipt: r, amt: pb[r].total, ts0: pb[r].ts } }); alerts.push('⛔ ບິນຫາຍຈາກລະບົບ ' + r + ' · ' + Math.round(+pb[r].total || 0).toLocaleString('en-US') + ' ກີບ (ບໍ່ແມ່ນການຍ້າຍເຂົ້າຄັງ)'); });
    /* 3) ຂໍ້ມູນຫຼັກ: ເມນູ / ວັດຖຸດິບ / ຜູ້ໃຊ້ / ການຕັ້ງຄ່າ — ກ່ອນ → ຫຼັງ */
    const pm = menuMap(prev.catalog), nm = menuMap(next.catalog), chg = { price: [], recipe: [], cost: [] }, who = ctx.u || '?';
    Object.keys(nm).forEach(function (c) { const a = pm[c], b = nm[c]; if (!a) { if (Object.keys(pm).length) ev.push({ t: 'master', d: { k: 'menu+', code: c, name: b.n, p: b.p } }); return; }
      ['p', 'n'].forEach(function (f) { if (a[f] !== b[f]) { ev.push({ t: 'master', d: { k: 'menu.' + (f === 'p' ? 'price' : 'name'), code: c, name: b.n, from: a[f], to: b[f] } }); if (f === 'p') chg.price.push((b.n || c) + ' ' + a[f] + '→' + b[f]); } });
      if (JSON.stringify(a.bom || []) !== JSON.stringify(b.bom || [])) { ev.push({ t: 'master', d: { k: 'menu.recipe', code: c, name: b.n, from: trim(a.bom || [], 300), to: trim(b.bom || [], 300) } }); chg.recipe.push(b.n || c); } });
    Object.keys(pm).forEach(function (c) { if (!nm[c] && Object.keys(nm).length) ev.push({ t: 'master', d: { k: 'menu-', code: c, name: pm[c].n } }); });
    const pi = prev.ingredients || {}, ni = next.ingredients || {};
    Object.keys(ni).forEach(function (c) { const a = pi[c], b = ni[c]; if (!b) return; if (!a) { if (Object.keys(pi).length) ev.push({ t: 'master', d: { k: 'ing+', code: c, name: b.name, unit: b.unit } }); return; }
      ['name', 'unit', 'cost', 'yield', 'reorder', 'max', 'bu', 'bf', 'rec'].forEach(function (f) { if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) { ev.push({ t: 'master', d: { k: 'ing.' + f, code: c, name: b.name, from: f === 'rec' ? trim(a[f] || null, 300) : a[f], to: f === 'rec' ? trim(b[f] || null, 300) : b[f] } }); if (f === 'cost' || f === 'yield') chg.cost.push((b.name || c) + ' ' + f + ' ' + a[f] + '→' + b[f]); if (f === 'rec') chg.recipe.push((b.name || c) + ' (ສູດຍ່ອຍ)'); } });
      /* ສະຕ໋ອກຕິດລົບໃໝ່ */
      const neg = function (it) { return Object.keys(it.locs || {}).filter(function (l) { return (+it.locs[l] || 0) < 0; }); };
      const nn = neg(b), on = neg(a); nn.forEach(function (l) { if (on.indexOf(l) < 0) { ev.push({ t: 'neg_stock', d: { code: c, name: b.name, loc: l, have: +b.locs[l] } }); alerts.push('📉 ສະຕ໋ອກຕິດລົບ ' + (b.name || c) + ' = ' + (Math.round(+b.locs[l] * 100) / 100) + ' ' + (b.unit || '')); } }); });
    Object.keys(pi).forEach(function (c) { if (!ni[c] && Object.keys(ni).length) ev.push({ t: 'master', d: { k: 'ing-', code: c, name: pi[c].name } }); });
    const sm = function (arr, icon, label) { if (arr.length) alerts.push(icon + ' ' + label + ' ' + arr.length + ' ລາຍການ ໂດຍ ' + who + ': ' + arr.slice(0, 3).map(function (x) { return trim(x, 60); }).join(' · ') + (arr.length > 3 ? ' …' : '') + ' — ເຈົ້າຂອງກວດ/ຢືນຢັນໃນໜ້າ ຕິດຕາມກວດສອບ'); };
    sm(chg.price, '💲', 'ແກ້ລາຄາເມນູ'); sm(chg.recipe, '🧾', 'ແກ້ສູດເມນູ'); sm(chg.cost, '💰', 'ແກ້ຕົ້ນທຶນ/Yield ວັດຖຸດິບ');
    const pu = {}, nu = {}; (prev.users || []).forEach(function (u) { if (u && u.id) pu[u.id] = u; }); (next.users || []).forEach(function (u) { if (u && u.id) nu[u.id] = u; });
    const pinOf = function (u) { return u ? String(u.pinH || u.pin || '') : ''; };
    Object.keys(nu).forEach(function (id) { const a = pu[id], b = nu[id]; if (!a) { if (Object.keys(pu).length) { ev.push({ t: 'user', d: { k: 'user+', id: id, name: b.name, role: b.role } }); alerts.push('👤 ເພີ່ມຜູ້ໃຊ້ ' + (b.name || id) + ' (' + (b.role || '') + ') ໂດຍ ' + (ctx.u || '?')); } return; }
      ['name', 'role', 'active', 'chkDept'].forEach(function (f) { if (JSON.stringify(a[f]) !== JSON.stringify(b[f])) { ev.push({ t: 'user', d: { k: 'user.' + f, id: id, name: b.name, from: a[f], to: b[f] } }); if (f === 'role' || f === 'active') alerts.push('👤 ' + (b.name || id) + ': ' + f + ' ' + trim(a[f], 30) + ' → ' + trim(b[f], 30) + ' ໂດຍ ' + (ctx.u || '?')); } });
      if (JSON.stringify(a.perm || null) !== JSON.stringify(b.perm || null)) { ev.push({ t: 'user', d: { k: 'user.perm', id: id, name: b.name, from: trim(a.perm || null, 300), to: trim(b.perm || null, 300) } }); alerts.push('🔑 ແກ້ສິດ ' + (b.name || id) + ' ໂດຍ ' + (ctx.u || '?')); }
      if (pinOf(a) !== pinOf(b)) { ev.push({ t: 'user', d: { k: 'user.pin', id: id, name: b.name } }); alerts.push('🔐 ປ່ຽນ PIN ຂອງ ' + (b.name || id) + ' ໂດຍ ' + (ctx.u || '?')); } });
    Object.keys(pu).forEach(function (id) { if (!nu[id] && Object.keys(nu).length) { ev.push({ t: 'user', d: { k: 'user-', id: id, name: pu[id].name } }); alerts.push('👤 ລຶບຜູ້ໃຊ້ ' + (pu[id].name || id) + ' ໂດຍ ' + (ctx.u || '?')); } });
    SET_KEYS.forEach(function (k) { const a = JSON.stringify(prev[k] === undefined ? null : prev[k]), b = JSON.stringify(next[k] === undefined ? null : next[k]); if (a === b) return;
      const red = k === 'bankQR'; ev.push({ t: 'setting', d: { k: k, from: red ? sha(a).slice(0, 12) : trim(a, 400), to: red ? sha(b).slice(0, 12) : trim(b, 400) } });
      if (k === 'bankQR' || k === 'stockBlock' || k === 'yieldCut' || k === 'discLimit' || k === 'sod' || k === 'requireShift') alerts.push('⚙️ ປ່ຽນຕັ້ງຄ່າ ' + k + (red ? ' (QR ໂອນເງິນຂອງຮ້ານ!)' : ' → ' + trim(next[k], 60)) + ' ໂດຍ ' + (ctx.u || '?')); });
    return { events: ev, alerts: alerts };
  }
  return { append: append, list: list, verify: verify, diffState: diffState, month: month };
}
module.exports = { create: create };
