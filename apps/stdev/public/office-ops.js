/* ໂມດູນປະຕິບັດການ: ພາບລວມ · ເບີກ & ຈ່າຍນ້ຳມັນ · ຮັບເຂົ້າແທ່ງ & ແທກ · ຮັບຮູ້ & ອະນຸມັດ — ພະນັກງານກອກແຕ່ cm, ລິດມາຈາກ server */
'use strict';
function chip(r) {
 if (r.ack) return '<span class="chip ok">' + ic('check') + esc(r.ack.name) + ' ຮັບຮູ້ແລ້ວ ' + when(r.ack.at) + '</span>';
 if (r.rej) return '<span class="chip bad">' + ic('x') + esc(r.rej.name) + ' ບໍ່ຍອມຮັບ: ' + esc(r.rej.why || '-') + '</span>';
 return r.add != null ? '<span class="chip warn">ລໍຖ້າຄົນຂັບຮັບຮູ້</span>' : '<span class="chip">ຍັງບໍ່ໄດ້ເຕີມ</span>';
}
function gapHtml(r) { /* ສ່ວນຕ່າງຂ້າມຄືນ: ກ່ອນເຕີມມື້ນີ້ ທຽບ ຫຼັງເລີກວຽກມື້ກ່ອນ (ຍັງຕ້ອງແທກກ່ອນເຕີມທຸກຄັ້ງ) */
 if (!r.prev) return ''; var big = r.gap != null && Math.abs(r.gap) > Tank.GAP;
 return '<div class="gap">ມື້ວານ (' + dmy(r.prev.date) + ') ຫຼັງເລີກວຽກ ' + r.prev.cm2 + ' cm = ' + L(r.prev.L2) + (r.gap != null ? ' · ຕ່າງ <span class="chip ' + (big ? 'bad' : 'ok') + '">' + (r.gap > 0 ? '+' : '') + Math.round(r.gap) + ' L</span>' + (big ? ' <b style="color:#b4361f">ກວດຄືນ: ນ້ຳມັນເພີ່ມ/ຫາຍໃນຄືນ</b>' : '') : ' · <span class="muted">ແທກ ກ່ອນເຕີມ ເພື່ອເບິ່ງສ່ວນຕ່າງ</span>') + '</div>';
}
function calcHtml(r) {
 var w = (r.add != null && r.add < 0 ? '<span class="chip bad">ຫຼັງເຕີມ ໜ້ອຍກວ່າ ກ່ອນເຕີມ — ກວດຄືນ</span> ' : '') + (r.used != null && r.used < 0 ? '<span class="chip bad">ຕອນແລງ ຫຼາຍກວ່າ ຫຼັງເຕີມ — ກວດຄືນ</span> ' : '');
 return gapHtml(r) + 'ກ່ອນເຕີມ ' + L(r.L0) + ' → ຫຼັງເຕີມ ' + L(r.L1) + '<br>ເຕີມຄັ້ງນີ້ <b>' + L(r.add) + '</b> · ຄ້າງຖັງຕອນແລງ ' + L(r.L2) + ' · ໃຊ້ຕົວຈິງ <b>' + L(r.used) + '</b><br>' + w + chip(r);
}
function tol() { var v = siteObj().tol; return v == null ? 20 : v; } /* ເກນເຕືອນຕັ້ງຕໍ່ສະໜາມ (ຕັ້ງຄ່າ → ສະໜາມ) */
function cmOn() { return false; } /* ບໍ່ແທກ cm ຫຼັງເລີກວຽກແລ້ວ: ໃຊ້ມິເຕີ ຫຼື ຊື້ທີ່ປໍ້າ */
function tankHtml(t) { if (!cmOn() && t.meter) { var m = t.mused, d = t.mdiff; return 'ຮັບເຂົ້າແທ່ງ <b>' + L(t.recv || 0) + '</b> · ຈ່າຍຕາມໃບເບີກ <b>' + L(t.out) + '</b> · ຍອດເຫຼືອຕາມບັນຊີ <b>' + L(t.bal) + '</b><br>ມິເຕີ: ' + (t.mtr != null ? '<b>' + t.mtr + '</b>' : '–') + (t.mprev != null ? ' (ຄັ້ງກ່ອນ ' + t.mprev + ')' : '') + (m != null ? ' → ນັບໄດ້ <b>' + L(m) + '</b>' : '') + (d != null ? ' · ຕ່າງຈາກໃບເບີກ <span class="chip ' + (Math.abs(d) > tol() ? 'bad' : 'ok') + '">' + (d > 0 ? '+' : '') + Math.round(d) + ' L</span>' : '') + (m != null && m < 0 ? '<br><small>ເລກມິເຕີນ້ອຍກວ່າຄັ້ງກ່ອນ — ກວດເລກ (ຫຼື ມິເຕີວົນຮອບ)</small>' : ''); }
  if (!cmOn()) { var r = t.recv || 0, x = r - t.out; return 'ຊື້ມື້ນີ້ <b>' + L(r) + '</b> · ຈ່າຍອອກມື້ນີ້ <b>' + L(t.out) + '</b><br>ຕ່າງ (ຊື້ − ຈ່າຍ) <span class="chip ' + (Math.abs(x) > tol() ? 'bad' : 'ok') + '">' + (x > 0 ? '+' : '') + Math.round(x) + ' L</span> · ຍອດຄ້າງສະສົມ <b>' + L(t.bal) + '</b>' + (Math.abs(x) > tol() ? '<br><small>ຊື້ກັບຈ່າຍບໍ່ເທົ່າກັນ — ກວດໃບຊື້ ແລະ ລິດທີ່ເບີກ</small>' : ''); } var d = t.diff != null ? t.diff : null; return 'ຈ່າຍອອກມື້ນີ້ <b>' + L(t.out) + '</b> · ຍອດເຫຼືອຕາມບັນຊີ <b>' + L(t.bal) + '</b><br>ແທກແທ່ງໄດ້ ' + L(t.measured) + (d != null ? ' · ຕ່າງຈາກບັນຊີ <span class="chip ' + (Math.abs(d) > tol() ? 'bad' : 'ok') + '">' + (d > 0 ? '+' : '') + Math.round(d) + ' L</span>' : ''); }
function phBtns(keys) { return '<div class="ph">' + keys.map(function (k) { return '<button type="button" data-ph="' + k[0] + '" data-t="' + k[1] + '"></button>'; }).join('') + '</div>'; }
function paintPhotos() { document.querySelectorAll('[data-ph]').forEach(function (b) { var d = P[b.dataset.ph]; b.className = d ? 'has' : ''; var m = PM[b.dataset.ph], late = m && m.taken && m.at - m.taken > 18e5, bad = m && (m.how === 'file' || late); b.innerHTML = (d ? '<img alt="" src="' + d + '">' : ic('cam')) + esc(b.dataset.t) + (d && m ? '<small class="pm' + (bad ? ' bad' : '') + '">' + when(m.at) + ' ' + esc(m.name || '') + (m.how === 'file' ? ' · ຈາກຄັງ' : '') + (late ? ' · ອັບຊ້າ' : '') + '</small>' : ''); }); }
function numIn(k, val, dis) { return '<input type="number" inputmode="decimal" min="0" step="0.1" data-k="' + k + '" value="' + (val == null ? '' : val) + '"' + (dis ? ' disabled' : '') + '>'; }
function totals() { var a = 0, u = 0; S.rows.forEach(function (r) { a += r.add > 0 && r.src !== 'shop' ? r.add : 0; u += r.used > 0 ? r.used : 0; }); return [a, u]; } /* ເບີກ = ຫັກຈາກແທ່ງ (ບໍ່ນັບທີ່ເຕີມຮ້ານອື່ນ) */
function approvedBanner() { return S.approved ? '<div class="card dark row">' + ic('shield') + '<div>ອະນຸມັດແລ້ວ ໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '<br><small style="opacity:.75">ໃບນີ້ຖືກລັອກ — ແກ້ບໍ່ໄດ້ຈົນກວ່າຈະຍົກເລີກການອະນຸມັດ</small>' + (R('approve') ? '<br><button type="button" class="btn line" id="unappr" style="margin-top:8px;min-height:44px">' + ic('x') + 'ຍົກເລີກການອະນຸມັດ ເພື່ອແກ້ໄຂ</button>' : '') + '</div></div>' : ''; }
function noCars() { return '<div class="card empty"><div class="logo">' + ic('truck') + '</div>ສະໜາມນີ້ຍັງບໍ່ມີລົດ' + (I.me.boss ? '<br><button class="btn line" data-go="cfg" style="margin-top:10px">ໄປ ຕັ້ງຄ່າ ສະໜາມ & ລົດ</button>' : '') + '</div>'; }
function driverTag(r) { return r.driver ? '<small class="muted">ຄົນຂັບ: ' + esc(drvName(r.driver) || '–') + '</small>' : '<small class="chip warn">ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ</small>'; }

/* ===== ພາບລວມ ===== */
function dashView() {
 var mine = MOD;
 withSheet(false, function () {
  api('ledger', { site: $('site').value }).then(function (r) {
   if (MOD !== mine) return; LEDGER = r.ok ? r.data : [];
   var n = S.rows.length, filled = S.rows.filter(function (x) { return x.add != null; }), acked = filled.filter(function (x) { return x.ack; }).length, pct = filled.length ? Math.round(acked * 100 / filled.length) : 0, t = totals(), tk = S.tank;
   var todo = [], add = function (tone, icn, title, sub, go) { todo.push('<button class="todo ' + tone + '" data-go="' + go + '"><span class="ti">' + ic(icn) + '</span><span><b>' + title + '</b><small>' + sub + '</small></span><span class="go">' + ic('next') + '</span></button>'); };
   if (S.approved) add('ok', 'shield', 'ໃບມື້ນີ້ອະນຸມັດແລ້ວ', 'ໂດຍ ' + esc(S.approved.name) + ' · ' + when(S.approved.at), 'report');
   var rqm = rqSite(), reqs = S.reqs || [], qPend = reqs.filter(function (x) { return x.state === 'pending'; }).length, qWait = reqs.filter(function (x) { return x.state === 'approved'; }).length, lim = !['view', 'issue', 'tank', 'approve'].some(hasRight);
   if (rqm && qPend && hasRight('reqOk')) add('warn', 'check', qPend + ' ຄຳຂໍລໍອະນຸມັດ', 'ເລືອກແຫຼ່ງ (ແທ່ງ / ຊື້ປໍ້າ) ແລ້ວອະນຸມັດ', 'rqok');
   if (rqm && qWait && hasRight('issue')) add('warn', 'pump', qWait + ' ຄຳຂໍອະນຸມັດແລ້ວ ລໍເຕີມເຂົ້າລົດ', 'ກົດ "ເລີ່ມເຕີມ"', 'issue');
   var noFill = 0;
   S.rows.forEach(function (x) {
    if (rqm && !x.rqi && x.cm0 == null && x.cm1 == null) return;
    if (x.gap != null && Math.abs(x.gap) > Tank.GAP) add('warn', 'drop', esc(x.name) + ': ກ່ອນເຕີມຕ່າງຈາກມື້ວານ ' + (x.gap > 0 ? '+' : '') + Math.round(x.gap) + ' L', 'ກວດນ້ຳມັນເພີ່ມ/ຫາຍໃນຄືນ', hasRight('issue') ? 'issue' : 'appr');
    if (x.rej) add('bad', 'alert', esc(x.name) + ': ຄົນຂັບບໍ່ຍອມຮັບ', esc(x.rej.name) + ' — ' + esc(x.rej.why || '-'), hasRight('issue') ? 'issue' : 'appr');
    else if (x.add == null) noFill++;
    else if (!x.ack) add('warn', 'user', 'ລໍຖ້າ ' + esc(drvName(x.driver) || 'ຄົນຂັບ') + ' ຮັບຮູ້', esc(x.name) + ' · ເຕີມ ' + L(x.add), 'appr');
   });
   if (noFill) add('warn', 'edit', noFill + ' ຄັນ ຍັງບໍ່ໄດ້ເຕີມ / ບັນທຶກ cm', 'ກົດເພື່ອເລືອກລົດ ແລ້ວກອກ', hasRight('issue') ? 'issue' : 'appr');
   if (!S.approved && n && canApprove() && filled.length && acked === filled.length) add('ok', 'check', 'ພ້ອມອະນຸມັດໃບປະຈຳວັນ', 'ຄົນຂັບຮັບຮູ້ຄົບ ' + acked + ' ຄັນ', 'appr');
   if (tk && tk.mdiff != null && Math.abs(tk.mdiff) > tol()) add('warn', 'drop', 'ມິເຕີຕ່າງຈາກໃບເບີກ ' + (tk.mdiff > 0 ? '+' : '') + Math.round(tk.mdiff) + ' L', 'ກວດເລກມິເຕີ / ການເບີກ', 'tank');
   if (tk && tk.diff != null && Math.abs(tk.diff) > tol()) add('warn', 'drop', 'ແທ່ງແທກໄດ້ຕ່າງຈາກບັນຊີ ' + (tk.diff > 0 ? '+' : '') + Math.round(tk.diff) + ' L', 'ກວດການຮັບເຂົ້າ / ການຈ່າຍ', 'tank');
   var cnt = { rq: reqs.filter(function (x) { return x.state === 'pending'; }).length, rqok: qPend, issue: qWait, appr: filled.length - acked }, qa = ['rq', 'rqok', 'tank', 'issue', 'appr', 'report'].map(modOf).filter(function (m) { return m && m.show(); }).map(function (m) { return '<button class="fn" data-go="' + m.id + '">' + ic(m.ic) + '<b>' + esc(m.t) + '</b>' + (cnt[m.id] ? '<i class="nb">' + cnt[m.id] + '</i>' : '') + '</button>'; }).join('');
   if (lim) { $('v').innerHTML = (qa ? '<div class="fns">' + qa + '</div>' : '') + '<section class="card"><h2>' + ic('ledger') + 'ຄຳຂໍຂອງຂ້ອຍມື້ນີ້</h2>' + (reqs.map(function (x) { return rqItem(x); }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຄຳຂໍ</div>') + '</section>'; return; }
   $('v').innerHTML = (qa ? '<div class="fns">' + qa + '</div>' : '') + '<div class="stats"><div class="stat-card dark"><div><small>ຄົນຂັບຮັບຮູ້ແລ້ວ</small><b>' + acked + '<span>/' + filled.length + ' ຄັນ</span></b></div><div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span></div></div>' +
    '<div class="stat-card" style="animation-delay:60ms"><small>ເບີກລວມ</small><b>' + L(t[0]) + '</b></div><div class="stat-card" style="animation-delay:120ms"><small>ໃຊ້ຕົວຈິງ</small><b>' + L(t[1]) + '</b></div><div class="stat-card" style="animation-delay:180ms"><small>ແທ່ງເຫຼືອ (ບັນຊີ)</small><b>' + (tk ? L(tk.bal) : '–') + '</b></div></div>' +
    '<section class="card"><h2>' + ic('alert') + 'ຕ້ອງເຮັດ / ຕິດຕາມ</h2>' + (todo.join('') || '<div class="empty" style="padding:14px">ບໍ່ມີລາຍການຄ້າງ</div>') + '</section>' +
    '<section class="card"><h2>' + ic('truck') + 'ສະຖານະລົດມື້ນີ້</h2>' + (n ? '<div class="tw"><table class="mini"><thead><tr><th>ລົດ</th><th>ຄົນຂັບ</th><th>ເຕີມ</th><th>ສະຖານະ</th></tr></thead><tbody>' + S.rows.map(function (x) { return '<tr><td class="l"><b>' + esc(x.name) + '</b></td><td class="l">' + esc(drvName(x.driver) || '–') + '</td><td>' + L(x.add) + '</td><td class="l">' + chip(x) + '</td></tr>'; }).join('') + '</tbody></table></div>' : noCars().replace('class="card empty"', 'class="empty"')) + '</section>';
  });
 });
}

/* ===== ເບີກ & ຈ່າຍນ້ຳມັນ (ຕໍ່ລົດ) ===== */
function issueView() { withSheet(true, function (ph) { if (ph) return paintPhotos(); drawIssue(); }); }
var CARSEL = '', RQCAR = '';
function drvSelect(r) { /* ຄົນຂັບຂ້ອຍ ບໍ່ມາ → ປ່ຽນຄົນຂັບໄດ້ທັນທີ (ຕ້ອງມີສິດ ມອບລົດ) */
 if (!R('assign') || !DRV.length) return driverTag(r);
 var o = [['', '— ຍັງບໍ່ມອບ —']].concat(DRV.map(function (d) { return [d.phone, d.name]; })); if (r.driver && !DRV.some(function (d) { return d.phone === r.driver; })) o.push([r.driver, drvName(r.driver)]);
 return '<label class="f" style="margin-top:6px">ຄົນຂັບ<select data-asgi="' + esc(r.v) + '">' + opts(o, r.driver || '') + '</select></label>';
}
/* ===== ຄຳຂໍນ້ຳມັນ: ວິຊາການຂໍ → ບໍລິຫານອະນຸມັດ (ແຫຼ່ງ + ລິດ) → ເຕີມເຂົ້າລົດ → ຄົນຂັບຮັບຮູ້ ===== */
var SRCN = { tank: 'ເບີກຈາກແທ່ງ', shop: 'ຈັດຊື້ທີ່ປໍ້າ / ຮ້ານ', jug: 'ຕຸກ (ພາໄປສະໜາມ)' };
function rqChip(x) {
 var s = x.state, o = x.ok || {};
 return s === 'pending' ? '<span class="chip warn">ລໍອະນຸມັດ</span>' : s === 'approved' ? '<span class="chip ok">ອະນຸມັດ ' + (o.lit != null ? L(o.lit) : '') + ' · ' + (SRCN[o.src] || '') + (o.shop ? ' (' + esc(o.shop) + ')' : '') + ' — ລໍເຕີມ</span>' : s === 'filling' ? '<span class="chip warn">ກຳລັງເຕີມ</span>' : s === 'done' ? '<span class="chip ok">ເຕີມແລ້ວ ' + L(x.fill) + '</span>' : s === 'rejected' ? '<span class="chip bad">ປະຕິເສດ: ' + esc(x.why || '-') + '</span>' : '<span class="chip">ຍົກເລີກ</span>';
}
function rqItem(x, acts) { return '<div class="cr" data-rq="' + esc(x.id) + '"><div class="row wrap"><b class="grow">' + ic('truck') + ' ' + esc(x.car) + '</b><span class="muted sm">' + (x.lit != null ? 'ຂໍ ' + L(x.lit) : 'ເຕີມດ່ວນ') + '</span></div><small class="muted">' + esc(x.name) + ' · ' + when(x.at) + (x.note ? ' · ' + esc(x.note) : '') + '</small><div>' + rqChip(x) + (x.urgent ? ' <span class="chip bad">ດ່ວນ</span>' : '') + '</div>' + (acts || '') + '</div>'; }
function siteCars() { return I.cfg.vehicles.filter(function (v) { return v.site === $('site').value; }); }
function carOpts() { return siteCars().map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join(''); }
function srcOpts(sel) { return ['tank', 'shop', 'jug'].map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + SRCN[k] + '</option>'; }).join(''); }
function rqOff() { return '<div class="card empty">ສະໜາມນີ້ຍັງບໍ່ເປີດໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ' + (I.me.boss ? '<br><button class="btn line" data-go="staff" style="margin-top:10px">ໄປ ຕັ້ງຄ່າ → ສະໜາມ ແລ້ວເປີດ "ໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ"</button>' : '') + '</div>'; }
function rqView() { withSheet(false, function () { drawRq(); }); }
function drawRq() {
 if (!rqSite()) { $('v').innerHTML = rqOff(); return; }
 if (!RQCAR && siteCars().length === 1) RQCAR = siteCars()[0].id; if (RQCAR && !siteCars().some(function (v) { return v.id === RQCAR; })) RQCAR = '';
 var h = approvedBanner(), reqs = S.reqs || [];
 h += '<section class="card"><h2>' + ic('edit') + 'ຂໍນ້ຳມັນ</h2><p class="hint">ເລືອກລົດ / ເຄື່ອງຈັກ ແລະ ຈຳນວນລິດທີ່ຈະໃຊ້ → ສົ່ງໃຫ້ບໍລິຫານອະນຸມັດ</p>' +
  '<div class="f">ລົດ / ເຄື່ອງຈັກ ' + (RQCAR ? '<span class="chip ok">ເລືອກແລ້ວ</span>' : '<span class="chip warn">ແຕະເລືອກລົດ</span>') + '</div>' + (siteCars().length > 8 ? '<label class="f noprint"><input type="text" id="rqq" placeholder="ຄົ້ນຫາລົດ…" autocomplete="off"></label>' : '') + '<div class="carlist" id="rqlist">' + siteCars().map(function (v) { return '<button type="button" class="carrow" data-rqpick="' + esc(v.id) + '" data-n="' + esc(v.name.toLowerCase()) + '" aria-pressed="' + (v.id === RQCAR) + '"><span class="grow"><b>' + esc(v.name) + '</b><small>' + (v.driver ? 'ຄົນຂັບ: ' + esc(drvName(v.driver) || '–') : '') + '</small></span>' + (v.id === RQCAR ? ic('check') : '') + '</button>'; }).join('') + '</div>' +
  '<label class="f" style="margin-top:8px">ຈຳນວນລິດທີ່ຂໍ<input type="number" inputmode="decimal" min="0" id="rqlit" placeholder="ເຊັ່ນ 200"></label>' +
  '<div class="row wrap" style="margin-top:8px">' + [50, 100, 200, 300].map(function (n) { return '<button type="button" class="btn line" data-qlit="' + n + '" style="min-height:40px">' + n + '</button>'; }).join('') + '</div>' +
  '<label class="f" style="margin-top:8px">ໃຊ້ເຮັດຫຍັງ / ໝາຍເຫດ<input type="text" id="rqnote" maxlength="200" placeholder="ເຊັ່ນ ຂຸດດິນ ແປງ 3"></label>' +
  '<button type="button" class="btn ok blk" id="rqsend" style="margin-top:12px">' + ic('check') + 'ສົ່ງຄຳຂໍ</button></section>' +
  '<section class="card"><h2>' + ic('ledger') + 'ຄຳຂໍມື້ນີ້ (' + reqs.length + ')</h2>' + (reqs.map(function (x) { return rqItem(x, x.state === 'pending' ? '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn line" data-rqcancel="' + esc(x.id) + '" style="min-height:40px">ຍົກເລີກຄຳຂໍ</button></div>' : ''); }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຄຳຂໍ</div>') + '</section>';
 $('v').innerHTML = h;
}
function rqokView() { withSheet(false, function () { drawRqok(); }); }
function drawRqok() {
 if (!rqSite()) { $('v').innerHTML = rqOff(); return; }
 var h = approvedBanner(), reqs = S.reqs || [], pend = reqs.filter(function (x) { return x.state === 'pending'; }), wait = reqs.filter(function (x) { return x.state === 'approved'; }), rest = reqs.filter(function (x) { return x.state !== 'pending' && x.state !== 'approved'; });
 h += '<section class="card"><h2>' + ic('check') + 'ຄຳຂໍທີ່ລໍອະນຸມັດ (' + pend.length + ')</h2>' + (pend.map(function (x) {
  return rqItem(x, '<div class="g2" style="margin-top:8px"><label class="f">ອະນຸມັດ (ລິດ)<input type="number" inputmode="decimal" min="0" data-f="lit" value="' + esc(x.lit) + '"></label><label class="f">ແຫຼ່ງ<select data-f="src">' + srcOpts('tank') + '</select></label></div>' +
   '<label class="f hide" data-shopf="1" style="margin-top:8px">ຊື່ຮ້ານ / ປໍ້າ ທີ່ຈັດຊື້<input type="text" data-f="shop" maxlength="60"></label>' +
   '<div class="row wrap" style="margin-top:10px"><button type="button" class="btn ok grow" data-rqapprove="' + esc(x.id) + '">' + ic('check') + 'ອະນຸມັດ</button><button type="button" class="btn line" data-rqreject="' + esc(x.id) + '">ປະຕິເສດ</button></div>');
 }).join('') || '<div class="empty" style="padding:14px">ບໍ່ມີຄຳຂໍທີ່ລໍ</div>') + '</section>';
 if (wait.length) h += '<section class="card"><h2>' + ic('pump') + 'ອະນຸມັດແລ້ວ — ລໍເຕີມ (' + wait.length + ')</h2>' + wait.map(function (x) { return rqItem(x, '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn line" data-rqcancel="' + esc(x.id) + '" style="min-height:40px">ຍົກເລີກ (ບໍ່ເຕີມແລ້ວ)</button></div>'); }).join('') + '</section>';
 if (rest.length) h += '<section class="card"><h2>' + ic('ledger') + 'ມື້ນີ້ ຜ່ານໄປແລ້ວ (' + rest.length + ')</h2>' + rest.map(function (x) { return rqItem(x); }).join('') + '</section>';
 $('v').innerHTML = h;
}
function rqIssueTop(ed) {
 var w = (S.reqs || []).filter(function (x) { return x.state === 'approved'; }), h = '';
 if (w.length) h += '<section class="card"><h2>' + ic('check') + 'ອະນຸມັດແລ້ວ — ລໍເຕີມ (' + w.length + ')</h2>' + w.map(function (x) { var o = x.ok || {}; return rqItem(x, ed ? '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn ok grow" data-rqstart="' + esc(x.id) + '">' + ic('pump') + 'ເລີ່ມເຕີມ ' + (o.lit != null ? L(o.lit) : '') + '</button></div>' : ''); }).join('') + '</section>';
 if (ed && hasRight('urgent')) h += '<details class="card noprint"><summary><b>ເຕີມດ່ວນ (ບໍ່ມີຄຳຂໍ)</b></summary><p class="hint">ໃຊ້ໃນກໍລະນີຮີບ — ລະບົບບັນທຶກເປັນ "ເຕີມດ່ວນ" ຕິດຊື່ຜູ້ເຮັດ</p><label class="f">ລົດ<select id="uqcar">' + carOpts() + '</select></label><div class="g2" style="margin-top:8px"><label class="f">ແຫຼ່ງ<select id="uqsrc">' + srcOpts('tank') + '</select></label><label class="f">ຊື່ຮ້ານ / ປໍ້າ<input type="text" id="uqshop" maxlength="60"></label></div><button type="button" class="btn ok blk" id="rqurgent" style="margin-top:10px">' + ic('pump') + 'ເລີ່ມເຕີມດ່ວນ</button></details>';
 return h;
}
function carStat(r) { /* ສະຖານະຂອງລົດ 1 ຄັນ (ລວມທຸກຮອບ) — ບອກດ້ວຍຕົວໜັງສື ບໍ່ໃຊ້ສີຢ່າງດຽວ */
 var ids = S.rows.filter(function (x) { return x.v === r.v || x.base === r.v; }), any = ids.some(function (x) { return x.add != null; }), add = ids.reduce(function (t, x) { return t + (x.add > 0 ? x.add : 0); }, 0);
 return ids.some(function (x) { return x.rej; }) ? ['bad', 'ຄົນຂັບບໍ່ຍອມຮັບ'] : !any ? ['', 'ຍັງບໍ່ໄດ້ເຕີມ'] : ids.every(function (x) { return x.add == null || x.ack; }) ? ['ok', 'ຮັບຮູ້ແລ້ວ ' + L(add)] : ['warn', 'ລໍຮັບຮູ້ ' + L(add)];
}
function carList(bases, attr) { /* ລາຍການລົດໃຫ້ແຕະເລືອກ: ຊື່ · ຄົນຂັບ · ສະຖານະ */
 return (bases.length > 8 ? '<label class="f noprint">ຄົ້ນຫາລົດ<input type="text" id="carq" placeholder="ພິມຊື່ / ທະບຽນລົດ" autocomplete="off"></label>' : '') + '<div class="carlist" id="carlist">' + bases.map(function (r) { var st = carStat(r); return '<button type="button" class="carrow" ' + attr + '="' + esc(r.v) + '" data-n="' + esc(r.name.toLowerCase()) + '"><span class="grow"><b>' + esc(r.name) + '</b><small>' + (r.driver ? 'ຄົນຂັບ: ' + esc(drvName(r.driver) || '–') : 'ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ') + '</small></span><span class="chip ' + st[0] + '">' + st[1] + '</span>' + ic('next', 'muted') + '</button>'; }).join('') + '</div>';
}
function drawIssue() {
 var ed = canEdit(), h = approvedBanner(), n = 0, rqm = rqSite();
 var rows = rqm ? S.rows.filter(function (x) { return x.rqi || x.cm0 != null || x.cm1 != null || x.ack || x.rej; }) : S.rows; /* ສະໜາມທີ່ໃຊ້ຄຳຂໍ: ສະແດງສະເພາະລົດທີ່ມີການເຕີມ */
 if (rqm) h += rqIssueTop(ed && hasRight('issue'));
 if (!S.rows.length) h += noCars(); else if (rqm && !rows.length) h += '<p class="hint">ຍັງບໍ່ມີການເຕີມ — ເມື່ອມີຄຳຂໍທີ່ອະນຸມັດແລ້ວ ກົດ "ເລີ່ມເຕີມ" ຢູ່ດ້ານເທິງ.</p>';
 var bases = rows.filter(function (x) { return !x.base; });
 var many = bases.length > 2; if (!many) CARSEL = ''; if (CARSEL && !bases.some(function (x) { return x.v === CARSEL; })) CARSEL = '';
 if (many && !CARSEL) h += '<section class="card"><h2>' + ic('truck') + 'ເລືອກລົດ (' + bases.length + ' ຄັນ)</h2><p class="hint">ແຕະລົດຄັນທີ່ຈະກອກ cm / ເຕີມ</p>' + carList(bases, 'data-pickcar') + '</section>';
 if (many && CARSEL) { var bi = bases.map(function (x) { return x.v; }).indexOf(CARSEL); h += '<div class="row noprint" style="margin-bottom:10px"><button type="button" class="btn line" data-pickcar="">‹ ທຸກຄັນ</button><span class="grow"></span>' + (bi > 0 ? '<button type="button" class="btn line" data-pickcar="' + esc(bases[bi - 1].v) + '">‹ ກ່ອນໜ້າ</button>' : '') + (bi < bases.length - 1 ? '<button type="button" class="btn line" data-pickcar="' + esc(bases[bi + 1].v) + '">ຄັນຕໍ່ໄປ ›</button>' : '') + '</div>'; }
 (many && !CARSEL ? [] : CARSEL ? rows.filter(function (x) { return x.v === CARSEL || x.base === CARSEL; }) : rows).forEach(function (r) {
  var lock = !ed || (r.ack && !isChief()), rd = r.round > 1, bid = r.base || r.v, last = !S.rows.some(function (x) { return x.base === bid && x.round > r.round; }), srcLock = lock || (!!r.rqi && !isChief()); n++;
  var qi = r.rqi ? '<div class="chips" style="margin:6px 0 0">' + (r.rqi.urgent ? '<span class="chip bad">ເຕີມດ່ວນ</span>' : '<span class="chip">ຂໍ ' + L(r.rqi.ask) + ' · ' + esc(r.rqi.by) + '</span>') + (r.rqi.ok != null ? '<span class="chip ok">ອະນຸມັດ ' + L(r.rqi.ok) + '</span>' : '') + '<span class="chip">' + esc(SRCN[r.src] || '') + '</span>' + (r.rqi.ok != null && r.add != null && Math.abs(r.add - r.rqi.ok) > Math.max(5, r.rqi.ok * 0.1) ? '<span class="chip warn">ເຕີມຈິງ ' + L(r.add) + ' ຕ່າງຈາກອະນຸມັດ ' + (r.add > r.rqi.ok ? '+' : '') + Math.round(r.add - r.rqi.ok) + ' L</span>' : '') + '</div>' : '';
  h += '<section class="card" data-v="' + esc(r.v) + '" style="animation-delay:' + n * 60 + 'ms"><h2>' + ic('truck') + esc(r.name) + '</h2>' + (rd ? driverTag(r) : drvSelect(r)) + qi + '<div class="g2" style="margin-top:8px">' +
   '<label class="f">ກ່ອນເຕີມ (cm)' + numIn('cm0', r.cm0, lock) + '</label><label class="f">ຫຼັງເຕີມ (cm)' + numIn('cm1', r.cm1, lock) + '</label>' +
   (rqm && r.rqi ? '' : '<label class="f">ເຕີມຈາກ<select data-k="src"' + (srcLock ? ' disabled' : '') + '><option value="tank">ແທ່ງນ້ຳມັນ</option><option value="jug"' + (r.src === 'jug' ? ' selected' : '') + '>ຕຸກ (ພາໄປສະໜາມ)</option><option value="shop"' + (r.src === 'shop' ? ' selected' : '') + '>ຮ້ານ / ປໍ້າອື່ນ (ບໍ່ຫັກແທ່ງ)</option></select></label>') +
   (rd ? '' : '<label class="f">ຫຼັງເລີກວຽກ (cm)' + numIn('cm2', r.cm2, !ed) + '</label>') + '</div>' +
   (r.src === 'shop' && !(rqm && r.rqi) ? '<label class="f" style="margin-top:8px">ຊື່ຮ້ານ / ປໍ້າ<input type="text" data-k="shop" maxlength="60" value="' + esc(r.shop) + '"' + (srcLock ? ' disabled' : '') + '></label>' : '') + '<label class="f" style="margin-top:8px">ໝາຍເຫດ<input type="text" data-k="note" maxlength="200" value="' + esc(r.note) + '"' + (ed ? '' : ' disabled') + '></label>' +
   '<div class="calc">' + calcHtml(r) + '</div>' + phBtns([[r.v + '_b', 'ກ່ອນເຕີມ'], [r.v + '_a', 'ຫຼັງເຕີມ']].concat(rd ? [] : [[r.v + '_e', 'ຕອນແລງ']])) +
   (!lock || (ed && last) ? '<div class="row wrap noprint" style="margin-top:12px">' + (!lock ? '<button type="button" class="btn ok" data-savecar="' + esc(r.v) + '">' + ic('check') + 'ບັນທຶກ</button>' : '') + (ed && last ? (!rqm && (r.round || 1) < 9 ? '<button type="button" class="btn line" data-addround="' + esc(bid) + '">' + ic('plus') + 'ເຕີມອີກຄັ້ງ (ຄັ້ງທີ ' + ((r.round || 1) + 1) + ')</button>' : '') + (rd && !r.ack ? '<button type="button" class="btn line" data-delround="' + esc(r.v) + '">ລຶບຄັ້ງນີ້</button>' : '') : '') + '</div>' : '') + '</section>';
 });
 if (S.rows.length && !ed && !S.approved) h += '<p class="hint">ບົດບາດຂອງເຈົ້າເບິ່ງໄດ້ຢ່າງດຽວ — ບໍ່ສາມາດແກ້ cm</p>';
 $('v').innerHTML = h; paintPhotos();
}

/* ===== ຮັບເຂົ້າແທ່ງ & ແທກ ===== */
function tankView() {
 withSheet(true, function (ph) {
  if (ph) return paintPhotos();
  var mine = MOD; api('ledger', { site: $('site').value }).then(function (r) { if (MOD !== mine) return; LEDGER = r.ok ? r.data : []; drawTank(); });
 });
}
function recvHtml(t, ed) { /* ຮັບເຂົ້າ / ຊື້ ໄດ້ຫຼາຍຄັ້ງຕໍ່ມື້: ແຕ່ລະຄັ້ງມີລິດ + ມາຈາກໃສ + ຮູບບິນ; ຍອດລວມຄິດໃຫ້ເອງ */
 var lst = t.recvs && t.recvs.length ? t.recvs : t.recv > 0 ? [{ id: 'r0', lit: t.recv, from: '' }] : [], w = t.meter ? 'ຮັບເຂົ້າ' : 'ຊື້ທີ່ປໍ້າ', tot = lst.reduce(function (s, x) { return s + x.lit; }, 0);
 return '<div class="f">' + w + 'ມື້ນີ້ <b>' + L(tot) + '</b> <small class="muted">(' + lst.length + ' ຄັ້ງ)</small></div>' + lst.map(function (x, i) { return '<div class="cr"><div class="row wrap"><b class="grow">ຄັ້ງທີ ' + (i + 1) + ' · ' + L(x.lit) + '</b>' + (ed ? '<button type="button" class="btn line" data-delrv="' + esc(x.id) + '" style="min-height:40px">ລຶບ</button>' : '') + '</div>' + (x.from || x.note ? '<small class="muted">' + (x.from ? 'ມາຈາກ: ' + esc(x.from) : '') + (x.from && x.note ? ' · ' : '') + esc(x.note || '') + '</small>' : '') + phBtns([[x.id === 'r0' ? 'tank' : 'tank_' + x.id, 'ຮູບບິນ / ໃບສົ່ງ']]) + '</div>'; }).join('') +
  (ed ? '<div class="cr noprint"><b>ເພີ່ມການ' + w + 'ຄັ້ງໃໝ່</b><div class="g2"><label class="f">ຈຳນວນ (ລິດ)<input type="number" inputmode="decimal" min="0" step="0.1" id="rvlit"></label><label class="f">ມາຈາກ (ບໍ່ບັງຄັບ)<input type="text" id="rvfrom" maxlength="60" list="rvfl" placeholder="ເຊັ່ນ ແທ່ງສະໜາມອື່ນ / ປໍ້າ / ຜູ້ຂາຍ" autocomplete="off"></label></div><datalist id="rvfl"><option value="ແທ່ງສະໜາມອື່ນ"><option value="ປໍ້າ"><option value="ຜູ້ຂາຍ / ບໍລິສັດ"><option value="ຮັບຄືນຈາກລົດ"></datalist><label class="f">ໝາຍເຫດ (ບໍ່ບັງຄັບ)<input type="text" id="rvnote" maxlength="200"></label><button type="button" class="btn ok" id="addRv">' + ic('plus') + 'ເພີ່ມການ' + w + '</button></div>' : '');
}
function drawTank() {
 var ed = canTank(), t = S.tank, h = approvedBanner();
 if (!t) { $('v').innerHTML = h + '<div class="card empty">ບົດບາດຂອງເຈົ້າບໍ່ມີສິດເບິ່ງແທ່ງນ້ຳມັນ</div>'; return; }
 h += '<section class="card" data-tank="1"><h2>' + ic('inbox') + (cmOn() ? 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ · ແທກແທ່ງ' : t.meter ? 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ · ມິເຕີ' : 'ຊື້ນ້ຳມັນທີ່ປໍ້າ · ກວດກັບການຈ່າຍ') + '</h2><p class="hint">' + esc(siteObj().name) + ' · ' + dmy(S.date) + '</p>' + recvHtml(t, ed) + '<div class="g2">' + (cmOn() ? '<label class="f">ແທກແທ່ງຫຼັງເລີກວຽກ (cm)' + numIn('cm', t.cm, !ed) + '</label>' : t.meter ? '<label class="f">ເລກມິເຕີ ຫຼັງເລີກວຽກ' + numIn('mtr', t.mtr, !ed) + '</label>' : '') + '</div><div class="calc">' + tankHtml(t) + '</div>' + (t.meter ? phBtns([['mtr', 'ຮູບເລກມິເຕີ']]) : '') + '<div class="row wrap noprint" style="margin-top:14px">' + (ed && (cmOn() || t.meter) ? '<button type="button" class="btn ok" id="savT">' + ic('check') + 'ບັນທຶກເລກມິເຕີ</button>' : '') + '<button type="button" class="btn line" id="xlsT">' + ic('xls') + 'ສົ່ງອອກ Excel (ໃບຕິດຕາມ)</button></div></section>';
 var rows = LEDGER.slice(-7).reverse();
 h += '<section class="card"><h2>' + ic('ledger') + 'ຍ້ອນຫຼັງ 7 ມື້</h2>' + (rows.length ? '<div class="tw"><table class="mini"><thead><tr><th>ວັນທີ</th><th>' + (cmOn() ? 'ຮັບເຂົ້າ' : 'ຊື້') + '</th><th>ຈ່າຍອອກ</th><th>ເຫຼືອ</th><th>' + (cmOn() ? 'ແທກໄດ້' : t.meter ? 'ມິເຕີ' : 'ຕ່າງມື້') + '</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (cmOn() ? (x.measured != null ? L(x.measured) : '') : t.meter ? (x.mtr != null ? x.mtr + (x.mused != null ? ' (+' + Math.round(x.mused) + ')' : '') : '') : (x.recv || x.out ? (x.recv - x.out > 0 ? '+' : '') + Math.round(x.recv - x.out) : '')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຂໍ້ມູນ</div>') + '</section>';
 $('v').innerHTML = h; paintPhotos();
}

/* ===== ຮັບຮູ້ & ອະນຸມັດ ===== */
function apprView() { withSheet(false, function () { drawAppr(); }); }
function drawAppr() {
 var shownRows = S.rows.filter(function (x) { return x.add != null || x.rej || x.rqi || S.rows.length <= 3; }), idle = S.rows.length - shownRows.length, h = approvedBanner(), filled = S.rows.filter(function (x) { return x.add != null; }), un = filled.filter(function (x) { return !x.ack; }), ok = canApprove(), edit = hasRight('issue'), openq = (S.reqs || []).filter(function (x) { return x.state === 'pending' || x.state === 'approved'; });
 if (!S.rows.length) { $('v').innerHTML = noCars(); return; }
 h += '<section class="card"><h2>' + ic('check') + 'ຄົນຂັບຮັບຮູ້ ' + (filled.length - un.length) + '/' + filled.length + ' ຄັນ</h2>' +
  shownRows.map(function (x) { return '<div class="cr"><div class="row wrap"><b class="grow">' + ic('truck') + ' ' + esc(x.name) + '</b><span class="muted sm">ເຕີມ ' + L(x.add) + '</span></div><small class="muted">ຄົນຂັບ: ' + esc(drvName(x.driver) || '–') + '</small><div>' + chip(x) + '</div>' + (x.mine && x.add != null && !x.ack && !S.approved ? '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn ok grow" data-ackyes="' + esc(x.v) + '">' + ic('check') + 'ຮັບຮູ້ ' + L(x.add) + '</button><button type="button" class="btn line" data-ackno="' + esc(x.v) + '">ບໍ່ຖືກ</button></div>' : '') + (x.rej && edit && !S.approved ? '<button class="btn line" data-go="issue" style="min-height:40px;align-self:start">' + ic('edit') + 'ກວດ ແລະ ແກ້ cm</button>' : '') + '</div>'; }).join('') + (idle ? '<p class="hint">ລົດທີ່ມື້ນີ້ບໍ່ໄດ້ເຕີມ ' + idle + ' ຄັນ ບໍ່ສະແດງ</p>' : '') + '</section>';
 h += '<section class="card"><h2>' + ic('shield') + 'ອະນຸມັດໃບປະຈຳວັນ</h2>';
 if (S.approved) h += '<p>ອະນຸມັດແລ້ວໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '</p>' + (ok ? '<button id="appr" class="btn bad blk">' + ic('x') + 'ຍົກເລີກການອະນຸມັດ</button>' : '');
 else if (!ok) h += '<p class="hint">ເຈົ້າບໍ່ມີສິດອະນຸມັດ. ຜູ້ອະນຸມັດ = ຫົວໜ້າສະໜາມ, ເຈົ້າຂອງ ແລະ ຄົນທີ່ເຈົ້າຂອງຕັ້ງເປັນ "ຜູ້ອະນຸມັດ" ໃນ ພະນັກງານ & ສິດ.</p>';
 else if (un.length || openq.length) h += (un.length ? '<div class="chip warn" style="margin-bottom:10px">' + ic('alert') + 'ຍັງມີ ' + un.length + ' ຄັນທີ່ຄົນຂັບບໍ່ທັນຮັບຮູ້</div>' : '') + (openq.length ? '<div class="chip warn" style="margin-bottom:10px">' + ic('alert') + 'ຍັງມີ ' + openq.length + ' ຄຳຂໍທີ່ລໍອະນຸມັດ / ຍັງບໍ່ໄດ້ເຕີມ</div>' : '') + '<button class="btn blk" disabled>' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 else h += '<p class="hint">ກວດຕົວເລກແລ້ວ ກົດອະນຸມັດ — ໃບຈະຖືກລັອກ ແລະ ຂຶ້ນລາຍງານ.</p><button id="appr" class="btn ok blk">' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 $('v').innerHTML = h + '</section>';
}

/* ===== ການກະທຳທີ່ໃຊ້ຮ່ວມ: ບັນທຶກທັນທີເມື່ອປ່ຽນຄ່າ (ປ່ຽນສະເພາະສ່ວນຄິດໄລ່ ບໍ່ແຕ້ມໃໝ່ທັງໜ້າ → ບໍ່ເສຍ focus) ===== */
$('v').addEventListener('input', function (e) { /* ຄົ້ນຫາລົດ */
 var id = e.target.id; if (id !== 'carq' && id !== 'rqq') return; var q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#' + (id === 'carq' ? 'carlist' : 'rqlist') + ' .carrow').forEach(function (r) { r.classList.toggle('hide', !!q && r.dataset.n.indexOf(q) < 0); });
});
$('v').addEventListener('change', function (e) {
 if (e.target.dataset && e.target.dataset.f === 'src') { var sf = e.target.closest('[data-rq]').querySelector('[data-shopf]'); sf.classList.toggle('hide', e.target.value !== 'shop'); return; }
 if (e.target.id === 'carpick' && MOD === 'issue') { CARSEL = e.target.value; drawIssue(); return; }
 var ai = e.target.dataset.asgi; if (ai && MOD === 'issue') { api('assign', { site: $('site').value, v: ai, driver: e.target.value }).then(function (r) { if (!r.ok) { drawIssue(); return; } r.data.forEach(function (x) { I.cfg.vehicles.forEach(function (v) { if (v.id === x.id) v.driver = x.driver; }); S.rows.forEach(function (w) { if (w.v === x.id) w.driver = x.driver; }); }); drawIssue(); toast('ປ່ຽນຄົນຂັບແລ້ວ ✓', 'ok'); }); return; }
 var k = e.target.dataset.k, sec = e.target.closest('section'); if (!k || !sec || (MOD !== 'issue' && MOD !== 'tank')) return;
 var b = here(); b[k] = e.target.value; if (sec.dataset.v) b.v = sec.dataset.v;
 api(sec.dataset.v ? 'row' : 'tank', b).then(function (r) {
  if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); if (k === 'src' && MOD === 'issue') { drawIssue(); return; }
  document.querySelectorAll('section[data-v]').forEach(function (s) { var row = S.rows.filter(function (x) { return x.v === s.dataset.v; })[0], c = s.querySelector('.calc'); if (row && c) c.innerHTML = calcHtml(row); });
  var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank);
 });
});
$('v').addEventListener('click', function (e) {
 if (e.target.closest('#xlsT')) { xlsLedger(); return; }
 var ar = e.target.closest('#addRv'); if (ar) { var al = $('rvlit').value; if (!(+al > 0)) { toast('ໃສ່ຈຳນວນລິດ', 'bad'); return; } var ab = here(); ab.add = { lit: al, from: $('rvfrom').value, note: $('rvnote').value }; ar.disabled = true; api('tank', ab).then(function (r) { ar.disabled = false; if (!r.ok) { toast('ບັນທຶກບໍ່ໄດ້ — ກວດຕົວເລກ', 'bad'); return; } S = r.data; drawTank(); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ເພີ່ມແລ້ວ ✓', 'ok'); }); return; }
 var dv = e.target.closest('[data-delrv]'); if (dv) { if (!confirm('ລຶບການຮັບເຂົ້າຄັ້ງນີ້ (ແລະຮູບບິນຂອງມັນ)?')) return; var db = here(); db.del = dv.dataset.delrv; dv.disabled = true; api('tank', db).then(function (r) { dv.disabled = false; if (!r.ok) { toast('ລຶບບໍ່ໄດ້', 'bad'); return; } delete P[db.del === 'r0' ? 'tank' : 'tank_' + db.del]; S = r.data; drawTank(); toast('ລຶບແລ້ວ', 'ok'); }); return; }
 var sv = e.target.closest('#savT'); if (sv) { var b = here(); document.querySelectorAll('section[data-tank] input[data-k]').forEach(function (i) { b[i.dataset.k] = i.value; }); sv.disabled = true; api('tank', b).then(function (r) { sv.disabled = false; if (!r.ok) { toast('ບັນທຶກບໍ່ໄດ້ — ກວດຕົວເລກອີກຄັ້ງ', 'bad'); return; } S = r.data; var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ບັນທຶກແລ້ວ ✓', 'ok'); }); return; }
 var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
 var b = e.target.closest('button'); if (!b) return;
 if (b.dataset.ph) { if ((MOD === 'issue' && canEdit()) || (MOD === 'tank' && canTank())) { PHK = b.dataset.ph; $('file').value = ''; var key0 = PHK; liveCam(((I && I.me && I.me.name) || '') + ' · ' + (($('site').selectedOptions[0] || {}).text || '') + ' · ' + b.dataset.t, function (d) { if (d === undefined) return; if (d === null) { toast('ເປີດກ້ອງບໍ່ໄດ້ — ອະນຸຍາດກ້ອງໃນ browser; ຖ້າເລືອກຈາກຄັງ ລະບົບຈະຕິດປ້າຍ "ຈາກຄັງ"', 'bad'); $('file').click(); return; } sendPhoto(key0, d, 'cam'); }); } else if (P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); return; }
 if (b.dataset.pickcar !== undefined) { var pv = b.dataset.pickcar; CARSEL = pv; drawIssue(); window.scrollTo(0, 0); return; }
 if (b.dataset.rqpick) { var kl = $('rqlit') ? $('rqlit').value : '', kn = $('rqnote') ? $('rqnote').value : ''; RQCAR = b.dataset.rqpick; drawRq(); $('rqlit').value = kl; $('rqnote').value = kn; $('rqlit').focus(); return; }
 if (b.dataset.qlit) { $('rqlit').value = b.dataset.qlit; return; }
 if (b.id === 'rqsend') { var qb = here(); qb.v = RQCAR; qb.lit = $('rqlit').value; qb.note = $('rqnote').value; if (!qb.v) { toast('ແຕະເລືອກລົດກ່ອນ', 'bad'); return; } if (!qb.lit) { toast('ໃສ່ຈຳນວນລິດທີ່ຂໍ', 'bad'); return; } b.disabled = true; api('rqNew', qb).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; RQCAR = siteCars().length > 1 ? '' : RQCAR; drawRq(); toast('ສົ່ງຄຳຂໍແລ້ວ ✓', 'ok'); }); return; }
 if (b.dataset.rqcancel) { if (!confirm('ຍົກເລີກຄຳຂໍນີ້?')) return; var qc = here(); qc.id = b.dataset.rqcancel; b.disabled = true; api('rqCancel', qc).then(function (r) { b.disabled = false; if (!r.ok) return; toast('ຍົກເລີກແລ້ວ', 'ok'); go(MOD); }); return; }
 if (b.dataset.rqapprove) { var card = b.closest('[data-rq]'), qa2 = here(); qa2.id = b.dataset.rqapprove; qa2.yes = 1; qa2.lit = card.querySelector('[data-f=lit]').value; qa2.src = card.querySelector('[data-f=src]').value; qa2.shop = card.querySelector('[data-f=shop]').value; b.disabled = true; api('rqDecide', qa2).then(function (r) { b.disabled = false; if (!r.ok) return; toast('ອະນຸມັດແລ້ວ ✓', 'ok'); go(MOD); }); return; }
 if (b.dataset.rqreject) { var qr = here(); qr.id = b.dataset.rqreject; qr.yes = 0; ask('ປະຕິເສດຄຳຂໍ', 'ບອກເຫດຜົນ (ເຊັ່ນ: ມີນ້ຳມັນໃນລົດພໍແລ້ວ)', 'ສົ່ງ').then(function (why) { if (why == null) return; qr.why = why; api('rqDecide', qr).then(function (r) { if (!r.ok) return; toast('ປະຕິເສດແລ້ວ', 'ok'); go(MOD); }); }); return; }
 if (b.dataset.rqstart) { var qs = here(); qs.id = b.dataset.rqstart; b.disabled = true; api('rqStart', qs).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); var sx = (S.reqs || []).filter(function (x) { return x.id === qs.id; })[0]; if (sx) CARSEL = sx.v; drawIssue(); window.scrollTo(0, 0); toast('ເລີ່ມເຕີມແລ້ວ — ກອກ cm ກ່ອນ / ຫຼັງເຕີມ', 'ok'); }); return; }
 if (b.id === 'rqurgent') { var uq = here(); uq.v = $('uqcar').value; uq.src = $('uqsrc').value; uq.shop = $('uqshop').value; b.disabled = true; api('rqUrgent', uq).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); CARSEL = uq.v; drawIssue(); window.scrollTo(0, 0); toast('ເລີ່ມເຕີມດ່ວນແລ້ວ', 'ok'); }); return; }
 if (b.dataset.ackyes) { var ay = here(); ay.v = b.dataset.ackyes; ay.yes = 1; b.disabled = true; api('ack', ay).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawAppr(); toast('ຮັບຮູ້ແລ້ວ ✓', 'ok'); }); return; }
 if (b.dataset.ackno) { var an = here(); an.v = b.dataset.ackno; an.yes = 0; ask('ບໍ່ຍອມຮັບ', 'ບອກວ່າບໍ່ຖືກບ່ອນໃດ (ເຊັ່ນ: ກ່ອນເຕີມບໍ່ຕົງ)', 'ສົ່ງ').then(function (why) { if (why == null) return; an.why = why; api('ack', an).then(function (r) { if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawAppr(); toast('ສົ່ງເຫດຜົນແລ້ວ', 'ok'); }); }); return; }
 if (b.dataset.savecar) { var sc = b.closest('section'), sb = here(); sb.v = b.dataset.savecar; sc.querySelectorAll('[data-k]:not(:disabled)').forEach(function (i) { sb[i.dataset.k] = i.value; }); b.disabled = true; api('row', sb).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawIssue(); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ບັນທຶກແລ້ວ ✓', 'ok'); }); return; }
 if (b.dataset.addround) { var pc = b.closest('section').querySelector('input[data-k="cm1"]'); if (!pc || pc.value === '') { toast('ກອກ "ຫຼັງເຕີມ (cm)" ຂອງຄັ້ງນີ້ກ່ອນ ຈຶ່ງເພີ່ມຄັ້ງຕໍ່ໄປໄດ້', 'bad'); return; } var nb = b.dataset.addround, nn = S.rows.filter(function (x) { return x.base === nb; }).length + 2, ar = here(); ar.v = nb + '_r' + nn; ar.note = ''; b.disabled = true; api('row', ar).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawIssue(); } }); return; }
 if (b.dataset.delround) { var dr = here(); dr.v = b.dataset.delround; dr.del = 1; b.disabled = true; api('row', dr).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawIssue(); } }); return; }
 if (b.id === 'unappr') { if (!confirm('ຍົກເລີກການອະນຸມັດ ເພື່ອແກ້ໄຂໃບນີ້?')) return; var ua = here(); ua.yes = 0; b.disabled = true; api('approve', ua).then(function (r) { b.disabled = false; if (!r.ok) { toast('ຍົກເລີກບໍ່ໄດ້', 'bad'); return; } S = r.data; setBadge(pendingOf(S)); toast('ຍົກເລີກການອະນຸມັດແລ້ວ — ແກ້ໄຂໄດ້', 'ok'); go(MOD); }); return; }
 if (b.id === 'appr') { var a = here(); a.yes = S.approved ? 0 : 1; b.disabled = true; api('approve', a).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawAppr(); toast(a.yes ? 'ອະນຸມັດແລ້ວ' : 'ຍົກເລີກການອະນຸມັດແລ້ວ', 'ok'); } }); }
});
function sendPhoto(key, d, how) { var b = here(); b.key = key; b.data = d; b.takenAt = Date.now(); b.how = how; api('photo', b).then(function (r) { if (r.ok) { P[key] = d; PM[key] = { at: Date.now(), name: (I && I.me && I.me.name) || '', taken: b.takenAt, how: how }; paintPhotos(); } }); }
$('file').onchange = function () { /* ທາງສຳຮອງ ເມື່ອກ້ອງສົດໃຊ້ບໍ່ໄດ້ — ຖືກຕິດປ້າຍ "ຈາກຄັງ" */
 var f = this.files[0], key = PHK; if (!f || !key) return;
 shrink(f).then(function (d) { sendPhoto(key, d, 'file'); }, function () { toast('ເປີດຮູບບໍ່ໄດ້', 'bad'); });
};
