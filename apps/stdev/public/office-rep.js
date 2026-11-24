/* ໂມດູນລາຍງານ: ລາຍງານປະຈຳວັນ (ຮູບແບບ "ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ") · ຍອດແທ່ງ · ສົ່ງອອກ PDF / Excel */
'use strict';
function pic(k) { return P[k] ? '<img alt="" src="' + P[k] + '">' : ''; }
function coName() { return siteObj().company || I.company || ''; }
function letterhead() { /* ຫົວເອກະສານ: ສປປ ລາວ (ເປີດ/ປິດໄດ້) + ໂລໂກ້ + ຊື່ບໍລິສັດ + ທີ່ຢູ່/ເບີໂທ (ຂຽນເອງຕໍ່ສະໜາມ) */
 var s = siteObj(), h = '<div class="lh">';
 if (s.nat !== false) h += '<div class="lh-n"><b>ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</b><span>ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ</span></div>';
 return h + '<div class="lh-c">' + (s.logo ? '<img src="' + s.logo + '" alt="">' : '') + '<div class="lh-t"><b>' + esc(coName()) + '</b>' + (s.hdr ? '<div>' + esc(s.hdr).replace(/\n/g, '<br>') + '</div>' : '') + '</div></div></div>';
}
function logoImg() { var g = siteObj().logo; return g ? '<img src="' + g + '" alt="" style="max-height:64px;max-width:200px;display:block;margin:0 auto 6px">' : ''; }
function exportBar(o) { return '<div class="row wrap noprint" style="margin-top:16px"><button class="btn" id="pdf" data-o="' + o + '" aria-label="ບັນທຶກ PDF A4 ' + (o === 'p' ? 'ແນວຕັ້ງ' : 'ແນວນອນ') + '">' + ic('pdf') + 'PDF</button><button class="btn line" id="xls" aria-label="ບັນທຶກ Excel">' + ic('xls') + 'Excel</button></div>'; }
function reportView() { withSheet(true, function () { drawReport(); }); }
function rqParts(r) { /* ຄຳຂໍ → ອະນຸມັດ + ຂໍ້ສັງເກດ (ດ່ວນ / ເກີນ / ຄົນຂັບແທນ / ບໍ່ຍອມຮັບ) ເປັນຂໍ້ຄວາມ — ໃຊ້ຮ່ວມກັນໜ້າຈໍ ແລະ Excel */
 var q = r.rqi, p = [], SN = { tank: 'ແທ່ງ', jug: 'ຕຸກ', shop: 'ຊື້ປໍ້າ/ຮ້ານ' };
 if (q) { if (q.urgent) p.push('ເຕີມດ່ວນ ໂດຍ ' + q.by); else { p.push('ຂໍ ' + L(q.ask) + ' · ' + q.by); if (q.ok != null) p.push('ອະນຸມັດ ' + L(q.ok) + (q.src ? ' · ' + (SN[q.src] || q.src) + (r.shop ? ' ' + r.shop : '') : '')); } if (r.add != null && q.ok != null && r.add > q.ok + 0.05) p.push('ເຕີມເກີນ +' + Math.round(r.add - q.ok) + ' L (ຢູ່ໃນຄ່າເຜື່ອ)'); }
 if (r.sub) p.push('ຄົນຂັບແທນ: ' + (drvName(r.driver) || '–') + ' (ປະຈຳ: ' + (drvName(r.regular) || '–') + ')');
 if (r.rej) p.push('ຄົນຂັບບໍ່ຍອມຮັບ: ' + (r.rej.why || '-'));
 return p;
}
var ENT = { report: ['issue', 'tank', 'rq'], rqrep: ['rq', 'rqok'], ledger: ['tank'] }, ENTN = { report: 'ກອກຂໍ້ມູນໃບນີ້', rqrep: 'ກອກຂໍ້ມູນໃບຂໍ', ledger: 'ກອກຍອດແທ່ງ' };
function entryBar() { /* ລາຍງານ 3 ໃບ: ປຸ່ມໄປກອກຂໍ້ມູນທັນທີ (ບໍ່ຕ້ອງຫາໃນເມນູ) */
 var ids = ENT[MOD]; if (!ids) return ''; var l = ids.map(modOf).filter(function (m) { return m && m.show(); }); if (!l.length) return '';
 return '<div class="entbar noprint"><b>' + ic('edit') + esc(ENTN[MOD]) + '</b>' + l.map(function (m) { return '<button type="button" class="btn ok" data-go="' + m.id + '">' + ic(m.ic) + esc(m.t) + '</button>'; }).join('') + '</div>';
}
function drawReport() {
 var t = totals(), d = dmy(S.date);
 var rows = S.rows.map(function (r, i) {
  return '<tr><td>' + (i + 1) + '</td><td class="l">' + (modOf('issue') && modOf('issue').show() ? '<button type="button" class="rowfill" data-fillcar="' + esc(r.base || r.v) + '" title="ກອກຂໍ້ມູນລົດຄັນນີ້">' + esc(r.name) + '<i class="noprint">' + ic('edit') + '</i></button>' : esc(r.name)) + (r.h && r.h.length ? ' <small class="pm bad" title="' + esc(r.h.map(function (x) { return when(x.at) + ' ' + x.k + ' ' + x.from + '→' + x.to; }).join(' | ')) + '">ແກ້ ' + r.h.length + ' ຄັ້ງ</small>' : '') + '</td>' +
   '<td><b>' + L(r.L0) + '</b></td><td>' + pic(r.v + '_b') + '</td><td>' + pic(r.v + '_bg') + '</td><td>' + (r.cm0 == null ? '' : r.cm0) + '</td>' +
   '<td><b>' + L(r.add) + '</b><br><small>' + (r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : r.src === 'shop' ? 'ປໍ້າ' : 'ແທ່ງ') + '</small></td><td>' + pic(r.v + '_a') + '</td><td>' + pic(r.v + '_ag') + '</td><td>' + (r.cm1 == null ? '' : r.cm1) + '</td>' +
   '<td><b>' + L(r.L1) + '</b></td>' +
   '<td>' + pic(r.v + '_e') + '</td><td>' + pic(r.v + '_eg') + '</td><td>' + (r.cm2 == null ? '' : r.cm2) + '</td><td><b>' + L(r.L2) + '</b></td>' +
   '<td class="used"><b>' + L(r.used) + '</b></td><td>' + (r.ack ? '✓ ' + esc(r.ack.name) : r.rej ? '✗ ' + esc(r.rej.name) : '') + '</td><td class="l">' + rqParts(r).map(esc).join('<br>') + (r.note ? (rqParts(r).length ? '<br>' : '') + esc(r.note) : '') + '</td></tr>';
 }).join('');
 $('v').innerHTML = repTabs() + '<section class="card a4l"><div class="rh">' + letterhead() + '<h2>ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + ' · ປະຈຳວັນທີ: <b>' + d + '</b></div></div>' +
  '<div class="tw"><table class="fsheet"><thead><tr><th rowspan="2">ລ/ດ</th><th rowspan="2">ປະເພດລົດ</th><th colspan="4" class="gm">ຕອນເຊົ້າ (ກ່ອນໃສ່ນ້ຳມັນ)</th><th colspan="4" class="gf">ເບີກນ້ຳມັນໃສ່ລົດ</th><th rowspan="2">ຈຳນວນລວມ<br>ນ້ຳມັນໃນລົດ</th><th colspan="4" class="ge">ຕອນແລງ (ຫຼັງເລີກວຽກ)</th><th rowspan="2" class="gu">ຍອດນຳໃຊ້<br>ນ້ຳມັນຕົວຈິງ</th><th rowspan="2">ລາຍເຊັນ<br>ໂຊເຟີລົດ</th><th rowspan="2">ໝາຍເຫດ</th></tr>' +
  '<tr><th>ຈ/ນ ນ້ຳມັນ<br>ກ່ອນໃສ່ເພີ່ມ</th><th>ຮູບພາບ<br>(ແທກນ້ຳມັນ)</th><th>ຮູບພາບ<br>(ເຂັມນ້ຳມັນ)</th><th>ແທກເປັນ<br>ເຊັນ</th><th>ຈຳນວນ<br>ໃສ່ຄັ້ງນີ້</th><th>ຮູບພາບ<br>(ແທກນ້ຳມັນ)</th><th>ຮູບພາບ<br>(ເຂັມນ້ຳມັນ)</th><th>ແທກເປັນ<br>ເຊັນ</th><th>ຮູບພາບ<br>(ແທກນ້ຳມັນ)</th><th>ຮູບພາບ<br>(ເຂັມນ້ຳມັນ)</th><th>ແທກເປັນ<br>ເຊັນ</th><th>ຈ/ນ ນ້ຳມັນ<br>ຄ້າງຖັງ</th></tr></thead><tbody>' + (rows || '<tr><td colspan="16">ບໍ່ມີລົດ</td></tr>') + '</tbody>' +
  '<tfoot><tr><td colspan="6">ລວມຍອດຈ່າຍອອກມື້ນີ້ທັງໝົດ</td><td><b>' + L(t[0]) + '</b></td><td>' + pic('mtr') + '</td><td colspan="2"></td><td colspan="5">ລວມຍອດນຳໃຊ້ຕົວຈິງ</td><td class="used"><b>' + L(t[1]) + '</b></td><td colspan="2"></td></tr></tfoot></table></div>' +
  (S.tank ? '<p>ແທ່ງນ້ຳມັນ: ຮັບເຂົ້າ ' + L(S.tank.recv || 0) + ' · ຍອດເຫຼືອຕາມບັນຊີ ' + L(S.tank.bal) + ' · ແທກໄດ້ ' + L(S.tank.measured) + (S.tank.cm != null ? ' (' + S.tank.cm + ' cm)' : '') + '</p>' : '') +
  '<div class="sign"><div>ຜູ້ຂໍ<br><br><br>' + signBox(uniq((S.reqs || []).map(function (x) { return x.name; }))) + '</div><div>ຜູ້ອະນຸມັດຄຳຂໍ<br><br><br>' + signBox(rqSigners({ items: S.reqs || [] }), lastAt(S.reqs || [])) + '</div><div>ຜູ້ອະນຸມັດໃບປະຈຳວັນ<br><br>' + (S.approved ? '✓ ' + when(S.approved.at) + '<br>( ' + esc(S.approved.name) + ' )' : '<span class="chip warn">ຍັງບໍ່ອະນຸມັດ</span><br>(..............................)') + '</div></div>' + exportBar('l') + '</section>';
}
function xlsReport() {
 var t = totals(), src = function (r) { return r.add == null ? '' : r.src === 'jug' ? 'ຕຸກ' : r.src === 'shop' ? 'ຮ້ານ' + (r.shop ? ' ' + r.shop : '') : 'ແທ່ງ'; };
 var rows = [[coName()], ['ໃບຕິດຕາມ ຮັບ ແລະ ເບີກຈ່າຍນ້ຳມັນ ປະຈຳວັນ'], ['ໂຄງການ: ' + siteObj().name + ' · ປະຈຳວັນທີ: ' + dmy(S.date)], [],
  ['ລ/ດ', 'ປະເພດລົດ', 'ກ່ອນເຕີມ (L)', 'ກ່ອນເຕີມ (cm)', 'ເຕີມ (L)', 'ເຕີມຈາກ', 'ຫຼັງເຕີມ (cm)', 'ລວມໃນລົດ (L)', 'ຕອນແລງ (cm)', 'ຄ້າງຖັງ (L)', 'ໃຊ້ຕົວຈິງ (L)', 'ຄົນຂັບຮັບຮູ້', 'ເວລາຮັບຮູ້', 'ຄຳຂໍ → ອະນຸມັດ ແລະ ຂໍ້ສັງເກດ', 'ໝາຍເຫດ']];
 S.rows.forEach(function (r, i) { rows.push([i + 1, r.name, r.L0, r.cm0, r.add, src(r), r.cm1, r.L1, r.cm2, r.L2, r.used, r.ack ? r.ack.name : r.rej ? 'ບໍ່ຍອມຮັບ: ' + r.rej.why : '', r.ack ? when(r.ack.at) : '', rqParts(r).join(' | '), r.note || '']); });
 rows.push(['', 'ລວມຍອດຈ່າຍອອກມື້ນີ້', '', '', t[0], '', '', '', '', '', t[1]]);
 if (S.tank) rows.push([], ['ແທ່ງນ້ຳມັນ', 'ຮັບເຂົ້າ (L)', S.tank.recv || 0, 'ຍອດເຫຼືອຕາມບັນຊີ (L)', S.tank.bal, 'ແທກໄດ້ (L)', S.tank.measured]);
 rows.push([], ['ຜູ້ຂໍ', uniq((S.reqs || []).map(function (x) { return x.name; })).join(', ') || '..............'], ['ຜູ້ອະນຸມັດຄຳຂໍ', rqSigners({ items: S.reqs || [] }).join(', ') || '..............'], ['ຜູ້ອະນຸມັດໃບປະຈຳວັນ', S.approved ? S.approved.name + ' · ' + when(S.approved.at) : 'ຍັງບໍ່ອະນຸມັດ']);
 exportXlsx('ໃບຕິດຕາມ ' + siteObj().name + ' ' + S.date, rows, [6, 20, 12, 12, 10, 10, 12, 14, 12, 12, 14, 22, 14, 40, 24], [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }]);
}
function rqRepView() { withSheet(false, function () { drawRqRep(); }); }
var SNm = { tank: 'ແທ່ງ', jug: 'ຕຸກ', shop: 'ຊື້ປໍ້າ/ຮ້ານ' }, STm = { pending: 'ລໍອະນຸມັດ', approved: 'ອະນຸມັດ (ລໍເຕີມ)', rejected: 'ຕີກັບ', cancel: 'ຍົກເລີກ', filling: 'ກຳລັງເຕີມ', done: 'ເຕີມແລ້ວ' };
var RQH = ['ລ/ດ', 'ລົດ / ເຄື່ອງຈັກ', 'ເຫຼືອໃນລົດ (L)', 'ຂໍ (L)', 'ອະນຸມັດ (L)', 'ແຫຼ່ງ', 'ເຕີມຈິງ (L)', 'ສະຖານະ', 'ໝາຍເຫດ'];
function rqLine(x, i) { /* ແຖວຂອງແບບຟອມໃບຂໍ: ໃຊ້ຮ່ວມກັນລະຫວ່າງໜ້າຈໍ ແລະ Excel */
 var o = x.ok || {}, l = S.left && S.left[x.v], st = STm[x.state] || x.state;
 return [i + 1, x.car, l && l.L != null ? Math.round(l.L) : '', x.urgent ? 'ດ່ວນ' : x.lit, o.lit != null ? o.lit : '', (SNm[o.src] || '') + (o.shop ? ' ' + o.shop : ''), x.fill != null ? x.fill : '', st + (x.why ? ': ' + x.why : ''), x.note || ''];
}
function signBox(names, at) { return (names && names.length ? '( ' + esc(names.join(', ')) + ' )' : '(..............................)') + (names && names.length && at ? '<br><small>' + when(at) + '</small>' : ''); }
function uniq(l) { var a = {}; l.forEach(function (x) { if (x) a[x] = 1; }); return Object.keys(a); }
function lastAt(items) { return items.reduce(function (m, x) { return Math.max(m, x.ok && x.ok.at || 0); }, 0); }
function rqSigners(g) { var a = {}; g.items.forEach(function (x) { if (x.ok && x.ok.name) a[x.ok.name] = 1; }); return Object.keys(a); }
function rqRepView() { withSheet(false, function () { drawRqRep(); }); }
function drawRqRep() {
 if (!rqSite()) { $('v').innerHTML = repTabs() + '<div class="card empty">ສະໜາມນີ້ຍັງບໍ່ເປີດໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ (ຕັ້ງຄ່າ → ສະໜາມ)</div>'; return; }
 var gs = rqGroups(S.reqs || []);
 $('v').innerHTML = repTabs() + '<section class="card a4p"><div class="rh">' + letterhead() + '<h2>ແບບຟອມໃບຂໍເບີກນ້ຳມັນ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + ' · ວັນທີ: <b>' + dmy(S.date) + '</b></div></div>' +
  (gs.length ? gs.map(function (g, gi) { var ap = rqSigners(g), sa = 0, sf = 0; g.items.forEach(function (x) { if (x.ok && x.ok.lit != null) sa += x.ok.lit; if (x.fill != null) sf += x.fill; });
   return '<div class="rqsheet"><h3 style="margin:14px 0 6px">' + (g.no ? 'ໃບຂໍເບີກ ເລກທີ ' + g.no : 'ຄຳຂໍ') + ' · ຜູ້ຂໍ: ' + esc(g.by) + ' · ' + when(g.at) + '</h3>' + (g.note ? '<p class="muted sm" style="margin:0 0 6px">ໃຊ້ເຮັດ: ' + esc(g.note) + '</p>' : '') +
    '<div class="tw"><table><thead><tr>' + RQH.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + g.items.map(function (x, i) { return '<tr>' + rqLine(x, i).map(function (c, k) { return '<td' + (k === 1 || k === 5 || k === 7 || k === 8 ? ' class="l"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody><tfoot><tr><td colspan="3">ລວມ ' + g.items.length + ' ຄັນ</td><td>' + L(g.items.reduce(function (t, x) { return t + (x.lit || 0); }, 0)) + '</td><td>' + L(sa) + '</td><td></td><td>' + L(sf) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
    '<div class="sign"><div>ວິຊາການ / ຜູ້ຂໍ<br><br><br>' + signBox([g.by], g.at) + '</div><div>ຜູ້ອະນຸມັດ<br><br><br>' + signBox(ap, lastAt(g.items)) + '</div><div>ຄົນຂັບ<br><br><br>' + signBox(uniq(g.items.map(function (x) { return S.drv && S.drv[x.v] ? drvName(S.drv[x.v].d) : ''; }))) + '</div></div></div>';
  }).join('') : '<div class="empty" style="padding:14px">ບໍ່ມີໃບຂໍມື້ນີ້</div>') + exportBar('p') + '</section>';
}
function xlsRqRep() {
 var rows = [[coName()], ['ແບບຟອມໃບຂໍເບີກນ້ຳມັນ'], ['ໂຄງການ: ' + siteObj().name + ' · ວັນທີ: ' + dmy(S.date)]], merges = [0, 1, 2].map(function (r) { return { s: { r: r, c: 0 }, e: { r: r, c: 8 } }; });
 rqGroups(S.reqs || []).forEach(function (g) {
  rows.push([], [(g.no ? 'ໃບຂໍເບີກ ເລກທີ ' + g.no : 'ຄຳຂໍ') + ' · ຜູ້ຂໍ: ' + g.by + ' · ' + when(g.at) + (g.note ? ' · ໃຊ້ເຮັດ: ' + g.note : '')], RQH);
  g.items.forEach(function (x, i) { rows.push(rqLine(x, i)); });
  rows.push(['', 'ລວມ ' + g.items.length + ' ຄັນ', '', g.items.reduce(function (t, x) { return t + (x.lit || 0); }, 0), g.items.reduce(function (t, x) { return t + (x.ok && x.ok.lit != null ? x.ok.lit : 0); }, 0), '', g.items.reduce(function (t, x) { return t + (x.fill || 0); }, 0)], ['ຜູ້ຂໍ: ' + g.by, '', 'ຜູ້ອະນຸມັດ: ' + (rqSigners(g).join(', ') || '..............'), '', 'ຄົນຂັບ: ' + (uniq(g.items.map(function (x) { return S.drv && S.drv[x.v] ? drvName(S.drv[x.v].d) : ''; })).join(', ') || '..............')]);
 });
 exportXlsx('ໃບຂໍນ້ຳມັນ ' + siteObj().name + ' ' + S.date, rows, [6, 22, 14, 10, 12, 18, 12, 24, 24], merges);
}
var ADJ = [];
var ADJH = ['ເວລາແກ້', 'ວັນທີຂອງໃບ', 'ຜູ້ແກ້', 'ລາຍການ', 'ເດີມ', 'ໃໝ່', 'ເຫດຜົນ'];
function adjRow(x) { var f = function (v) { return !v ? '–' : v.txt != null ? v.txt : L(v.lit) + (v.from ? ' · ' + v.from : '') + (v.note ? ' · ' + v.note : ''); }; return [when(x.at), dmy(x.date), x.name, x.kind === 'row' ? 'ແກ້ cm ເຕີມລົດ · ' + x.car : x.kind === 'void' ? 'ຍົກເລີກການຮັບເຂົ້າແຫ່ງ' : 'ແກ້ການຮັບເຂົ້າແຫ່ງ', f(x.from), x.kind === 'void' ? '–' : f(x.to), x.reason]; }
function adjLoad() { var mine = MOD; api('adjlog', { site: $('site').value }).then(function (r) { if (r.ok && MOD === mine) adjView(r.data); }); }
function adjView(list) {
 ADJ = list;
 $('v').innerHTML = repTabs() + '<section class="card a4l"><div class="rh">' + letterhead() + '<h2>ລາຍງານການປັບປຸງ (ແກ້ໄຂຍອດຮັບເຂົ້າແທ່ງ)</h2><div>ໂຄງການ: ' + esc(siteObj().name) + ' · ສຳລັບ Admin / ເຈົ້າຂອງ</div></div><div class="tw"><table><thead><tr>' + ADJH.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
  (list.length ? list.map(function (x) { return '<tr>' + adjRow(x).map(function (c, i) { return '<td' + (i === 2 || i === 4 || i === 5 || i === 6 ? ' class="l"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="7">ຍັງບໍ່ມີການແກ້ໄຂ</td></tr>') + '</tbody></table></div>' + exportBar('l') + '</section>';
}
function xlsAdj() { exportXlsx('ການປັບປຸງ ' + siteObj().name, [[coName()], ['ລາຍງານການປັບປຸງ (ແກ້ໄຂຍອດຮັບເຂົ້າແທ່ງ)'], ['ໂຄງການ: ' + siteObj().name], [], ADJH].concat(ADJ.map(adjRow)), [20, 14, 22, 16, 30, 30, 36], [0, 1, 2].map(function (r) { return { s: { r: r, c: 0 }, e: { r: r, c: 6 } }; })); }
function ledgerLoad() { var mine = MOD; api('ledger', { site: $('site').value }).then(function (r) { if (r.ok && MOD === mine) ledgerView(r.data); }); }
function ledgerView(rows) {
 LEDGER = rows; var tr = 0, to = 0;
 $('v').innerHTML = repTabs() + '<section class="card a4p"><div class="rh">' + letterhead() + '<h2>ຕິດຕາມນ້ຳມັນລົງສະໜາມ</h2><div>ໂຄງການ: ' + esc(siteObj().name) + '</div></div><div class="tw"><table><thead><tr><th>ລ/ດ</th><th>ວັນທີ</th><th>ຍອດຮັບ</th><th>ຍອດເບີກຈ່າຍ</th><th>ຍອດເຫຼືອ</th><th>ແທກແທ່ງໄດ້</th><th>ຕ່າງ</th><th>ສະຖານະ</th></tr></thead><tbody>' +
  rows.map(function (x, i) { tr += x.recv; to += x.out; var d = x.diff != null ? x.diff : null; return '<tr><td>' + (i + 1) + '</td><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (x.measured != null ? L(x.measured) : '') + '</td><td>' + (d != null ? (d > 0 ? '+' : '') + Math.round(d) + ' L' : '') + '</td><td>' + (x.approved ? '✓ ອະນຸມັດ' : x.idle ? '–' : 'ລໍຖ້າ') + '</td></tr>'; }).join('') +
  '</tbody><tfoot><tr><td colspan="2">ລວມຍອດ</td><td>' + L(tr) + '</td><td>' + L(to) + '</td><td>' + L(tr - to) + '</td><td colspan="3"></td></tr></tfoot></table></div>' + exportBar('p') + '</section>';
}
function xlsLedger() { /* ແບບຟອມ "ຕິດຕາມນ້ຳມັນລົງສະໜາມ": ລຳດັບ · ວັນທີ · ລາຍການ · ຫົວໜ່ວຍ · ຍອດຍົກມາ · ຮັບ · ເບີກຈ່າຍ · ເຫຼືອ · ໝາຍເຫດ */
 var pump = !siteObj().tank && !siteObj().meter, yrs = LEDGER.length ? LEDGER[0].date.slice(0, 4) + (LEDGER[LEDGER.length - 1].date.slice(0, 4) !== LEDGER[0].date.slice(0, 4) ? '-' + LEDGER[LEDGER.length - 1].date.slice(0, 4) : '') : '',
  rows = [['ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'], ['ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'], [coName()], ['ຕິດຕາມນ້ຳມັນລົງສະໜາມ ' + yrs], ['ໂຄງການ: ' + siteObj().name], ['ລຳດັບ', 'ວັນ,ເດືອນ,ປີ', 'ລາຍການ', 'ຫົວໜ່ວຍ', 'ຍອດຍົກມາ', 'ຍອດຮັບ', 'ຍອດເບີກຈ່າຍ', 'ຍອດເຫຼືອ', 'ໝາຍເຫດ']], n = 0, bal = 0, tr = 0, to = 0;
 LEDGER.forEach(function (x) {
  var note = x.measured != null ? 'ແທກແທ່ງໄດ້ ' + Math.round(x.measured) + ' L' + (x.diff != null ? ' (ຕ່າງ ' + (x.diff > 0 ? '+' : '') + Math.round(x.diff) + ')' : '') : x.mtr != null ? 'ມິເຕີ ' + x.mtr + (x.mused != null ? ' (ໃຊ້ ' + Math.round(x.mused) + (x.mdiff != null ? ', ຕ່າງ ' + (x.mdiff > 0 ? '+' : '') + Math.round(x.mdiff) : '') + ')' : '') : '', last = x.out > 0 ? 'out' : 'in';
  if (x.recv > 0) { bal += x.recv; tr += x.recv; rows.push([++n, dmy(x.date), pump ? 'ຊື້ນ້ຳມັນທີ່ປໍ້າ' : 'ຮັບນ້ຳມັນລົງສະໜາມເພີ່ມ', 'ລິດ', '', x.recv, '', bal, last === 'in' ? note : '']); }
  if (x.shop > 0) rows.push([++n, dmy(x.date), 'ເຕີມຈາກຮ້ານ/ປໍ້າອື່ນ (ບໍ່ຫັກແທ່ງ)', 'ລິດ', '', '', '', bal, x.shop + ' L']);
  if (x.out > 0) { bal -= x.out; to += x.out; rows.push([++n, dmy(x.date), 'ຈ່າຍນ້ຳມັນອອກສະໜາມ', 'ລິດ', '', '', x.out, bal, note]); }
  if (!(x.recv > 0) && !(x.out > 0) && note) rows.push([++n, dmy(x.date), 'ແທກແທ່ງ', 'ລິດ', '', '', '', bal, note]);
 });
 for (var k = n; k < 32; k++) rows.push([k + 1, '', '', '', '', '', '', '', '']);
 rows.push(['', '', 'ລວມຍອດ', '', '', tr, to, tr - to, ''], [], ['', 'ຜູ້ຮັບຜິດຊອບສະໜາມ', '', '', '', '', '', 'ບັນຊີ / ຫ້ອງການ']);
 exportXlsx('ຕິດຕາມນ້ຳມັນ ' + siteObj().name, rows, [8, 14, 34, 10, 12, 12, 14, 12, 28], [0, 1, 2, 3, 4].map(function (r) { return { s: { r: r, c: 0 }, e: { r: r, c: 8 } }; }));
}
$('v').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || (MOD !== 'report' && MOD !== 'ledger' && MOD !== 'rqrep' && MOD !== 'adjrep')) return; if (b.id === 'pdf') exportPdf(b.dataset.o); else if (b.id === 'xls') ({ report: xlsReport, ledger: xlsLedger, rqrep: xlsRqRep, adjrep: xlsAdj })[MOD](); else if (b.dataset.ph && P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); });

/* ===== ໂທລະສັບ: ລາຍງານສະແດງເປັນ "ໜ້າ A4" ຍ່ໍໃຫ້ພໍດີຈໍ (ເບິ່ງ/ຊູມ ຄືເປີດ PDF) ແທນຕາຕະລາງຖືກບີບ — ບໍ່ຕ້ອງດາວໂຫຼດຈຶ່ງເບິ່ງໄດ້ ===== */
var PZ = 1; /* ຊູມປັດຈຸບັນ: 1 = ພໍດີຈໍ */
function paperize() {
 var v = $('v'), s = v.firstElementChild;
 if (!s || !/\bcard\b/.test(s.className) || !/\ba4[lp]\b/.test(s.className) || s.querySelector('.pv') || window.innerWidth > 900) return;
 var land = /\ba4l\b/.test(s.className), W = land ? 1123 : 794, pv = document.createElement('div'); pv.className = 'pv';
 pv.innerHTML = '<div class="pv-bar noprint"><span class="muted sm pv-hint">A4 ' + (land ? '↔' : '↕') + '</span><span class="grow"></span><button type="button" class="btn line" data-pz="-" aria-label="ຫຍໍ້">−</button><button type="button" class="btn line" data-pz="0">ພໍດີຈໍ</button><button type="button" class="btn line" data-pz="+" aria-label="ຂະຫຍາຍ">+</button></div><div class="pv-scroll"><div class="pv-sheet" style="width:' + W + 'px"></div></div>';
 var sheet = pv.querySelector('.pv-sheet');
 [].slice.call(s.children).forEach(function (c) { if (!c.classList.contains('noprint')) sheet.appendChild(c); });
 s.insertBefore(pv, s.firstChild); fitPaper(pv);
}
function fitPaper(pv) {
 var sc = pv.querySelector('.pv-scroll'), sh = pv.querySelector('.pv-sheet');
 if (window.innerWidth > 900) { sh.style.transform = 'none'; sh.style.width = 'auto'; sc.style.height = 'auto'; return; }
 var land = pv.closest('.a4l') != null, W = land ? 1123 : 794; sh.style.width = W + 'px';
 var k = (pv.clientWidth / W) * PZ; sh.style.transformOrigin = '0 0'; sh.style.transform = 'scale(' + k + ')';
 sc.style.height = Math.min(sh.offsetHeight * k + 2, Math.round(window.innerHeight * 0.8)) + 'px';
}
new MutationObserver(function () { paperize(); }).observe($('v'), { childList: true });
window.addEventListener('resize', function () { document.querySelectorAll('.pv').forEach(fitPaper); paperize(); });
$('v').addEventListener('click', function (e) {
 var b = e.target.closest('[data-pz]'); if (!b) return; var z = b.dataset.pz; PZ = z === '0' ? 1 : z === '+' ? Math.min(4, PZ * 1.5) : Math.max(1, PZ / 1.5);
 document.querySelectorAll('.pv').forEach(fitPaper);
});
