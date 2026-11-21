/* ກວດວ່າມືຖືຕໍ່ເຊີບເວີໄດ້ບໍ ແລະ ໃຊ້ເວລາເທົ່າໃດ — ບໍ່ແຕະຂໍ້ມູນ (ໃຊ້ຄຳຂໍ me ທີ່ບໍ່ມີ token) */
'use strict';
var out = document.getElementById('out');
function row(t, ok, d) { var e = document.createElement('div'); e.className = 'r'; e.innerHTML = '<b class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '✗') + '</b> ' + t + (d ? '<br><small>' + d + '</small>' : ''); out.appendChild(e); }
function probe(name, url, opt) {
 var t0 = Date.now(), ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 30000);
 return fetch(url + (url.indexOf('?') < 0 ? '?x=' : '&x=') + Date.now(), Object.assign({ signal: ctl.signal, cache: 'no-store' }, opt || {})).then(function (r) { clearTimeout(to); return r.text().then(function (x) { row(name, r.ok, 'HTTP ' + r.status + ' · ' + (Date.now() - t0) + ' ms · ' + x.length + ' ໂຕ'); }); }, function (e) { clearTimeout(to); row(name, false, (e && e.name === 'AbortError' ? 'ໝົດເວລາ 30 ວິ' : 'ຕໍ່ບໍ່ໄດ້: ' + (e && e.message)) + ' · ' + (Date.now() - t0) + ' ms'); });
}
document.getElementById('go').onclick = function () {
 out.innerHTML = ''; row('ສັນຍານ (navigator.onLine)', navigator.onLine, navigator.onLine ? 'ມືຖືບອກວ່າມີເນັດ' : 'ມືຖືບອກວ່າບໍ່ມີເນັດ');
 var sw = navigator.serviceWorker && navigator.serviceWorker.controller; row('Service worker', !!sw, sw ? 'ເຮັດວຽກຢູ່' : 'ບໍ່ໄດ້ຄວບຄຸມໜ້ານີ້');
 probe('ໄຟລ໌ໜ້າເວັບ (sw.js)', 'sw.js').then(function () { return probe('ເຊີບເວີຂໍ້ມູນ (api/me)', 'api/me', { method: 'POST', body: '{}' }); }).then(function () { return probe('ເຊີບເວີຂໍ້ມູນ ເທື່ອທີ 2', 'api/me', { method: 'POST', body: '{}' }); }).then(function () { return probe('Google Fonts', 'https://fonts.googleapis.com/css2?family=Noto+Sans+Lao', { mode: 'no-cors' }); });
};
