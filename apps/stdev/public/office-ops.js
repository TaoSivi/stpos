/* ໂມດູນປະຕິບັດການ: ພາບລວມ · ເບີກ & ຈ່າຍນ້ຳມັນ · ຮັບເຂົ້າແທ່ງ & ແທກ · ຮັບຮູ້ & ອະນຸມັດ — ພະນັກງານກອກແຕ່ cm, ລິດມາຈາກ server */
'use strict';
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
function totals() { var a = 0, u = 0; S.rows.forEach(function (r) { a += r.add > 0 ? r.add : 0; u += r.used > 0 ? r.used : 0; }); return [a, u]; }
function approvedBanner() { return S.approved ? '<div class="card dark row">' + ic('shield') + '<div>ອະນຸມັດແລ້ວ ໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '<br><small style="opacity:.75">ໃບນີ້ຖືກລັອກ — ແກ້ບໍ່ໄດ້ຈົນກວ່າຈະຍົກເລີກການອະນຸມັດ</small></div></div>' : ''; }
function noCars() { return '<div class="card empty"><div class="logo">' + ic('truck') + '</div>ສະໜາມນີ້ຍັງບໍ່ມີລົດ' + (I.me.boss ? '<br><button class="btn line" data-go="cfg" style="margin-top:10px">ໄປ ຕັ້ງຄ່າ ສະໜາມ & ລົດ</button>' : '') + '</div>'; }
function driverTag(r) { return r.driver ? '<small class="muted">ຄົນຂັບ: ' + esc(drvName(r.driver)) + '</small>' : '<small class="chip warn">ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ</small>'; }

/* ===== ພາບລວມ ===== */
function dashView() {
 var mine = MOD;
 withSheet(false, function () {
  api('ledger', { site: $('site').value }).then(function (r) {
   if (MOD !== mine) return; LEDGER = r.ok ? r.data : [];
   var n = S.rows.length, filled = S.rows.filter(function (x) { return x.add != null; }), acked = filled.filter(function (x) { return x.ack; }).length, pct = filled.length ? Math.round(acked * 100 / filled.length) : 0, t = totals(), tk = S.tank;
   var todo = [], add = function (tone, icn, title, sub, go) { todo.push('<button class="todo ' + tone + '" data-go="' + go + '"><span class="ti">' + ic(icn) + '</span><span><b>' + title + '</b><small>' + sub + '</small></span><span class="go">' + ic('next') + '</span></button>'); };
   if (S.approved) add('ok', 'shield', 'ໃບມື້ນີ້ອະນຸມັດແລ້ວ', 'ໂດຍ ' + esc(S.approved.name) + ' · ' + when(S.approved.at), 'report');
   S.rows.forEach(function (x) {
    if (x.rej) add('bad', 'alert', esc(x.name) + ': ຄົນຂັບບໍ່ຍອມຮັບ', esc(x.rej.name) + ' — ' + esc(x.rej.why || '-'), hasRole(['head', 'admin']) ? 'issue' : 'appr');
    else if (x.add == null) add('warn', 'edit', esc(x.name) + ' — ຍັງບໍ່ໄດ້ບັນທຶກ cm', 'ກອກ cm ກ່ອນ / ຫຼັງເຕີມ', hasRole(['head', 'admin']) ? 'issue' : 'appr');
    else if (!x.ack) add('warn', 'user', 'ລໍຖ້າ ' + esc(drvName(x.driver) || 'ຄົນຂັບ') + ' ຮັບຮູ້', esc(x.name) + ' · ເຕີມ ' + L(x.add), 'appr');
   });
   if (!S.approved && n && canApprove() && filled.length && acked === filled.length) add('ok', 'check', 'ພ້ອມອະນຸມັດໃບປະຈຳວັນ', 'ຄົນຂັບຮັບຮູ້ຄົບ ' + acked + ' ຄັນ', 'appr');
   if (tk && tk.measured != null && Math.abs(tk.measured - tk.bal) > 20) add('warn', 'drop', 'ແທ່ງແທກໄດ້ຕ່າງຈາກບັນຊີ ' + (tk.measured - tk.bal > 0 ? '+' : '') + Math.round(tk.measured - tk.bal) + ' L', 'ກວດການຮັບເຂົ້າ / ການຈ່າຍ', 'tank');
   var qa = [['issue', 'pump', 'ເບີກນ້ຳມັນ'], ['tank', 'inbox', 'ຮັບເຂົ້າແທ່ງ'], ['report', 'report', 'ເບິ່ງລາຍງານ']].filter(function (q) { return modOf(q[0]).show(); }).map(function (q, i) { return '<button class="btn ' + (i ? 'line' : '') + '" data-go="' + q[0] + '">' + ic(q[1]) + q[2] + '</button>'; }).join('');
   $('v').innerHTML = '<div class="stats"><div class="stat-card dark"><div><small>ຄົນຂັບຮັບຮູ້ແລ້ວ</small><b>' + acked + '<span>/' + filled.length + ' ຄັນ</span></b></div><div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span></div></div>' +
    '<div class="stat-card" style="animation-delay:60ms"><small>ເບີກລວມ</small><b>' + L(t[0]) + '</b></div><div class="stat-card" style="animation-delay:120ms"><small>ໃຊ້ຕົວຈິງ</small><b>' + L(t[1]) + '</b></div><div class="stat-card" style="animation-delay:180ms"><small>ແທ່ງເຫຼືອ (ບັນຊີ)</small><b>' + (tk ? L(tk.bal) : '–') + '</b></div></div>' +
    (qa ? '<div class="qa">' + qa + '</div>' : '') +
    '<section class="card"><h2>' + ic('alert') + 'ຕ້ອງເຮັດ / ຕິດຕາມ</h2>' + (todo.join('') || '<div class="empty" style="padding:14px">ບໍ່ມີລາຍການຄ້າງ</div>') + '</section>' +
    '<section class="card"><h2>' + ic('truck') + 'ສະຖານະລົດມື້ນີ້</h2>' + (n ? '<div class="tw"><table class="mini"><thead><tr><th>ລົດ</th><th>ຄົນຂັບ</th><th>ເຕີມ</th><th>ສະຖານະ</th></tr></thead><tbody>' + S.rows.map(function (x) { return '<tr><td class="l"><b>' + esc(x.name) + '</b></td><td class="l">' + esc(drvName(x.driver) || '–') + '</td><td>' + L(x.add) + '</td><td class="l">' + chip(x) + '</td></tr>'; }).join('') + '</tbody></table></div>' : noCars().replace('class="card empty"', 'class="empty"')) + '</section>';
  });
 });
}

/* ===== ເບີກ & ຈ່າຍນ້ຳມັນ (ຕໍ່ລົດ) ===== */
function issueView() { withSheet(true, function (ph) { if (ph) return paintPhotos(); drawIssue(); }); }
function drawIssue() {
 var ed = canEdit(), h = approvedBanner(), n = 0;
 if (!S.rows.length) h += noCars();
 S.rows.forEach(function (r) {
  var lock = !ed || (r.ack && !isChief()); n++;
  h += '<section class="card" data-v="' + esc(r.v) + '" style="animation-delay:' + n * 60 + 'ms"><h2>' + ic('truck') + esc(r.name) + '</h2>' + driverTag(r) + '<div class="g2" style="margin-top:8px">' +
   '<label class="f">ກ່ອນເຕີມ (cm)' + numIn('cm0', r.cm0, lock) + '</label><label class="f">ຫຼັງເຕີມ (cm)' + numIn('cm1', r.cm1, lock) + '</label>' +
   '<label class="f">ເຕີມຈາກ<select data-k="src"' + (lock ? ' disabled' : '') + '><option value="tank">ແທ່ງນ້ຳມັນ</option><option value="jug"' + (r.src === 'jug' ? ' selected' : '') + '>ຕຸກ (ພາໄປສະໜາມ)</option></select></label>' +
   '<label class="f">ຫຼັງເລີກວຽກ (cm)' + numIn('cm2', r.cm2, !ed) + '</label></div>' +
   '<label class="f" style="margin-top:8px">ໝາຍເຫດ<input type="text" data-k="note" maxlength="200" value="' + esc(r.note) + '"' + (ed ? '' : ' disabled') + '></label>' +
   '<div class="calc">' + calcHtml(r) + '</div>' + phBtns([[r.v + '_b', 'ກ່ອນເຕີມ'], [r.v + '_a', 'ຫຼັງເຕີມ'], [r.v + '_e', 'ຕອນແລງ']]) + '</section>';
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
function drawTank() {
 var ed = canEdit(), t = S.tank, h = approvedBanner();
 if (!t) { $('v').innerHTML = h + '<div class="card empty">ບົດບາດຂອງເຈົ້າບໍ່ມີສິດເບິ່ງແທ່ງນ້ຳມັນ</div>'; return; }
 h += '<section class="card" data-tank="1"><h2>' + ic('inbox') + 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ · ແທກແທ່ງ</h2><p class="hint">' + esc(siteObj().name) + ' · ' + dmy(S.date) + '</p><div class="g2"><label class="f">ຮັບນ້ຳມັນເຂົ້າມື້ນີ້ (ລິດ)' + numIn('recv', t.recv, !ed) + '</label><label class="f">ແທກແທ່ງຫຼັງເລີກວຽກ (cm)' + numIn('cm', t.cm, !ed) + '</label></div><div class="calc">' + tankHtml(t) + '</div>' + phBtns([['tank', 'ຮູບແທກແທ່ງ']]) + '</section>';
 var rows = LEDGER.slice(-7).reverse();
 h += '<section class="card"><h2>' + ic('ledger') + 'ຍ້ອນຫຼັງ 7 ມື້</h2>' + (rows.length ? '<div class="tw"><table class="mini"><thead><tr><th>ວັນທີ</th><th>ຮັບເຂົ້າ</th><th>ຈ່າຍອອກ</th><th>ເຫຼືອ</th><th>ແທກໄດ້</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (x.measured != null ? L(x.measured) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຂໍ້ມູນ</div>') + '</section>';
 $('v').innerHTML = h; paintPhotos();
}

/* ===== ຮັບຮູ້ & ອະນຸມັດ ===== */
function apprView() { withSheet(false, function () { drawAppr(); }); }
function drawAppr() {
 var h = approvedBanner(), filled = S.rows.filter(function (x) { return x.add != null; }), un = filled.filter(function (x) { return !x.ack; }), ok = canApprove(), edit = hasRole(['head', 'admin']);
 if (!S.rows.length) { $('v').innerHTML = noCars(); return; }
 h += '<section class="card"><h2>' + ic('check') + 'ຄົນຂັບຮັບຮູ້ ' + (filled.length - un.length) + '/' + filled.length + ' ຄັນ</h2>' +
  S.rows.map(function (x) { return '<div class="cr"><div class="row wrap"><b class="grow">' + ic('truck') + ' ' + esc(x.name) + '</b><span class="muted sm">ເຕີມ ' + L(x.add) + '</span></div><small class="muted">ຄົນຂັບ: ' + esc(drvName(x.driver) || '–') + '</small><div>' + chip(x) + '</div>' + (x.rej && edit && !S.approved ? '<button class="btn line" data-go="issue" style="min-height:40px;align-self:start">' + ic('edit') + 'ກວດ ແລະ ແກ້ cm</button>' : '') + '</div>'; }).join('') + '</section>';
 h += '<section class="card"><h2>' + ic('shield') + 'ອະນຸມັດໃບປະຈຳວັນ</h2>';
 if (S.approved) h += '<p>ອະນຸມັດແລ້ວໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '</p>' + (ok ? '<button id="appr" class="btn bad blk">' + ic('x') + 'ຍົກເລີກການອະນຸມັດ</button>' : '');
 else if (!ok) h += '<p class="hint">ເຈົ້າບໍ່ມີສິດອະນຸມັດ. ຜູ້ອະນຸມັດ = ຫົວໜ້າສະໜາມ, ເຈົ້າຂອງ ແລະ ຄົນທີ່ເຈົ້າຂອງຕັ້ງເປັນ "ຜູ້ອະນຸມັດ" ໃນ ພະນັກງານ & ສິດ.</p>';
 else if (un.length) h += '<div class="chip warn" style="margin-bottom:10px">' + ic('alert') + 'ຍັງມີ ' + un.length + ' ຄັນທີ່ຄົນຂັບບໍ່ທັນຮັບຮູ້</div><button class="btn blk" disabled>' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 else h += '<p class="hint">ກວດຕົວເລກແລ້ວ ກົດອະນຸມັດ — ໃບຈະຖືກລັອກ ແລະ ຂຶ້ນລາຍງານ.</p><button id="appr" class="btn ok blk">' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 $('v').innerHTML = h + '</section>';
}

/* ===== ການກະທຳທີ່ໃຊ້ຮ່ວມ: ບັນທຶກທັນທີເມື່ອປ່ຽນຄ່າ (ປ່ຽນສະເພາະສ່ວນຄິດໄລ່ ບໍ່ແຕ້ມໃໝ່ທັງໜ້າ → ບໍ່ເສຍ focus) ===== */
$('v').addEventListener('change', function (e) {
 var k = e.target.dataset.k, sec = e.target.closest('section'); if (!k || !sec || (MOD !== 'issue' && MOD !== 'tank')) return;
 var b = here(); b[k] = e.target.value; if (sec.dataset.v) b.v = sec.dataset.v;
 api(sec.dataset.v ? 'row' : 'tank', b).then(function (r) {
  if (!r.ok) return; S = r.data; setBadge(pendingOf(S));
  document.querySelectorAll('section[data-v]').forEach(function (s) { var row = S.rows.filter(function (x) { return x.v === s.dataset.v; })[0], c = s.querySelector('.calc'); if (row && c) c.innerHTML = calcHtml(row); });
  var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank);
 });
});
$('v').addEventListener('click', function (e) {
 var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
 var b = e.target.closest('button'); if (!b) return;
 if (b.dataset.ph) { if ((MOD === 'issue' || MOD === 'tank') && canEdit()) { PHK = b.dataset.ph; $('file').value = ''; $('file').click(); } else if (P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); return; }
 if (b.id === 'appr') { var a = here(); a.yes = S.approved ? 0 : 1; b.disabled = true; api('approve', a).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawAppr(); toast(a.yes ? 'ອະນຸມັດແລ້ວ' : 'ຍົກເລີກການອະນຸມັດແລ້ວ', 'ok'); } }); }
});
$('file').onchange = function () {
 var f = this.files[0], key = PHK; if (!f || !key) return;
 shrink(f).then(function (d) { var b = here(); b.key = key; b.data = d; api('photo', b).then(function (r) { if (r.ok) { P[key] = d; paintPhotos(); } }); }, function () { toast('ເປີດຮູບບໍ່ໄດ້', 'bad'); });
};
