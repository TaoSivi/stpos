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
    dirOf: dirOf
  };
  return self;
}
module.exports = { create: create };
