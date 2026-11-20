/* ປຸ່ມ "ແອັບທັງໝົດ" ໃນແອັບ HR → ກັບໄປ /home.html (ໜ້າເລີ່ມຕົ້ນ: ເລືອກ ນ້ຳມັນ / HR / ອື່ນໆ). ແຍກຈາກ build ຂອງ HR ເພື່ອບໍ່ຕ້ອງແກ້ໂຄ້ດ HR.
 * ວາງເປັນຊ່ອງສຸດທ້າຍໃນແຖບລຸ່ມ (.tabbar) ຖ້າມີ (.bottomnav = ລົງເວລາ · ປະຕິທິນ · ລາ); ຖ້າບໍ່ມີແຖບລຸ່ມ (ໜ້າຈໍກວ້າງຂອງຜູ້ຈັດການ) ໃຊ້ປຸ່ມລອຍແທນ.
 * ໃຊ້ສະເພາະເມື່ອ HR ຢູ່ໃນ server ດຽວກັບແອັບນ້ຳມັນ (stdev.store). ຖ້າສ້າງ HR build ໃໝ່ ໃຫ້ຮັກສາແຖວ <script src="./back-to-home.js"> ໃນ index.html */
(function () {
  if (window.__stHome) return; window.__stHome = 1;
  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>';
  var TIP = 'ໜ້າຫຼັກ (ເລືອກແອັບ)';
  function tab() { /* ຊ່ອງໃນແຖບລຸ່ມ */
    var b = document.createElement('button'); b.id = 'st-home-tab'; b.type = 'button'; b.title = TIP; b.setAttribute('aria-label', TIP);
    b.innerHTML = ICON + '<span>ໜ້າຫຼັກ</span>'; b.onclick = function () { location.href = '/home.html'; }; return b;
  }
  function pill() { /* ສຳຮອງ: ປຸ່ມລອຍ */
    var a = document.createElement('a'); a.id = 'st-home'; a.href = '/home.html'; a.title = TIP; a.setAttribute('aria-label', TIP);
    a.innerHTML = ICON.replace('width="22" height="22"', 'width="20" height="20"') + '<span>ໜ້າຫຼັກ</span>';
    a.style.cssText = 'position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:999px;background:#0b2f2d;color:#fff;font:600 14px/1 "Noto Sans Lao","Plus Jakarta Sans",system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 18px rgba(8,42,40,.35);opacity:.92;-webkit-tap-highlight-color:transparent'; return a;
  }
  function sync() {
    var bar = document.querySelector('.bottomnav, .tabbar'), t = document.getElementById('st-home-tab'), p = document.getElementById('st-home');
    if (bar) { if (p) p.remove(); if (!t || t.parentNode !== bar) bar.appendChild(tab()); }
    else { if (t) t.remove(); var mgr = document.querySelector('.mgr'); if (mgr && !p) document.body.appendChild(pill()); else if (!mgr && p) p.remove(); } /* ປຸ່ມລອຍສະເພາະໜ້າຈໍກວ້າງຂອງຜູ້ຈັດການ (ບໍ່ສະແດງຕອນກຳລັງໂຫຼດ) */
  }
  function start() { sync(); new MutationObserver(sync).observe(document.body, { childList: true, subtree: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
