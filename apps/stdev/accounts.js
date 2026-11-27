/* ບັນຊີກາງ — ສ້າງຜູ້ໃຊ້ຄັ້ງດຽວ ໃຊ້ໄດ້ທຸກໂມດູນ (ນ້ຳມັນ, HR). ໂມດູນບໍ່ເກັບ PIN/ບັນຊີຂອງຕົນເອງ — ຖາມຈາກບ່ອນນີ້ເທົ່ານັ້ນ.
 * level: superadmin = ທຸກຢ່າງ + ຈັດການທຸກບັນຊີ · admin = ທຸກໂມດູນ (ເປັນເຈົ້າຂອງໃນໂມດູນ) + ຈັດການສະເພາະບັນຊີລະດັບ user · user = ສະເພາະໂມດູນທີ່ເປີດໃຫ້
 * user.fuel = ໜ້າທີ່ໃນໂມດູນນ້ຳມັນ (driver|admin|head|office; ວ່າງ = ບໍ່ມີສິດ) · user.hr = ເຂົ້າໂມດູນ HR ໄດ້ (ສິດພາຍໃນ HR ກຳນົດໃນ HR)
 * user.fuelRights / user.hrRights = ລາຍການສິດທີ່ຕິກ (ຟັງຊັນລະອຽດ) — ບໍ່ມີ (null) = ໃຊ້ແມ່ແບບຂອງໜ້າທີ່; ໂມດູນກວດ key ທີ່ຮູ້ຈັກເອງ
 * user.hrRole = ໜ້າທີ່ໃນ HR (employee|head|accountant|auditor) — mod-hr.js ສ້າງ/ອັບເດດພະນັກງານໃນ HR ຕາມຄ່ານີ້ ເພື່ອບໍ່ຕ້ອງເພີ່ມຊ້ຳ
 * user.apps = ລາຍຊື່ id ແອັບອື່ນທີ່ເປີດໃຫ້ (ເຊັ່ນ 'sop') — ແອັບໃໝ່ບໍ່ຕ້ອງແກ້ໂຄງບັນຊີ; admin/superadmin ເຂົ້າໄດ້ທຸກແອັບ
 * user.approver = ຜູ້ອະນຸມັດໃບນ້ຳມັນປະຈຳວັນ (ນອກຈາກ ຫົວໜ້າສະໜາມ/admin ຂຶ້ນໄປ ທີ່ອະນຸມັດໄດ້ຢູ່ແລ້ວ) — ເຈົ້າຂອງເລືອກໃຫ້ຄົນບໍລິຫານ/ຫ້ອງການທີ່ໄວ້ໃຈ
 * ຂໍ້ມູນ: DATA/users.json (PIN ເກັບແບບ scrypt) · DATA/secret.key */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const LEVELS = ['superadmin', 'admin', 'user'], FUEL_ROLES = ['driver', 'admin', 'head', 'office', 'tech'], HR_ROLES = ['employee', 'head', 'accountant', 'auditor'];

function create(DATA) {
  const USERS = path.join(DATA, 'users.json');
  fs.mkdirSync(DATA, { recursive: true });
  const readJson = function (f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
  const writeAtomic = function (f, t) { const tmp = f + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, t); fs.renameSync(tmp, f); };
  const SECRET = (function () { const f = path.join(DATA, 'secret.key'); try { return fs.readFileSync(f); } catch (e) { const k = crypto.randomBytes(32); fs.writeFileSync(f, k, { mode: 0o600 }); return k; } })();
  const users = function () { return readJson(USERS, {}); };
  const phoneOf = function (x) { const d = String(x || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 15 ? d : ''; };
  const pinOk = function (p) { return /^\d{4,8}$/.test(String(p || '')); };
  function pinHash(pin, salt) { salt = salt || crypto.randomBytes(8).toString('hex'); return salt + ':' + crypto.scryptSync(String(pin), salt, 32).toString('hex'); }
  function pinCheck(pin, h) { const p = String(h || '').split(':'); if (p.length !== 2) return false; const a = Buffer.from(pinHash(pin, p[0]).split(':')[1], 'hex'), b = Buffer.from(p[1], 'hex'); return a.length === b.length && crypto.timingSafeEqual(a, b); }

  /* ສິດຕົວຈິງ ຂອງບັນຊີ — ໂມດູນຖາມຈາກນີ້ເທົ່ານັ້ນ (ບໍ່ອ່ານ level ເອງ) */
  const fuelRole = function (u) { return u.level !== 'user' ? 'owner' : (FUEL_ROLES.indexOf(u.fuel) >= 0 ? u.fuel : ''); };
  const hasHr = function (u) { return u.level !== 'user' || u.hr === true; };
  const approverOf = function (u) { return u.level !== 'user' || u.approver === true; };
  const appsOf = function (u) { return u.level !== 'user' ? ['*'] : (u.apps || []); };
  const hrRoleOf = function (u) { return u.level !== 'user' ? 'owner' : u.hr ? (HR_ROLES.indexOf(u.hrRole) >= 0 ? u.hrRole : 'employee') : ''; };
  const view = function (ph, u) { return { id: ph, name: u.name, level: u.level, fuel: fuelRole(u), hr: hasHr(u), hrRole: hrRoleOf(u), fuelRights: u.level === 'user' && Array.isArray(u.fuelRights) ? u.fuelRights : null, hrRights: u.level === 'user' && u.hr && Array.isArray(u.hrRights) ? u.hrRights : null, approver: approverOf(u), apps: appsOf(u), sites: u.sites || [] }; };

  /* ບັນທຶກບັນຊີ. actor = {level} ຂອງຜູ້ແກ້ (null = ຄຳສັ່ງ CLI = superadmin) · ຄືນ {ok, phone} ຫຼື {ok:false, error} */
  function save(o, actor) {
    const lv = actor ? actor.level : 'superadmin', ph = phoneOf(o.phone), all = users(), cur = all[ph];
    if (lv !== 'superadmin' && lv !== 'admin') return { ok: false, error: 'auth' };
    if (!ph) return { ok: false, error: 'phone' };
    const level = o.level == null ? (cur ? cur.level : 'user') : o.level;
    if (LEVELS.indexOf(level) < 0) return { ok: false, error: 'level' };
    if (lv === 'admin' && (level !== 'user' || (cur && cur.level !== 'user'))) return { ok: false, error: 'auth' }; /* admin ແຕະໄດ້ແຕ່ລະດັບ user */
    const name = String(o.name == null ? (cur && cur.name) || '' : o.name).replace(/[<>]/g, '').trim().slice(0, 60); if (!name) return { ok: false, error: 'name' };
    if (!cur && !pinOk(o.pin)) return { ok: false, error: 'pin' };
    if (o.pin != null && o.pin !== '' && !pinOk(o.pin)) return { ok: false, error: 'pin' };
    const fuel = o.fuel == null ? (cur ? cur.fuel || '' : '') : String(o.fuel);
    if (fuel && FUEL_ROLES.indexOf(fuel) < 0) return { ok: false, error: 'role' };
    const hr = o.hr == null ? !!(cur && cur.hr) : o.hr === true, approver = Array.isArray(o.fuelRights) ? o.fuelRights.indexOf('approve') >= 0 : (o.approver == null ? !!(cur && cur.approver) : o.approver === true); /* ຕິກ "ອະນຸມັດ" = ຜູ້ອະນຸມັດ (ໃຫ້ຕົງກັນ) */
    const cleanRights = function (x, prev) { if (x === undefined) return prev == null ? null : prev; if (x === null) return null; return Array.isArray(x) ? x.map(String).filter(function (k, i, a) { return /^[A-Za-z.]{2,30}$/.test(k) && a.indexOf(k) === i; }).slice(0, 60) : (prev == null ? null : prev); };
    const fuelRights = cleanRights(o.fuelRights, cur && cur.fuelRights), hrRights = cleanRights(o.hrRights, cur && cur.hrRights);
    const hrRole = o.hrRole == null ? (cur && cur.hrRole) || 'employee' : String(o.hrRole);
    if (HR_ROLES.indexOf(hrRole) < 0) return { ok: false, error: 'role' };
    const apps = (o.apps == null ? (cur && cur.apps) || [] : Array.isArray(o.apps) ? o.apps : []).map(String).filter(function (id, i, a) { return /^[a-z0-9_-]{2,24}$/.test(id) && id !== 'fuel' && id !== 'hr' && a.indexOf(id) === i; });
    if (level === 'user' && !fuel && !hr && !apps.length) return { ok: false, error: 'nomodule' }; /* ບັນຊີ user ຕ້ອງເປີດຢ່າງໜ້ອຍ 1 ໂມດູນ */
    all[ph] = { name: name, level: level, fuel: level === 'user' ? fuel : '', hr: level === 'user' ? hr : false, approver: level === 'user' ? approver : false, hrRole: level === 'user' && hr ? hrRole : '', fuelRights: level === 'user' && fuel ? fuelRights : null, hrRights: level === 'user' && hr ? hrRights : null, apps: level === 'user' ? apps : [], sites: (Array.isArray(o.sites) ? o.sites : (cur && cur.sites) || []).map(String).filter(function (s) { return /^[a-z0-9]{1,16}$/.test(s); }), active: o.active !== false, pinH: o.pin ? pinHash(o.pin) : cur.pinH, pl: o.pin ? String(o.pin).length : (cur && cur.pl) || 0 }; /* pl = ຄວາມຍາວ PIN (ໃຫ້ໜ້າ login ສະແດງຈຸດພໍດີ ແລະ ເຂົ້າອັດຕະໂນມັດ) */
    if (!Object.keys(all).some(function (k) { return all[k].level === 'superadmin' && all[k].active; })) return { ok: false, error: 'lastsuper' };
    writeAtomic(USERS, JSON.stringify(all)); return { ok: true, phone: ph };
  }
  /* ລາຍຊື່ໃຫ້ໜ້າຈັດການ: ທຸກຄົນ + editable (ຜູ້ເບິ່ງແກ້ໄດ້ບໍ) */
  function list(actor) {
    const all = users(); return Object.keys(all).sort().map(function (k) { const u = all[k]; return { phone: k, name: u.name, level: u.level, fuel: u.fuel || '', hr: !!u.hr, hrRole: u.hr ? (u.hrRole || 'employee') : '', fuelRights: Array.isArray(u.fuelRights) ? u.fuelRights : null, hrRights: Array.isArray(u.hrRights) ? u.hrRights : null, approver: !!u.approver, apps: u.apps || [], sites: u.sites || [], active: u.active, editable: actor.level === 'superadmin' || (actor.level === 'admin' && u.level === 'user') }; });
  }
  function changePin(ph, oldPin, pin) { const cur = users()[ph]; if (!cur || !pinCheck(oldPin, cur.pinH)) return { ok: false, error: 'oldpin' }; if (!pinOk(pin)) return { ok: false, error: 'pin' }; const r = save({ phone: ph, pin: pin }, { level: 'superadmin' }); return r.ok ? { ok: true, token: tokenFor(ph, users()[ph]) } : r; }

  /* ===== ເຂົ້າລະບົບ: ເບີໂທ + PIN → token (HMAC, 30 ວັນ, ຜູກກັບ PIN ແລະ ສະຖານະເປີດໃຊ້) ===== */
  const sign = function (v) { return crypto.createHmac('sha256', SECRET).update(v).digest('base64url'); };
  function tokenFor(ph, u) { const v = Buffer.from(JSON.stringify({ u: ph, e: Date.now() + 30 * 864e5, p: u.pinH.slice(-8) })).toString('base64url'); return v + '.' + sign(v); }
  function userOf(tk) {
    const parts = String(tk || '').split('.'); if (parts.length !== 2) return null;
    const a = Buffer.from(sign(parts[0])), b = Buffer.from(parts[1]); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    let o; try { o = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch (e) { return null; }
    const u = o && o.e > Date.now() && users()[o.u]; if (!u || !u.active || u.pinH.slice(-8) !== o.p) return null;
    return view(o.u, u);
  }
  function renew(tk) { /* ຕໍ່ອາຍຸ token ອັດຕະໂນມັດ: ໃຊ້ແອັບເລື້ອຍໆ = ບໍ່ຕ້ອງ login ໃໝ່ (ເຫຼືອ < 25 ວັນ → ອອກໃໝ່ 30 ວັນ) */
    const parts = String(tk || '').split('.'); let o; try { o = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); } catch (e) { return null; }
    const u = o && users()[o.u]; return u && o.e - Date.now() < 25 * 864e5 && userOf(tk) ? tokenFor(o.u, u) : null;
  }
  const fails = new Map(); /* ກັນເດົາ PIN: ຜິດ 5 ເທື່ອ/ເບີ ຫຼື 30 ເທື່ອ/IP → ລັອກ 15 ນາທີ */
  const lockLeft = function (k, max) { const f = fails.get(k); return f && f.n >= max && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 60000) : 0; };
  const failAdd = function (k) { const f = fails.get(k), now = Date.now(); fails.set(k, !f || f.until < now ? { n: 1, until: now + 15 * 60000 } : { n: f.n + 1, until: now + 15 * 60000 }); };
  function login(o, ip) {
    const ph = phoneOf(o.phone), kp = 'p' + ph, ki = 'i' + ip, left = Math.max(lockLeft(kp, 5), lockLeft(ki, 30));
    if (left) return { ok: false, error: 'locked', min: left };
    const u = ph && users()[ph], good = !!u && u.active && pinOk(o.pin) && pinCheck(o.pin, u.pinH);
    if (!good) { if (!u) pinCheck('0000', pinHash('0000')); failAdd(kp); failAdd(ki); return { ok: false, error: 'login', left: Math.max(0, 5 - fails.get(kp).n) }; } /* ຂໍ້ຄວາມດຽວກັນທັງ "ບໍ່ມີເບີ" ແລະ "PIN ຜິດ" */
    fails.delete(kp);
    if (u.pl !== String(o.pin).length) { try { const all = users(); if (all[ph]) { all[ph].pl = String(o.pin).length; writeAtomic(USERS, JSON.stringify(all)); } } catch (e) { } } /* ບັນຊີເກົ່າ: ຮຽນຮູ້ຄວາມຍາວ PIN ຕອນ login ສຳເລັດ */
    return Object.assign({ ok: true, token: tokenFor(ph, u) }, view(ph, u));
  }
  const pinLen = function (phone) { const u = users()[phoneOf(phone)]; return u && u.active && u.pl >= 4 && u.pl <= 8 ? u.pl : 0; };
  const get = function (ph) { const u = users()[ph]; return u ? view(ph, u) : null; };
  return { pinLen: pinLen, users: users, get: get, save: save, list: list, changePin: changePin, login: login, userOf: userOf, renew: renew, phoneOf: phoneOf, pinOk: pinOk, LEVELS: LEVELS, FUEL_ROLES: FUEL_ROLES };
}
module.exports = { create: create };
