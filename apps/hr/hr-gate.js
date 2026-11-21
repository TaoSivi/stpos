/* ປະຕູໜ້າ HR: ໃຫ້ເຂົ້າ HR ດ້ວຍບັນຊີກາງ (stdev.store) ສະເໝີ — ບໍ່ໃຫ້ເຫັນໜ້າ login ຂອງ HR ເອງ.
 * ແຍກຈາກ build ຂອງ HR (ບໍ່ແກ້ໂຄ້ດ HR): index.html ໂຫຼດໄຟລ໌ນີ້ ແທນ <script type="module"> ຫຼັກ ແລ້ວ ໄຟລ໌ນີ້ຄ່ອຍໂຫຼດໂຕຫຼັກ (data-main) ຫຼັງຕັ້ງ session ແລ້ວ.
 *  1) ມີ session HR ໃໝ່ (< 12 ຊົ່ວໂມງ) → ເປີດ HR ເລີຍ (ໃຊ້ໄດ້ຕອນບໍ່ມີເນັດ)
 *  2) ມີ session ກາງ (fuel_tk) → ຂໍ session HR ໃໝ່ຈາກ /api/hrlogin ແລ້ວເປີດ HR; ບັນຊີນີ້ບໍ່ມີ HR → ໜ້າຫຼັກ; session ກາງໝົດ → ໜ້າ login ກາງ
 *  3) ບໍ່ມີ session ກາງ → ຖ້າມີ session HR ເກົ່າ ເປີດໄປກ່ອນ (ອາດໃຊ້ຕອນບໍ່ມີເນັດ) ບໍ່ດັ່ງນັ້ນ ໜ້າ login ກາງ
 *  ຫຼັງເປີດ: ຖ້າ session HR ຫາຍ (ກົດອອກຈາກລະບົບໃນ HR / ໝົດອາຍຸ) → ກັບໜ້າຫຼັກ ແທນທີ່ຈະເປັນໜ້າ login HR
 * ໄຟລ໌ -open.js = build ເດີມ ແຕ່ປຸ່ມລົງເວລາ (ເຂົ້າ/ອອກ/ພັກ) ກົດໄດ້ຕະຫຼອດ (q=_.allowed ຖືກແທນ). ຖ້າສ້າງ HR build ໃໝ່ ໃຫ້ແກ້ ຊື່ໄຟລ໌ data-main ໃນ index.html ໃຫ້ຕົງກັບ assets/index-*.js ໃໝ່. */
(function () {
  var me = document.currentScript, MAIN = me && me.getAttribute('data-main'), FRESH = 12 * 36e5;
  var get = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  var set = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } };
  var go = function (u) { location.replace(u); };
  var boot = function () {
    var s = document.createElement('script'); s.type = 'module'; s.crossOrigin = 'anonymous'; s.src = MAIN;
    s.onerror = function () { /* ໂຫຼດໂຄ້ດ HR ບໍ່ໄດ້ (ບໍ່ມີເນັດ + ຍັງບໍ່ເຄີຍເກັບໄວ້) — ບອກແທນຈໍຂາວ */ document.body.innerHTML = '<div style="font:18px/1.7 system-ui,sans-serif;padding:32px;text-align:center;color:#0f2e2c"><p><b>ເປີດ ST HR ບໍ່ໄດ້</b></p><p>ຍັງບໍ່ໄດ້ໂຫຼດ HR ມາເກັບໄວ້ໃນເຄື່ອງນີ້. ຕ້ອງເຂົ້າໜ້າຫຼັກຕອນມີເນັດ ແລະ ລໍ 1-2 ນາທີ ຈົນຂຶ້ນ "ST HR ✓".</p><p><a href="/home.html" style="display:inline-block;margin-top:12px;padding:12px 22px;border-radius:12px;background:#0a7e7a;color:#fff;text-decoration:none">ກັບໜ້າຫຼັກ</a></p></div>'; };
    document.head.appendChild(s);
    setInterval(function () { if (!get('sthr-sheets-token')) { set('sthr-gate-at', null); go('/home.html'); } }, 1500); /* session HR ຫາຍ → ກັບໜ້າຫຼັກ */
  };
  var central = get('fuel_tk'), hrTok = get('sthr-sheets-token'), at = +get('sthr-gate-at') || 0;
  if (hrTok && get('sthr-sheets-me') && (Date.now() - at < FRESH || navigator.onLine === false)) return boot(); /* ບໍ່ມີເນັດ = ໃຊ້ session ໃນເຄື່ອງເລີຍ ບໍ່ລໍ 4 ວິ */
  if (!central) return hrTok ? boot() : go('/');
  var ac = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ac) ac.abort(); }, 4000);
  fetch('/api/hrlogin', { method: 'POST', body: JSON.stringify({ token: central }), signal: ac ? ac.signal : undefined }).then(function (r) { return r.json(); }).then(function (r) {
    clearTimeout(timer);
    if (r.ok && r.data && r.data.hr) {
      var h = r.data.hr, url = location.origin + '/api/hr';
      set('sthr-sheets-info', null); set('sthr-sheets-logins', null);
      set('sthr-server', JSON.stringify({ kind: 'sheets', url: url, key: '' })); set('sthr-sheets-token', h.token);
      set('sthr-sheets-me', JSON.stringify({ member: h.member, company: h.company })); set('sthr-online', h.member.companyId); set('sthr-gate-at', String(Date.now()));
      return boot();
    }
    if (r.error === 'auth') { set('fuel_tk', null); return hrTok ? boot() : go('/'); }
    if (r.error === 'noapp') return go('/home.html');
    return hrTok ? boot() : go('/home.html');
  }).catch(function () { clearTimeout(timer); hrTok ? boot() : go('/home.html'); });
})();
