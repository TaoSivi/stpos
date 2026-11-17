/* ປຸ່ມລອຍ "ໜ້າຫຼັກ" ໃນແອັບ HR → ກັບໄປ /home.html (ເລືອກ ນ້ຳມັນ / HR). ແຍກຈາກ build ຂອງ HR ເພື່ອບໍ່ຕ້ອງແກ້ໂຄ້ດ HR.
 * ໃຊ້ສະເພາະເມື່ອ HR ຢູ່ໃນ server ດຽວກັບແອັບນ້ຳມັນ (stdev.store). ຖ້າສ້າງ HR build ໃໝ່ ໃຫ້ຮັກສາແຖວ <script src="./back-to-home.js"> ໃນ index.html */
(function () {
  if (document.getElementById('st-home')) return;
  var a = document.createElement('a');
  a.id = 'st-home'; a.href = '/home.html'; a.title = 'ກັບໜ້າຫຼັກ (ນ້ຳມັນ / HR)'; a.setAttribute('aria-label', 'ກັບໜ້າຫຼັກ');
  a.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg><span>ໜ້າຫຼັກ</span>';
  a.style.cssText = 'position:fixed;right:14px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:999px;background:#0b2f2d;color:#fff;font:600 14px/1 "Noto Sans Lao","Plus Jakarta Sans",system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 18px rgba(8,42,40,.35);opacity:.92;-webkit-tap-highlight-color:transparent';
  function add() { document.body.appendChild(a); }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();
