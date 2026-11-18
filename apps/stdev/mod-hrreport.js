/* ໂມດູນ "ລາຍງານ HR (Excel)" — ໃຊ້ຂໍ້ມູນ HR ຜ່ານ hr.snapshot() (ອ່ານຢ່າງດຽວ) ແລ້ວສ້າງ .xlsx ດ້ວຍ hr-report.js
 * action: hrreport.info → ສາຂາ/ພະແນກ/ຮອບເດືອນ · hrreport.build {from,to,branchId?,dept?} → {name, b64, days, employees}
 * ສິດເຂົ້າ: ກຳນົດຢູ່ທະບຽນແອັບ (server.js access) — admin ຂຶ້ນໄປ ຫຼື ບັນຊີ HR ບົດບາດ ບັນຊີ/ເຈົ້າຂອງ/ຜູ້ກວດສອບ */
'use strict';
const report = require('./hr-report');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
function create(hr, opts) {
  const today = function () { return opts && opts.today ? opts.today() : new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); };
  function handle(action, o) {
    const err = function (e) { return { ok: false, error: e }; };
    const snap = hr.snapshot(); if (!snap) return err('nohr');
    if (action === 'info') return { ok: true, data: report.info(snap, today()) };
    if (action === 'build') {
      if (!DATE.test(String(o.from)) || !DATE.test(String(o.to)) || o.from > o.to) return err('date');
      let r; try { r = report.build(snap, { from: o.from, to: o.to, branchId: String(o.branchId || ''), dept: String(o.dept || ''), today: today() }); } catch (e) { return err(e.code === 'range' ? 'range' : 'server'); }
      if (!r.employees) return err('noemp');
      return { ok: true, data: { name: r.name, days: r.days, employees: r.employees, rows: r.rows, b64: r.buffer.toString('base64') } };
    }
    return err('action');
  }
  return { handle: handle };
}
module.exports = { create: create };
