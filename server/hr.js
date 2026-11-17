/* ST HR ຕໍ່ບໍລິສັດ: POST /t/<code>/hr — ແລ່ນ Code.gs ຂອງ ST HR (ສຳເນົາໃນ hr/Code.gs) ເທິງ Node ດ້ວຍ gas-shim ຂອງຕົນເອງ
 * (ແຍກຈາກ Code.gs ຂອງ POS: context vm ແຍກ + shim ແຍກ → ຊື່ຟັງຊັນບໍ່ຊົນກັນ, ຂໍ້ມູນ HR ຂອງແຕ່ລະບໍລິສັດຢູ່ <ໂຟນເດີບໍລິສັດ>/hr/)
 * ໂປຣໂຕຄໍຄືກັບ Apps Script ຂອງ HR ທຸກຢ່າງ (POST text/plain {action,...} → {ok,data|error}) — ແອັບ HR ໃຊ້ໂໝດ "sheets" ຊີ້ມາທີ່ນີ້ໄດ້ເລີຍ
 * ສິດ: ບໍລິສັດຕ້ອງມີແອັບ 'sthr' (ຫຼື '*') · ການສ້າງບໍລິສັດ HR ໃຊ້ SIGNUP_CODE ຂອງບໍລິສັດນັ້ນ (ຜູ້ດູແລແພລດຟອມເບິ່ງ/ຕັ້ງໃໝ່ໄດ້ດ້ວຍ ?admin=tenant_hr) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

function create(rootDir, codeFile) {
  const shim = require('./gas-shim').create(path.join(rootDir, '_hr-shim'));
  shim.noEnv(true); /* ຄ່າ env ຂອງ server (token, Telegram…) ບໍ່ຮົ່ວເຂົ້າ Script Properties ຂອງ HR */
  const ctx = vm.createContext(Object.assign({ console: console }, shim.globals));
  vm.runInContext(fs.readFileSync(codeFile, 'utf8'), ctx, { filename: 'HR Code.gs' });
  const dirOf = function (code) { return path.join(rootDir, 't', code, 'hr'); };
  /* ເຮັດວຽກໃນໂຟນເດີ HR ຂອງບໍລິສັດ ແບບ synchronous (shim ມີສະຖານະໂຟນເດີຕໍ່ request) */
  function within(code, fn) { shim.use(dirOf(code)); shim.beginRequest(); try { return fn(); } finally { shim.endRequest(); } }
  const self = {
    /* ຄຳຕອບຂອງ doPost ເປັນຂໍ້ຄວາມ JSON */
    post: function (code, body) { return within(code, function () { return ctx.doPost({ postData: { contents: String(body || '') } }).getContent(); }); },
    ping: function (code) { return within(code, function () { return ctx.doGet().getContent(); }); },
    /* SIGNUP_CODE ຂອງບໍລິສັດ (ສ້າງສຸ່ມຄັ້ງທຳອິດ ຫຼື ຕັ້ງໃໝ່ເມື່ອ reset) + ບໍລິສັດ HR ຖືກສ້າງແລ້ວ ຫຼື ຍັງ */
    signup: function (code, reset) {
      return within(code, function () {
        let s = shim.props.getProperty('SIGNUP_CODE');
        if (!s || reset) { s = crypto.randomBytes(9).toString('hex'); shim.props.setProperty('SIGNUP_CODE', s); }
        let created = false; try { created = !!JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ action: 'info' }) } }).getContent()).data.companyId; } catch (e) {}
        return { signupCode: s, created: created };
      });
    },
    /* ສ້າງບໍລິສັດ HR ຕົວຢ່າງ: ຊື່ + ພະນັກງານ 3 ຄົນ. PIN ສຸ່ມໂດຍ server ແລ້ວສົ່ງກັບໃຫ້ຜູ້ດູແລແພລດຟອມເຫັນຄັ້ງດຽວ — ຮູບແບບຂໍ້ມູນຄືກັບ newCompanyRecords ຂອງແອັບ HR */
    seed: function (code, name, own) {
      const sg = self.signup(code, false); if (sg.created) return { ok: false, err: 'ບໍລິສັດ HR ນີ້ຖືກສ້າງແລ້ວ' };
      const pins = []; while (pins.length < 2) { const p = String(crypto.randomInt(1000, 10000)); if (pins.indexOf(p) < 0 && !/^(\d)\1{3}$/.test(p) && p !== '1234') pins.push(p); }
      const call = function (o) { const r = JSON.parse(self.post(code, JSON.stringify(o))); if (!r.ok) throw new Error(r.error || 'hr'); return r.data; };
      const d = new Date(), ymd = function (x) { return x.toISOString().slice(0, 10); }, today = ymd(d), until = ymd(new Date(d.getTime() + 30 * 864e5));
      const cid = 'c-' + crypto.randomBytes(4).toString('hex'), nm = String(name || 'LTGTEST').replace(/[<>]/g, '').trim().slice(0, 60) || 'LTGTEST';
      try {
        const mk = { action: 'create', signupCode: sg.signupCode, company: { id: cid, name: nm, plan: 'pro', trial: true, validUntil: until, createdAt: today }, owner: { employeeId: 'e-owner', code: 'ST-001' }, pin: own ? String(own.pin) : pins[1] };
        if (!own) mk.superAdmin = { employeeId: 'e-super', code: 'ST-000', pin: pins[0] };
        const s = call(mk);
        const put = function (coll, id, data) { call({ action: 'upsert', token: s.token, collection: coll, id: id, data: data }); };
        const base = { companyId: cid, dept: 'ບໍລິຫານ', homeBranchId: 'b-main', shiftId: 'morning', startDate: today, baseSalary: 0, allowance: 0, payMethod: 'cash' };
        put('branches', 'b-main', { id: 'b-main', companyId: cid, name: 'ສາຂາຫຼັກ', lat: 17.9757, lng: 102.6331, radiusM: 100 });
        put('employees', 'e-owner', Object.assign({ id: 'e-owner', code: 'ST-001', name: own ? (String(own.name || '').trim() || 'ເຈົ້າຂອງ') : 'Admin', position: 'ເຈົ້າຂອງ', roles: ['employee', 'owner'] }, own ? {} : { pinMustChange: true }, base));
        if (!own) put('employees', 'e-super', Object.assign({ id: 'e-super', code: 'ST-000', name: 'Super admin', position: 'Super admin', roles: ['employee', 'owner'], superAdmin: true }, base));
        [{ id: 'morning', name: 'ກະເຊົ້າ', start: '06:00', end: '14:00', breakStart: '10:00', breakEnd: '10:30' }, { id: 'evening', name: 'ກະແລງ', start: '14:00', end: '22:00', breakStart: '18:00', breakEnd: '18:30' }, { id: 'flex', name: 'ຢືດຢຸ່ນ(ອອຟຟິດ)', start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00', flexible: true, dailyHours: 8 }].forEach(function (x) { put('shifts', x.id, x); });
        put('settings', cid, { id: cid, companyId: cid, graceMinutes: 5, lateDeductPerMinute: 1000, otRate: 1.5, workHoursPerMonth: 208, ssRate: 0.055, taxBrackets: [{ upTo: 1300000, rate: 0 }, { upTo: 5000000, rate: 0.05 }, { upTo: 15000000, rate: 0.1 }, { upTo: 25000000, rate: 0.15 }, { upTo: 65000000, rate: 0.2 }, { upTo: null, rate: 0.25 }], maxClockSkewMin: 2, faceMinScore: 70, leaveDaysPerYear: 15, sickDaysPerYear: 30, personalDaysPerYear: 5, specialDaysPerYear: 30, unpaidDaysPerYear: 30, leaveAccrual: 'monthly', leaveCarryOverMax: 5, leaveApproversRequired: 1, leaveApproverRoles: ['head', 'owner'], escalateAfterHours: 24, makerChecker: true, advanceMaxPctOfEarned: 0.5, photoRetentionDays: 365, randomSamplePerDay: 5, holidays: [], leavePayoutOnExit: true, compLeaveExpiryDays: 90, approverRoles: {}, employeeMenus: {}, roleRights: {} });
        if (!own) [['ST-101', 'ສົມຊາຍ ວົງດາລາ', 'ຂາຍ', 'ພະນັກງານຂາຍ', 3000000], ['ST-102', 'ມະນີ ສີສຸວັນ', 'ບັນຊີ', 'ບັນຊີ', 3500000], ['ST-103', 'ຄຳຜຸຍ ພົມມະຈັນ', 'ບໍລິການ', 'ພະນັກງານບໍລິການ', 2800000]].forEach(function (p, i) {
          put('employees', 'e-s' + (i + 1), Object.assign({}, base, { id: 'e-s' + (i + 1), code: p[0], name: p[1], dept: p[2], position: p[3], roles: ['employee'], baseSalary: p[4], allowance: 200000 }));
        });
      } catch (e) { return { ok: false, err: String(e.message || e) }; }
      if (own) return { ok: true, company: nm };
      return { ok: true, company: nm, superAdmin: { code: 'ST-000', pin: pins[0] }, admin: { code: 'ST-001', pin: pins[1], mustChange: true }, staff: ['ST-101', 'ST-102', 'ST-103'] };
    },
    /* ເຈົ້າຂອງແພລດຟອມເຂົ້າ HR ຂອງບໍລິສັດ: session ຂອງບັນຊີ Super admin (ຫຼື ເຈົ້າຂອງ) ໂດຍບໍ່ຕ້ອງໃສ່ PIN — ຄືນ null ຖ້າ HR ຍັງບໍ່ຖືກສ້າງ */
    superSession: function (code) {
      return within(code, function () {
        vm.runInContext('REQ = {}', ctx);
        const c = ctx.readCompany(); if (!c) return null;
        const rows = ctx.userRows(), pick = function (r) { return rows.filter(function (u) { return (u.roles || []).indexOf(r) >= 0; })[0]; };
        const u = pick('superadmin') || pick('owner'); if (!u) return null;
        const lock = ctx.LockService.getScriptLock(); lock.waitLock(25000);
        try { return ctx.openSession(u.employeeId, u.roles, ctx.companyRecord().id); } finally { lock.releaseLock(); }
      });
    },
    /* ບັນຊີດຽວທຸກແອັບ: ຜູ້ໃຊ້ຂອງບໍລິສັດ (ລາຍຊື່ດຽວກັບ POS) ເຂົ້າ HR ໂດຍບໍ່ຕ້ອງມີ PIN HR ແຍກ.
     * ເຈົ້າຂອງ / superadmin → ບັນຊີ Super admin ຫຼື ເຈົ້າຂອງ ຂອງ HR. ຜູ້ອື່ນ → ພະນັກງານ HR ທີ່ຜູກກັບ id ນັ້ນ (posUid); ບໍ່ມີ = ສ້າງໃຫ້ (ບົດບາດ employee)
     * ສິດໃນ HR (ຫົວໜ້າ, HR, ບັນຊີ…) ກຳນົດໃນແອັບ HR ຕາມປົກກະຕິ. ຄືນ null ຖ້າ HR ຂອງບໍລິສັດຍັງບໍ່ຖືກສ້າງ */
    sessionFor: function (code, pu) {
      if (pu.role === 'superadmin' || pu.role === 'owner') return self.superSession(code);
      return within(code, function () {
        vm.runInContext('REQ = {}', ctx);
        const co = ctx.readCompany(); if (!co) return null;
        const cid = ctx.companyRecord().id, emps = ctx.employeesById(), uid = String(pu.id);
        let empId = Object.keys(emps).filter(function (k) { return emps[k] && emps[k].posUid === uid; })[0];
        const lock = ctx.LockService.getScriptLock(); lock.waitLock(25000);
        try {
          if (!empId) {
            empId = 'e-p' + crypto.createHash('sha256').update(uid).digest('hex').slice(0, 10);
            let n = 100; Object.keys(emps).forEach(function (k) { const m = /^ST-(\d+)$/i.exec(String(emps[k] && emps[k].code || '')); if (m) n = Math.max(n, +m[1]); });
            const shifts = ctx.recordRows('shifts').map(function (r) { return r.data; }).filter(Boolean), br = ctx.recordRows('branches').map(function (r) { return r.data; }).filter(Boolean)[0];
            const data = { id: empId, companyId: cid, code: 'ST-' + (n + 1), name: String(pu.name || uid).slice(0, 60), dept: '', position: '', roles: ['employee'], homeBranchId: br ? br.id : 'b-main', shiftId: shifts[0] ? shifts[0].id : 'morning', startDate: new Date().toISOString().slice(0, 10), baseSalary: 0, allowance: 0, payMethod: 'cash', posUid: uid };
            const sh = ctx.tab(ctx.PREFIX + 'employees', ctx.RECORD_HEADER);
            ctx.writeRow(sh, ctx.findRow(sh, empId), [empId, new Date().toISOString(), 'platform'].concat(ctx.chunks(JSON.stringify(data))));
            ctx.collectionChanged('employees'); vm.runInContext('REQ.emps = undefined', ctx); /* ບໍ່ລ້າງ REQ ທັງໝົດ: REQ.book ຖືການຂຽນທີ່ຍັງບໍ່ທັນບັນທຶກ */
          }
          let u = ctx.userRows().filter(function (x) { return x.employeeId === empId; })[0];
          if (!u) { /* ບັນຊີເຂົ້າ HR ທີ່ບໍ່ມີ PIN ທີ່ໃຜຮູ້ (ສຸ່ມ) — ເຂົ້າໄດ້ຜ່ານແພລດຟອມເທົ່ານັ້ນ ຈົນກວ່າ Admin ຈະຕັ້ງ PIN ໃຫ້ */
            const e = ctx.employeesById()[empId] || {}, salt = crypto.randomUUID(), pin = String(crypto.randomInt(0, 1e8));
            ctx.saveUser({ employeeId: empId, code: String(e.code || empId).toLowerCase(), salt: salt, hash: ctx.hashPin(salt, pin), sealed: '', roles: ['employee'].concat((e.roles || []).filter(function (r) { return r !== 'employee' && r !== 'superadmin'; })) });
            vm.runInContext('REQ.users = undefined', ctx);
            u = ctx.userRows().filter(function (x) { return x.employeeId === empId; })[0];
          }
          return ctx.openSession(u.employeeId, u.roles, cid);
        } finally { lock.releaseLock(); }
      });
    },
    /* ລາຍການສິດທັງໝົດຂອງ HR + ສິດເລີ່ມຕົ້ນຂອງແຕ່ລະບົດບາດ (ລວມທີ່ Admin ປັບໃນ HR) — ໃຫ້ຟອມ "ພະນັກງານ & ສິດ" ຂອງ stdev ສະແດງເປັນຕິກ */
    schema: function (code) {
      return within(code, function () {
        vm.runInContext('REQ = {}', ctx);
        const st = ctx.settingsRecord(), custom = (st && st.roleRights) || {}, roles = {};
        Object.keys(ctx.ROLE_RIGHTS).forEach(function (r) { roles[r] = (Array.isArray(custom[r]) && ctx.EDITABLE_ROLES.indexOf(r) >= 0 ? custom[r] : ctx.ROLE_RIGHTS[r]).slice(); });
        return JSON.parse(JSON.stringify({ all: ctx.ALL_RIGHTS, roles: roles }));
      });
    },
    dirOf: dirOf
  };
  return self;
}
module.exports = { create: create };
