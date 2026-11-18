/* ໂມດູນ ຕິດຕາມນ້ຳມັນ — ຕໍ່ກັບ server: ກວດສິດໂມດູນ ແລ້ວສົ່ງໃຫ້ fuel-core.js (logic ລ້ວນ). ຂໍ້ມູນ: DATA/fuel/*.json
 * ບໍ່ຮູ້ຈັກ HR ແລະ ບໍ່ເກັບບັນຊີ — ໄດ້ຮັບ user ຈາກບັນຊີກາງ (user.fuel = ໜ້າທີ່ໃນໂມດູນນີ້) */
'use strict';
const fs = require('fs'), path = require('path');
const core = require('./fuel-core');

function create(DATA, accounts) {
  const dir = path.join(DATA, 'fuel'); fs.mkdirSync(dir, { recursive: true });
  const file = function (n) { return path.join(dir, n + '.json'); };
  const store = {
    read: function (n) { try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch (e) { return null; } },
    write: function (n, v) { const t = file(n) + '.' + process.pid + '.tmp'; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, file(n)); }, /* synchronous ທັງໝົດ → ບໍ່ມີ race ໃນຂະບວນການດຽວ */
    list: function (pre) { try { return fs.readdirSync(dir).filter(function (f) { return f.indexOf(pre) === 0 && /\.json$/.test(f); }).map(function (f) { return f.slice(0, -5); }); } catch (e) { return []; } }
  };
  const fuelUser = function (u) { return { id: u.id, name: u.name, role: u.fuel, sites: u.sites, rights: u.fuelRights, approver: u.approver }; };
  /* user = view ຈາກບັນຊີກາງ. ຄືນ {ok,...} */
  function handle(action, o, user) {
    if (!user.fuel) return { ok: false, error: 'noapp' };
    if (action === 'drivers') { /* ລາຍຊື່ຄົນຂັບ ໃຫ້ຜູ້ມອບລົດ — ຄົນຂັບເອງບໍ່ເຫັນ */
      if (user.fuel !== 'owner' && core.rightsFor(fuelUser(user)).indexOf('assign') < 0) return { ok: false, error: 'auth' }; const all = accounts.users();
      return { ok: true, data: Object.keys(all).filter(function (k) { return all[k].level === 'user' && all[k].active && !!all[k].fuel; }).map(function (k) { return { phone: k, name: all[k].name }; }) };
    }
    if (action === 'pending') { /* ຕົວເລກເທິງໄອຄອນແອັບ: ລາຍການລໍຂ້ອຍຮັບຮູ້ (ຄົນຂັບ) + ຖືກປະຕິເສດ (ຜູ້ບໍລິຫານ) ຂອງວັນນີ້ ແລະ ມື້ວານ */
      const me = fuelUser(user), init = core.handle(store, me, { action: 'init' }); if (!init.ok) return init;
      const day = function (back) { return new Date(Date.now() + 7 * 36e5 - back * 864e5).toISOString().slice(0, 10); }; /* ເວລາລາວ UTC+7 */
      let wait = 0, rej = 0;
      Object.keys(init.data.me.roles).forEach(function (s) { [day(0), day(1)].forEach(function (d) {
        const r = core.handle(store, me, { action: 'sheet', site: s, date: d }); if (!r.ok) return;
        r.data.rows.forEach(function (x) { if (x.mine && x.add != null && !x.ack && !x.rej) wait++; if (x.rej && r.data.tank) rej++; });
      }); });
      return { ok: true, data: { wait: wait, rej: rej, n: wait + rej } };
    }
    const r = core.handle(store, fuelUser(user), Object.assign({}, o, { action: action }));
    if (action === 'assign' && r.ok && o.driver) { /* ມອບລົດໃຫ້ໃຜ ຄົນນັ້ນຕ້ອງມີສິດ "ຮັບຮູ້" — ເຕີມໃຫ້ເອງ (ບໍ່ຕ້ອງໄປຕິກໃນ ຄົນ & ສິດ) */
      const d = accounts.get(String(o.driver)); if (d && d.fuel && d.level === 'user') { const rs = core.rightsFor(fuelUser(d)); if (rs.indexOf('ack') < 0) accounts.save({ phone: String(o.driver), fuelRights: rs.concat('ack') }, null); }
    }
    return r;
  }
  /* ຜູ້ໃຊ້ນີ້ເຂົ້າໜ້າບໍລິຫານ (office) ໄດ້ບໍ — ບໍ່ແມ່ນຮັບຮູ້ຢ່າງດຽວ */
  const ops = function (u) { return !!u.fuel && (u.fuel === 'owner' || core.rightsFor(fuelUser(u)).some(function (k) { return core.OPS.indexOf(k) >= 0; })); };
  const schema = function () { return { rights: core.RIGHTS, presets: core.PRESET }; };
  const vehicles = function () { return ((store.read('cfg') || {}).vehicles || []).map(function (v) { return { id: v.id, name: v.name, site: v.site, driver: v.driver || '' }; }); }; /* ອ່ານຢ່າງດຽວ — ໃຫ້ແອັບອື່ນ (SOP) ຮູ້ວ່າໃຜຂັບຄັນໃດ */
  return { handle: handle, ops: ops, schema: schema, vehicles: vehicles };
}
module.exports = { create: create };
