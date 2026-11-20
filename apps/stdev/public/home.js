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
 $('v').onclick = function (e) {
  var b = e.target.closest('[data-app]'); if (!b) return; var a = apps.filter(function (x) { return x.id === b.dataset.app; })[0]; if (!a) return;
  if (a.action === 'hr') openHr(); else if (a.href) location.href = a.href;
 };
});
