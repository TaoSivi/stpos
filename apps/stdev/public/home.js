/* ໜ້າຫຼັກ (launcher): ສະແດງແອັບທີ່ບັນຊີນີ້ມີສິດ ຈັດເປັນໝວດ — ລາຍການ ແລະ ໝວດມາຈາກທະບຽນແອັບຂອງ server (me.apps / me.cats), ແອັບໃໝ່ຂຶ້ນເອງເມື່ອລົງທະບຽນ */
'use strict';
function greet() { var h = new Date().getHours(); return h < 11 ? 'ສະບາຍດີຕອນເຊົ້າ' : h < 17 ? 'ສະບາຍດີຕອນບ່າຍ' : 'ສະບາຍດີຕອນແລງ'; }
function today() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); }
api('me').then(function (r) {
 if (!r.ok) { if (r.error === 'net') { $('hd').innerHTML = header('LTG Track', ''); $('v').innerHTML = '<div class="card empty">ບໍ່ມີເນັດ ແລະ ຍັງບໍ່ມີຂໍ້ມູນໃນເຄື່ອງ — ເປີດໃໝ່ເມື່ອມີເນັດ 1 ເທື່ອ</div>'; return; } ls('fuel_tk', null); location.href = '/'; return; } var m = r.data, apps = m.apps || [], cats = m.cats && m.cats.length ? m.cats : [{ id: 'work', name: 'ແອັບ' }];
 $('hd').innerHTML = header('LTG Track', m.name); $('lo').onclick = logout; installHint('inst');
 var tile = function (a, i) { return '<button class="tile" data-app="' + esc(a.id) + '" data-cat="' + esc(a.cat || 'work') + '" style="animation-delay:' + i * 70 + 'ms"><div class="logo">' + ic(a.icon) + '</div><div class="grow"><b>' + esc(a.name) + '</b><span class="muted">' + esc(a.desc) + '</span></div>' + ic('next', 'muted') + '</button>'; };
 var known = {}; cats.forEach(function (c) { known[c.id] = 1; });
 var sections = cats.map(function (c) { return { c: c, list: apps.filter(function (a) { return (known[a.cat] ? a.cat : cats[0].id) === c.id; }) }; }).filter(function (s) { return s.list.length; }), n = 0;
 var h = '<section class="hello"><div><small>' + greet() + '</small><b>' + esc(m.name) + '</b></div><span class="chip">' + today() + '</span></section>';
 if (apps.length > 6) h += '<input id="q" class="search" type="search" placeholder="ຄົ້ນຫາແອັບ…" aria-label="ຄົ້ນຫາແອັບ">';
 h += sections.map(function (s) { return '<section class="cat" data-c="' + esc(s.c.id) + '"><h2 class="cat-h">' + esc(s.c.name) + '<small>' + (s.c.hint ? esc(s.c.hint) : '') + '</small></h2><div class="grid">' + s.list.map(function (a) { return tile(a, n++); }).join('') + '</div></section>'; }).join('');
 $('v').innerHTML = h || '<div class="card empty"><div class="logo" style="background:#eaf0f0;color:var(--muted)">' + ic('lock') + '</div>ບັນຊີນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ແອັບໃດ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ</div>';
 if ($('q')) $('q').oninput = function () { var t = this.value.trim().toLowerCase(); document.querySelectorAll('.tile').forEach(function (b) { b.style.display = !t || b.textContent.toLowerCase().indexOf(t) >= 0 ? '' : 'none'; }); document.querySelectorAll('.cat').forEach(function (s) { s.style.display = [].some.call(s.querySelectorAll('.tile'), function (b) { return b.style.display !== 'none'; }) ? '' : 'none'; }); };
 api('pending').then(function (p) { if (!p.ok || !p.data.n) return; var t = document.querySelector('[data-app="fuel"]'); if (t) { var b = document.createElement('span'); b.className = 'tbadge'; b.textContent = p.data.n; b.title = (p.data.wait ? p.data.wait + ' ລໍຮັບຮູ້ ' : '') + (p.data.rej ? p.data.rej + ' ຖືກປະຕິເສດ' : ''); t.appendChild(b); } try { navigator.setAppBadge && navigator.setAppBadge(p.data.n); } catch (e) {} });
 window.APPS_HR = apps.some(function (a) { return a.action === 'hr'; }); readyChip(); hrWarm(apps);
 $('v').onclick = function (e) {
  var b = e.target.closest('[data-app]'); if (!b) return; var a = apps.filter(function (x) { return x.id === b.dataset.app; })[0]; if (!a) return;
  if (a.action === 'hr') openHr(); else if (a.href) location.href = a.href;
 };
});

/* ບອກວ່າເຄື່ອງພ້ອມໃຊ້ຕອນບໍ່ມີເນັດແລ້ວບໍ (ໂຫຼດຂໍ້ມູນທຸກໜ້າມາເກັບຄົບ) + ເລກເວີຊັນ — ເຫັນແລ້ວຮູ້ວ່າປິດເນັດໄດ້ */
function readyChip() {
 var el = document.createElement('p'); el.id = 'rdy'; el.style.cssText = 'text-align:center;font-size:13px;margin:16px 0 0;color:var(--muted)'; $('v').appendChild(el);
 var n = 0, chk = function () { kv.get('warmts').then(function (t) { hrReady().then(function (hk) { var hasHr = (window.APPS_HR === true); el.innerHTML = (t ? '<span style="color:#0a7e7a;font-weight:700">✓ ພ້ອມໃຊ້ຕອນບໍ່ມີເນັດ</span>' : '<span style="color:#b26b00">… ກຳລັງກຽມຂໍ້ມູນສຳລັບຕອນບໍ່ມີເນັດ (ຢ່າເພິ່ງປິດເນັດ)</span>') + (hasHr ? (hk ? ' · <span style="color:#0a7e7a;font-weight:700">ST HR ✓</span>' : ' · <span style="color:#b26b00">ST HR …</span>') : '') + ' · v' + esc(APPV); if ((!t || (hasHr && !hk)) && ++n < 60) setTimeout(chk, 3000); }); }); };
 chk();
}

/* ກຽມ HR ໃຫ້ໃຊ້ຕອນບໍ່ມີເນັດ (ຄືແອັບນ້ຳມັນ): 1) ຂໍ session HR ມາເກັບໄວ້ເອງ 2) ເປີດ /hr/ ໃນກອບທີ່ເບິ່ງບໍ່ເຫັນ ໃຫ້ HR ຕິດຕັ້ງໄຟລ໌ຂອງມັນ (ໂຄ້ດ + ໂມເດວໃບໜ້າ) — ເຮັດຕອນມີເນັດ ເມື່ອຍັງບໍ່ພ້ອມ */
function hrReady() { /* session ໃນເຄື່ອງ + ໄຟລ໌ HR ເກັບແລ້ວ */
 var sess = !!(ls('sthr-sheets-token') && ls('sthr-sheets-me')); if (!sess || !window.caches) return Promise.resolve(false);
 return caches.has('sthr-v4').then(function (h) { return h ? caches.open('sthr-v4').then(function (c) { return c.keys().then(function (k) { return k.some(function (r) { return /open5\.js/.test(r.url); }) && k.length > 8; }); }) : false; }).catch(function () { return false; });
}
function hrWarm(apps) {
 if (!apps.some(function (a) { return a.action === 'hr'; }) || navigator.onLine === false || (typeof OFF !== 'undefined' && OFF)) return;
 var frame = function () { hrReady().then(function (ok) { if (ok) return; var f = document.createElement('iframe'); f.src = '/hr/'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.style.cssText = 'position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px'; document.body.appendChild(f); setTimeout(function () { if (f.parentNode) f.remove(); }, 120000); }); };
 var at = +ls('sthr-gate-at') || 0;
 if (ls('sthr-sheets-token') && Date.now() - at < 6 * 36e5) { setTimeout(frame, 8000); return; }
 api('hrlogin').then(function (r) { if (r.ok && r.data && r.data.hr) hrStore(r.data.hr); setTimeout(frame, 3000); });
}
