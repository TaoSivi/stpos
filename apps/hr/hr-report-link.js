/* ເມນູ "ລາຍງານ HR (Excel)" ໃນແອັບ HR: ເພີ່ມປຸ່ມໃສ່ເມນູຂ້າງ (☰) ສຳລັບຜູ້ທີ່ມີສິດ (admin / HR ບັນຊີ-ເຈົ້າຂອງ-ຜູ້ກວດສອບ).
 * ແຍກຈາກ build ຂອງ HR (ບໍ່ແກ້ໂຄ້ດ HR) — ສັງເກດ DOM ເມື່ອເມນູເປີດ ແລ້ວແຊກປຸ່ມເຂົ້າ. ກົດ → /hrreport.html?from=hr (ມີປຸ່ມກັບ HR).
 * ສິດກວດຈາກ server (/api/hrreport.info ດ້ວຍ session ກາງ) — ບໍ່ມີ session ກາງ ຫຼື ບໍ່ມີສິດ = ບໍ່ສະແດງປຸ່ມ.
 * ຖ້າສ້າງ HR build ໃໝ່ ແລະ ຊື່ class ເມນູ (aside.drawer / .drawer-sec) ປ່ຽນ ຕ້ອງປັບໄຟລ໌ນີ້; ລາຍງານຍັງເຂົ້າໄດ້ຈາກໜ້າຫຼັກ (ໝວດ "ລາຍງານ"). */
(function () {
  var tok = ''; try { tok = localStorage.getItem('fuel_tk') || ''; } catch (e) { }
  if (!tok || !window.fetch) return;
  var allowed = false;
  function inject(drawer) {
    if (drawer.querySelector('[data-hrx]')) return;
    var sec = null; [].forEach.call(drawer.querySelectorAll('.drawer-sec'), function (s) { if (/ລາຍງານ ແລະ ການອະນຸມັດ/.test(s.textContent)) sec = s; });
    var ref = drawer.querySelector('button svg'), cls = ref ? ref.getAttribute('class') || '' : '';
    var btn = document.createElement('button'); btn.type = 'button'; btn.setAttribute('data-hrx', '1');
    btn.innerHTML = '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13l4 4M13 13l-4 4"/></svg><span class="grow">ລາຍງານ HR (Excel)</span>';
    btn.onclick = function () { location.href = '/hrreport.html?from=hr'; };
    if (sec) sec.insertAdjacentElement('afterend', btn); else { var first = drawer.querySelector('.drawer-sec'); if (first) drawer.insertBefore(btn, first); else drawer.appendChild(btn); }
  }
  function scan() { if (!allowed) return; var d = document.querySelector('aside.drawer'); if (d) inject(d); }
  fetch('/api/hrreport.info', { method: 'POST', body: JSON.stringify({ token: tok }) }).then(function (r) { return r.json(); }).then(function (r) {
    allowed = !!(r && r.ok); if (!allowed) return; scan();
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  }).catch(function () { });
})();
