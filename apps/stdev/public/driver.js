/* ໜ້າຄົນຂັບ: ເຫັນສະເພາະລົດຂອງຕົນ — ກົດຮັບຮູ້ ຈຳນວນ cm / ລິດ ທີ່ບໍລິຫານກອກໃຫ້ */
'use strict';
var ME = null, CFG = null, DATE = today(), DATA = [];
$('prev').innerHTML = ic('back'); $('next').innerHTML = ic('next');
function load() {
 $('v').innerHTML = '<div class="skel"></div><div class="skel"></div>';
 var sites = Object.keys(ME.roles).filter(function (s) { return ME.roles[s] === 'driver'; });
 $('dl').textContent = DATE === today() ? 'ມື້ນີ້' : dmy(DATE); $('ds').textContent = DATE === today() ? dmy(DATE) : ''; $('next').disabled = DATE >= today();
 Promise.all(sites.map(function (s) { return Promise.all([api('sheet', { site: s, date: DATE }), api('photos', { site: s, date: DATE })]).then(function (r) { return { site: s, sh: r[0], ph: r[1] }; }); })).then(function (all) {
  DATA = all.filter(function (x) { return x.sh.ok; }); draw();
 });
}
function siteName(id) { var s = CFG.sites.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }
function chip(r) {
 if (r.ack) return '<span class="chip ok">' + ic('check') + 'ຮັບຮູ້ແລ້ວ ' + when(r.ack.at) + '</span>';
 if (r.rej) return '<span class="chip bad">' + ic('x') + 'ບໍ່ຍອມຮັບ: ' + esc(r.rej.why || '') + '</span>';
 return '<span class="chip warn">ລໍຖ້າທ່ານຮັບຮູ້</span>';
}
function draw() {
 var h = '', n = 0;
 DATA.forEach(function (d) {
  d.sh.data.rows.forEach(function (r) {
   n++; var locked = !!d.sh.data.approved, ph = ['b', 'a', 'e'].map(function (k, i) { var s = d.ph.ok && d.ph.data[r.v + '_' + k]; return s ? '<button class="has" data-img="' + r.v + '_' + k + '" data-s="' + d.site + '">' + '<img alt="" src="' + s + '">' + ['ກ່ອນເຕີມ', 'ຫຼັງເຕີມ', 'ຕອນແລງ'][i] + '</button>' : ''; }).join('');
   h += '<section class="card" style="animation-delay:' + n * 70 + 'ms"><div class="row"><div class="logo" style="width:38px;height:38px;border-radius:12px">' + ic('truck') + '</div><div class="grow"><h2 style="margin:0">' + esc(r.name) + '</h2><small class="muted">' + esc(siteName(d.site)) + '</small></div></div>';
   if (r.add == null) h += '<p class="muted" style="text-align:center;padding:18px 0">ມື້ນີ້ຍັງບໍ່ມີການເຕີມນ້ຳມັນ</p>';
   else {
    h += '<div style="text-align:center;margin:12px 0 4px"><small class="muted">ເຕີມນ້ຳມັນ ຈາກ' + (r.src === 'jug' ? 'ຕຸກ' : 'ແທ່ງ') + '</small><div class="big">' + L(r.add) + '</div></div>' +
     '<div class="stat"><div><small>ກ່ອນເຕີມ</small><b>' + r.cm0 + ' cm</b> · ' + L(r.L0) + '</div><div><small>ຫຼັງເຕີມ</small><b>' + r.cm1 + ' cm</b> · ' + L(r.L1) + '</div></div>' +
     (r.cm2 != null ? '<div class="stat"><div><small>ຫຼັງເລີກວຽກ</small><b>' + r.cm2 + ' cm</b> · ' + L(r.L2) + '</div><div><small>ໃຊ້ຕົວຈິງ</small><b>' + L(r.used) + '</b></div></div>' : '') +
     (ph ? '<div class="ph">' + ph + '</div>' : '') + '<div style="margin:12px 0 0">' + chip(r) + '</div>';
    if (!r.ack && !locked) h += '<div class="row" style="margin-top:14px" data-v="' + r.v + '" data-s="' + d.site + '"><button class="btn bad" data-a="0" style="flex:1">ຕົວເລກບໍ່ຖືກ</button><button class="btn ok" data-a="1" style="flex:2">' + ic('check') + 'ຮັບຮູ້ ເຕີມ ' + L(r.add) + '</button></div>';
   }
   h += '</section>';
  });
 });
 $('v').innerHTML = h || '<div class="card" style="text-align:center"><div class="done" style="background:#eaf0f0;color:var(--muted)">' + ic('truck') + '</div>ບໍ່ມີລົດທີ່ມອບໃຫ້ທ່ານ — ຕິດຕໍ່ຜູ້ບໍລິຫານ</div>';
}
$('v').onclick = function (e) {
 var im = e.target.closest('[data-img]'); if (im) { var d = DATA.filter(function (x) { return x.site === im.dataset.s; })[0]; viewPhoto(d.ph.data[im.dataset.img]); return; }
 var b = e.target.closest('[data-a]'); if (!b) return; var box = b.parentNode, body = { site: box.dataset.s, date: DATE, v: box.dataset.v, yes: +b.dataset.a };
 var send = function () { b.disabled = true; api('ack', body).then(function (r) { if (!r.ok) { b.disabled = false; return; } var d = DATA.filter(function (x) { return x.site === body.site; })[0]; d.sh = r; if (body.yes) { var m = modal('<div class="done">' + ic('check') + '</div><h2 style="justify-content:center;margin-bottom:12px">ຮັບຮູ້ແລ້ວ</h2>'); setTimeout(function () { m.remove(); }, 1100); } else toast('ສົ່ງກັບໃຫ້ບໍລິຫານກວດແລ້ວ'); draw(); }); };
 if (body.yes) send(); else ask('ຕົວເລກບໍ່ຖືກ', 'ບອກວ່າບໍ່ຖືກບ່ອນໃດ (ເຊັ່ນ: ແທກໄດ້ 38 cm)', 'ສົ່ງກັບ').then(function (why) { if (why) { body.why = why; send(); } });
};
$('prev').onclick = function () { DATE = shift(DATE, -1); load(); };
$('next').onclick = function () { if (DATE < today()) { DATE = shift(DATE, 1); load(); } };
document.addEventListener('synced', function () { if (ME) load(); });
document.addEventListener('visibilitychange', function () { if (!document.hidden && ME) load(); }); /* ເປີດກັບມາ = ໂຫຼດໃໝ່ */
api('init').then(function (r) {
 if (!r.ok) return; ME = r.data.me; CFG = r.data.cfg;
 if (!Object.keys(ME.roles).some(function (s) { return ME.roles[s] === 'driver'; }) && Object.keys(ME.roles).length) { location.href = 'office.html'; return; }
 $('hd').innerHTML = header('ຮັບຮູ້ການເຕີມນ້ຳມັນ', ME.name, r.data.hr ? '<button class="ic" id="hrb" aria-label="ST HR">' + ic('users') + '</button>' : '');
 window.MENU_HR = !!r.data.hr; $('lo').onclick = logout; if ($('hrb')) $('hrb').onclick = openHr; load();
 $('v').insertAdjacentHTML('afterend', '<div id="inst"></div>'); installHint('inst');
});
