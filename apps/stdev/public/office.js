/* ໜ້າບໍລິຫານ / ຫົວໜ້າ / ຫ້ອງການ / ເຈົ້າຂອງ: ໃບເບີກ · ລາຍງານ (PDF, Excel) · ຍອດແທ່ງ · ຕັ້ງຄ່າ */
'use strict';
var I = null, S = null, P = {}, VIEW = 'sheet', USERS = [], PHK = null, DRV = [];
function drvName(ph) { var d = DRV.filter(function (x) { return x.phone === ph; })[0]; return d ? d.name : ph ? ph + ' (ບໍ່ພົບ/ປິດ)' : ''; }
var RN = { owner: 'ເຈົ້າຂອງ', head: 'ຫົວໜ້າສະໜາມ', admin: 'ບໍລິຫານສະໜາມ', office: 'ຫ້ອງການ', driver: 'ຄົນຂັບ', boss: 'ເຈົ້າຂອງ' };
function role() { return I.me.roles[$('site').value]; }
function isChief() { return role() === 'boss' || role() === 'head'; }
function canEdit() { return ['boss', 'head', 'admin'].indexOf(role()) >= 0 && !(S && S.approved); }
function here() { return { site: $('site').value, date: $('date').value }; }
function siteObj() { return I.cfg.sites.filter(function (s) { return s.id === $('site').value; })[0] || {}; }
function fillSites() { var cur = $('site').value; $('site').innerHTML = I.cfg.sites.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join(''); if (cur) $('site').value = cur; }

function start() {
 api('init').then(function (r) {
  if (!r.ok) return; I = r.data;
  if (I.me.role === 'driver') { location.href = 'driver.html'; return; }
  $('hd').innerHTML = header('ນ້ຳມັນສະໜາມ', I.me.name + ' · ' + (RN[I.me.role] || ''), I.hr ? '<button class="ic" id="hrb" aria-label="ST HR">' + ic('users') + '</button>' : ''); $('lo').onclick = logout; if ($('hrb')) $('hrb').onclick = openHr;
  $('date').value = today(); fillSites();
  api('drivers').then(function (d) { DRV = d.ok ? d.data : []; if (VIEW === 'assign') assignView(); });
  go(I.cfg.sites.length || !I.me.boss ? 'sheet' : 'cfg');
 });
}
function go(v) {
 VIEW = v; var any = !!$('site').value, tabs = [];
 if (any) tabs.push(['sheet', 'sheet', 'ໃບເບີກ'], ['report', 'report', 'ລາຍງານ'], ['ledger', 'ledger', 'ຍອດແທ່ງ']);
 if (any && (I.me.boss || Object.keys(I.me.roles).some(function (s) { return I.me.roles[s] === 'head'; }))) tabs.push(['assign', 'users', 'ມອບລົດ']);
 if (I.me.boss) tabs.push(['cfg', 'gear', 'ຕັ້ງຄ່າ']); tabs.push(['me', 'user', 'ຂ້ອຍ']);
 $('nav').innerHTML = tabs.map(function (t) { return '<button data-v="' + t[0] + '" aria-current="' + (t[0] === v) + '">' + ic(t[1]) + t[2] + '</button>'; }).join('');
 $('pick').classList.toggle('hide', !any || v === 'cfg' || v === 'me'); $('date').classList.toggle('hide', v === 'ledger' || v === 'assign');
 if (v === 'assign') return assignView();
 if (v === 'cfg') return cfgView(); if (v === 'me') return meView();
 if (!any) { $('v').innerHTML = '<div class="card" style="text-align:center">ເຈົ້າຍັງບໍ່ໄດ້ຖືກກຳນົດສະໜາມ — ຕິດຕໍ່ເຈົ້າຂອງ</div>'; return; }
 $('v').innerHTML = '<div class="skel"></div><div class="skel"></div>';
 if (v === 'ledger') return api('ledger', { site: $('site').value }).then(function (r) { if (r.ok) ledgerView(r.data); });
 api('sheet', here()).then(function (r) { if (!r.ok) return; S = r.data; P = {}; (v === 'report' ? reportView : sheetView)(); api('photos', here()).then(function (p) { if (p.ok) { P = p.data; v === 'report' ? reportView() : paintPhotos(); } }); });
}
$('nav').onclick = function (e) { var b = e.target.closest('button'); if (b) go(b.dataset.v); };
$('site').onchange = $('date').onchange = function () { go(VIEW); };

/* ===== ໃບເບີກ: ກອກແຕ່ cm — ລິດມາຈາກ server ===== */
function chip(r) {
 if (r.ack) return '<span class="chip ok">' + ic('check') + esc(r.ack.name) + ' ຮັບຮູ້ແລ້ວ ' + when(r.ack.at) + '</span>';
 if (r.rej) return '<span class="chip bad">' + ic('x') + esc(r.rej.name) + ' ບໍ່ຍອມຮັບ: ' + esc(r.rej.why || '-') + '</span>';
 return r.add != null ? '<span class="chip warn">ລໍຖ້າຄົນຂັບຮັບຮູ້</span>' : '<span class="chip">ຍັງບໍ່ໄດ້ເຕີມ</span>';
}
function calcHtml(r) {
 var w = (r.add != null && r.add < 0 ? '<span class="chip bad">ຫຼັງເຕີມ ໜ້ອຍກວ່າ ກ່ອນເຕີມ — ກວດຄືນ</span> ' : '') + (r.used != null && r.used < 0 ? '<span class="chip bad">ຕອນແລງ ຫຼາຍກວ່າ ຫຼັງເຕີມ — ກວດຄືນ</span> ' : '');
 return 'ກ່ອນເຕີມ ' + L(r.L0) + ' → ຫຼັງເຕີມ ' + L(r.L1) + '<br>ເຕີມຄັ້ງນີ້ <b>' + L(r.add) + '</b> · ຄ້າງຖັງຕອນແລງ ' + L(r.L2) + ' · ໃຊ້ຕົວຈິງ <b>' + L(r.used) + '</b><br>' + w + chip(r);
}
function tankHtml(t) { var d = t.measured != null ? t.measured - t.bal : null; return 'ຈ່າຍອອກມື້ນີ້ <b>' + L(t.out) + '</b> · ຍອດເຫຼືອຕາມບັນຊີ <b>' + L(t.bal) + '</b><br>ແທກແທ່ງໄດ້ ' + L(t.measured) + (d != null ? ' · ຕ່າງຈາກບັນຊີ <span class="chip ' + (Math.abs(d) > 20 ? 'bad' : 'ok') + '">' + (d > 0 ? '+' : '') + Math.round(d) + ' L</span>' : ''); }
function phBtns(keys) { return '<div class="ph">' + keys.map(function (k) { return '<button type="button" data-ph="' + k[0] + '" data-t="' + k[1] + '"></button>'; }).join('') + '</div>'; }
function paintPhotos() { document.querySelectorAll('[data-ph]').forEach(function (b) { var d = P[b.dataset.ph]; b.className = d ? 'has' : ''; b.innerHTML = (d ? '<img alt="" src="' + d + '">' : ic('cam')) + esc(b.dataset.t); }); }
function numIn(k, val, dis) { return '<input type="number" inputmode="decimal" min="0" step="0.1" data-k="' + k + '" value="' + (val == null ? '' : val) + '"' + (dis ? ' disabled' : '') + '>'; }
function sheetView() {
 var ed = canEdit(), h = '', n = 0;
 if (S.approved) h += '<div class="card dark row">' + ic('check') + '<div>ອະນຸມັດແລ້ວ ໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '</div></div>';
 if (!S.rows.length) h += '<div class="card" style="text-align:center">ສະໜາມນີ້ຍັງບໍ່ມີລົດ' + (I.me.boss ? ' — ເພີ່ມໃນ "ຕັ້ງຄ່າ"' : '') + '</div>';
 S.rows.forEach(function (r) {
  var lock = !ed || (r.ack && !isChief()); n++;
  h += '<section class="card" data-v="' + esc(r.v) + '" style="animation-delay:' + n * 60 + 'ms"><h2>' + ic('truck') + esc(r.name) + '</h2>' + (r.driver ? '<small class="muted">ຄົນຂັບ: ' + esc(drvName(r.driver)) + '</small>' : '<small class="chip warn">ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ</small>') + '<div class="g2" style="margin-top:8px">' +
   '<label class="f">ກ່ອນເຕີມ (cm)' + numIn('cm0', r.cm0, lock) + '</label><label class="f">ຫຼັງເຕີມ (cm)' + numIn('cm1', r.cm1, lock) + '</label>' +
   '<label class="f">ເຕີມຈາກ<select data-k="src"' + (lock ? ' disabled' : '') + '><option value="tank">ແທ່ງນ້ຳມັນ</option><option value="jug"' + (r.src === 'jug' ? ' selected' : '') + '>ຕຸກ (ພາໄປສະໜາມ)</option></select></label>' +
   '<label class="f">ຫຼັງເລີກວຽກ (cm)' + numIn('cm2', r.cm2, !ed) + '</label></div>' +
   '<label class="f" style="margin-top:8px">ໝາຍເຫດ<input type="text" data-k="note" maxlength="200" value="' + esc(r.note) + '"' + (ed ? '' : ' disabled') + '></label>' +
   '<div class="calc">' + calcHtml(r) + '</div>' + phBtns([[r.v + '_b', 'ກ່ອນເຕີມ'], [r.v + '_a', 'ຫຼັງເຕີມ'], [r.v + '_e', 'ຕອນແລງ']]) + '</section>';
 });
 if (S.tank) h += '<section class="card" data-tank="1"><h2>' + ic('drop') + 'ແທ່ງນ້ຳມັນຂອງສະໜາມ</h2><div class="g2"><label class="f">ຮັບນ້ຳມັນເຂົ້າມື້ນີ້ (ລິດ)' + numIn('recv', S.tank.recv, !ed) + '</label><label class="f">ແທກແທ່ງຫຼັງເລີກວຽກ (cm)' + numIn('cm', S.tank.cm, !ed) + '</label></div><div class="calc">' + tankHtml(S.tank) + '</div>' + phBtns([['tank', 'ຮູບແທກແທ່ງ']]) + '</section>';
 if (isChief() && S.rows.length) h += '<button id="appr" class="btn blk ' + (S.approved ? 'bad' : 'ok') + '">' + ic('check') + (S.approved ? 'ຍົກເລີກການອະນຸມັດ' : 'ອະນຸມັດໃບປະຈຳວັນ') + '</button>';
 $('v').innerHTML = h; paintPhotos();
}
/* ບັນທຶກທັນທີເມື່ອປ່ຽນຄ່າ: ປ່ຽນແຕ່ສ່ວນຄິດໄລ່ຂອງບັດນັ້ນ (ບໍ່ແຕ້ມໃໝ່ທັງໜ້າ → ບໍ່ເສຍ focus) */
$('v').addEventListener('change', function (e) {
 var k = e.target.dataset.k, sec = e.target.closest('section'); if (!k || !sec || VIEW !== 'sheet') return;
 var b = here(); b[k] = e.target.value; if (sec.dataset.v) b.v = sec.dataset.v;
 api(sec.dataset.v ? 'row' : 'tank', b).then(function (r) {
  if (!r.ok) return; S = r.data;
  document.querySelectorAll('section[data-v]').forEach(function (s) { var row = S.rows.filter(function (x) { return x.v === s.dataset.v; })[0], c = s.querySelector('.calc'); if (row && c) c.innerHTML = calcHtml(row); });
  var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank);
 });
});
$('v').addEventListener('click', function (e) {
 var b = e.target.closest('button'); if (!b) return;
 if (b.dataset.ph) { if (VIEW === 'sheet' && canEdit()) { PHK = b.dataset.ph; $('file').value = ''; $('file').click(); } else if (P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); return; }
 if (b.id === 'appr') { var a = here(); a.yes = S.approved ? 0 : 1; api('approve', a).then(function (r) { if (r.ok) { S = r.data; sheetView(); toast(a.yes ? 'ອະນຸມັດແລ້ວ' : 'ຍົກເລີກແລ້ວ', 'ok'); } }); return; }
 if (b.id === 'pdf') exportPdf(); if (b.id === 'xls') (VIEW === 'report' ? xlsReport : xlsLedger)();
 if (VIEW === 'cfg' || VIEW === 'me') cfgClick(b);
});
$('file').onchange = function () {
 var f = this.files[0], key = PHK; if (!f || !key) return;
 shrink(f).then(function (d) { var b = here(); b.key = key; b.data = d; api('photo', b).then(function (r) { if (r.ok) { P[key] = d; paintPhotos(); } }); }, function () { toast('ເປີດຮູບບໍ່ໄດ້', 'bad'); });
};

/* ===== ລາຍງານປະຈຳວັນ (ຮູບແບບ "ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ") ===== */
function pic(k) { return P[k] ? '<img alt="" src="' + P[k] + '">' : ''; }
function totals() { var a = 0, u = 0; S.rows.forEach(function (r) { a += r.add > 0 ? r.add : 0; u += r.used > 0 ? r.used : 0; }); return [a, u]; }
function exportBar() { return '<div class="row wrap noprint" style="margin-top:16px"><button class="btn" id="pdf">' + ic('pdf') + 'ສົ່ງອອກ PDF</button><button class="btn line" id="xls">' + ic('xls') + 'ສົ່ງອອກ Excel</button></div><p class="muted sm noprint">PDF: ໃນໜ້າຕ່າງພິມ ເລືອກ "Save as PDF" (ປິດ Headers and footers)</p>'; }
function reportView() {
 var t = totals(), d = dmy(S.date);
 var rows = S.rows.map(function (r, i) {
  return '<tr><td>' + (i + 1) + '</td><td class="l">' + esc(r.name) + '</td><td>' + L(r.L0) + '</td><td>' + pic(r.v + '_b') + '</td><td>' + (r.cm0 == null ? '' : r.cm0 + ' cm') + '</td><td><b>' + L(r.add) + '</b><br><small>' + (r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : 'ແທ່ງ') + '</small></td><td>' + (r.cm1 == null ? '' : r.cm1 + ' cm') + '</td><td>' + pic(r.v + '_a') + '</td><td>' + L(r.L1) + '</td><td>' + pic(r.v + '_e') + '</td><td>' + (r.cm2 == null ? '' : r.cm2 + ' cm') + '</td><td>' + L(r.L2) + '</td><td><b>' + L(r.used) + '</b></td><td>' + (r.ack ? '✓ ' + esc(r.ack.name) : r.rej ? '✗ ' + esc(r.rej.name) : '') + '</td><td class="l">' + esc(r.note) + '</td></tr>';
 }).join('');
 $('v').innerHTML = '<section class="card"><div class="rh"><div class="muted">' + esc(I.company || '') + '</div><h2>ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + ' · ປະຈຳວັນທີ: <b>' + d + '</b></div></div>' +
  '<div class="tw"><table><thead><tr><th rowspan="2">ລ/ດ</th><th rowspan="2">ປະເພດລົດ</th><th colspan="3">ຕອນເຊົ້າ (ກ່ອນໃສ່ນ້ຳມັນ)</th><th colspan="3">ເບີກນ້ຳມັນໃສ່ລົດ</th><th rowspan="2">ລວມ<br>ໃນລົດ</th><th colspan="3">ຕອນແລງ (ຫຼັງເລີກວຽກ)</th><th rowspan="2">ຍອດນຳໃຊ້<br>ຕົວຈິງ</th><th rowspan="2">ຄົນຂັບ<br>ຮັບຮູ້</th><th rowspan="2">ໝາຍເຫດ</th></tr>' +
  '<tr><th>ຈ/ນ ກ່ອນໃສ່</th><th>ຮູບ</th><th>ແທກ</th><th>ຈຳນວນໃສ່</th><th>ແທກ</th><th>ຮູບ</th><th>ຮູບ</th><th>ແທກ</th><th>ຄ້າງຖັງ</th></tr></thead><tbody>' + (rows || '<tr><td colspan="15">ບໍ່ມີລົດ</td></tr>') + '</tbody>' +
  '<tfoot><tr><td colspan="5">ລວມຍອດຈ່າຍອອກມື້ນີ້ທັງໝົດ</td><td>' + L(t[0]) + '</td><td colspan="6">ລວມຍອດນຳໃຊ້ຕົວຈິງ</td><td>' + L(t[1]) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
  (S.tank ? '<p>ແທ່ງນ້ຳມັນ: ຮັບເຂົ້າ ' + L(S.tank.recv || 0) + ' · ຍອດເຫຼືອຕາມບັນຊີ ' + L(S.tank.bal) + ' · ແທກໄດ້ ' + L(S.tank.measured) + (S.tank.cm != null ? ' (' + S.tank.cm + ' cm)' : '') + '</p>' : '') +
  '<div class="sign"><div>ບໍລິຫານສະໜາມ<br><br><br>(..............................)</div><div>ຫົວໜ້າສະໜາມ<br><br>' + (S.approved ? '✓ ອະນຸມັດ ' + when(S.approved.at) + '<br>( ' + esc(S.approved.name) + ' )' : '<span class="chip warn">ຍັງບໍ່ອະນຸມັດ</span><br>(..............................)') + '</div></div>' + exportBar() + '</section>';
}
function xlsReport() {
 var t = totals(), src = function (r) { return r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : 'ແທ່ງ'; };
 var rows = [[I.company || ''], ['ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ'], ['ໂຄງການ: ' + siteObj().name + ' · ປະຈຳວັນທີ: ' + dmy(S.date)], [],
  ['ລ/ດ', 'ປະເພດລົດ', 'ກ່ອນເຕີມ (L)', 'ກ່ອນເຕີມ (cm)', 'ເຕີມ (L)', 'ເຕີມຈາກ', 'ຫຼັງເຕີມ (cm)', 'ລວມໃນລົດ (L)', 'ຕອນແລງ (cm)', 'ຄ້າງຖັງ (L)', 'ໃຊ້ຕົວຈິງ (L)', 'ຄົນຂັບຮັບຮູ້', 'ເວລາຮັບຮູ້', 'ໝາຍເຫດ']];
 S.rows.forEach(function (r, i) { rows.push([i + 1, r.name, r.L0, r.cm0, r.add, src(r), r.cm1, r.L1, r.cm2, r.L2, r.used, r.ack ? r.ack.name : r.rej ? 'ບໍ່ຍອມຮັບ: ' + r.rej.why : '', r.ack ? when(r.ack.at) : '', r.note || '']); });
 rows.push(['', 'ລວມຍອດຈ່າຍອອກມື້ນີ້', '', '', t[0], '', '', '', '', '', t[1]]);
 if (S.tank) rows.push([], ['ແທ່ງນ້ຳມັນ', 'ຮັບເຂົ້າ (L)', S.tank.recv || 0, 'ຍອດເຫຼືອຕາມບັນຊີ (L)', S.tank.bal, 'ແທກໄດ້ (L)', S.tank.measured]);
 rows.push([], ['ອະນຸມັດ', S.approved ? S.approved.name + ' · ' + when(S.approved.at) : 'ຍັງບໍ່ອະນຸມັດ']);
 exportXlsx('ໃບຕິດຕາມ ' + siteObj().name + ' ' + S.date, rows, [6, 20, 12, 12, 10, 10, 12, 14, 12, 12, 14, 22, 14, 24], [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }]);
}
var LEDGER = [];
function ledgerView(rows) {
 LEDGER = rows; var tr = 0, to = 0;
 $('v').innerHTML = '<section class="card"><div class="rh"><div class="muted">' + esc(I.company || '') + '</div><h2>ຕິດຕາມນ້ຳມັນລົງສະໜາມ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + '</div></div><div class="tw"><table><thead><tr><th>ລ/ດ</th><th>ວັນທີ</th><th>ຍອດຮັບ</th><th>ຍອດເບີກຈ່າຍ</th><th>ຍອດເຫຼືອ</th><th>ແທກແທ່ງໄດ້</th><th>ຕ່າງ</th><th>ສະຖານະ</th></tr></thead><tbody>' +
  rows.map(function (x, i) { tr += x.recv; to += x.out; var d = x.measured != null ? x.measured - x.bal : null; return '<tr><td>' + (i + 1) + '</td><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (x.measured != null ? L(x.measured) : '') + '</td><td>' + (d != null ? (d > 0 ? '+' : '') + Math.round(d) + ' L' : '') + '</td><td>' + (x.approved ? '✓ ອະນຸມັດ' : 'ລໍຖ້າ') + '</td></tr>'; }).join('') +
  '</tbody><tfoot><tr><td colspan="2">ລວມຍອດ</td><td>' + L(tr) + '</td><td>' + L(to) + '</td><td>' + L(tr - to) + '</td><td colspan="3"></td></tr></tfoot></table></div>' + exportBar() + '</section>';
}
function xlsLedger() {
 var tr = 0, to = 0, rows = [[I.company || ''], ['ຕິດຕາມນ້ຳມັນລົງສະໜາມ'], ['ໂຄງການ: ' + siteObj().name], [], ['ລ/ດ', 'ວັນທີ', 'ຍອດຮັບ (L)', 'ຍອດເບີກຈ່າຍ (L)', 'ຍອດເຫຼືອ (L)', 'ແທກແທ່ງໄດ້ (L)', 'ຕ່າງ (L)', 'ສະຖານະ']];
 LEDGER.forEach(function (x, i) { tr += x.recv; to += x.out; rows.push([i + 1, dmy(x.date), x.recv || '', x.out || '', x.bal, x.measured == null ? '' : x.measured, x.measured == null ? '' : x.measured - x.bal, x.approved ? 'ອະນຸມັດ' : 'ລໍຖ້າ']); });
 rows.push(['', 'ລວມຍອດ', tr, to, tr - to]); exportXlsx('ຍອດແທ່ງ ' + siteObj().name, rows, [6, 14, 14, 16, 14, 16, 12, 12]);
}

/* ===== ມອບລົດ: ໃຜຂັບຄັນໃດ (ຫົວໜ້າສະໜາມ / ເຈົ້າຂອງ) ===== */
function assignView() {
 var site = $('site').value, cars = I.cfg.vehicles.filter(function (v) { return v.site === site; }), canSet = role() === 'boss' || role() === 'head';
 var opt = function (cur) { var o = [['', '— ຍັງບໍ່ມອບ —']].concat(DRV.map(function (d) { return [d.phone, d.name]; })); if (cur && !DRV.some(function (d) { return d.phone === cur; })) o.push([cur, drvName(cur)]); return opts(o, cur || ''); };
 var by = {}; cars.forEach(function (v) { if (v.driver) (by[v.driver] = by[v.driver] || []).push(v.name); });
 $('v').innerHTML = '<section class="card"><h2>' + ic('truck') + 'ມອບລົດໃຫ້ຄົນຂັບ</h2><small class="muted">ຄົນຂັບຈະເຫັນ ແລະ ຮັບຮູ້ສະເພາະລົດທີ່ມອບໃຫ້ເທົ່ານັ້ນ. ປ່ຽນແລ້ວມີຜົນທັນທີ.</small>' +
  (cars.map(function (v) { return '<div class="cr"><b>' + esc(v.name) + '</b><select data-asg="' + esc(v.id) + '" aria-label="ຄົນຂັບຂອງ ' + esc(v.name) + '"' + (canSet ? '' : ' disabled') + '>' + opt(v.driver) + '</select></div>'; }).join('') || '<p class="muted">ສະໜາມນີ້ຍັງບໍ່ມີລົດ</p>') + '</section>' +
  '<section class="card"><h2>' + ic('users') + 'ສະຫຼຸບ: ໃຜຂັບຄັນໃດ</h2>' + (Object.keys(by).map(function (p) { return '<div class="cr"><b>' + esc(drvName(p)) + '</b><span>' + by[p].map(esc).join(' · ') + '</span></div>'; }).join('') || '<p class="muted">ຍັງບໍ່ໄດ້ມອບລົດ</p>') + (DRV.length ? '' : '<p class="chip warn">ຍັງບໍ່ມີພະນັກງານໜ້າທີ່ "ຄົນຂັບ" — ເຈົ້າຂອງເພີ່ມໃນ ຕັ້ງຄ່າ → ພະນັກງານ</p>') + '</section>';
}
$('v').addEventListener('change', function (e) {
 var id = e.target.dataset.asg; if (!id) return;
 api('assign', { site: $('site').value, v: id, driver: e.target.value }).then(function (r) {
  if (!r.ok) { assignView(); return; }
  r.data.forEach(function (x) { I.cfg.vehicles.forEach(function (v) { if (v.id === x.id) v.driver = x.driver; }); });
  assignView(); toast('ມອບລົດແລ້ວ', 'ok');
 });
});

/* ===== ຂ້ອຍ: ປ່ຽນ PIN ===== */
function meView() {
 $('v').innerHTML = '<section class="card"><h2>' + ic('user') + esc(I.me.name) + '</h2><p class="muted">ເບີ ' + esc(I.me.phone) + ' · ' + (RN[I.me.role] || '') + '</p><h2>' + ic('lock') + 'ປ່ຽນ PIN</h2><div class="g2"><label class="f">PIN ເກົ່າ<input type="password" inputmode="numeric" maxlength="8" id="po" autocomplete="current-password"></label><label class="f">PIN ໃໝ່ (4-8 ຫຼັກ)<input type="password" inputmode="numeric" maxlength="8" id="pn" autocomplete="new-password"></label></div><button class="btn blk" id="pchg" style="margin-top:12px">ບັນທຶກ PIN ໃໝ່</button></section><div id="inst"></div><button class="btn bad blk" id="lo2" style="margin-top:12px">' + ic('out') + 'ອອກຈາກລະບົບ</button>';
 $('lo2').onclick = logout; installHint('inst');
}

/* ===== ຕັ້ງຄ່າ (ເຈົ້າຂອງ): ສະໜາມ + ຂະໜາດແທ່ງ · ລົດ + ຂະໜາດຖັງ + ຄົນຂັບ · ພະນັກງານ ===== */
function opts(list, sel) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
function tankIn(t) { t = t || { t: 'lpc' }; return '<div class="tk"><select data-c="tt" aria-label="ຮູບຊົງຖັງ">' + opts([['lpc', 'ລິດ ຕໍ່ 1 cm'], ['box', 'ຖັງສີ່ຫຼ່ຽມ'], ['hcyl', 'ຖັງກົມນອນ']], t.t) + '</select><input type="number" min="0" step="0.01" data-c="ta" value="' + (t.k || t.l || t.d || '') + '"><input type="number" min="0" step="0.01" data-c="tb" value="' + (t.w || t.len || '') + '"></div>'; }
function tankHint(row) { var t = row.querySelector('[data-c=tt]').value, a = row.querySelector('[data-c=ta]'), b = row.querySelector('[data-c=tb]'); a.placeholder = a.title = t === 'lpc' ? 'ລິດ/cm' : t === 'box' ? 'ຍາວ cm' : 'ເສັ້ນຜ່າກາງ cm'; b.placeholder = b.title = t === 'box' ? 'ກວ້າງ cm' : 'ຍາວ cm'; b.classList.toggle('hide', t === 'lpc'); }
function tankOut(row) { var t = row.querySelector('[data-c=tt]').value, a = row.querySelector('[data-c=ta]').value, b = row.querySelector('[data-c=tb]').value; return t === 'box' ? { t: t, l: a, w: b } : t === 'hcyl' ? { t: t, d: a, len: b } : { t: t, k: a }; }
var del = '<button type="button" class="btn bad" data-del="1">' + ic('trash') + 'ລຶບ</button>';
function cfgRow(kind, x) {
 var sites = I.cfg.sites.map(function (s) { return [s.id, s.name]; }), drv = [['', '— ເລືອກຄົນຂັບ —']].concat(USERS.filter(function (u) { return u.level === 'user' && u.fuel === 'driver' && u.active; }).map(function (u) { return [u.phone, u.name]; }));
 if (kind === 'site') return '<div class="cr" data-kind="site" data-id="' + esc(x.id) + '"><input type="text" data-c="name" placeholder="ຊື່ສະໜາມ / ໂຄງການ" value="' + esc(x.name) + '"><small class="muted">ຂະໜາດແທ່ງນ້ຳມັນ</small>' + tankIn(x.tank) + del + '</div>';
 return '<div class="cr" data-kind="car" data-id="' + esc(x.id) + '"><input type="text" data-c="name" placeholder="ຊື່ລົດ / ທະບຽນ" value="' + esc(x.name) + '"><div class="g2"><select data-c="site" aria-label="ສະໜາມ">' + opts(sites, x.site) + '</select><select data-c="driver" aria-label="ຄົນຂັບ">' + opts(drv, x.driver) + '</select></div><small class="muted">ຂະໜາດຖັງລົດ</small>' + tankIn(x.tank) + del + '</div>';
}
var LV = { superadmin: 'Super admin', admin: 'Admin', user: 'ຜູ້ໃຊ້' };
function userRow(u, isNew) {
 var sites = I.cfg.sites, lv = I.me.level, can = isNew || u.editable, lvl = u.level || 'user';
 var head = isNew ? '<div class="g2"><label class="f">ເບີໂທ<input type="tel" inputmode="tel" data-c="phone" placeholder="020…"></label><label class="f">ຊື່<input type="text" data-c="name" maxlength="60"></label></div>' : '<div class="row"><b class="grow">' + esc(u.name) + '</b><span class="muted sm">' + esc(u.phone) + '</span></div>';
 if (!can) return '<div class="cr" data-kind="ro">' + head + '<div class="row wrap"><span class="chip">' + LV[lvl] + '</span>' + (lvl !== 'user' ? '<span class="chip ok">ທຸກແອັບ</span>' : (u.fuel ? '<span class="chip ok">ນ້ຳມັນ: ' + (RN[u.fuel] || u.fuel) + '</span>' : '') + (u.hr ? '<span class="chip ok">HR</span>' : '')) + (u.active ? '' : '<span class="chip bad">ປິດ</span>') + '</div><small class="muted">ແກ້ໄດ້ໂດຍ Super admin ເທົ່ານັ້ນ</small></div>';
 var lvOpts = lv === 'superadmin' ? [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)'], ['admin', 'Admin (ທຸກແອັບ + ຈັດການຜູ້ໃຊ້)'], ['superadmin', 'Super admin (ທຸກຢ່າງ)']] : [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)']];
 return '<div class="cr" data-kind="user" data-phone="' + esc(u.phone || '') + '">' + head +
  '<div class="g2"><label class="f">ລະດັບ<select data-c="level">' + opts(lvOpts, lvl) + '</select></label><label class="f">' + (isNew ? 'PIN (4-8 ຫຼັກ)' : 'PIN ໃໝ່ (ຖ້າຈະປ່ຽນ)') + '<input type="password" inputmode="numeric" maxlength="8" data-c="pin" autocomplete="new-password"></label></div>' +
  '<div data-c="mods"><div class="g2"><label class="f">ແອັບນ້ຳມັນ<select data-c="fuel">' + opts([['', 'ບໍ່ໃຊ້'], ['driver', RN.driver], ['admin', RN.admin], ['head', RN.head], ['office', RN.office + ' (ເບິ່ງທຸກສະໜາມ)']], u.fuel || '') + '</select></label><label class="cks" style="align-self:end"><label><input type="checkbox" data-c="hr"' + (u.hr ? ' checked' : '') + '> ເຂົ້າ ST HR ໄດ້</label></label></div>' +
  '<div class="cks" data-c="sites"><small class="muted">ສະໜາມທີ່ດູແລ (ບໍລິຫານ / ຫົວໜ້າ)</small><br>' + sites.map(function (s) { return '<label><input type="checkbox" value="' + esc(s.id) + '"' + ((u.sites || []).indexOf(s.id) >= 0 ? ' checked' : '') + '> ' + esc(s.name) + '</label>'; }).join('') + '</div></div>' +
  '<small class="muted" data-c="allnote">Admin / Super admin ເຂົ້າໄດ້ທຸກແອັບ ແລະ ທຸກຟັງຊັນ</small>' +
  '<div class="row">' + (isNew ? '' : '<label class="cks"><label><input type="checkbox" data-c="active"' + (u.active === false ? '' : ' checked') + '> ເປີດໃຊ້</label></label>') + '<button type="button" class="btn grow" data-usave="1">' + ic('check') + (isNew ? 'ເພີ່ມພະນັກງານ' : 'ບັນທຶກ') + '</button></div></div>';
}
function cfgView() {
 $('v').innerHTML = '<div class="skel"></div>';
 api('userList').then(function (r) {
  USERS = r.ok ? r.data : []; var c = I.cfg;
  var sec = function (id, icn, title, hint, rows, add) { return '<section class="card"><h2>' + ic(icn) + title + '</h2><small class="muted">' + hint + '</small><div id="' + id + '">' + rows + '</div>' + (add ? '<button type="button" class="btn line" data-add="' + add + '" style="margin-top:8px">' + ic('plus') + 'ເພີ່ມ</button>' : '') + '</section>'; };
  $('v').innerHTML = '<section class="card"><label class="f">ຊື່ບໍລິສັດ (ສະແດງຫົວລາຍງານ)<input type="text" id="co" maxlength="100" value="' + esc(c.company) + '"></label></section>' + sec('cS', 'drop', '1. ສະໜາມ', 'ເພີ່ມສະໜາມ ແລ້ວກົດ "ບັນທຶກ" ກ່ອນ ຈຶ່ງເພີ່ມລົດ', c.sites.map(function (s) { return cfgRow('site', s); }).join(''), 'site') +
   sec('cV', 'truck', '2. ລົດ / ເຄື່ອງຈັກ', 'ຄົນຂັບ = ຜູ້ທີ່ຈະກົດຮັບຮູ້ໃນມືຖືຂອງຕົນ (ເພີ່ມພະນັກງານກ່ອນໃນຂໍ້ 3)', c.vehicles.map(function (v) { return cfgRow('car', v); }).join(''), 'car') +
   '<button id="csave" class="btn blk" style="margin-bottom:14px">' + ic('check') + 'ບັນທຶກ ສະໜາມ ແລະ ລົດ</button>' +
   sec('cU', 'users', '3. ພະນັກງານ (ບັນຊີກາງ — ໃຊ້ໄດ້ທຸກແອັບ)', 'ສ້າງຄັ້ງດຽວ ເລືອກໄດ້ວ່າເຂົ້າ ນ້ຳມັນ ແລະ/ຫຼື HR · ເຂົ້າລະບົບດ້ວຍເບີໂທ + PIN', USERS.map(function (u) { return userRow(u, false); }).join('') + userRow({}, true), '');
  document.querySelectorAll('#v .tk').forEach(function (t) { tankHint(t.parentNode); }); syncUsers();
 });
}
function syncUsers() { document.querySelectorAll('[data-kind=user]').forEach(function (r) { var q = function (c) { return r.querySelector('[data-c=' + c + ']'); }, adm = q('level').value !== 'user', f = q('fuel').value; q('mods').classList.toggle('hide', adm); q('allnote').classList.toggle('hide', !adm); q('sites').classList.toggle('hide', f !== 'admin' && f !== 'head'); }); }
$('v').addEventListener('change', function (e) { var c = e.target.dataset.c; if (c === 'tt') tankHint(e.target.closest('.cr')); if (c === 'level' || c === 'fuel') syncUsers(); });
function cfgRead() {
 var q = function (r, c) { return r.querySelector('[data-c=' + c + ']').value; }, all = function (id) { return Array.prototype.slice.call($(id).children).filter(function (x) { return x.dataset.kind; }); };
 return { company: $('co').value, sites: all('cS').map(function (r) { return { id: r.dataset.id, name: q(r, 'name'), tank: tankOut(r) }; }), vehicles: all('cV').map(function (r) { return { id: r.dataset.id, name: q(r, 'name'), site: q(r, 'site'), driver: q(r, 'driver'), tank: tankOut(r) }; }) };
}
function cfgClick(b) {
 if (b.id === 'pchg') { api('pin', { old: $('po').value, pin: $('pn').value }).then(function (r) { if (r.ok) { ls('fuel_tk', r.token); $('po').value = $('pn').value = ''; toast('ປ່ຽນ PIN ແລ້ວ', 'ok'); } }); return; }
 if (b.dataset.del) { b.closest('.cr').remove(); return; }
 if (b.dataset.add) { var k = b.dataset.add, box = b.previousElementSibling; box.insertAdjacentHTML('beforeend', cfgRow(k, { id: (k === 'site' ? 's' : 'v') + Math.random().toString(36).slice(2, 9) })); var r = box.lastElementChild; tankHint(r); return; }
 if (b.dataset.usave) {
  var row = b.closest('.cr'), g = function (c) { return row.querySelector('[data-c=' + c + ']'); }, ac = g('active');
  var u = { phone: row.dataset.phone || g('phone').value, name: g('name') ? g('name').value : undefined, level: g('level').value, fuel: g('fuel').value, hr: g('hr').checked, pin: g('pin').value, active: ac ? ac.checked : true, sites: Array.prototype.map.call(g('sites').querySelectorAll('input:checked'), function (x) { return x.value; }) };
  api('userSave', { user: u }).then(function (r) { if (r.ok) { toast('ບັນທຶກແລ້ວ', 'ok'); cfgView(); } }); return;
 }
 if (b.id === 'csave') {
  var sent = cfgRead(); api('cfgSave', { cfg: sent }).then(function (r) {
   if (!r.ok) return; I.company = r.data.company; var lost = sent.sites.length + sent.vehicles.length - r.data.sites.length - r.data.vehicles.length;
   api('init').then(function (i) { if (!i.ok) return; I = i.data; fillSites(); cfgView(); toast(lost ? 'ບັນທຶກແລ້ວ ແຕ່ ' + lost + ' ແຖວຖືກຂ້າມ (ຂາດຊື່ ຫຼື ຂະໜາດຖັງ)' : 'ບັນທຶກແລ້ວ', lost ? 'bad' : 'ok'); });
  });
 }
}
/* ສົ່ງຄິວຄົບແລ້ວ → ໂຫຼດໜ້າໃໝ່ (ຖ້າບໍ່ໄດ້ກຳລັງພິມຢູ່) */
document.addEventListener('synced', function () { var a = document.activeElement; if (VIEW !== 'cfg' && VIEW !== 'me' && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) go(VIEW); });
start();
