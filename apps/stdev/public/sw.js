/* Service worker: ເປີດແອັບໄດ້ທັນທີ ແລະ ຕອນສັນຍານອ່ອນ (ໜ້າ/ສະຄຣິບ/ໄອຄອນ ເກັບໃນເຄື່ອງ).
 * /api/ ບໍ່ຖືກເກັບທີ່ນີ້ — ຂໍ້ມູນນ້ຳມັນ + ຄິວບັນທຶກຕອນອອບລາຍ ຢູ່ IndexedDB ໃນ offline.js.
 * ປ່ຽນ VER ທຸກຄັ້ງທີ່ແກ້ໄຟລ໌ໜ້າ ເພື່ອໃຫ້ມືຖືໂຫຼດຕົວໃໝ່ */
'use strict';
const VER = 'stdev-v118', SHELL = ['/', 'index.html', 'home.html', 'home.js', 'admin.html', 'admin.js', 'admin.css', 'sop.html', 'sop.js', 'sop.css', 'hrreport.html', 'hrreport.js', 'people.html', 'perm.js', 'office.html', 'office.css', 'office-ops.js', 'office-rep.js', 'office-admin.js', 'driver.html', 'fuel.css', 'tank.js', 'app.js', 'offline.js', 'login.js', 'office.js', 'driver.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', 'cover.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VER).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); })); /* cache:'reload' = ບໍ່ເອົາສຳເນົາເກົ່າຈາກ HTTP cache (LiteSpeed ໃຫ້ເກັບ 7 ວັນ) */ }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { /* ເວີຊັນໃໝ່ມາແທນເກົ່າ → ໂຫຼດທຸກໜ້າທີ່ເປີດຢູ່ໃໝ່ເອງ (ໜ້າເກົ່າບໍ່ຕ້ອງມີໂຄ້ດຮັບຮູ້) — ຜູ້ໃຊ້ບໍ່ຕ້ອງເຮັດຫຍັງ; ຄິວອອບລາຍເກັບໃນ IndexedDB ບໍ່ຫາຍ */
  let upgraded = false;
  e.waitUntil(caches.keys().then(function (ks) { upgraded = ks.some(function (k) { return k !== VER && k !== 'stdev-fonts'; }); return Promise.all(ks.filter(function (k) { return k !== VER && k !== 'stdev-fonts'; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }).then(function () { if (!upgraded) return; return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (x) { } }); }); }));
});
const FONTS = 'stdev-fonts';
self.addEventListener('fetch', function (e) {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { /* ຟອນ: ຄັ້ງທຳອິດໂຫຼດ ແລ້ວເກັບໄວ້ — ຕໍ່ໄປເປີດທັນທີ ແມ້ບໍ່ມີເນັດ */
    e.respondWith(caches.open(FONTS).then(function (c) { return c.match(e.request).then(function (hit) { return hit || fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; }); }); }));
    return;
  }
  if (u.origin !== location.origin || u.pathname.indexOf('/api/') === 0 || u.pathname.indexOf('/hr') === 0) return; /* /hr/ ມີ service worker ຂອງຕົນເອງ */
  /* ໜ້າ/ໂຄ້ດ: ເປີດຈາກເຄື່ອງທັນທີ (ບໍ່ລໍເນັດ) ແລ້ວໂຫຼດຕົວໃໝ່ເກັບໄວ້ເບື້ອງຫຼັງ. ເວີຊັນໃໝ່ເຂົ້າມາດ້ວຍ VER ປ່ຽນ → install ໂຫຼດໃໝ່ທັງໝົດ + ໜ້າໂຫຼດໃໝ່ເອງ */
  const key = new Request(u.origin + u.pathname);
  e.respondWith(caches.open(VER).then(function (c) { return c.match(key).then(function (hit) {
    if (hit) return hit; /* ບໍ່ໂຫຼດຊ້ຳເບື້ອງຫຼັງທຸກເທື່ອ (ແຍ່ງຊ່ອງເນັດກັບ API ເຮັດໃຫ້ຊ້າ) — ເວີຊັນໃໝ່ມາຕອນ VER ປ່ຽນ: install ໂຫຼດໃໝ່ທັງໝົດ */
    return fetch(e.request, { cache: 'no-cache' }).then(function (r) { if (r.ok) c.put(key, r.clone()); return r; }).catch(function () { return Response.error(); });
  }); }));
});
