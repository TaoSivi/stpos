/* Service worker: ເປີດແອັບໄດ້ທັນທີ ແລະ ຕອນສັນຍານອ່ອນ (ໜ້າ/ສະຄຣິບ/ໄອຄອນ ເກັບໃນເຄື່ອງ).
 * /api/ ບໍ່ຖືກເກັບທີ່ນີ້ — ຂໍ້ມູນນ້ຳມັນ + ຄິວບັນທຶກຕອນອອບລາຍ ຢູ່ IndexedDB ໃນ offline.js.
 * ປ່ຽນ VER ທຸກຄັ້ງທີ່ແກ້ໄຟລ໌ໜ້າ ເພື່ອໃຫ້ມືຖືໂຫຼດຕົວໃໝ່ */
'use strict';
const VER = 'stdev-v84', SHELL = ['/', 'index.html', 'home.html', 'home.js', 'admin.html', 'admin.js', 'admin.css', 'sop.html', 'sop.js', 'sop.css', 'hrreport.html', 'hrreport.js', 'people.html', 'perm.js', 'office.html', 'office.css', 'office-ops.js', 'office-rep.js', 'office-admin.js', 'driver.html', 'fuel.css', 'tank.js', 'app.js', 'offline.js', 'login.js', 'office.js', 'driver.js', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png', 'cover.webp'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VER).then(function (c) { return Promise.all(SHELL.map(function (u) { return fetch(new Request(u, { cache: 'reload' })).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); })); /* cache:'reload' = ບໍ່ເອົາສຳເນົາເກົ່າຈາກ HTTP cache (LiteSpeed ໃຫ້ເກັບ 7 ວັນ) */ }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('/api/') === 0 || u.pathname.indexOf('/hr') === 0) return; /* /hr/ ມີ service worker ຂອງຕົນເອງ */
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (r) { if (r.ok) { const copy = r.clone(); caches.open(VER).then(function (c) { c.put(e.request, copy); }); } return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); })); /* network-first: ແກ້ໂຄ້ດແລ້ວເຫັນທັນທີ, ບໍ່ມີເນັດຈຶ່ງໃຊ້ສຳເນົາ */
});
