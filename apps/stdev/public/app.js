/* ຕົວຊ່ວຍຮ່ວມ ຂອງທຸກໜ້າ: icon, api, toast, ໂມດອນ, ຮູບ, ສົ່ງອອກ PDF / Excel */
'use strict';
var $ = function (i) { return document.getElementById(i); };
function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return ''; } return ''; }
var ICONS = {
 pump: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M7 7h6v4H7zM15 10h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
 truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
 cam: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/>',
 check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
 user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/>',
 users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.9.1 5 2.3 5 5.3"/>',
 sheet: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>', report: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
 ledger: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
 gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
 out: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>', pdf: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 15h1.5a1.3 1.3 0 0 0 0-2.6H9V17M14 12.4V17h1.2a2.3 2.3 0 0 0 0-4.6z"/>',
 xls: '<path d="M6 3h9l4 4v14H6z"/><path d="M9.5 12.5l4 5M13.5 12.5l-4 5"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4"/>', back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
 grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
 edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/>',
 dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 inbox: '<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
 key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
 alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.1"/>'
};
function ic(n, extra) { return '<svg class="i ' + (extra || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }
function L(x) { return x == null ? '–' : Math.round(x).toLocaleString('en') + ' L'; }
function when(t) { return new Date(t).toLocaleString('en-GB', { timeZone: 'Asia/Vientiane', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
function dmy(d) { return d.split('-').reverse().join('/'); }
function shift(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); }

var ERR = { auth: 'ເຈົ້າບໍ່ມີສິດເຮັດລາຍການນີ້', locked: 'ໃບນີ້ອະນຸມັດແລ້ວ ແກ້ບໍ່ໄດ້', acked: 'ຄົນຂັບຮັບຮູ້ແລ້ວ — ຕ້ອງໃຫ້ຫົວໜ້າສະໜາມແກ້', unacked: 'ຍັງມີລົດທີ່ຄົນຂັບບໍ່ທັນຮັບຮູ້', empty: 'ຍັງບໍ່ໄດ້ກອກ cm ກ່ອນ ແລະ ຫຼັງເຕີມ', image: 'ຮູບໃຫຍ່ເກີນໄປ', run: 'ບໍ່ພົບໃບເຊັກນີ້', tpl: 'ບໍ່ພົບເຊັກລິດນີ້', label: 'ໃສ່ຊື່ກຳກັບກ່ອນ', open: 'ຍັງຕອບບໍ່ຄົບທຸກຂໍ້', note: 'ຂໍ້ທີ່ບໍ່ຜ່ານ ຕ້ອງຂຽນເຫດຜົນ', item: 'ລາຍການບໍ່ຖືກຕ້ອງ', people: 'ບໍ່ພົບພະນັກງານ ຫຼື ບັນຊີຖືກປິດ', empty: 'ຕ້ອງມີຢ່າງໜ້ອຍ 1 ຂໍ້', cmrange: 'ຄ່າ cm ເກີນຄວາມສູງຖັງ — ກວດຕົວເລກອີກຄັ້ງ', cmorder: 'cm ຫຼັງເຕີມຕ້ອງບໍ່ຕ່ຳກວ່າ cm ກ່ອນເຕີມ', future: 'ກອກລ່ວງໜ້າວັນທີບໍ່ໄດ້', old: 'ວັນທີນີ້ເກົ່າເກີນໄປ — ແກ້ຍ້ອນຫຼັງໄດ້ສະເພາະຫົວໜ້າ/ເຈົ້າຂອງ', net: 'ເຊື່ອມຕໍ່ server ບໍ່ໄດ້ — ກວດອິນເຕີເນັດ', phone: 'ເບີໂທຕ້ອງເປັນຕົວເລກ 8-15 ຫຼັກ', name: 'ໃສ່ຊື່', pin: 'PIN ຕ້ອງເປັນຕົວເລກ 4-8 ຫຼັກ', oldpin: 'PIN ເກົ່າບໍ່ຖືກ', lastowner: 'ຕ້ອງມີເຈົ້າຂອງຢ່າງໜ້ອຍ 1 ຄົນທີ່ເປີດໃຊ້ຢູ່', role: 'ເລືອກໜ້າທີ່', level: 'ລະດັບບັນຊີບໍ່ຖືກ', noapp: 'ບັນຊີນີ້ບໍ່ມີສິດໃຊ້ແອັບນີ້', nohr: 'ຍັງບໍ່ໄດ້ສ້າງລະບົບ HR ໃນ server', lastsuper: 'ຕ້ອງມີ Super admin ຢ່າງໜ້ອຍ 1 ຄົນທີ່ເປີດໃຊ້ຢູ່', nomodule: 'ເລືອກຢ່າງໜ້ອຍ 1 ແອັບ (ນ້ຳມັນ ຫຼື HR)' };
/* api() ແລະ logout() ຢູ່ offline.js (ຮອງຮັບຕອນບໍ່ມີເນັດ) */

var _t;
function toast(msg, kind) { var o = document.querySelector('.toast'); if (o) o.remove(); var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); clearTimeout(_t); _t = setTimeout(function () { t.remove(); }, 3500); }
/* ໂມດອນ: ຄືນ element; ປິດດ້ວຍ close() ຫຼື ກົດພື້ນຫຼັງ */
function modal(html) { var m = document.createElement('div'); m.className = 'mask'; m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>'; m.onclick = function (e) { if (e.target === m) m.remove(); }; document.body.appendChild(m); return m; }
function ask(title, label, okText) { /* ຖາມຂໍ້ຄວາມ → Promise(ຂໍ້ຄວາມ | null) */
 return new Promise(function (res) {
  var m = modal('<h2>' + esc(title) + '</h2><label class="f">' + esc(label) + '<textarea rows="3" maxlength="200" id="askv"></textarea></label><div class="row" style="margin-top:14px"><button class="btn line grow" id="askn">ຍົກເລີກ</button><button class="btn bad grow" id="asky" style="background:var(--bad);color:#fff">' + esc(okText) + '</button></div>');
  m.querySelector('#askv').focus(); m.querySelector('#askn').onclick = function () { m.remove(); res(null); }; m.querySelector('#asky').onclick = function () { var v = m.querySelector('#askv').value.trim(); if (!v) { toast('ກະລຸນາບອກເຫດຜົນ', 'bad'); return; } m.remove(); res(v); };
 });
}
/* ripple ຢູ່ປຸ່ມ */
document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('.btn'); if (!b) return; var r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height); s.className = 'rp'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px'; b.appendChild(s); setTimeout(function () { s.remove(); }, 650); });

/* ຮູບ: ຫຍໍ້ໃນເຄື່ອງກ່ອນສົ່ງ (ຂ້າງຍາວ 900px, JPEG) — ອິນເຕີເນັດສະໜາມຊ້າ */
function shrink(file) { return new Promise(function (res, rej) { var img = new Image(); img.onload = function () { var s = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.6)); }; img.onerror = rej; img.src = URL.createObjectURL(file); }); }
/* ກ້ອງສົດ: ບໍ່ມີປຸ່ມເລືອກຮູບຈາກຄັງ → ຖ່າຍໄວ້ກ່ອນແລ້ວອັບທີຫຼັງບໍ່ໄດ້. ຮູບປະທັບ ວັນເວລາ + ຊື່ + ປ້າຍ. cb(dataURL, 'cam') ຫຼື cb(null) ຖ້າເປີດກ້ອງບໍ່ໄດ້ */
function liveCam(label, cb) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return cb(null);
  var m = modal('<video playsinline muted autoplay style="width:100%;border-radius:16px;background:#000;max-height:60vh"></video><div class="row" style="gap:10px;margin-top:12px"><button class="btn grow" id="camok">' + ic('cam') + 'ຖ່າຍ</button><button class="btn line" id="camno">ຍົກເລີກ</button></div>'), v = m.querySelector('video'), st = null;
  var stop = function () { if (st) st.getTracks().forEach(function (t) { t.stop(); }); m.remove(); };
  m.querySelector('#camno').onclick = function () { stop(); cb(undefined); };
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).then(function (s) { st = s; v.srcObject = s; return v.play(); }).catch(function () { stop(); cb(null); });
  m.querySelector('#camok').onclick = function () {
    if (!v.videoWidth) return; var s = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
    var g = c.getContext('2d'); g.drawImage(v, 0, 0, c.width, c.height); var h = Math.max(22, Math.round(c.height / 16)); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, c.height - h, c.width, h);
    g.fillStyle = '#fff'; g.font = 'bold ' + Math.round(h * 0.55) + 'px sans-serif'; g.textBaseline = 'middle';
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; g.fillText(p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ' · ' + label, 8, c.height - h / 2, c.width - 16);
    var url = c.toDataURL('image/jpeg', 0.6); stop(); cb(url);
  };
}
function viewPhoto(src) { var m = modal('<img alt="" src="' + src + '" style="width:100%;border-radius:16px"><button class="btn line blk" style="margin-top:12px">ປິດ</button>'); m.querySelector('button').onclick = function () { m.remove(); }; }

/* ສົ່ງອອກ: PDF = ໜ້າພິມຂອງບຣາວເຊີ (ເລືອກ "Save as PDF" — ຕົວອັກສອນລາວຖືກຕ້ອງ) · Excel = SheetJS ຈາກ cdnjs */
function exportPdf() { window.print(); }
function loadXlsx() { return new Promise(function (res, rej) { if (window.XLSX) return res(); var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function exportXlsx(name, rows, widths, merges) {
 return loadXlsx().then(function () { var ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = (widths || []).map(function (w) { return { wch: w }; }); if (merges) ws['!merges'] = merges; var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); XLSX.writeFile(wb, name + '.xlsx'); toast('ບັນທຶກ Excel ແລ້ວ', 'ok'); }, function () { toast('ໂຫຼດຕົວສ້າງ Excel ບໍ່ໄດ້ — ຕ້ອງມີອິນເຕີເນັດ', 'bad'); });
}
function header(title, sub, right) { var home = /home\.html$/.test(location.pathname) ? '' : '<a class="ic" href="home.html" aria-label="ໜ້າຫຼັກ (ເລືອກແອັບ)" title="ໜ້າຫຼັກ" style="text-decoration:none">' + ic('grid') + '</a>'; return '<div class="top"><div class="in"><div class="logo float">' + ic('pump') + '</div><div class="grow"><h1>' + esc(title) + '</h1><small>' + esc(sub || '') + '</small></div>' + home + (right || '') + '<button class="ic" id="lo" aria-label="ອອກຈາກລະບົບ">' + ic('out') + '</button></div></div>'; }

/* ===== ແອັບໃນມືຖື (PWA): ລົງທະບຽນ service worker + ຊ່ວຍຕິດຕັ້ງ ===== */
if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
var DEFER = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DEFER = e; var b = document.getElementById('instbtn'); if (b) b.classList.remove('hide'); });
function installHint(id) { /* Android/Chrome: ປຸ່ມຕິດຕັ້ງ · iPhone/iPad (Safari): ບອກວິທີ "ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ" · ເປີດຈາກໄອຄອນແລ້ວ: ບໍ່ສະແດງ */
 var el = $(id), standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; if (!el || standalone) return;
 var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 if (ios) el.innerHTML = '<div class="inst">ຕິດຕັ້ງໃນ iPhone: ກົດປຸ່ມ <b>ແຊຣ໌</b> (ສີ່ຫຼ່ຽມມີລູກສອນຂຶ້ນ) ໃນ Safari → <b>ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ</b></div>';
 else el.innerHTML = '<div class="inst">ໃຊ້ເປັນແອັບໃນມືຖື ບໍ່ຕ້ອງດາວໂຫຼດຈາກ Store<button type="button" class="btn line hide" id="instbtn">' + ic('pump') + 'ຕິດຕັ້ງແອັບ</button></div>';
 var b = document.getElementById('instbtn'); if (b) { if (DEFER) b.classList.remove('hide'); b.onclick = function () { if (DEFER) { DEFER.prompt(); DEFER = null; b.classList.add('hide'); } }; }
}

/* ===== ເຂົ້າ HR ດ້ວຍບັນຊີດຽວ: server ອອກ session HR ໃຫ້ → ຕັ້ງຄ່າໃນເຄື່ອງ → ເປີດ /hr/ (ຮູບແບບດຽວກັບທີ່ແອັບ HR ໃຊ້ຕອນຕໍ່ server) ===== */
function openHr() {
 toast('ກຳລັງເຂົ້າ ST HR…');
 api('hrlogin').then(function (r) {
  if (!r.ok) return; var h = r.data.hr, url = location.origin + '/api/hr';
  ls('sthr-sheets-info', null); ls('sthr-sheets-logins', null);
  ls('sthr-server', JSON.stringify({ kind: 'sheets', url: url, key: '' })); ls('sthr-sheets-token', h.token);
  ls('sthr-sheets-me', JSON.stringify({ member: h.member, company: h.company })); ls('sthr-online', h.member.companyId);
  location.href = '/hr/?server=' + encodeURIComponent(url);
 });
}
