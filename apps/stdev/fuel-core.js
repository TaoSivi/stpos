/* ST Fuel — ເບີກຈ່າຍນ້ຳມັນສະໜາມ: logic ທັງໝົດ (ບໍ່ຮູ້ເລື່ອງ HTTP / ໄຟລ໌ — server.js ສົ່ງ store ເຂົ້າມາ)
 * ຂໍ້ມູນ: cfg (ສະໜາມ, ລົດ) · d_<ສະໜາມ>_<ວັນທີ> (ໃບປະຈຳວັນ) · p_<ສະໜາມ>_<ວັນທີ> (ຮູບ)
 * ພະນັກງານກອກແຕ່ cm — ລິດຄິດໄລ່ຢູ່ນີ້ບ່ອນດຽວ (ແອັບສະແດງຄ່າທີ່ server ຄືນໃຫ້)
 * ສິດ (user.role): owner = ທຸກຢ່າງ + ຕັ້ງຄ່າ · head/admin = ສະເພາະສະໜາມໃນ user.sites · office = ເບິ່ງທຸກສະໜາມ · driver = ເຫັນ/ຮັບຮູ້ສະເພາະລົດຂອງຕົນ (vehicles[].driver = ເບີໂທ) */
'use strict';
const ID = /^[a-z0-9]{1,16}$/, DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = function (x) { const n = Number(x); return x === '' || x == null || !isFinite(n) || n < 0 || n > 1e6 ? null : n; };
const str = function (x, n) { return String(x == null ? '' : x).replace(/[<>]/g, '').trim().slice(0, n); };

const liters = require('./public/tank.js').liters; /* ສູດຖັງ ຢູ່ tank.js — ມືຖືໃຊ້ໄຟລ໌ດຽວກັນຕອນອອບລາຍ */
function cleanTank(t) {
  t = t || {};
  if (t.t === 'box') return num(t.l) && num(t.w) ? { t: 'box', l: num(t.l), w: num(t.w) } : null;
  if (t.t === 'hcyl') return num(t.d) && num(t.len) ? { t: 'hcyl', d: num(t.d), len: num(t.len) } : null;
  return num(t.k) ? { t: 'lpc', k: num(t.k) } : null;
}
function cleanCfg(c) {
  c = c || {}; const out = { company: str(c.company, 100), sites: [], vehicles: [] }, seen = {};
  (Array.isArray(c.sites) ? c.sites : []).forEach(function (s) { if (s && ID.test(s.id) && !seen[s.id] && str(s.name, 80)) { seen[s.id] = 1; out.sites.push({ id: s.id, name: str(s.name, 80), tank: cleanTank(s.tank) }); } });
  const vs = {};
  (Array.isArray(c.vehicles) ? c.vehicles : []).forEach(function (v) { if (v && ID.test(v.id) && !vs[v.id] && seen[v.site] && str(v.name, 60) && cleanTank(v.tank)) { vs[v.id] = 1; out.vehicles.push({ id: v.id, name: str(v.name, 60), site: v.site, driver: str(v.driver, 40), tank: cleanTank(v.tank) }); } });
  return out;
}

/* store = {read(name) → object|null, write(name, object), list(prefix) → [name]} · user = {id, role, name} */
function handle(store, user, o) {
  const a = String(o.action || ''), cfg = store.read('cfg') || { sites: [], vehicles: [] };
  const boss = user.role === 'owner', mem = ['admin', 'head'].indexOf(user.role) >= 0 ? { role: user.role, sites: user.sites || [] } : null;
  const mine = cfg.vehicles.filter(function (v) { return v.driver === user.id; });
  /* ບົດບາດຂອງຜູ້ໃຊ້ໃນສະໜາມນີ້: boss > head > admin > office > driver > null */
  const roleAt = function (site) {
    if (boss) return 'boss';
    if (user.role === 'office') return 'office';
    if (mem && mem.sites.indexOf(site) >= 0) return mem.role;
    return mine.some(function (v) { return v.site === site; }) ? 'driver' : null;
  };
  const err = function (e) { return { ok: false, error: e }; }, ok = function (d) { return { ok: true, data: d }; };

  if (a === 'init') {
    const sites = cfg.sites.filter(function (s) { return roleAt(s.id); });
    return ok({ me: { id: user.id, name: user.name, boss: boss, roles: sites.reduce(function (m, s) { m[s.id] = roleAt(s.id); return m; }, {}) }, company: cfg.company || '', cfg: boss ? cfg : { sites: sites, vehicles: cfg.vehicles.filter(function (v) { return ['head', 'admin', 'office'].indexOf(roleAt(v.site)) >= 0; }) } }); /* ມີຂະໜາດຖັງ: ມືຖືຕ້ອງຄິດລິດເອງຕອນບໍ່ມີເນັດ */
  }
  if (a === 'cfgSave') { if (!boss) return err('auth'); const c = cleanCfg(o.cfg); store.write('cfg', c); return ok(c); }

  const site = cfg.sites.filter(function (s) { return s.id === o.site; })[0], role = site && roleAt(site.id);
  if (!site || !role) return err('auth');
  const edit = role === 'boss' || role === 'head' || role === 'admin', chief = role === 'boss' || role === 'head';
  const cars = cfg.vehicles.filter(function (v) { return v.site === site.id; });
  const sheetOf = function (d) { return store.read('d_' + site.id + '_' + d) || { rows: {}, tank: {} }; };
  /* ຄ່າລິດຂອງ 1 ຄັນ ຈາກ cm ທີ່ກອກ */
  const calc = function (v, r) {
    const L0 = liters(v.tank, r.cm0), L1 = liters(v.tank, r.cm1), L2 = liters(v.tank, r.cm2);
    return { L0: L0, L1: L1, L2: L2, add: L0 != null && L1 != null ? L1 - L0 : null, used: L1 != null && L2 != null ? L1 - L2 : null };
  };
  const issued = function (sh) { return cars.reduce(function (t, v) { const c = calc(v, sh.rows[v.id] || {}); return t + (c.add > 0 ? c.add : 0); }, 0); };
  /* shortcut: ຍອດເຫຼືອແທ່ງ ອ່ານທຸກໃບຂອງສະໜາມທຸກເທື່ອ (ມື້ລະ 1 ໄຟລ໌ນ້ອຍ) — ຖ້າເກີນຫຼາຍຮ້ອຍມື້ແລ້ວຊ້າ ໃຫ້ເກັບຍອດຍົກມາ */
  const ledger = function () {
    let bal = 0;
    return store.list('d_' + site.id + '_').sort().map(function (n) {
      const d = n.slice(-10), sh = store.read(n) || { rows: {}, tank: {} }, recv = sh.tank.recv || 0, out = issued(sh);
      bal += recv - out;
      return { date: d, recv: recv, out: out, bal: bal, cm: sh.tank.cm, measured: liters(site.tank, sh.tank.cm), approved: !!sh.approved };
    });
  };
  if (a === 'assign') { /* ມອບລົດໃຫ້ຄົນຂັບ (ຫົວໜ້າ / ເຈົ້າຂອງ) — driver = ເບີໂທ ຫຼື ວ່າງ = ຍົກເລີກ */
    if (!chief) return err('auth'); const c = cars.filter(function (v) { return v.id === o.v; })[0]; if (!c) return err('vehicle');
    cfg.vehicles.forEach(function (v) { if (v.id === c.id) v.driver = str(o.driver, 40); }); store.write('cfg', cfg);
    return ok(cfg.vehicles.filter(function (v) { return v.site === site.id; }).map(function (v) { return { id: v.id, driver: v.driver }; }));
  }
  if (a === 'ledger') return role === 'driver' ? err('auth') : ok(ledger());

  if (!DATE.test(o.date)) return err('date');
  const key = 'd_' + site.id + '_' + o.date, pkey = 'p_' + site.id + '_' + o.date, sh = sheetOf(o.date);
  const view = function () {
    const show = role === 'driver' ? cars.filter(function (v) { return v.driver === user.id; }) : cars;
    const L = role === 'driver' ? [] : ledger(), today = L.filter(function (x) { return x.date === o.date; })[0], before = L.filter(function (x) { return x.date < o.date; }).pop();
    return ok({ site: site.id, date: o.date, role: role, approved: sh.approved || null,
      rows: show.map(function (v) { const r = sh.rows[v.id] || {}; return Object.assign({ v: v.id, name: v.name, driver: v.driver, mine: v.driver === user.id }, r, calc(v, r)); }),
      tank: role === 'driver' ? null : Object.assign({}, sh.tank, { measured: liters(site.tank, sh.tank.cm), bal: today ? today.bal : before ? before.bal : 0, out: today ? today.out : 0 }) });
  };
  if (a === 'sheet') return view();
  if (a === 'photos') { const p = store.read(pkey) || {}; if (role === 'driver') Object.keys(p).forEach(function (k) { if (!mine.some(function (v) { return k.indexOf(v.id + '_') === 0; })) delete p[k]; }); return ok(p); }

  const car = cars.filter(function (v) { return v.id === o.v; })[0];
  if (a === 'ack') { /* ຄົນຂັບຂອງລົດຄັນນັ້ນເທົ່ານັ້ນ — ຮັບຮູ້ຕົວເລກທີ່ບໍລິຫານກອກ (ເກັບສຳເນົາຕົວເລກໄວ້ກັບການຮັບຮູ້) */
    if (!car || car.driver !== user.id) return err('auth');
    if (sh.approved) return err('locked');
    const r = sh.rows[car.id] || {}, c = calc(car, r);
    if (c.add == null) return err('empty');
    if (o.yes) { r.ack = { by: user.id, name: user.name, at: Date.now(), cm0: r.cm0, cm1: r.cm1, add: c.add }; delete r.rej; }
    else { r.rej = { by: user.id, name: user.name, at: Date.now(), why: str(o.why, 200) }; delete r.ack; }
    sh.rows[car.id] = r; store.write(key, sh); return view();
  }
  if (a === 'approve') { /* ຫົວໜ້າ/ເຈົ້າຂອງ ຫຼື ຄົນທີ່ເຈົ້າຂອງຕັ້ງເປັນ "ຜູ້ອະນຸມັດ" (ບໍລິຫານ/ຫ້ອງການ) */
    if (!(chief || (user.approver === true && (role === 'admin' || role === 'office')))) return err('auth');
    if (o.yes) {
      if (cars.some(function (v) { const r = sh.rows[v.id] || {}; return r.cm1 != null && !r.ack; })) return err('unacked');
      sh.approved = { by: user.id, name: user.name, at: Date.now() };
    } else delete sh.approved;
    store.write(key, sh); return view();
  }
  if (!edit) return err('auth');
  if (sh.approved) return err('locked');
  if (a === 'row') {
    if (!car) return err('vehicle');
    const r = sh.rows[car.id] || {};
    const fill = ['cm0', 'cm1'].some(function (k) { return k in o && num(o[k]) !== (r[k] == null ? null : r[k]); }) || ('src' in o && (o.src === 'jug' ? 'jug' : 'tank') !== (r.src || 'tank'));
    if (fill && r.ack) { if (!chief) return err('acked'); delete r.ack; } /* ແກ້ຕົວເລກເຕີມຫຼັງຮັບຮູ້ = ຫົວໜ້າເທົ່ານັ້ນ ແລະ ຄົນຂັບຕ້ອງຮັບຮູ້ໃໝ່ */
    if (fill) delete r.rej;
    ['cm0', 'cm1', 'cm2'].forEach(function (k) { if (k in o) { const n = num(o[k]); if (n == null) delete r[k]; else r[k] = n; } });
    if ('src' in o) r.src = o.src === 'jug' ? 'jug' : 'tank';
    if ('note' in o) r.note = str(o.note, 200);
    r.by = user.id; sh.rows[car.id] = r; store.write(key, sh); return view();
  }
  if (a === 'tank') {
    ['cm', 'recv'].forEach(function (k) { if (k in o) { const n = num(o[k]); if (n == null) delete sh.tank[k]; else sh.tank[k] = n; } });
    store.write(key, sh); return view();
  }
  if (a === 'photo') { /* key = <ລົດ>_b|a|e ຫຼື tank · data = data:image/jpeg ທີ່ແອັບຫຍໍ້ແລ້ວ */
    const m = /^([a-z0-9]{1,16})_(b|a|e)$/.exec(String(o.key || ''));
    if (o.key !== 'tank' && !(m && cars.some(function (v) { return v.id === m[1]; }))) return err('key');
    const p = store.read(pkey) || {};
    if (!o.data) delete p[o.key];
    else { if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.data) || o.data.length > 400000) return err('image'); p[o.key] = o.data; }
    store.write(pkey, p); return ok(1);
  }
  return err('action');
}
module.exports = { handle: handle, liters: liters, cleanCfg: cleanCfg };
