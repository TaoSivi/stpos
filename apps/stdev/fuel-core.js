/* ST Fuel — ເບີກຈ່າຍນ້ຳມັນສະໜາມ: logic ທັງໝົດ (ບໍ່ຮູ້ເລື່ອງ HTTP / ໄຟລ໌ — server.js ສົ່ງ store ເຂົ້າມາ)
 * ຂໍ້ມູນ: cfg (ສະໜາມ, ລົດ) · d_<ສະໜາມ>_<ວັນທີ> (ໃບປະຈຳວັນ) · p_<ສະໜາມ>_<ວັນທີ> (ຮູບ)
 * ພະນັກງານກອກແຕ່ cm — ລິດຄິດໄລ່ຢູ່ນີ້ບ່ອນດຽວ (ແອັບສະແດງຄ່າທີ່ server ຄືນໃຫ້)
 * ສິດ = ຟັງຊັນທີ່ຕິກໄດ້ (KEYS) · ເລີ່ມຈາກ "ແມ່ແບບໜ້າທີ່" (PRESET ຕາມ user.role) ແລ້ວ user.rights (ລາຍການຕິກສຸດທ້າຍ) ແທນທີ່ໄດ້ທັງໝົດ
 *   owner = ທຸກຢ່າງ + ຕັ້ງຄ່າ (ຕິກບໍ່ໄດ້) · ຂອບເຂດສະໜາມ: head/admin/driver ເຮັດໄດ້ສະເພາະສະໜາມໃນ user.sites · office ທຸກສະໜາມ
 *   ຄົນຂັບຂອງລົດ (vehicles[].driver = ເບີໂທ) ທີ່ບໍ່ມີສະໜາມນັ້ນໃນ sites = ເຮັດໄດ້ສະເພາະ "ຮັບຮູ້ລົດຂອງຕົນ" */
'use strict';
const ID = /^[a-z0-9]{1,16}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = function (x) { const n = Number(x); return x === '' || x == null || !isFinite(n) || n < 0 || n > 1e6 ? null : n; };
const srcN = function (x) { return x === 'jug' ? 'jug' : x === 'shop' ? 'shop' : 'tank'; }; /* ເຕີມຈາກ: ແທ່ງ · ຕຸກ (ພາໄປສະໜາມ) · ຮ້ານ/ປໍ້າອື່ນ (ບໍ່ຫັກແທ່ງຂອງສະໜາມ) */
const str = function (x, n) { return String(x == null ? '' : x).replace(/[<>]/g, '').trim().slice(0, n); };

/* ຟັງຊັນທີ່ຕິກສິດໄດ້ — label ໃຊ້ໃນຟອມ "ພະນັກງານ & ສິດ" */
const RIGHTS = [
  { k: 'view', label: 'ເບິ່ງລາຍງານ & ຍອດແທ່ງ' }, { k: 'issue', label: 'ເບີກ & ແກ້ cm ຂອງລົດ' }, { k: 'tank', label: 'ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ' },
  { k: 'assign', label: 'ມອບລົດໃຫ້ຄົນຂັບ' }, { k: 'approve', label: 'ອະນຸມັດໃບປະຈຳວັນ' }, { k: 'ack', label: 'ຮັບຮູ້ການເຕີມຂອງລົດຕົນ (ຄົນຂັບ)' }, { k: 'fixAck', label: 'ແກ້ cm ຫຼັງຄົນຂັບຮັບຮູ້ແລ້ວ' },
  { k: 'request', label: 'ຂໍນ້ຳມັນ (ວິຊາການ)' }, { k: 'reqOk', label: 'ອະນຸມັດຄຳຂໍນ້ຳມັນ (ເລືອກແຫຼ່ງ: ແທ່ງ / ຊື້ປໍ້າ)' }, { k: 'urgent', label: 'ເຕີມດ່ວນ ບໍ່ມີຄຳຂໍ' }
];
const KEYS = RIGHTS.map(function (r) { return r.k; });
const PRESET = { head: ['view', 'issue', 'tank', 'assign', 'approve', 'fixAck', 'request', 'reqOk', 'urgent'], admin: ['view', 'issue', 'tank', 'request'], office: ['view'], driver: ['ack'], tech: ['request'] };
const OPS = ['view', 'issue', 'tank', 'assign', 'approve', 'request', 'reqOk']; /* ສິດທີ່ໃຊ້ໜ້າບໍລິຫານ (ບໍ່ແມ່ນສະເພາະຮັບຮູ້) */
/* ສິດຕົວຈິງຂອງ user = {role, rights?, approver?}: owner ໄດ້ທັງໝົດ · ມີ rights ໃຊ້ rights · ບໍ່ມີ ໃຊ້ແມ່ແບບ · approver:true ເພີ່ມ approve (ຂໍ້ມູນເກົ່າ) */
function rightsFor(user) {
  if (user.role === 'owner') return KEYS.slice();
  let l = Array.isArray(user.rights) ? user.rights : (PRESET[user.role] || []);
  if (user.approver === true) l = l.concat('approve');
  return KEYS.filter(function (k) { return l.indexOf(k) >= 0; });
}
const Tank = require('./public/tank.js'), liters = Tank.liters; /* ສູດຖັງ ຢູ່ tank.js — ມືຖືໃຊ້ໄຟລ໌ດຽວກັນຕອນອອບລາຍ */
function cleanTank(t) {
  t = t || {};
  if (t.t === 'box') return num(t.l) && num(t.w) ? { t: 'box', l: num(t.l), w: num(t.w) } : null;
  if (t.t === 'hcyl') return num(t.d) && num(t.len) ? { t: 'hcyl', d: num(t.d), len: num(t.len) } : null;
  return num(t.k) ? { t: 'lpc', k: num(t.k) } : null;
}
function cleanCfg(c) {
  c = c || {}; const out = { company: str(c.company, 100), sites: [], vehicles: [] }, seen = {};
  (Array.isArray(c.sites) ? c.sites : []).forEach(function (s) { if (s && ID.test(s.id) && !seen[s.id] && str(s.name, 80)) { seen[s.id] = 1; const lg = typeof s.logo === 'string' && s.logo.length <= 200000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(s.logo) ? s.logo : '', tl = Number(s.tol); out.sites.push({ id: s.id, name: str(s.name, 80), tank: cleanTank(s.tank), company: str(s.company, 100), meter: !!s.meter, rq: !!s.rq, logo: lg, tol: isFinite(tl) && tl >= 0 && tl <= 100000 && s.tol !== '' && s.tol != null ? tl : null }); } });
  const vs = {};
  (Array.isArray(c.vehicles) ? c.vehicles : []).forEach(function (v) { if (v && ID.test(v.id) && !vs[v.id] && seen[v.site] && str(v.name, 60) && cleanTank(v.tank)) { vs[v.id] = 1; out.vehicles.push({ id: v.id, name: str(v.name, 60), site: v.site, driver: str(v.driver, 40), tank: cleanTank(v.tank) }); } });
  return out;
}

/* store = {read(name) → object|null, write(name, object), list(prefix) → [name]} · user = {id, role, name} */
function handle(store, user, o) {
  const a = String(o.action || ''), cfg = store.read('cfg') || { sites: [], vehicles: [] };
  const boss = user.role === 'owner', mem = ['admin', 'head', 'driver', 'tech'].indexOf(user.role) >= 0 ? { role: user.role, sites: user.sites || [] } : null, R = rightsFor(user), has = function (k) { return R.indexOf(k) >= 0 || (k === 'ack' && mine.length > 0); }; /* ເປັນຄົນຂັບຂອງລົດຄັນໃດ = ຮັບຮູ້ລົດຂອງຕົນໄດ້ ເຖິງບໍ່ໄດ້ຕິກສິດ */
  const mine = cfg.vehicles.filter(function (v) { return v.driver === user.id; });
  /* ບົດບາດຂອງຜູ້ໃຊ້ໃນສະໜາມນີ້: boss > head > admin > office > driver > null */
  const roleAt = function (site) {
    if (boss) return 'boss';
    if (user.role === 'office') return 'office';
    if (mem && mem.sites.indexOf(site) >= 0) return mem.role;
    return mine.some(function (v) { return v.site === site; }) ? 'driver' : null;
  };
  /* ຂອບເຂດ "ຄົນຂັບຂອງລົດ" (ບໍ່ມີສະໜາມນີ້ໃນ sites) = ເຮັດໄດ້ສະເພາະຮັບຮູ້ */
  const carOnly = function (site) { return !boss && roleAt(site) === 'driver' && !(mem && mem.sites.indexOf(site) >= 0); };
  const canAt = function (site, k) { return boss || (carOnly(site) ? k === 'ack' && has('ack') : has(k)); };
  const opsAt = function (site) { return boss || (!carOnly(site) && roleAt(site) && OPS.some(has)); };
  const err = function (e) { return { ok: false, error: e }; }, ok = function (d) { return { ok: true, data: d }; };
  const nowMs = typeof store.now === 'function' ? store.now() : Date.now(), laoDay = function (back) { return new Date(nowMs + 7 * 36e5 - (back || 0) * 864e5).toISOString().slice(0, 10); }; /* ເວລາລາວ UTC+7 */

  if (a === 'init') {
    const sites = cfg.sites.filter(function (s) { return roleAt(s.id); });
    const rs = {}; sites.forEach(function (s) { rs[s.id] = boss ? KEYS.slice() : carOnly(s.id) ? (has('ack') ? ['ack'] : []) : R; });
    return ok({ me: { id: user.id, name: user.name, boss: boss, roles: sites.reduce(function (m, s) { m[s.id] = roleAt(s.id); return m; }, {}), rights: rs }, company: cfg.company || '', cfg: boss ? cfg : { sites: sites, vehicles: cfg.vehicles.filter(function (v) { return opsAt(v.site); }) } }); /* ມີຂະໜາດຖັງ: ມືຖືຕ້ອງຄິດລິດເອງຕອນບໍ່ມີເນັດ */
  }
  if (a === 'cfgSave') { if (!boss) return err('auth'); const c = cleanCfg(o.cfg); store.write('cfg', c); return ok(c); }

  const site = cfg.sites.filter(function (s) { return s.id === o.site; })[0], role = site && roleAt(site.id);
  if (!site || !role) return err('auth');
  const can = function (k) { return canAt(site.id, k); }, ownOnly = !opsAt(site.id);
  const cars = cfg.vehicles.filter(function (v) { return v.site === site.id; });
  /* ເຕີມຫຼາຍຮອບຕໍ່ມື້: ຮອບທີ 2, 3… ເກັບເປັນແຖວ "<ລົດ>_r2", "_r3" ໃນໃບດຽວກັນ — ແຕ່ລະຮອບມີ cm ກ່ອນ/ຫຼັງ, ແຫຼ່ງເຕີມ, ແລະ ຄົນຂັບຮັບຮູ້ແຍກກັນ */
  const rname = function (v, n) { return v.name + ' · ເຕີມຄັ້ງທີ ' + n; };
  const carsOf = function (sh) { const out = []; cars.forEach(function (v) { out.push(v); for (let n = 2; n < 10 && sh.rows[v.id + '_r' + n]; n++) out.push(Object.assign({}, v, { id: v.id + '_r' + n, base: v.id, round: n, name: rname(v, n) })); }); return out; };
  const vcar = function (vid, sh, create) { const m = /^(.+)_r([2-9])$/.exec(String(vid || '')); if (!m) return cars.filter(function (v) { return v.id === vid; })[0]; const b = cars.filter(function (v) { return v.id === m[1]; })[0], n = +m[2]; if (!b) return null; if (!sh.rows[vid] && !(create && (n === 2 || sh.rows[m[1] + '_r' + (n - 1)]))) return null; return Object.assign({}, b, { id: vid, base: b.id, round: n, name: rname(b, n) }); };
  const chainUsed = function (v, sh) { const ids = [v.id]; for (let n = 2; n < 10 && sh.rows[v.id + '_r' + n]; n++) ids.push(v.id + '_r' + n); if (ids.length < 2) return null; let u = 0; for (let i = 0; i < ids.length; i++) { const L1 = liters(v.tank, (sh.rows[ids[i]] || {}).cm1); if (L1 == null) return null; const nx = i < ids.length - 1 ? liters(v.tank, (sh.rows[ids[i + 1]] || {}).cm0) : liters(v.tank, sh.rows[v.id].cm2); if (nx == null) return null; u += L1 - nx; } return u; };
  const sheetOf = function (d) { return store.read('d_' + site.id + '_' + d) || { rows: {}, tank: {} }; };
  /* ຄ່າລິດຂອງ 1 ຄັນ ຈາກ cm ທີ່ກອກ */
  const calc = function (v, r) {
    const L0 = liters(v.tank, r.cm0), L1 = liters(v.tank, r.cm1), L2 = liters(v.tank, r.cm2);
    return { L0: L0, L1: L1, L2: L2, add: L0 != null && L1 != null ? L1 - L0 : null, used: L1 != null && L2 != null ? L1 - L2 : null };
  };
  /* cm ຫຼັງເລີກວຽກ (cm2) ຂອງລົດຄັນນີ້ ໃນມື້ກ່ອນໜ້າທີ່ເຄີຍບັນທຶກ (ຍ້ອນຫຼັງບໍ່ເກີນ 14 ໄຟລ໌) — ໃຊ້ທຽບກັບ "ກ່ອນເຕີມ" ມື້ນີ້ */
  const prevOf = function (v, date) {
    const days = store.list('d_' + site.id + '_').map(function (n) { return n.slice(-10); }).filter(function (d) { return d < date; }).sort().reverse().slice(0, 14);
    for (let i = 0; i < days.length; i++) { const r = ((store.read('d_' + site.id + '_' + days[i]) || { rows: {} }).rows || {})[v.id] || {}; if (r.cm2 != null) return { date: days[i], cm2: r.cm2, L2: liters(v.tank, r.cm2) }; }
    return null;
  };
  const issued = function (sh) { return carsOf(sh).reduce(function (t, v) { const r = sh.rows[v.id] || {}, c = calc(v, r); return t + (c.add > 0 && r.src !== 'shop' ? c.add : 0); }, 0); }; /* ລິດທີ່ຫັກຈາກແທ່ງ (ບໍ່ນັບຮ້ານອື່ນ) */
  const shopL = function (sh) { return carsOf(sh).reduce(function (t, v) { const r = sh.rows[v.id] || {}, c = calc(v, r); return t + (c.add > 0 && r.src === 'shop' ? c.add : 0); }, 0); };
  /* shortcut: ຍອດເຫຼືອແທ່ງ ອ່ານທຸກໃບຂອງສະໜາມທຸກເທື່ອ (ມື້ລະ 1 ໄຟລ໌ນ້ອຍ) — ຖ້າເກີນຫຼາຍຮ້ອຍມື້ແລ້ວຊ້າ ໃຫ້ເກັບຍອດຍົກມາ */
  const ledger = function () {
    let bal = 0, last = null, acc = 0, lastM = null, accO = 0; /* ຕ່າງ = ແທກຈິງ − (ແທກຄັ້ງກ່ອນ + ຮັບ − ຈ່າຍ ຕັ້ງແຕ່ນັ້ນ) — ຄັ້ງທຳອິດເປັນຖານ ບໍ່ມີຄ່າຕ່າງ */
    return store.list('d_' + site.id + '_').sort().map(function (n) {
      const d = n.slice(-10), sh = store.read(n) || { rows: {}, tank: {} }, recv = sh.tank.recv || 0, out = issued(sh);
      bal += recv - out; acc += recv - out;
      const m = liters(site.tank, sh.tank.cm); let exp = null, diff = null;
      if (m != null) { if (last != null) { exp = last + acc; diff = m - exp; } last = m; acc = 0; }
      const mt = sh.tank.mtr; let mused = null, mdiff = null; /* ມິເຕີ: ໃຊ້ = ເລກມື້ນີ້ − ເລກຄັ້ງກ່ອນ · ຕ່າງ = ມິເຕີນັບໄດ້ − ລິດທີ່ເບີກຕາມໃບ (ຕັ້ງແຕ່ຄັ້ງກ່ອນ) */
      if (mt != null) { if (lastM != null) { mused = mt - lastM; mdiff = mused - (accO + out); } lastM = mt; accO = 0; } else accO += out;
      return { date: d, recv: recv, out: out, shop: shopL(sh), bal: bal, cm: sh.tank.cm, measured: m, exp: exp, diff: diff, mtr: mt != null ? mt : null, mused: mused, mdiff: mdiff, approved: !!sh.approved };
    });
  };
  if (a === 'assign') { /* ມອບລົດໃຫ້ຄົນຂັບ (ຫົວໜ້າ / ເຈົ້າຂອງ) — driver = ເບີໂທ ຫຼື ວ່າງ = ຍົກເລີກ */
    if (!can('assign')) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
    cfg.vehicles.forEach(function (v) { if (v.id === c.id) v.driver = str(o.driver, 40); }); store.write('cfg', cfg);
    return ok(cfg.vehicles.filter(function (v) { return v.site === site.id; }).map(function (v) { return { id: v.id, driver: v.driver }; }));
  }
  const lim = !boss && !ownOnly && !['view', 'issue', 'tank', 'assign', 'approve'].some(has); /* ວິຊາການ: ຂໍນ້ຳມັນຢ່າງດຽວ — ບໍ່ເຫັນຍອດແທ່ງ / ໃບເບີກ */
  if (a === 'ledger') return ownOnly || lim ? err('auth') : ok(ledger());

  if (!DATE.test(o.date)) return err('date');
  const key = 'd_' + site.id + '_' + o.date, pkey = 'p_' + site.id + '_' + o.date, sh = sheetOf(o.date);
  const meterInfo = function (L, today, date) { /* ເລກມິເຕີຄັ້ງກ່ອນ + ລິດເບີກສະສົມຕັ້ງແຕ່ນັ້ນ (ໃຫ້ມືຖືຄິດເອງຕອນບໍ່ມີເນັດ) */
    const pv = L.filter(function (x) { return x.date < date && x.mtr != null; }).pop(), base = L.filter(function (x) { return x.date < date && (!pv || x.date > pv.date); }).reduce(function (t, x) { return t + x.out; }, 0);
    return { mprev: pv ? pv.mtr : null, mbase: pv ? base : null, mused: today ? today.mused : null, mdiff: today ? today.mdiff : null };
  };
  /* ===== ຄຳຂໍນ້ຳມັນ (ສະໜາມທີ່ເປີດ site.rq): ວິຊາການຂໍ → ບໍລິຫານອະນຸມັດ (ແຫຼ່ງ ແທ່ງ/ຊື້ປໍ້າ + ລິດ) → ເຕີມເຂົ້າລົດ (ແຖວ/ຮອບ) → ຄົນຂັບຮັບຮູ້ ===== */
  const qkey = 'q_' + site.id + '_' + o.date, qdoc = function () { return DATE.test(o.date) ? (store.read(qkey) || { list: [] }) : { list: [] }; };
  const rqView = function (sh, q) { return q.list.map(function (x) { const row = x.row ? sh.rows[x.row] : null, c = row ? calc(cars.filter(function (v) { return v.id === x.v; })[0] || {}, row) : null; return Object.assign({}, x, { car: (cars.filter(function (v) { return v.id === x.v; })[0] || {}).name || x.v, fill: c ? c.add : null, state: x.st === 'approved' && x.row ? (row && row.cm1 != null ? 'done' : 'filling') : x.st }); }); };
  const view = function () {
    const all = carsOf(sh), show = ownOnly ? all.filter(function (v) { return v.driver === user.id; }) : all;
    const L = ownOnly ? [] : ledger(), today = L.filter(function (x) { return x.date === o.date; })[0], before = L.filter(function (x) { return x.date < o.date; }).pop();
    const q = qdoc(), qs = rqView(sh, q).filter(function (x) { return ownOnly ? cars.some(function (v) { return v.id === x.v && v.driver === user.id; }) : lim ? x.by === user.id : true; });
    if (lim) return ok({ site: site.id, date: o.date, role: role, approved: sh.approved || null, rows: [], tank: null, reqs: qs, rqOn: !!site.rq });
    return ok({ site: site.id, date: o.date, role: role, approved: sh.approved || null, reqs: qs, rqOn: !!site.rq,
      rows: show.map(function (v) { const r = sh.rows[v.id] || {}, c = calc(v, r), pv = ownOnly || v.round ? null : prevOf(v, o.date), cu = v.round ? null : chainUsed(v, sh); if (cu != null) c.used = cu; return Object.assign({ v: v.id, name: v.name, driver: v.driver, mine: v.driver === user.id, base: v.base || null, round: v.round || 1, rqi: r.rq ? (function () { const x = q.list.filter(function (y) { return y.id === r.rq; })[0]; return x ? { id: x.id, ask: x.lit, ok: x.ok && x.ok.lit != null ? x.ok.lit : null, src: x.ok && x.ok.src, urgent: !!x.urgent, by: x.name } : null; })() : null }, r, c, { prev: pv, gap: pv && c.L0 != null && pv.L2 != null ? c.L0 - pv.L2 : null }); }),
      tank: ownOnly ? null : Object.assign({}, sh.tank, meterInfo(L, today, o.date), { has: !!site.tank, meter: !!site.meter || !!site.tank, measured: liters(site.tank, sh.tank.cm), bal: today ? today.bal : before ? before.bal : 0, out: today ? today.out : 0, exp: today ? today.exp : null, diff: today ? today.diff : null }) });
  };
  if (a === 'sheet') return view();
  if (a === 'photometa') { const pm = store.read('pm_' + site.id + '_' + o.date) || {}; delete pm._log; if (ownOnly) Object.keys(pm).forEach(function (k) { if (!mine.some(function (v) { return k.indexOf(v.id + '_') === 0; })) delete pm[k]; }); return ok(pm); }
  if (a === 'photos') { const p = store.read(pkey) || {}; if (ownOnly) Object.keys(p).forEach(function (k) { if (!mine.some(function (v) { return k.indexOf(v.id + '_') === 0; })) delete p[k]; }); return ok(p); }

  if (a.indexOf('rq') === 0) { /* ===== ຄຳຂໍນ້ຳມັນ ===== */
    if (!site.rq) return err('rqoff'); if (!DATE.test(o.date)) return err('date');
    if (o.date > laoDay(0)) return err('future'); if (o.date < laoDay(boss || has('fixAck') ? 60 : 7)) return err('old');
    if (sh.approved) return err('locked');
    const q = qdoc(), by = function (id) { return q.list.filter(function (x) { return x.id === id; })[0]; }, done = function () { store.write(qkey, q); return view(); };
    const rowFor = function (cid) { let id = cid, n = 1; while (sh.rows[id]) { n++; id = cid + '_r' + n; if (n > 9) return null; } return id; }; /* ແຖວຖັດໄປຂອງລົດ: v · v_r2 · v_r3 */
    const open = function (x) { /* ເລີ່ມເຕີມຕາມຄຳຂໍ: ສ້າງແຖວ (ຮອບ) ແລະ ຜູກກັບຄຳຂໍ */
      const rid = rowFor(x.v); if (!rid) return false; sh.rows[rid] = { rq: x.id, src: x.ok.src, shop: x.ok.shop || '', by: user.id, at: nowMs }; x.row = rid; store.write(key, sh); return true;
    };
    if (a === 'rqNew') {
      if (!can('request')) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
      const lit = num(o.lit); if (!(lit > 0) || lit > 100000) return err('lit');
      q.list.push({ id: 'r' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36), v: c.id, lit: lit, note: str(o.note, 200), by: user.id, name: user.name, at: nowMs, st: 'pending' }); return done();
    }
    if (a === 'rqDecide') {
      if (!can('reqOk')) return err('auth'); const x = by(o.id); if (!x) return err('rq'); if (x.st !== 'pending' && !(x.st === 'approved' && !x.row)) return err('rqstate');
      if (o.yes) { const lit = o.lit == null || o.lit === '' ? x.lit : num(o.lit); if (!(lit > 0) || lit > 100000) return err('lit'); x.st = 'approved'; x.ok = { by: user.id, name: user.name, at: nowMs, lit: lit, src: srcN(o.src), shop: str(o.shop, 60) }; delete x.why; }
      else { x.st = 'rejected'; x.why = str(o.why, 200); x.ok = { by: user.id, name: user.name, at: nowMs }; }
      return done();
    }
    if (a === 'rqCancel') {
      const x = by(o.id); if (!x) return err('rq'); if (x.row || x.st === 'rejected' || x.st === 'cancel') return err('rqstate');
      if (!(can('reqOk') || (x.by === user.id && x.st === 'pending'))) return err('auth'); x.st = 'cancel'; return done();
    }
    if (a === 'rqStart') { /* ເລີ່ມເຕີມ: ຄົນເບີກ (ສິດ issue) */
      if (!can('issue')) return err('auth'); const x = by(o.id); if (!x || x.st !== 'approved' || x.row) return err('rqstate');
      if (!open(x)) return err('rounds'); return done();
    }
    if (a === 'rqUrgent') { /* ເຕີມດ່ວນ ບໍ່ມີຄຳຂໍ (ສິດ urgent) — ບັນທຶກເປັນຄຳຂໍ "ດ່ວນ" ທີ່ອະນຸມັດໂດຍຜູ້ເຮັດ */
      if (!can('urgent') || !can('issue')) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
      const x = { id: 'r' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36), v: c.id, lit: null, note: str(o.note, 200), by: user.id, name: user.name, at: nowMs, st: 'approved', urgent: true, ok: { by: user.id, name: user.name, at: nowMs, lit: null, src: srcN(o.src), shop: str(o.shop, 60) } };
      q.list.push(x); if (!open(x)) { q.list.pop(); return err('rounds'); } return done();
    }
    return err('action');
  }
  const car = vcar(o.v, sh, a === 'row' && !o.del);
  if (a === 'ack') { /* ຄົນຂັບຂອງລົດຄັນນັ້ນເທົ່ານັ້ນ — ຮັບຮູ້ຕົວເລກທີ່ບໍລິຫານກອກ (ເກັບສຳເນົາຕົວເລກໄວ້ກັບການຮັບຮູ້) */
    if (!car || car.driver !== user.id || !has('ack')) return err('auth');
    if (sh.approved) return err('locked');
    const r = sh.rows[car.id] || {}, c = calc(car, r);
    if (c.add == null) return err('empty');
    if (o.yes) { r.ack = { by: user.id, name: user.name, at: Date.now(), cm0: r.cm0, cm1: r.cm1, add: c.add }; delete r.rej; }
    else { r.rej = { by: user.id, name: user.name, at: Date.now(), why: str(o.why, 200) }; delete r.ack; }
    sh.rows[car.id] = r; store.write(key, sh); return view();
  }
  if (a === 'approve') { /* ຫົວໜ້າ/ເຈົ້າຂອງ ຫຼື ຄົນທີ່ເຈົ້າຂອງຕັ້ງເປັນ "ຜູ້ອະນຸມັດ" (ບໍລິຫານ/ຫ້ອງການ) */
    if (!can('approve')) return err('auth');
    if (o.yes) {
      if (carsOf(sh).some(function (v) { const r = sh.rows[v.id] || {}; return r.cm1 != null && !r.ack; })) return err('unacked');
      if (site.rq && qdoc().list.some(function (x) { return x.st === 'pending' || (x.st === 'approved' && !x.row); })) return err('openrq'); /* ຍັງມີຄຳຂໍທີ່ລໍອະນຸມັດ / ຍັງບໍ່ໄດ້ເຕີມ */
      sh.approved = { by: user.id, name: user.name, at: Date.now() };
    } else delete sh.approved;
    store.write(key, sh); return view();
  }
  if (['row', 'tank', 'photo'].indexOf(a) < 0) return err('action');
  if (a === 'row' ? !can('issue') : a === 'tank' ? !can('tank') : !can(o.key === 'tank' ? 'tank' : 'issue')) return err('auth');
  if (sh.approved) return err('locked');
  /* ກອກລ່ວງໜ້າບໍ່ໄດ້ · ຍ້ອນຫຼັງໄດ້ 7 ມື້ (ຫົວໜ້າ/ເຈົ້າຂອງ 60 ມື້) — ກັນການແຕ່ງຂໍ້ມູນຍ້ອນຫຼັງ */
  if (o.date > laoDay(0)) return err('future'); if (o.date < laoDay(boss || has('fixAck') ? 60 : 7)) return err('old');
  if (a === 'row') {
    if (!car) return err('vehicle');
    if (o.del) { /* ລຶບຮອບເຕີມ (ສະເພາະຮອບສຸດທ້າຍ) */
      if (!car.round) return err('vehicle'); if (sh.rows[car.base + '_r' + (car.round + 1)]) return err('rorder');
      const dr = sh.rows[car.id] || {}; if (dr.ack && !can('fixAck')) return err('acked'); delete sh.rows[car.id]; store.write(key, sh);
      if (dr.rq) { const dq = qdoc(), dx = dq.list.filter(function (x) { return x.id === dr.rq; })[0]; if (dx) { dx.row = null; if (dx.urgent) dx.st = 'cancel'; store.write(qkey, dq); } }
      return view();
    }
    if (car.round) delete o.cm2; /* cm ຕອນແລງ ກອກຢູ່ແຖວຮອບທີ 1 ເທົ່ານັ້ນ */
    if (site.rq && !sh.rows[car.id]) return err('norq'); /* ສະໜາມທີ່ໃຊ້ຄຳຂໍ: ຕ້ອງເລີ່ມຈາກຄຳຂໍທີ່ອະນຸມັດແລ້ວ ຫຼື ເຕີມດ່ວນ */
    const r = sh.rows[car.id] || {};
    const fill = ['cm0', 'cm1'].some(function (k) { return k in o && num(o[k]) !== (r[k] == null ? null : r[k]); }) || ('src' in o && srcN(o.src) !== (r.src || 'tank'));
    if (fill && r.ack) { if (!can('fixAck')) return err('acked'); delete r.ack; } /* ແກ້ຕົວເລກເຕີມຫຼັງຮັບຮູ້ = ຫົວໜ້າເທົ່ານັ້ນ ແລະ ຄົນຂັບຕ້ອງຮັບຮູ້ໃໝ່ */
    if (fill) delete r.rej;
    const before = Object.assign({}, r), nr = Object.assign({}, r);
    ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in o) { const n = num(o[k]); if (n == null) delete nr[k]; else nr[k] = n; } });
    const bad = Tank.check(car.tank, nr); if (bad) return err(bad);
    ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in o) { if (nr[k] == null) delete r[k]; else r[k] = nr[k]; if (before[k] != null && before[k] !== nr[k]) { r.h = (r.h || []).concat({ at: nowMs, by: user.id, k: k, from: before[k], to: nr[k] == null ? null : nr[k] }).slice(-30); } } }); /* ປະຫວັດແກ້ຄ່າທີ່ເຄີຍກອກແລ້ວ */
    if (!(r.rq && !can('fixAck'))) { if ('src' in o) r.src = srcN(o.src); if ('shop' in o) r.shop = str(o.shop, 60); } /* ແຫຼ່ງເຕີມມາຈາກການອະນຸມັດຄຳຂໍ */
    if ('note' in o) r.note = str(o.note, 200);
    r.by = user.id; r.at = nowMs; sh.rows[car.id] = r; store.write(key, sh); return view();
  }
  if (a === 'tank') {
    const t = sh.tank;
    ['cm', 'mtr'].concat(Array.isArray(t.recvs) ? [] : ['recv']).forEach(function (k) { if (k in o) { const n = num(o[k]); if (n == null) delete t[k]; else t[k] = n; } });
    if (o.add || o.del) { /* ຮັບເຂົ້າຫຼາຍຄັ້ງຕໍ່ມື້: ລາຍການ recvs, recv = ຜົນລວມ (ສ່ວນອື່ນຂອງລະບົບຍັງໃຊ້ recv ຄືເກົ່າ) */
      if (!Array.isArray(t.recvs)) t.recvs = t.recv > 0 ? [{ id: 'r0', lit: t.recv, from: '', note: '', by: user.id, at: nowMs }] : [];
      if (o.add) { const lit = num(o.add.lit); if (!(lit > 0) || lit > 1000000) return err('lit'); if (t.recvs.length >= 30) return err('rounds');
        t.recvs.push({ id: 'r' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36), lit: lit, from: str(o.add.from, 60), note: str(o.add.note, 200), by: user.id, at: nowMs }); }
      if (o.del) { const x = t.recvs.filter(function (r) { return r.id === o.del; })[0]; if (!x) return err('rq'); t.recvs = t.recvs.filter(function (r) { return r !== x; });
        const pk = x.id === 'r0' ? 'tank' : 'tank_' + x.id, p = store.read(pkey) || {}; if (p[pk]) { delete p[pk]; store.write(pkey, p); } }
      t.recv = t.recvs.reduce(function (s, r) { return s + r.lit; }, 0);
    }
    store.write(key, sh); return view();
  }
  if (a === 'photo') { /* key = <ລົດ>_b|a|e ຫຼື tank · data = data:image/jpeg ທີ່ແອັບຫຍໍ້ແລ້ວ */
    const m = /^([a-z0-9]{1,16}(?:_r[2-9])?)_(b|a|e)$/.exec(String(o.key || ''));
    if (o.key !== 'tank' && o.key !== 'mtr' && !/^tank_r[a-z0-9]{1,14}$/.test(String(o.key || '')) && !(m && carsOf(sh).some(function (v) { return v.id === m[1]; }))) return err('key');
    const p = store.read(pkey) || {}, mk = 'pm_' + site.id + '_' + o.date, pm = store.read(mk) || {};
    if (!o.data) { delete p[o.key]; delete pm[o.key]; pm._log = (pm._log || []).concat({ at: nowMs, by: user.id, key: o.key, act: 'del' }).slice(-50); }
    else { if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.data) || o.data.length > 400000) return err('image'); p[o.key] = o.data;
      const tk = Number(o.takenAt) > 0 && Number(o.takenAt) < 4e12 ? Math.round(Number(o.takenAt)) : null; pm[o.key] = { at: nowMs, by: user.id, name: user.name, taken: tk, how: o.how === 'file' ? 'file' : 'cam' }; /* ເວລາຮັບເປັນຂອງ server; ເວລາຖ່າຍມາຈາກເຄື່ອງ (ອັບຄ້າງຕອນບໍ່ມີເນັດ) */
      pm._log = (pm._log || []).concat({ at: nowMs, by: user.id, key: o.key, act: 'set' }).slice(-50); }
    store.write(pkey, p); store.write(mk, pm); return ok(1);
  }
  return err('action');
}
module.exports = { handle: handle, liters: liters, cleanCfg: cleanCfg, rightsFor: rightsFor, RIGHTS: RIGHTS, KEYS: KEYS, PRESET: PRESET, OPS: OPS };
