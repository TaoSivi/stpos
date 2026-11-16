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
  return {
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
    dirOf: dirOf
  };
}
module.exports = { create: create };
