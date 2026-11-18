/* ຕົວຊ່ວຍຮ່ວມ ໜ້າ "ພະນັກງານ & ສິດ" ແລະ ໜ້າ "ຂ້ອຍ": ຊື່ໜ້າທີ່, ຄຳອະທິບາຍສິດ, ຕາຕະລາງສິດ (ສິດຈິງກວດຢູ່ server) */
'use strict';
var RN = { owner: 'ເຈົ້າຂອງ', head: 'ຫົວໜ້າສະໜາມ', tech: 'ວິຊາການ', admin: 'ບໍລິຫານສະໜາມ', office: 'ຫ້ອງການ', driver: 'ຄົນຂັບ', boss: 'ເຈົ້າຂອງ' };
var LVN = { superadmin: 'Super admin', admin: 'Admin', user: 'ຜູ້ໃຊ້' };
var HRN = { employee: 'ພະນັກງານ', head: 'ຫົວໜ້າ', accountant: 'ບັນຊີ', auditor: 'ຜູ້ກວດສອບ', owner: 'ເຈົ້າຂອງ HR' };
function opts(list, sel) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
function initial(n) { return esc(String(n || '?').trim().slice(0, 1).toUpperCase()); }

function permList(level, fuel, hr, appr, hrRole) {
 var out = [];
 if (level === 'superadmin' || level === 'admin') out.push('ທຸກແອັບ ແລະ ທຸກຟັງຊັນ (ນ້ຳມັນ + HR + ແອັບອື່ນ)', 'ຕັ້ງຄ່າ ສະໜາມ & ລົດ', level === 'superadmin' ? 'ຈັດການທຸກບັນຊີ ລວມ Admin' : 'ຈັດການບັນຊີຜູ້ໃຊ້ທົ່ວໄປ', 'ອະນຸມັດໃບປະຈຳວັນ');
 else {
  if (fuel === 'head') out.push('ນ້ຳມັນ: ເບີກ/ແກ້ cm ໃນສະໜາມທີ່ດູແລ', 'ນ້ຳມັນ: ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ', 'ນ້ຳມັນ: ມອບລົດໃຫ້ຄົນຂັບ', 'ນ້ຳມັນ: ອະນຸມັດໃບປະຈຳວັນ (ຫົວໜ້າອະນຸມັດໄດ້ສະເໝີ)', 'ນ້ຳມັນ: ເບິ່ງລາຍງານ');
  if (fuel === 'admin') out.push('ນ້ຳມັນ: ເບີກ/ແກ້ cm ໃນສະໜາມທີ່ດູແລ', 'ນ້ຳມັນ: ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ', 'ນ້ຳມັນ: ເບິ່ງລາຍງານ');
  if (fuel === 'office') out.push('ນ້ຳມັນ: ເບິ່ງລາຍງານ ແລະ ຍອດແທ່ງ (ທຸກສະໜາມ) — ແກ້ບໍ່ໄດ້');
  if (fuel === 'driver') out.push('ນ້ຳມັນ: ເຫັນ ແລະ ຮັບຮູ້ສະເພາະລົດທີ່ມອບໃຫ້ຕົນ');
  if (appr && (fuel === 'admin' || fuel === 'office')) out.push('ນ້ຳມັນ: ອະນຸມັດໃບປະຈຳວັນ (ຜູ້ອະນຸມັດທີ່ເຈົ້າຂອງຕັ້ງ)');
  if (hr) out.push('HR: ເຂົ້າ ST HR ໃນໜ້າທີ່ "' + (HRN[hrRole] || HRN.employee) + '" (ຂໍ້ມູນອື່ນ ເຊັ່ນ ພະແນກ/ເງິນເດືອນ HR ຕື່ມໃນ HR)');
 }
 return out;
}
function permLegend() {
 var Y = '<td class="y" aria-label="ໄດ້">✓</td>', N = '<td class="n" aria-label="ບໍ່ໄດ້">–</td>', A = '<td aria-label="ໄດ້ຖ້າຖືກຕັ້ງເປັນຜູ້ອະນຸມັດ">✱</td>', row = function (n, c) { return '<tr><td>' + n + '</td>' + c.map(function (x) { return x === 1 ? Y : x === 2 ? A : N; }).join('') + '</tr>'; };
 return '<section class="card"><h2>' + ic('key') + 'ສິດຕາມໜ້າທີ່ (ແອັບນ້ຳມັນ)</h2><div class="tw"><table class="perm"><thead><tr><th>ໜ້າທີ່</th><th>ເບິ່ງ/ລາຍງານ</th><th>ເບີກ & ແກ້ cm</th><th>ຮັບເຂົ້າແທ່ງ</th><th>ມອບລົດ</th><th>ອະນຸມັດ</th><th>ຕັ້ງຄ່າ/ຜູ້ໃຊ້</th><th>ຮັບຮູ້ (ລົດຕົນ)</th></tr></thead><tbody>' +
  row('Super admin / Admin', [1, 1, 1, 1, 1, 1, 0]) + row('ຫົວໜ້າສະໜາມ', [1, 1, 1, 1, 1, 0, 0]) + row('ບໍລິຫານສະໜາມ', [1, 1, 1, 0, 2, 0, 0]) + row('ຫ້ອງການ', [1, 0, 0, 0, 2, 0, 0]) + row('ຄົນຂັບ', [0, 0, 0, 0, 0, 0, 1]) +
  '</tbody></table></div><p class="hint">✱ = ອະນຸມັດໄດ້ ຖ້າເຈົ້າຂອງຕັ້ງຄົນນັ້ນເປັນ "ຜູ້ອະນຸມັດ". ຂອບເຂດສະໜາມ: ບໍລິຫານ/ຫົວໜ້າ ເຮັດໄດ້ສະເພາະສະໜາມທີ່ເລືອກ; ຫ້ອງການ ເຫັນທຸກສະໜາມ. ສິດພາຍໃນ HR ກຳນົດໃນ HR (ໜ້າທີ່ຫົວໜ້າ/ບັນຊີ/ຜູ້ກວດສອບ ຕັ້ງຈາກຟອມນີ້ໄດ້).</p></section>';
}
