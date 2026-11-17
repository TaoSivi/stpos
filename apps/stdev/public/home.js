/* ໜ້າຫຼັກ (launcher): ສະແດງແອັບທີ່ບັນຊີນີ້ມີສິດ — ລາຍການມາຈາກທະບຽນແອັບຂອງ server (me.apps), ແອັບໃໝ່ຂຶ້ນເອງເມື່ອລົງທະບຽນ */
'use strict';
api('me').then(function (r) {
 if (!r.ok) { ls('fuel_tk', null); location.href = '/'; return; } var m = r.data, apps = m.apps || [];
 $('hd').innerHTML = header('ໜ້າຫຼັກ', m.name); $('lo').onclick = logout; installHint('inst');
 $('v').innerHTML = '<p class="muted" style="margin:0 4px 12px">ເລືອກແອັບທີ່ຈະເຂົ້າເຮັດວຽກ</p>' + (apps.map(function (a, i) {
  return '<button class="tile" data-app="' + esc(a.id) + '" style="animation-delay:' + i * 80 + 'ms"><div class="logo">' + ic(a.icon) + '</div><div class="grow"><b>' + esc(a.name) + '</b><span class="muted">' + esc(a.desc) + '</span></div>' + ic('next', 'muted') + '</button>';
 }).join('') || '<div class="card empty"><div class="logo" style="background:#eaf0f0;color:var(--muted)">' + ic('lock') + '</div>ບັນຊີນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ແອັບໃດ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ</div>');
 $('v').onclick = function (e) {
  var b = e.target.closest('[data-app]'); if (!b) return; var a = apps.filter(function (x) { return x.id === b.dataset.app; })[0]; if (!a) return;
  if (a.action === 'hr') openHr(); else if (a.href) location.href = a.href;
 };
});
