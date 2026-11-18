/* ໂມດູນ ST HR — ຕໍ່ໂຄ້ດ HR ເດີມ (server/hr.js + server/hr/Code.gs + ໜ້າ apps/hr) ເຂົ້າກັບ server ນີ້. ບໍ່ແກ້ໂຄ້ດ HR.
 * ຂໍ້ມູນ HR ຢູ່ DATA/t/<HR_COMPANY>/hr (ແຍກຈາກນ້ຳມັນ) · ບໍ່ຮູ້ຈັກນ້ຳມັນ
 * ເຂົ້າ HR ດ້ວຍບັນຊີກາງ: login(user) ໃຫ້ session HR ຂອງຄົນນັ້ນ (admin ຂຶ້ນໄປ = ເຈົ້າຂອງ HR · user = ພະນັກງານ HR ທີ່ຜູກກັບເບີ, ສ້າງໃຫ້ອັດຕະໂນມັດ)
 * HR ມີລະບົບ session ຂອງຕົນເອງ: ປິດບັນຊີກາງແລ້ວ session HR ທີ່ອອກໄປກ່ອນໜ້າຍັງໃຊ້ໄດ້ຈົນໝົດອາຍຸຂອງ HR */
'use strict';
const fs = require('fs'), path = require('path');

/* ປ້າຍພາສາລາວຂອງສິດ HR (key ມາຈາກ Code.gs ຂອງ HR — ຖ້າ HR ເພີ່ມສິດໃໝ່ ຈະຂຶ້ນໃນກຸ່ມ "ອື່ນໆ" ເອງ) */
const HR_GROUPS = [
  { id: 'pages', label: 'ເມນູທີ່ເຂົ້າໄດ້', items: [['p.overview', 'ພາບລວມ'], ['p.review', 'ກວດການລົງເວລາ'], ['p.approvals', 'ອະນຸມັດຄຳຂໍ'], ['p.time', 'ລົງເວລາມື້ນີ້'], ['p.reports', 'ລາຍງານ'], ['p.map', 'ແຜນທີ່'], ['p.leave', 'ລາພັກ & ເບີກ'], ['p.staff', 'ພະນັກງານ'], ['p.pay', 'ເງິນເດືອນ'], ['p.access', 'ສິດ & ການອະນຸມັດ'], ['p.settings', 'ກົດເກນ & ຕັ້ງຄ່າ'], ['p.audit', 'ບັນທຶກການແກ້ໄຂ'], ['p.records', 'ຈັດເກັບ / ເອກະສານ']] },
  { id: 'actions', label: 'ຟັງຊັນທີ່ເຮັດໄດ້', items: [['scan.review', 'ກວດ & ຕັດສິນການສະແກນເວລາ'], ['ot.preapprove', 'ອະນຸມັດ OT ລ່ວງໜ້າ'], ['advance.decide', 'ອະນຸມັດເບີກເງິນ / ຄຳຂໍ'], ['staff.edit', 'ແກ້ຂໍ້ມູນພະນັກງານ'], ['staff.change.decide', 'ຕັດສິນຄຳຂໍປ່ຽນຂໍ້ມູນພະນັກງານ'], ['payroll.prepare', 'ກຽມເງິນເດືອນ'], ['payroll.lock', 'ລັອກ / ຢືນຢັນເງິນເດືອນ'], ['payroll.confirmLate', 'ຢືນຢັນເງິນເດືອນທີ່ລ່າຊ້າ'], ['payroll.items', 'ເພີ່ມລາຍການຈ່າຍ / ຫັກ'], ['payroll.items.decide', 'ຕັດສິນລາຍການຈ່າຍ / ຫັກ'], ['settings.edit', 'ແກ້ການຕັ້ງຄ່າ HR']] },
  { id: 'scope', label: 'ຂອບເຂດຂໍ້ມູນ', items: [['dataAll', 'ເຫັນຂໍ້ມູນຂອງທຸກຄົນ'], ['dataDept', 'ເຫັນສະເພາະພະແນກຂອງຕົນ'], ['writeAll', 'ແກ້ໄຂຂໍ້ມູນຂອງທຸກຄົນ'], ['userMng', 'ຈັດການບັນຊີເຂົ້າລະບົບ HR'], ['override', 'ປັບແກ້ການລົງເວລາ']] }
];
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
    /* ສຳເນົາຂໍ້ມູນ HR ສຳລັບລາຍງານ (ອ່ານຢ່າງດຽວ ດ້ວຍ session ເຈົ້າຂອງ) — null ຖ້າຍັງບໍ່ໄດ້ສ້າງ HR */
    snapshot: function () {
      if (!ready()) return null; const sup = x().superSession(CODE); if (!sup) return null;
      const get = function (c) { const r = JSON.parse(x().post(CODE, JSON.stringify({ action: 'list', token: sup.token, collection: c }))); return r.ok ? r.data.map(function (row) { return Object.assign({ id: row.id }, row.data || row); }) : []; };
      return { employees: get('employees'), scans: get('scans'), leaves: get('leaves'), ots: get('ots'), shifts: get('shifts'), branches: get('branches'), overrides: get('overrides'), settings: get('settings')[0] || {} };
    },
    /* ລາຍການສິດ (ແບ່ງກຸ່ມ ມີປ້າຍລາວ) + ສິດເລີ່ມຕົ້ນຂອງແຕ່ລະບົດບາດ — null ຖ້າຍັງບໍ່ໄດ້ສ້າງ HR */
    schema: function () {
      if (!ready()) return null; let s; try { s = x().schema(CODE); } catch (e) { console.error(e); return null; }
      const known = {}, groups = HR_GROUPS.map(function (g) { return { id: g.id, label: g.label, items: g.items.filter(function (i) { return s.all.indexOf(i[0]) >= 0; }).map(function (i) { known[i[0]] = 1; return { k: i[0], label: i[1] }; }) }; });
      const rest = s.all.filter(function (k) { return !known[k]; }); if (rest.length) groups.push({ id: 'other', label: 'ອື່ນໆ', items: rest.map(function (k) { return { k: k, label: k }; }) });
      return { groups: groups, presets: s.roles, roles: ['employee', 'head', 'accountant', 'auditor'] };
    },
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
        if (Array.isArray(u.hrRights)) { /* ຕິກຕໍ່ຄົນ = ຜົນຕ່າງຈາກສິດເລີ່ມຕົ້ນຂອງບົດບາດ (HR ເກັບເປັນ employee.perm: true = ເພີ່ມ, false = ເອົາອອກ) */
          const sc = x().schema(CODE), base = sc.roles[u.hrRole] || [], want = u.hrRights.filter(function (k) { return sc.all.indexOf(k) >= 0; }), perm = {};
          sc.all.forEach(function (k) { const w = want.indexOf(k) >= 0, h = base.indexOf(k) >= 0; if (w !== h) perm[k] = w; });
          if (Object.keys(perm).length) d.perm = perm; else delete d.perm;
        }
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
