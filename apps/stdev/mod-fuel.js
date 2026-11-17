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
  /* user = view ຈາກບັນຊີກາງ. ຄືນ {ok,...} */
  function handle(action, o, user) {
    if (!user.fuel) return { ok: false, error: 'noapp' };
    if (action === 'drivers') { /* ລາຍຊື່ຄົນຂັບ ໃຫ້ຜູ້ມອບລົດ — ຄົນຂັບເອງບໍ່ເຫັນ */
      if (user.fuel === 'driver') return { ok: false, error: 'auth' }; const all = accounts.users();
      return { ok: true, data: Object.keys(all).filter(function (k) { return all[k].level === 'user' && all[k].fuel === 'driver' && all[k].active; }).map(function (k) { return { phone: k, name: all[k].name }; }) };
    }
    return core.handle(store, { id: user.id, name: user.name, role: user.fuel, sites: user.sites }, Object.assign({}, o, { action: action }));
  }
  return { handle: handle };
}
module.exports = { create: create };
