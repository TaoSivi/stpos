/* ໂມດູນ ST HR — ຕໍ່ໂຄ້ດ HR ເດີມ (server/hr.js + server/hr/Code.gs + ໜ້າ apps/hr) ເຂົ້າກັບ server ນີ້. ບໍ່ແກ້ໂຄ້ດ HR.
 * ຂໍ້ມູນ HR ຢູ່ DATA/t/<HR_COMPANY>/hr (ແຍກຈາກນ້ຳມັນ) · ບໍ່ຮູ້ຈັກນ້ຳມັນ
 * ເຂົ້າ HR ດ້ວຍບັນຊີກາງ: login(user) ໃຫ້ session HR ຂອງຄົນນັ້ນ (admin ຂຶ້ນໄປ = ເຈົ້າຂອງ HR · user = ພະນັກງານ HR ທີ່ຜູກກັບເບີ, ສ້າງໃຫ້ອັດຕະໂນມັດ)
 * HR ມີລະບົບ session ຂອງຕົນເອງ: ປິດບັນຊີກາງແລ້ວ session HR ທີ່ອອກໄປກ່ອນໜ້າຍັງໃຊ້ໄດ້ຈົນໝົດອາຍຸຂອງ HR */
'use strict';
const fs = require('fs'), path = require('path');

function create(DATA) {
  const CODE = process.env.HR_COMPANY || 'main', LIB = process.env.HR_LIB || path.join(__dirname, '..', '..', 'server'), WEB = process.env.HR_WEB || path.join(__dirname, '..', 'hr');
  const avail = function () { return fs.existsSync(path.join(LIB, 'hr.js')) && fs.existsSync(path.join(LIB, 'hr', 'Code.gs')) && fs.existsSync(path.join(WEB, 'index.html')); };
  let X = null; const x = function () { return X || (X = require(path.join(LIB, 'hr.js')).create(DATA, path.join(LIB, 'hr', 'Code.gs'))); };
  let memo = { v: false, t: 0 };
  function ready() { if (!avail()) return false; if (memo.v || Date.now() - memo.t < 10000) return memo.v; let v = false; try { v = !!x().signup(CODE, false).created; } catch (e) {} memo = { v: v, t: Date.now() }; return v; }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg' };
  return {
    avail: avail, ready: ready, code: CODE,
    setup: function (company, ownerName, pin) { memo = { v: false, t: 0 }; return x().seed(CODE, company, { name: ownerName, pin: pin }); },
    post: function (body) { return x().post(CODE, body); }, ping: function () { return x().ping(CODE); },
    /* ສ້າງ/ອັບເດດພະນັກງານໃນ HR ຈາກບັນຊີກາງ (ຊື່ + ໜ້າທີ່ໃນ HR) — ເພື່ອບໍ່ຕ້ອງເພີ່ມຄົນຊ້ຳໃນ HR. ຄືນ 'ok' | 'skip' | 'nohr' | 'error'
     * ບັນຊີລະດັບ admin/superadmin ໃຊ້ session ເຈົ້າຂອງ HR ຢູ່ແລ້ວ (ບໍ່ມີ record ແຍກ). ຂໍ້ມູນອື່ນ (ພະແນກ, ເງິນເດືອນ…) HR admin ຕື່ມໃນ HR ຕາມປົກກະຕິ */
    provision: function (u) {
      if (!u || !u.hr) return 'skip'; if (!ready()) return 'nohr';
      try {
        const sup = x().superSession(CODE); if (!sup) return 'nohr';
        const h = x().sessionFor(CODE, { id: u.id, role: u.level === 'user' ? 'staff' : 'owner', name: u.name });
        const empId = h && h.member && (h.member.id || h.member.employeeId); if (u.level !== 'user') return 'ok'; if (!empId) return 'error';
        const call = function (o) { return JSON.parse(x().post(CODE, JSON.stringify(Object.assign({ token: sup.token }, o)))); };
        const cur = call({ action: 'get', collection: 'employees', id: empId}); if (!cur.ok || !cur.data) return 'error';
        const d = cur.data.data || cur.data, mine = ['employee', 'head', 'accountant', 'auditor'], keep = (d.roles || []).filter(function (r) { return mine.indexOf(r) < 0; });
        d.name = String(u.name).slice(0, 60); d.roles = ['employee'].concat(keep, u.hrRole && u.hrRole !== 'employee' ? [u.hrRole] : []);
        return call({ action: 'upsert', collection: 'employees', id: empId, data: d }).ok ? 'ok' : 'error';
      } catch (e) { console.error(e); return 'error'; }
    },
    /* user = view ຈາກບັນຊີກາງ. ຄືນ {ok, data:{hr}} */
    login: function (user) {
      if (!user.hr) return { ok: false, error: 'noapp' }; if (!ready()) return { ok: false, error: 'nohr' };
      let h; try { h = x().sessionFor(CODE, { id: user.id, role: user.level === 'user' ? 'staff' : 'owner', name: user.name }); } catch (e) { console.error(e); return { ok: false, error: 'server' }; }
      return h ? { ok: true, data: { hr: h } } : { ok: false, error: 'nohr' };
    },
    /* ໄຟລ໌ໜ້າ HR ຢູ່ /hr/… ຄືນ {code, type, body, cache} ຫຼື null */
    file: function (pathname) {
      if (!avail()) return null; let f = decodeURIComponent(pathname.slice(3)); if (f === '/') f = '/index.html'; f = path.join(WEB, path.normalize(f));
      if (f.indexOf(WEB + path.sep) !== 0) return { code: 403 }; let d; try { d = fs.readFileSync(f); } catch (e) { return { code: 404 }; }
      const ty = MIME[path.extname(f)] || 'application/octet-stream';
      return { code: 200, body: d, type: /^(text|application\/(json|manifest))|svg|javascript/.test(ty) ? ty + '; charset=utf-8' : ty, cache: /sw\.js$|index\.html$/.test(f) ? 'no-store' : 'public, max-age=3600' };
    }
  };
}
module.exports = { create: create };
