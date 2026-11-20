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
const PRESET = { head: ['view', 'issue', 'tank', 'assign', 'approve', 'fixAck', 'request', 'reqOk', 'urgent'], admin: ['view', 'issue', 'tank', 'request', 'reqOk'], office: ['view'], driver: ['ack'], tech: ['request'] };
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
  (Array.isArray(c.sites) ? c.sites : []).forEach(function (s) { if (s && ID.test(s.id) && !seen[s.id] && str(s.name, 80)) { seen[s.id] = 1; const lg = typeof s.logo === 'string' && s.logo.length <= 200000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(s.logo) ? s.logo : '', tl = Number(s.tol); out.sites.push({ id: s.id, name: str(s.name, 80), tank: cleanTank(s.tank), company: str(s.company, 100), hdr: str(s.hdr, 400), nat: s.nat !== false, meter: !!s.meter, rq: !!s.rq, logo: lg, tol: isFinite(tl) && tl >= 0 && tl <= 100000 && s.tol !== '' && s.tol != null ? tl : null }); } });
  const vs = {};
  (Array.isArray(c.vehicles) ? c.vehicles : []).forEach(function (v) { if (v && ID.test(v.id) && !vs[v.id] && seen[v.site] && str(v.name, 60) && cleanTank(v.tank)) { vs[v.id] = 1; out.vehicles.push({ id: v.id, name: str(v.name, 60), site: v.site, driver: str(v.driver, 40), tank: cleanTank(v.tank) }); } });
  return out;
}

/* store = {read(name) → object|null, write(name, object), list(prefix) → [name]} · user = {id, role, name} */
function handle(store, user, o) {
  const a = String(o.action || ''), cfg = store.read('cfg') || { sites: [], vehicles: [] };
  (cfg.sites || []).forEach(function (s) { if (s && s.rq === undefined) s.rq = true; }); /* ສະໜາມທີ່ບໍ່ເຄີຍຕັ້ງ rq (ຂໍ້ມູນເກົ່າ) = ໃຊ້ລະບົບຄຳຂໍ → ອະນຸມັດ → ເຕີມ; ຜູ້ດູແລປິດໄດ້ໃນ ຕັ້ງຄ່າສະໜາມ */
  const boss = user.role === 'owner', mem = ['admin', 'head', 'driver', 'tech'].indexOf(user.role) >= 0 ? { role: user.role, sites: user.sites || [] } : null, R = rightsFor(user), has = function (k) { return R.indexOf(k) >= 0 || (k === 'ack' && mine.length > 0); }; /* ເປັນຄົນຂັບຂອງລົດຄັນໃດ = ຮັບຮູ້ລົດຂອງຕົນໄດ້ ເຖິງບໍ່ໄດ້ຕິກສິດ */
  const todayLao = new Date((typeof store.now === 'function' ? store.now() : Date.now()) + 7 * 36e5).toISOString().slice(0, 10);
  const mine = cfg.vehicles.filter(function (v) { const sb = ((store.read('sub_' + v.site + '_' + todayLao) || {}).cars || {})[v.id]; return (sb ? sb.driver : v.driver) === user.id; }); /* ຄົນຂັບແທນສະເພາະມື້: ນັບເປັນຄົນຂັບຂອງລົດມື້ນັ້ນ */
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
  const subs = DATE.test(String(o.date || '')) ? ((store.read('sub_' + site.id + '_' + o.date) || {}).cars || {}) : {}; /* ຄົນຂັບແທນສະເພາະມື້ (driver '' = ຄົນຂັບລາ ບໍ່ມີຄົນແທນ → ຈອດ) */
  const cars = cfg.vehicles.filter(function (v) { return v.site === site.id; }).map(function (v) { return subs[v.id] ? Object.assign({}, v, { driver: subs[v.id].driver, regular: v.driver || '', sub: true }) : v; });
  const drvMap = function () { const m = {}; cars.forEach(function (v) { m[v.id] = { d: v.driver || '', sub: !!v.sub, reg: v.regular || '' }; }); return m; };
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
  const leftMap = function (date) { /* ນ້ຳມັນທີ່ເຫຼືອໃນລົດແຕ່ລະຄັນ ຫຼັງແທກເລີກວຽກຄັ້ງຫຼ້າສຸດ (ຍ້ອນຫຼັງບໍ່ເກີນ 14 ມື້) — ໃຫ້ວິຊາການຮູ້ກ່ອນຂໍ */
    const days = store.list('d_' + site.id + '_').map(function (n) { return n.slice(-10); }).filter(function (d) { return d < date; }).sort().reverse().slice(0, 14), cache = {}, out = {};
    cars.forEach(function (v) { out[v.id] = null; for (let i = 0; i < days.length; i++) { const d = cache[days[i]] || (cache[days[i]] = (store.read('d_' + site.id + '_' + days[i]) || { rows: {} }).rows || {}), r = d[v.id]; if (r && r.cm2 != null) { out[v.id] = { L: liters(v.tank, r.cm2), date: days[i] }; break; } } });
    return out;
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
      return { date: d, recv: recv, out: out, shop: shopL(sh), bal: bal, cm: sh.tank.cm, measured: m, exp: exp, diff: diff, mtr: mt != null ? mt : null, mused: mused, mdiff: mdiff, approved: !!sh.approved, idle: !sh.approved && out === 0 && shopL(sh) === 0 };
    });
  };
  const maxFill = function (v, r, lit) { /* ເຕີມໄດ້ສູງສຸດ = ທີ່ອະນຸມັດ + ຄ່າເຜື່ອ (10% ຫຼື 1 cm ຂອງຖັງຄັນນັ້ນ ເອົາອັນໃຫຍ່ກວ່າ) — ການແທກ cm ບໍ່ລະອຽດກວ່າ 1 cm */
    const hi = r.cm1 != null ? r.cm1 : r.cm0, a = hi != null ? liters(v.tank, hi) : null, b = hi != null ? liters(v.tank, hi - 1) : null, cmL = a != null && b != null ? Math.abs(a - b) : 0;
    return lit + Math.max(lit * 0.1, cmL);
  };
  const stockAt = function (date) { let b = 0; ledger().forEach(function (x) { if (x.date <= date) b = x.bal; }); return b; }; /* ຍອດແທ່ງເຫຼືອຕາມບັນຊີ ເຖິງທ້າຍວັນນັ້ນ */
  const stockInfo = function () { if (!site.rq || !can('reqOk')) return null; const q = qdoc(); return { have: stockAt(o.date), pend: q.list.reduce(function (t, x) { return t + (x.st === 'approved' && !x.row && x.ok && x.ok.src === 'tank' && x.ok.lit > 0 ? x.ok.lit : 0); }, 0) }; }; /* ເຫຼືອ + ອະນຸມັດແລ້ວຍັງບໍ່ເຕີມ (ບໍ່ຈອງ ສະແດງໃຫ້ຕັດສິນເອງ) */
  if (a === 'adjlog') return boss ? ok((store.read('adj_' + site.id) || { list: [] }).list.slice().reverse()) : err('auth'); /* ລາຍງານການປັບປຸງ: Admin ຂຶ້ນໄປ */
  if (a === 'assign') { /* ມອບລົດໃຫ້ຄົນຂັບ (ຫົວໜ້າ / ເຈົ້າຂອງ) — driver = ເບີໂທ ຫຼື ວ່າງ = ຍົກເລີກ */
    if (!can('assign')) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
    cfg.vehicles.forEach(function (v) { if (v.id === c.id) v.driver = str(o.driver, 40); }); store.write('cfg', cfg);
    return ok(cfg.vehicles.filter(function (v) { return v.site === site.id; }).map(function (v) { return { id: v.id, driver: v.driver }; }));
  }
  const lim = !boss && !ownOnly && !['view', 'issue', 'tank', 'assign', 'approve'].some(has); /* ວິຊາການ: ຂໍນ້ຳມັນຢ່າງດຽວ — ບໍ່ເຫັນຍອດແທ່ງ / ໃບເບີກ */
  if (a === 'ledger') return ownOnly || lim ? err('auth') : ok(ledger());
  if (a === 'dash') { /* ສະຫຼຸບຊ່ວງວັນ (ຕໍ່ສະໜາມ): ຄຳຂໍ / ເຕີມ / ຮັບຮູ້ / ແທ່ງ ຕໍ່ວັນ — Dashboard */
    if (ownOnly || lim) return err('auth'); if (!DATE.test(o.from) || !DATE.test(o.to) || o.from > o.to) return err('date'); if ((Date.parse(o.to) - Date.parse(o.from)) / 864e5 > 92) return err('range');
    const LG = ledger(), pre = LG.filter(function (x) { return x.date < o.from; }).pop(), upto = LG.filter(function (x) { return x.date <= o.to; }).pop(), ds = {};
    store.list('d_' + site.id + '_').concat(store.list('q_' + site.id + '_')).forEach(function (n) { const d = n.slice(-10); if (d >= o.from && d <= o.to) ds[d] = 1; });
    const days = Object.keys(ds).sort().map(function (d) {
      const s2 = sheetOf(d), q = store.read('q_' + site.id + '_' + d) || { list: [] }, rq = { n: 0, pend: 0, wait: 0, rej: 0, litReq: 0, litOk: 0 }, fl = { n: 0, lit: 0, tank: 0, shop: 0, jug: 0, ack: 0, rej: 0 };
      (q.list || []).forEach(function (x) { if (x.st === 'cancel') return; if (x.st === 'rejected') { rq.rej++; return; } rq.n++; rq.litReq += x.lit || 0; if (x.st === 'pending') rq.pend++; else if (x.st === 'approved') { rq.litOk += (x.ok && x.ok.lit) || 0; if (!x.row) rq.wait++; } });
      carsOf(s2).forEach(function (v) { const r = s2.rows[v.id] || {}, c2 = calc(v, r); if (c2.add != null && c2.add > 0) { fl.n++; fl.lit += c2.add; fl[r.src === 'shop' ? 'shop' : r.src === 'jug' ? 'jug' : 'tank'] += c2.add; if (r.ack) fl.ack++; } if (r.rej) fl.rej++; });
      return { date: d, rq: rq, fl: fl, recv: (s2.tank || {}).recv || 0, out: issued(s2), approved: !!s2.approved };
    });
    return ok({ site: site.id, name: site.name, from: o.from, to: o.to, open: pre ? pre.bal : 0, close: upto ? upto.bal : (pre ? pre.bal : 0), days: days });
  }

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
    if (lim) return ok({ site: site.id, date: o.date, role: role, approved: sh.approved || null, rows: [], tank: null, reqs: qs, rqOn: !!site.rq, left: site.rq ? leftMap(o.date) : null, stock: stockInfo(), drv: site.rq ? drvMap() : null });
    return ok({ site: site.id, date: o.date, role: role, approved: sh.approved || null, reqs: qs, rqOn: !!site.rq, left: site.rq && !ownOnly ? leftMap(o.date) : null, stock: stockInfo(), drv: site.rq && !ownOnly ? drvMap() : null,
      rows: show.map(function (v) { const r = sh.rows[v.id] || {}, c = calc(v, r), pv = ownOnly || v.round ? null : prevOf(v, o.date), cu = v.round ? null : chainUsed(v, sh); if (cu != null) c.used = cu; return Object.assign({ v: v.id, name: v.name, driver: v.driver, sub: !!v.sub, regular: v.regular || '', mine: v.driver === user.id, base: v.base || null, round: v.round || 1, rqi: r.rq ? (function () { const x = q.list.filter(function (y) { return y.id === r.rq; })[0]; return x ? { id: x.id, ask: x.lit, ok: x.ok && x.ok.lit != null ? x.ok.lit : null, max: x.ok && x.ok.lit != null ? Math.round(maxFill(v, r, x.ok.lit) * 10) / 10 : null, src: x.ok && x.ok.src, urgent: !!x.urgent, by: x.name } : null; })() : null }, r, c, { prev: pv, gap: pv && c.L0 != null && pv.L2 != null ? c.L0 - pv.L2 : null }); }),
      tank: ownOnly ? null : Object.assign({}, sh.tank, meterInfo(L, today, o.date), { has: !!site.tank, meter: !!site.meter || !!site.tank, measured: liters(site.tank, sh.tank.cm), bal: today ? today.bal : before ? before.bal : 0, out: today ? today.out : 0, exp: today ? today.exp : null, diff: today ? today.diff : null }) });
  };
  if (a === 'sheet') return view();
  if (a === 'photometa') { const pm = store.read('pm_' + site.id + '_' + o.date) || {}; delete pm._log; if (ownOnly) Object.keys(pm).forEach(function (k) { if (!mine.some(function (v) { return k.indexOf(v.id + '_') === 0; })) delete pm[k]; }); return ok(pm); }
  if (a === 'photos') { const p = store.read(pkey) || {}; if (ownOnly) Object.keys(p).forEach(function (k) { if (!mine.some(function (v) { return k.indexOf(v.id + '_') === 0; })) delete p[k]; }); return ok(p); }

  if (a === 'subDriver') { /* ຄົນຂັບແທນສະເພາະມື້ນັ້ນ (ວິຊາການ / ບໍລິຫານສະໜາມ): driver = ເບີໂທ · '' = ລາ ບໍ່ມີຄົນແທນ (ຈອດ) · reset = ກັບເປັນຄົນຂັບປະຈຳ */
    if (!(can('request') || can('assign'))) return err('auth'); if (!site.rq) return err('rqoff');
    if (!DATE.test(String(o.date || '')) || o.date < laoDay(0) || o.date > laoDay(-7)) return err('date'); if (sh.approved) return err('locked');
    const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
    if (Object.keys(sh.rows).some(function (k) { return (k === c.id || k.indexOf(c.id + '_r') === 0) && sh.rows[k].ack; })) return err('subacked'); /* ຄົນຂັບຮັບຮູ້ແລ້ວ ປ່ຽນຄົນບໍ່ໄດ້ */
    const sk = 'sub_' + site.id + '_' + o.date, doc = store.read(sk) || { cars: {} }; doc.cars = doc.cars || {};
    if (o.reset) delete doc.cars[c.id]; else doc.cars[c.id] = { driver: str(o.driver, 40), by: user.id, name: user.name, at: nowMs };
    store.write(sk, doc); return ok({ drv: cars.reduce(function (m, v) { const sb = doc.cars[v.id], eff = sb ? sb.driver : (v.regular != null && v.sub ? v.regular : v.driver); m[v.id] = { d: eff || '', sub: !!sb, reg: sb ? (v.regular != null && v.sub ? v.regular : v.driver) || '' : '' }; return m; }, {}) });
  }
  if (a === 'rqAhead') { /* ຄຳຂໍລ່ວງໜ້າ (ມື້ອື່ນ → +7 ມື້) ທີ່ມີຢູ່ — ໃຫ້ຜູ້ອະນຸມັດ / ຜູ້ຂໍເຫັນໂດຍບໍ່ຕ້ອງເປີດທີລະມື້ */
    if (!site.rq) return err('rqoff'); if (!(can('request') || can('reqOk'))) return err('auth');
    const out = []; for (let i = 1; i <= 7; i++) { const d = laoDay(-i), q = store.read('q_' + site.id + '_' + d); if (!q || !Array.isArray(q.list)) continue;
      const l = q.list.filter(function (x) { return (can('reqOk') || x.by === user.id) && (x.st === 'pending' || x.st === 'approved'); }); if (l.length) out.push({ date: d, total: l.length, pending: l.filter(function (x) { return x.st === 'pending'; }).length, approved: l.filter(function (x) { return x.st === 'approved'; }).length }); }
    return ok(out);
  }
  if (a.indexOf('rq') === 0) { /* ===== ຄຳຂໍນ້ຳມັນ ===== */
    if (!site.rq) return err('rqoff'); if (!DATE.test(o.date)) return err('date');
    if (o.date > laoDay(['rqNew', 'rqDecide', 'rqDecideMany', 'rqCancel'].indexOf(a) >= 0 ? -7 : 0)) return err('future'); /* ຂໍ / ອະນຸມັດ ລ່ວງໜ້າໄດ້ 7 ມື້; ເລີ່ມເຕີມ ແລະເຕີມດ່ວນ = ມື້ນີ້ເທົ່ານັ້ນ */
    if (o.date < laoDay(boss || has('fixAck') ? 60 : 7)) return err('old');
    if (sh.approved) return err('locked');
    const q = qdoc(), by = function (id) { return q.list.filter(function (x) { return x.id === id; })[0]; }, done = function () { store.write(qkey, q); return view(); };
    const rowFor = function (cid) { let id = cid, n = 1; while (sh.rows[id]) { n++; id = cid + '_r' + n; if (n > 9) return null; } return id; }; /* ແຖວຖັດໄປຂອງລົດ: v · v_r2 · v_r3 */
    const open = function (x) { /* ເລີ່ມເຕີມຕາມຄຳຂໍ: ສ້າງແຖວ (ຮອບ) ແລະ ຜູກກັບຄຳຂໍ */
      const rid = rowFor(x.v); if (!rid) return false; sh.rows[rid] = { rq: x.id, src: x.ok.src, shop: x.ok.shop || '', by: user.id, at: nowMs }; x.row = rid; store.write(key, sh); return true;
    };
    if (a === 'rqNew') {
      if (!can('request')) return err('auth');
      const lines = Array.isArray(o.lines) ? o.lines : [{ v: o.v, lit: o.lit }]; /* ໃບຂໍ 1 ໃບ = ຫຼາຍຄັນ (ເກົ່າ: ຄັນດຽວ) */
      if (!lines.length || lines.length > 60) return err('lit'); const seen = {}, ready = [];
      for (let i = 0; i < lines.length; i++) { const c = cars.filter(function (v) { return v.id === (lines[i] || {}).v; })[0]; if (!c) return err('vehicle'); if (!c.driver) return err('nodriver'); if (seen[c.id]) return err('dup'); /* ບໍ່ມີຄົນຂັບມື້ນີ້ = ບໍ່ເຕີມ ຈອດໄວ້ */ seen[c.id] = 1; const lit = num(lines[i].lit); if (!(lit > 0) || lit > 100000) return err('lit'); ready.push({ c: c, lit: lit }); }
      const bid = 'b' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36), bno = q.list.reduce(function (m, x) { return Math.max(m, x.bno || 0); }, 0) + 1;
      ready.forEach(function (z, i) { let nid; do { nid = 'r' + nowMs.toString(36) + i.toString(36) + Math.floor(Math.random() * 1296).toString(36); } while (q.list.some(function (y) { return y.id === nid; })); /* id ບໍ່ຊ້ຳ */ q.list.push({ id: nid, bid: bid, bno: bno, v: z.c.id, lit: z.lit, note: str(o.note, 200), by: user.id, name: user.name, at: nowMs, st: 'pending' }); });
      return done();
    }
    if (a === 'rqDecide') {
      if (!can('reqOk')) return err('auth'); const x = by(o.id); if (!x) return err('rq'); if (x.st !== 'pending' && !(x.st === 'approved' && !x.row)) return err('rqstate');
      if (o.yes && x.by === user.id) return err('self'); /* ອະນຸມັດຄຳຂໍຂອງຕົນເອງບໍ່ໄດ້ — ຕ້ອງໃຫ້ຄົນອື່ນ */
      if (o.yes) { const lit = o.lit == null || o.lit === '' ? x.lit : num(o.lit); if (!(lit > 0) || lit > 100000) return err('lit');
        if (srcN(o.src) === 'tank') { const have = stockAt(o.date); if (lit > have + 0.05) return { ok: false, error: 'stock', have: Math.max(0, have) }; } /* ເບີກຈາກແທ່ງ: ບໍ່ເກີນຍອດເຫຼືອ — ເກີນ ໃຫ້ຫຼຸດລິດ ຫຼື ປ່ຽນເປັນຊື້ທີ່ປໍ້າ */
        x.st = 'approved'; x.ok = { by: user.id, name: user.name, at: nowMs, lit: lit, src: srcN(o.src), shop: str(o.shop, 60) }; delete x.why; }
      else { x.st = 'rejected'; x.why = str(o.why, 200); x.ok = { by: user.id, name: user.name, at: nowMs }; }
      return done();
    }
    if (a === 'rqDecideMany') { /* ອະນຸມັດທັງໝົດ (ທາງລັດ): ແຕ່ລະແຖວໃຊ້ລິດທີ່ຂໍ; ຂ້າມແຖວຂອງຕົນເອງ ແລະແຖວທີ່ຕັດສິນແລ້ວ */
      if (!can('reqOk')) return err('auth'); if (!Array.isArray(o.ids) || !o.ids.length) return err('rq');
      let have = srcN(o.src) === 'tank' ? stockAt(o.date) : Infinity, skipped = 0; /* ແຖວທີ່ເກີນຍອດແທ່ງ (ນັບສະສົມ) ຖືກຂ້າມ ຍັງລໍອະນຸມັດ */
      o.ids.forEach(function (id) { const x = by(id); if (!x || x.st !== 'pending' || x.by === user.id) return; if (x.lit > have + 0.05) { skipped++; return; } if (have !== Infinity) have -= x.lit; x.st = 'approved'; x.ok = { by: user.id, name: user.name, at: nowMs, lit: x.lit, src: srcN(o.src), shop: str(o.shop, 60) }; delete x.why; });
      store.write(qkey, q); const rv = view(); if (rv.ok) rv.data.skipped = skipped; return rv;
    }
    if (a === 'rqCancel') {
      const x = by(o.id); if (!x) return err('rq'); if (x.row || x.st === 'rejected' || x.st === 'cancel') return err('rqstate');
      if (!(can('reqOk') || (x.by === user.id && x.st === 'pending'))) return err('auth'); x.st = 'cancel'; return done();
    }
    if (a === 'rqStart') { /* ເລີ່ມເຕີມ: ຄົນເບີກ (ສິດ issue) */
      if (!can('issue')) return err('auth'); const x = by(o.id); if (!x || x.st !== 'approved' || x.row) return err('rqstate'); if (!(cars.filter(function (v) { return v.id === x.v; })[0] || {}).driver) return err('nodriver');
      if (!open(x)) return err('rounds'); return done();
    }
    if (a === 'rqUrgent') { /* ເຕີມດ່ວນ ບໍ່ມີຄຳຂໍ (ສິດ urgent) — ບັນທຶກເປັນຄຳຂໍ "ດ່ວນ" ທີ່ອະນຸມັດໂດຍຜູ້ເຮັດ */
      if (!can('urgent') || !can('issue')) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle'); if (!c.driver) return err('nodriver');
      let uid; do { uid = 'r' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36); } while (q.list.some(function (y) { return y.id === uid; }));
      const x = { id: uid, v: c.id, lit: null, note: str(o.note, 200), by: user.id, name: user.name, at: nowMs, st: 'approved', urgent: true, ok: { by: user.id, name: user.name, at: nowMs, lit: null, src: srcN(o.src), shop: str(o.shop, 60) } };
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
      if (site.rq && !qdoc().list.some(function (x) { return x.st === 'approved' && x.row; })) return err('nofill'); /* ອະນຸມັດໃບໄດ້ເມື່ອມີການເຕີມຢ່າງໜ້ອຍ 1 ຄັ້ງ — ມື້ບໍ່ມີຄຳຂໍ ບໍ່ຕ້ອງອະນຸມັດ */
      { const pp = store.read(pkey) || {}; if ((sh.tank && sh.tank.recvs || []).some(function (r) { return !pp[r.id === 'r0' ? 'tank' : 'tank_' + r.id]; })) return err('nobill'); } /* ຮັບເຂົ້າແທ່ງທຸກຄັ້ງຕ້ອງມີຮູບບິນ */
      sh.approved = { by: user.id, name: user.name, at: Date.now() };
    } else delete sh.approved;
    store.write(key, sh); return view();
  }
  if (['row', 'tank', 'photo'].indexOf(a) < 0) return err('action');
  if (a === 'row' ? !can('issue') : a === 'tank' ? !can('tank') : !can(/^(tank|mtr)/.test(String(o.key || '')) ? 'tank' : 'issue')) return err('auth');
  if (sh.approved && !(a === 'tank' && boss && (o.edit || o.del))) return err('locked'); /* Admin / Super admin ແກ້ຍອດຮັບເຂົ້າຫຼັງລັອກໄດ້ (ມີ log) */
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
    if (r.rq) { const rx = qdoc().list.filter(function (x) { return x.id === r.rq; })[0]; if (rx && rx.ok && rx.ok.lit != null) { const c2 = calc(car, nr), mx = maxFill(car, nr, rx.ok.lit); if (c2.add != null && c2.add > mx + 0.05) return { ok: false, error: 'overcap', max: Math.round(mx * 10) / 10 }; } } /* ເຕີມເກີນທີ່ອະນຸມັດ + ຄ່າເຜື່ອ ບໍ່ໄດ້ — ຕ້ອງຂໍເພີ່ມ ແລະອະນຸມັດໃໝ່ */
    const LBL = { cm0: 'ກ່ອນເຕີມ', cm1: 'ຫຼັງເຕີມ', cm2: 'ຫຼັງເລີກວຽກ' }, edited = ['cm0', 'cm1', 'cm2'].filter(function (k) { return k in o && before[k] != null && nr[k] !== before[k]; }), why = str(o.reason, 200);
    if (edited.length && !why) return err('reason'); /* ແກ້ຄ່າທີ່ເຄີຍກອກແລ້ວ ຕ້ອງໃສ່ເຫດຜົນ */
    ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in o) { if (nr[k] == null) delete r[k]; else r[k] = nr[k]; if (before[k] != null && before[k] !== nr[k]) { r.h = (r.h || []).concat({ at: nowMs, by: user.id, name: user.name, k: k, from: before[k], to: nr[k] == null ? null : nr[k], why: why }).slice(-30); } } }); /* ປະຫວັດແກ້ຄ່າທີ່ເຄີຍກອກແລ້ວ */
    if (edited.length) { const adj = store.read('adj_' + site.id) || { list: [] }; edited.forEach(function (k) { adj.list.push({ at: nowMs, by: user.id, name: user.name, date: o.date, id: car.id, kind: 'row', car: car.name, from: { txt: LBL[k] + ' ' + before[k] + ' cm' }, to: { txt: LBL[k] + ' ' + (nr[k] == null ? '–' : nr[k] + ' cm') }, reason: why }); }); adj.list = adj.list.slice(-500); store.write('adj_' + site.id, adj); } /* ລາຍງານການປັບປຸງ */
    if (!(r.rq && !can('fixAck'))) { if ('src' in o) r.src = srcN(o.src); if ('shop' in o) r.shop = str(o.shop, 60); } /* ແຫຼ່ງເຕີມມາຈາກການອະນຸມັດຄຳຂໍ */
    if ('note' in o) r.note = str(o.note, 200);
    r.by = user.id; r.at = nowMs; sh.rows[car.id] = r; store.write(key, sh); return view();
  }
  if (a === 'tank') {
    const t = sh.tank;
    if ('recv' in o && !Array.isArray(t.recvs)) { const n = num(o.recv); if (n !== (t.recv || null) && t.recv > 0 && !boss) return err('auth'); if (n == null) delete t.recv; else t.recv = n; } /* ຄ່າຮັບເຂົ້າເກົ່າ (ຄ່າດຽວ): ຕັ້ງຄັ້ງທຳອິດໄດ້ ແກ້ຕໍ່ມາ = Admin ເທົ່ານັ້ນ */
    ['cm', 'mtr'].forEach(function (k) { if (k in o) { const n = num(o[k]); if (n == null) delete t[k]; else t[k] = n; } });
    if (o.add || o.del || o.edit) { /* ຮັບເຂົ້າຫຼາຍຄັ້ງຕໍ່ມື້: ລາຍການ recvs, recv = ຜົນລວມ (ສ່ວນອື່ນຂອງລະບົບຍັງໃຊ້ recv ຄືເກົ່າ) */
      if (!Array.isArray(t.recvs)) t.recvs = t.recv > 0 ? [{ id: 'r0', lit: t.recv, from: '', note: '', by: user.id, at: nowMs }] : [];
      if (o.add) { const lit = num(o.add.lit); if (!(lit > 0) || lit > 1000000) return err('lit'); if (t.recvs.length >= 30) return err('rounds');
        t.recvs.push({ id: 'r' + nowMs.toString(36) + Math.floor(Math.random() * 1296).toString(36), lit: lit, from: str(o.add.from, 60), note: str(o.add.note, 200), by: user.id, at: nowMs }); }
      if (o.del || o.edit) { /* ແກ້ / ຍົກເລີກການຮັບເຂົ້າ: Admin ຂຶ້ນໄປ + ເຫດຜົນ + ບັນທຶກ log (ລາຍງານການປັບປຸງ) */
        if (!boss) return err('auth'); const reason = str(o.reason, 200); if (!reason) return err('reason');
        const rid = o.del || (o.edit || {}).id, x = t.recvs.filter(function (r) { return r.id === rid; })[0]; if (!x) return err('rq');
        const adj = store.read('adj_' + site.id) || { list: [] }, snap = { lit: x.lit, from: x.from || '', note: x.note || '' };
        if (o.del) { t.recvs = t.recvs.filter(function (r) { return r !== x; }); const pk = x.id === 'r0' ? 'tank' : 'tank_' + x.id, p = store.read(pkey) || {}; if (p[pk]) { delete p[pk]; store.write(pkey, p); } adj.list.push({ at: nowMs, by: user.id, name: user.name, date: o.date, id: x.id, kind: 'void', from: snap, to: null, reason: reason }); }
        else { const lit = num(o.edit.lit); if (!(lit > 0) || lit > 1000000) return err('lit'); x.lit = lit; x.from = str(o.edit.from, 60); x.note = str(o.edit.note, 200); x.edited = { at: nowMs, by: user.id, name: user.name, reason: reason }; adj.list.push({ at: nowMs, by: user.id, name: user.name, date: o.date, id: x.id, kind: 'edit', from: snap, to: { lit: x.lit, from: x.from, note: x.note }, reason: reason }); }
        adj.list = adj.list.slice(-500); store.write('adj_' + site.id, adj);
      }
      t.recv = t.recvs.reduce(function (s, r) { return s + r.lit; }, 0);
    }
    store.write(key, sh); return view();
  }
  if (a === 'photo') { /* key = <ລົດ>_b|a|e ຫຼື tank · data = data:image/jpeg ທີ່ແອັບຫຍໍ້ແລ້ວ */
    const m = /^([a-z0-9]{1,16}(?:_r[2-9])?)_(b|a|e|p[1-6])$/.exec(String(o.key || ''));
    if (o.key !== 'tank' && o.key !== 'mtr' && !/^tank_r[a-z0-9]{1,14}$/.test(String(o.key || '')) && !(m && carsOf(sh).some(function (v) { return v.id === m[1]; }))) return err('key');
    const p = store.read(pkey) || {}, mk = 'pm_' + site.id + '_' + o.date, pm = store.read(mk) || {};
    if (/^tank/.test(String(o.key)) && p[o.key] && !boss) return err('auth'); /* ຮູບບິນທີ່ບັນທຶກແລ້ວ ປ່ຽນ/ລຶບໄດ້ສະເພາະ Admin */
    if (m && p[o.key] && (sh.rows[m[1]] || {}).ack && !can('fixAck')) return err('photolock'); /* ຮູບລົດ: ຫຼັງຄົນຂັບຮັບຮູ້ແລ້ວ ປ່ຽນໄດ້ສະເພາະຫົວໜ້າ */
    if (!o.data) { delete p[o.key]; delete pm[o.key]; pm._log = (pm._log || []).concat({ at: nowMs, by: user.id, key: o.key, act: 'del' }).slice(-50); }
    else { if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.data) || o.data.length > 400000) return err('image'); p[o.key] = o.data;
      const tk = Number(o.takenAt) > 0 && Number(o.takenAt) < 4e12 ? Math.round(Number(o.takenAt)) : null; pm[o.key] = { at: nowMs, by: user.id, name: user.name, taken: tk, how: o.how === 'file' ? 'file' : 'cam' }; /* ເວລາຮັບເປັນຂອງ server; ເວລາຖ່າຍມາຈາກເຄື່ອງ (ອັບຄ້າງຕອນບໍ່ມີເນັດ) */
      pm._log = (pm._log || []).concat({ at: nowMs, by: user.id, key: o.key, act: 'set' }).slice(-50); }
    store.write(pkey, p); store.write(mk, pm); return ok(1);
  }
  return err('action');
}
module.exports = { handle: handle, liters: liters, cleanCfg: cleanCfg, rightsFor: rightsFor, RIGHTS: RIGHTS, KEYS: KEYS, PRESET: PRESET, OPS: OPS };
