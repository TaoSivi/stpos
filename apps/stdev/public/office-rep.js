/* ໂມດູນລາຍງານ: ລາຍງານປະຈຳວັນ (ຮູບແບບ "ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ") · ຍອດແທ່ງ · ສົ່ງອອກ PDF / Excel */
'use strict';
function pic(k) { return P[k] ? '<img alt="" src="' + P[k] + '">' : ''; }
function coName() { return siteObj().company || I.company || ''; }
function logoImg() { var g = siteObj().logo; return g ? '<img src="' + g + '" alt="" style="max-height:64px;max-width:200px;display:block;margin:0 auto 6px">' : ''; }
function exportBar() { return '<div class="row wrap noprint" style="margin-top:16px"><button class="btn" id="pdf">' + ic('pdf') + 'ສົ່ງອອກ PDF</button><button class="btn line" id="xls">' + ic('xls') + 'ສົ່ງອອກ Excel</button></div><p class="muted sm noprint">PDF: ໃນໜ້າຕ່າງພິມ ເລືອກ "Save as PDF" (ປິດ Headers and footers)</p>'; }
function reportView() { withSheet(true, function () { drawReport(); }); }
function drawReport() {
 var t = totals(), d = dmy(S.date);
 var rows = S.rows.map(function (r, i) {
  return '<tr><td>' + (i + 1) + '</td><td class="l">' + esc(r.name) + (r.h && r.h.length ? ' <small class="pm bad" title="' + esc(r.h.map(function (x) { return when(x.at) + ' ' + x.k + ' ' + x.from + '→' + x.to; }).join(' | ')) + '">ແກ້ ' + r.h.length + ' ຄັ້ງ</small>' : '') + '</td><td>' + L(r.L0) + '</td><td>' + pic(r.v + '_b') + '</td><td>' + (r.cm0 == null ? '' : r.cm0 + ' cm') + '</td><td><b>' + L(r.add) + '</b><br><small>' + (r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : 'ແທ່ງ') + '</small></td><td>' + (r.cm1 == null ? '' : r.cm1 + ' cm') + '</td><td>' + pic(r.v + '_a') + '</td><td>' + L(r.L1) + '</td><td>' + pic(r.v + '_e') + '</td><td>' + (r.cm2 == null ? '' : r.cm2 + ' cm') + '</td><td>' + L(r.L2) + '</td><td><b>' + L(r.used) + '</b></td><td>' + (r.ack ? '✓ ' + esc(r.ack.name) : r.rej ? '✗ ' + esc(r.rej.name) : '') + '</td><td class="l">' + esc(r.note) + '</td></tr>';
 }).join('');
 $('v').innerHTML = '<section class="card"><div class="rh">' + logoImg() + '<div class="muted">' + esc(coName()) + '</div><h2>ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + ' · ປະຈຳວັນທີ: <b>' + d + '</b></div></div>' +
  '<div class="tw"><table><thead><tr><th rowspan="2">ລ/ດ</th><th rowspan="2">ປະເພດລົດ</th><th colspan="3">ຕອນເຊົ້າ (ກ່ອນໃສ່ນ້ຳມັນ)</th><th colspan="3">ເບີກນ້ຳມັນໃສ່ລົດ</th><th rowspan="2">ລວມ<br>ໃນລົດ</th><th colspan="3">ຕອນແລງ (ຫຼັງເລີກວຽກ)</th><th rowspan="2">ຍອດນຳໃຊ້<br>ຕົວຈິງ</th><th rowspan="2">ຄົນຂັບ<br>ຮັບຮູ້</th><th rowspan="2">ໝາຍເຫດ</th></tr>' +
  '<tr><th>ຈ/ນ ກ່ອນໃສ່</th><th>ຮູບ</th><th>ແທກ</th><th>ຈຳນວນໃສ່</th><th>ແທກ</th><th>ຮູບ</th><th>ຮູບ</th><th>ແທກ</th><th>ຄ້າງຖັງ</th></tr></thead><tbody>' + (rows || '<tr><td colspan="15">ບໍ່ມີລົດ</td></tr>') + '</tbody>' +
  '<tfoot><tr><td colspan="5">ລວມຍອດຈ່າຍອອກມື້ນີ້ທັງໝົດ</td><td>' + L(t[0]) + '</td><td colspan="6">ລວມຍອດນຳໃຊ້ຕົວຈິງ</td><td>' + L(t[1]) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
  (S.tank ? '<p>ແທ່ງນ້ຳມັນ: ຮັບເຂົ້າ ' + L(S.tank.recv || 0) + ' · ຍອດເຫຼືອຕາມບັນຊີ ' + L(S.tank.bal) + ' · ແທກໄດ້ ' + L(S.tank.measured) + (S.tank.cm != null ? ' (' + S.tank.cm + ' cm)' : '') + '</p>' : '') +
  '<div class="sign"><div>ບໍລິຫານສະໜາມ<br><br><br>(..............................)</div><div>ຜູ້ອະນຸມັດ<br><br>' + (S.approved ? '✓ ອະນຸມັດ ' + when(S.approved.at) + '<br>( ' + esc(S.approved.name) + ' )' : '<span class="chip warn">ຍັງບໍ່ອະນຸມັດ</span><br>(..............................)') + '</div></div>' + exportBar() + '</section>';
}
function xlsReport() {
 var t = totals(), src = function (r) { return r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : 'ແທ່ງ'; };
 var rows = [[coName()], ['ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ'], ['ໂຄງການ: ' + siteObj().name + ' · ປະຈຳວັນທີ: ' + dmy(S.date)], [],
  ['ລ/ດ', 'ປະເພດລົດ', 'ກ່ອນເຕີມ (L)', 'ກ່ອນເຕີມ (cm)', 'ເຕີມ (L)', 'ເຕີມຈາກ', 'ຫຼັງເຕີມ (cm)', 'ລວມໃນລົດ (L)', 'ຕອນແລງ (cm)', 'ຄ້າງຖັງ (L)', 'ໃຊ້ຕົວຈິງ (L)', 'ຄົນຂັບຮັບຮູ້', 'ເວລາຮັບຮູ້', 'ໝາຍເຫດ']];
 S.rows.forEach(function (r, i) { rows.push([i + 1, r.name, r.L0, r.cm0, r.add, src(r), r.cm1, r.L1, r.cm2, r.L2, r.used, r.ack ? r.ack.name : r.rej ? 'ບໍ່ຍອມຮັບ: ' + r.rej.why : '', r.ack ? when(r.ack.at) : '', r.note || '']); });
 rows.push(['', 'ລວມຍອດຈ່າຍອອກມື້ນີ້', '', '', t[0], '', '', '', '', '', t[1]]);
 if (S.tank) rows.push([], ['ແທ່ງນ້ຳມັນ', 'ຮັບເຂົ້າ (L)', S.tank.recv || 0, 'ຍອດເຫຼືອຕາມບັນຊີ (L)', S.tank.bal, 'ແທກໄດ້ (L)', S.tank.measured]);
 rows.push([], ['ອະນຸມັດ', S.approved ? S.approved.name + ' · ' + when(S.approved.at) : 'ຍັງບໍ່ອະນຸມັດ']);
 exportXlsx('ໃບຕິດຕາມ ' + siteObj().name + ' ' + S.date, rows, [6, 20, 12, 12, 10, 10, 12, 14, 12, 12, 14, 22, 14, 24], [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }]);
}
function ledgerLoad() { var mine = MOD; api('ledger', { site: $('site').value }).then(function (r) { if (r.ok && MOD === mine) ledgerView(r.data); }); }
function ledgerView(rows) {
 LEDGER = rows; var tr = 0, to = 0;
 $('v').innerHTML = '<section class="card"><div class="rh">' + logoImg() + '<div class="muted">' + esc(coName()) + '</div><h2>ຕິດຕາມນ້ຳມັນລົງສະໜາມ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + '</div></div><div class="tw"><table><thead><tr><th>ລ/ດ</th><th>ວັນທີ</th><th>ຍອດຮັບ</th><th>ຍອດເບີກຈ່າຍ</th><th>ຍອດເຫຼືອ</th><th>ແທກແທ່ງໄດ້</th><th>ຕ່າງ</th><th>ສະຖານະ</th></tr></thead><tbody>' +
  rows.map(function (x, i) { tr += x.recv; to += x.out; var d = x.diff != null ? x.diff : null; return '<tr><td>' + (i + 1) + '</td><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (x.measured != null ? L(x.measured) : '') + '</td><td>' + (d != null ? (d > 0 ? '+' : '') + Math.round(d) + ' L' : '') + '</td><td>' + (x.approved ? '✓ ອະນຸມັດ' : 'ລໍຖ້າ') + '</td></tr>'; }).join('') +
  '</tbody><tfoot><tr><td colspan="2">ລວມຍອດ</td><td>' + L(tr) + '</td><td>' + L(to) + '</td><td>' + L(tr - to) + '</td><td colspan="3"></td></tr></tfoot></table></div>' + exportBar() + '</section>';
}
function xlsLedger() { /* ແບບຟອມ "ຕິດຕາມນ້ຳມັນລົງສະໜາມ": ລຳດັບ · ວັນທີ · ລາຍການ · ຫົວໜ່ວຍ · ຍອດຍົກມາ · ຮັບ · ເບີກຈ່າຍ · ເຫຼືອ · ໝາຍເຫດ */
 var pump = !siteObj().tank && !siteObj().meter, yrs = LEDGER.length ? LEDGER[0].date.slice(0, 4) + (LEDGER[LEDGER.length - 1].date.slice(0, 4) !== LEDGER[0].date.slice(0, 4) ? '-' + LEDGER[LEDGER.length - 1].date.slice(0, 4) : '') : '',
  rows = [['ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'], ['ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'], [coName()], ['ຕິດຕາມນ້ຳມັນລົງສະໜາມ ' + yrs], ['ໂຄງການ: ' + siteObj().name], ['ລຳດັບ', 'ວັນ,ເດືອນ,ປີ', 'ລາຍການ', 'ຫົວໜ່ວຍ', 'ຍອດຍົກມາ', 'ຍອດຮັບ', 'ຍອດເບີກຈ່າຍ', 'ຍອດເຫຼືອ', 'ໝາຍເຫດ']], n = 0, bal = 0, tr = 0, to = 0;
 LEDGER.forEach(function (x) {
  var note = x.measured != null ? 'ແທກແທ່ງໄດ້ ' + Math.round(x.measured) + ' L' + (x.diff != null ? ' (ຕ່າງ ' + (x.diff > 0 ? '+' : '') + Math.round(x.diff) + ')' : '') : x.mtr != null ? 'ມິເຕີ ' + x.mtr + (x.mused != null ? ' (ໃຊ້ ' + Math.round(x.mused) + (x.mdiff != null ? ', ຕ່າງ ' + (x.mdiff > 0 ? '+' : '') + Math.round(x.mdiff) : '') + ')' : '') : '', last = x.out > 0 ? 'out' : 'in';
  if (x.recv > 0) { bal += x.recv; tr += x.recv; rows.push([++n, dmy(x.date), pump ? 'ຊື້ນ້ຳມັນທີ່ປໍ້າ' : 'ຮັບນ້ຳມັນລົງສະໜາມເພີ່ມ', 'ລິດ', '', x.recv, '', bal, last === 'in' ? note : '']); }
  if (x.out > 0) { bal -= x.out; to += x.out; rows.push([++n, dmy(x.date), 'ຈ່າຍນ້ຳມັນອອກສະໜາມ', 'ລິດ', '', '', x.out, bal, note]); }
  if (!(x.recv > 0) && !(x.out > 0) && note) rows.push([++n, dmy(x.date), 'ແທກແທ່ງ', 'ລິດ', '', '', '', bal, note]);
 });
 for (var k = n; k < 32; k++) rows.push([k + 1, '', '', '', '', '', '', '', '']);
 rows.push(['', '', 'ລວມຍອດ', '', '', tr, to, tr - to, ''], [], ['', 'ຜູ້ຮັບຜິດຊອບສະໜາມ', '', '', '', '', '', 'ບັນຊີ / ຫ້ອງການ']);
 exportXlsx('ຕິດຕາມນ້ຳມັນ ' + siteObj().name, rows, [8, 14, 34, 10, 12, 12, 14, 12, 28], [0, 1, 2, 3, 4].map(function (r) { return { s: { r: r, c: 0 }, e: { r: r, c: 8 } }; }));
}
$('v').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || (MOD !== 'report' && MOD !== 'ledger')) return; if (b.id === 'pdf') exportPdf(); else if (b.id === 'xls') (MOD === 'report' ? xlsReport : xlsLedger)(); else if (b.dataset.ph && P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); });
