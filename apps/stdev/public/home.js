/* ໜ້າຫຼັກ: ສະແດງສະເພາະໂມດູນທີ່ບັນຊີນີ້ມີສິດ (ນ້ຳມັນ / HR) */
'use strict';
api('me').then(function (r) {
 if (!r.ok) { ls('fuel_tk', null); location.href = '/'; return; } var m = r.data;
 $('hd').innerHTML = header('ໜ້າຫຼັກ', m.name); $('lo').onclick = logout; installHint('inst');
 var tiles = '';
 if (m.fuel) tiles += '<button class="tile" id="tf"><div class="logo">' + ic('pump') + '</div><div><b>ຕິດຕາມນ້ຳມັນ</b><span class="muted">' + (m.fuel === 'driver' ? 'ຮັບຮູ້ການເຕີມນ້ຳມັນ' : 'ໃບເບີກ · ລາຍງານ · ຍອດແທ່ງ') + '</span></div></button>';
 if (m.hr) tiles += '<button class="tile" id="th" style="animation-delay:80ms"><div class="logo">' + ic('users') + '</div><div><b>ST HR</b><span class="muted">ລົງເວລາ · ລາ · ເງິນເດືອນ</span></div></button>';
 $('v').innerHTML = tiles || '<div class="card" style="text-align:center">ບັນຊີນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ແອັບໃດ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ</div>';
 if ($('tf')) $('tf').onclick = function () { location.href = m.fuel === 'driver' ? 'driver.html' : 'office.html'; };
 if ($('th')) $('th').onclick = openHr;
});
