/* ສຳຮອງຂໍ້ມູນອັດຕະໂນມັດ: ສຳເນົາ DATA_DIR ທັງໝົດ (ນ້ຳມັນ + ບັນຊີ + HR) ເປັນໂຟນເດີຕາມວັນ ໃນ DATA_DIR/backups/YYYY-MM-DD, ເກັບ 14 ມື້ຫຼ້າສຸດ.
 * ເອີ້ນຕອນ server ເລີ່ມ ແລະ ທຸກ 6 ຊົ່ວໂມງ (ມື້ໜຶ່ງເຮັດເທື່ອດຽວ). ບໍ່ມີ dependency.
 * shortcut: ສຳເນົາທັງໂຟນເດີ ບໍ່ບີບອັດ — ຖ້າຂໍ້ມູນເກີນຫຼາຍຮ້ອຍ MB ໃຫ້ປ່ຽນເປັນ zip / ສຳຮອງໄປເຄື່ອງອື່ນ. */
'use strict';
const fs = require('fs'), path = require('path');
const KEEP = 14, SKIP = 'backups';

const today = function () { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }; /* ເວລາລາວ UTC+7 */

function run(data, force) {
  const root = path.join(data, SKIP), dest = path.join(root, today());
  if (!force && fs.existsSync(dest)) return { skipped: true, dest: dest };
  fs.mkdirSync(root, { recursive: true });
  const tmp = dest + '.tmp'; fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp); /* ສຳເນົາແຕ່ລະລາຍການຊັ້ນບນ (cpSync ປະຕິເສດສຳເນົາໂຟນເດີເຂົ້າໂຕເອງ) */
  fs.readdirSync(data).filter(function (n) { return n !== SKIP; }).forEach(function (n) { fs.cpSync(path.join(data, n), path.join(tmp, n), { recursive: true }); });
  fs.rmSync(dest, { recursive: true, force: true }); fs.renameSync(tmp, dest);
  fs.readdirSync(root).filter(function (n) { return /^\d{4}-\d{2}-\d{2}$/.test(n); }).sort().slice(0, -KEEP).forEach(function (n) { fs.rmSync(path.join(root, n), { recursive: true, force: true }); });
  return { skipped: false, dest: dest };
}

/* ເລີ່ມຕັ້ງເວລາ: ເຮັດທັນທີ + ທຸກ 6 ຊົ່ວໂມງ. ຜິດພາດບໍ່ໃຫ້ server ລົ້ມ */
function schedule(data, log) {
  const tick = function () { try { const r = run(data); if (!r.skipped) log('backup ok ' + r.dest); } catch (e) { log('backup FAILED ' + e.message); } };
  tick(); setInterval(tick, 6 * 36e5).unref();
}
module.exports = { run: run, schedule: schedule };
