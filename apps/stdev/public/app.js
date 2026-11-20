/* ===== ໜ້າປົກ (splash): ຮູບປົກສະແດງກ່ອນເຂົ້າແອັບ ເທື່ອດຽວຕໍ່ການເປີດແອັບ (ຕໍ່ໄດ້ເຖິງແມ່ນຈະປ່ຽນໜ້າ/ເດັ້ງເຂົ້າໜ້າຫຼັກ) ===== */
(function () {
 var T = 1600, now = Date.now(), t0;
 try { t0 = +sessionStorage.getItem('ltg_sp0'); if (!t0) { t0 = now; sessionStorage.setItem('ltg_sp0', String(t0)); } } catch (e) { return; }
 var left = T - (now - t0); if (left < 120 || !document.body) return;
 var s = document.createElement('div'); s.id = 'splash'; s.setAttribute('role', 'presentation'); s.innerHTML = '<img src="cover.webp" alt="LTG Track" width="340" height="340"><div class="sp-dots" aria-hidden="true"><i></i><i></i><i></i></div>';
 document.body.appendChild(s);
 var end = function () { if (!s.parentNode) return; s.classList.add('off'); setTimeout(function () { if (s.parentNode) s.remove(); }, 450); };
 s.onclick = end; setTimeout(end, left);
})();
/* ຕົວຊ່ວຍຮ່ວມ ຂອງທຸກໜ້າ: icon, api, toast, ໂມດອນ, ຮູບ, ສົ່ງອອກ PDF / Excel */
'use strict';
var $ = function (i) { return document.getElementById(i); };
function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return ''; } return ''; }
var ICONS = {
 home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
 calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
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
 menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
 dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 inbox: '<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
 key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
 alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.1"/>'
};
function ic(n, extra) { return '<svg class="i ' + (extra || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[n] || '') + '</svg>'; }
function L(x) { return x == null ? '–' : Math.round(x).toLocaleString('en') + ' L'; }
function when(t) { return new Date(t).toLocaleString('en-GB', { timeZone: 'Asia/Vientiane', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); }
function dmy(d) { return d.split('-').reverse().join('/'); }
function shift(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); }

var ERR = { nobill: 'ມີການຮັບນ້ຳມັນເຂົ້າແທ່ງທີ່ຍັງບໍ່ໄດ້ແນບຮູບບິນ — ແນບກ່ອນຈຶ່ງອະນຸມັດໄດ້', nofill: 'ມື້ນີ້ຍັງບໍ່ມີການເຕີມ — ບໍ່ຕ້ອງອະນຸມັດໃບ (ມື້ທີ່ບໍ່ມີຄຳຂໍ ບໍ່ຕ້ອງເຮັດຫຍັງ)', reason: 'ໃສ່ເຫດຜົນຂອງການແກ້ໄຂ', nodriver: 'ລົດຄັນນີ້ບໍ່ມີຄົນຂັບມື້ນີ້ — ກຳນົດຄົນຂັບແທນກ່ອນ ຖ້າບໍ່ມີຄົນແທນ ບໍ່ເຕີມ', driver: 'ຄົນຂັບທີ່ເລືອກບໍ່ມີບັນຊີນ້ຳມັນ', subacked: 'ຄົນຂັບຮັບຮູ້ແລ້ວ — ປ່ຽນຄົນຂັບບໍ່ໄດ້', photolock: 'ຮູບຖືກລັອກຫຼັງຄົນຂັບຮັບຮູ້ — ໃຫ້ຫົວໜ້າສະໜາມປ່ຽນ', overcap: 'ເຕີມເກີນທີ່ອະນຸມັດ — ຖ້າຕ້ອງການເພີ່ມ ໃຫ້ວິຊາການຂໍເພີ່ມ ແລະບໍລິຫານອະນຸມັດໃໝ່', stock: 'ແທ່ງເຫຼືອບໍ່ພໍ — ຫຼຸດລິດ ຫຼື ປ່ຽນແຫຼ່ງເປັນ "ຈັດຊື້ທີ່ປໍ້າ / ຮ້ານ"', self: 'ອະນຸມັດຄຳຂໍຂອງຕົນເອງບໍ່ໄດ້ — ໃຫ້ຄົນອື່ນອະນຸມັດ', dup: 'ມີລົດຄັນດຽວກັນຊ້ຳໃນໃບນີ້', norq: 'ຕ້ອງມີຄຳຂໍນ້ຳມັນທີ່ອະນຸມັດແລ້ວກ່ອນ ຈຶ່ງເຕີມໄດ້ — ໄປ "ເບີກອອກ / ເຕີມເຂົ້າລົດ" ແລ້ວກົດ "ເລີ່ມເຕີມ" (ຫຼື ເຕີມດ່ວນ)', rqoff: 'ສະໜາມນີ້ຍັງບໍ່ເປີດໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ', lit: 'ໃສ່ຈຳນວນລິດໃຫ້ຖືກ (ຫຼາຍກວ່າ 0)', rqstate: 'ຄຳຂໍນີ້ປ່ຽນສະຖານະແລ້ວ — ໂຫຼດໜ້າໃໝ່', rq: 'ບໍ່ພົບຄຳຂໍນີ້', rounds: 'ເຕີມໄດ້ສູງສຸດ 9 ຄັ້ງຕໍ່ລົດຕໍ່ມື້', openrq: 'ຍັງມີຄຳຂໍທີ່ລໍອະນຸມັດ ຫຼື ຍັງບໍ່ໄດ້ເຕີມ — ເຕີມ ຫຼື ຍົກເລີກຄຳຂໍກ່ອນ', rorder: 'ລຶບໄດ້ສະເພາະຄັ້ງສຸດທ້າຍ', auth: 'ເຈົ້າບໍ່ມີສິດເຮັດລາຍການນີ້', locked: 'ໃບນີ້ອະນຸມັດແລ້ວ ແກ້ບໍ່ໄດ້', acked: 'ຄົນຂັບຮັບຮູ້ແລ້ວ — ຕ້ອງໃຫ້ຫົວໜ້າສະໜາມແກ້', unacked: 'ຍັງມີລົດທີ່ຄົນຂັບບໍ່ທັນຮັບຮູ້', empty: 'ຍັງບໍ່ໄດ້ກອກ cm ກ່ອນ ແລະ ຫຼັງເຕີມ', image: 'ຮູບໃຫຍ່ເກີນໄປ', run: 'ບໍ່ພົບໃບເຊັກນີ້', tpl: 'ບໍ່ພົບເຊັກລິດນີ້', label: 'ໃສ່ຊື່ກຳກັບກ່ອນ', open: 'ຍັງຕອບບໍ່ຄົບທຸກຂໍ້', note: 'ຂໍ້ທີ່ບໍ່ຜ່ານ ຕ້ອງຂຽນເຫດຜົນ', item: 'ລາຍການບໍ່ຖືກຕ້ອງ', people: 'ບໍ່ພົບພະນັກງານ ຫຼື ບັນຊີຖືກປິດ', noitems: 'ຕ້ອງມີຢ່າງໜ້ອຍ 1 ຂໍ້', range: 'ຊ່ວງວັນທີຍາວເກີນ (ສູງສຸດ 93 ມື້)', date: 'ວັນທີບໍ່ຖືກຕ້ອງ', noemp: 'ບໍ່ພົບພະນັກງານຕາມເງື່ອນໄຂທີ່ເລືອກ', cmrange: 'ຄ່າ cm ເກີນຄວາມສູງຖັງ — ກວດຕົວເລກອີກຄັ້ງ', cmorder: 'cm ຫຼັງເຕີມຕ້ອງບໍ່ຕ່ຳກວ່າ cm ກ່ອນເຕີມ', future: 'ກອກລ່ວງໜ້າວັນທີບໍ່ໄດ້', old: 'ວັນທີນີ້ເກົ່າເກີນໄປ — ແກ້ຍ້ອນຫຼັງໄດ້ສະເພາະຫົວໜ້າ/ເຈົ້າຂອງ', net: 'ເຊື່ອມຕໍ່ server ບໍ່ໄດ້ — ກວດອິນເຕີເນັດ', phone: 'ເບີໂທຕ້ອງເປັນຕົວເລກ 8-15 ຫຼັກ', name: 'ໃສ່ຊື່', pin: 'PIN ຕ້ອງເປັນຕົວເລກ 4-8 ຫຼັກ', oldpin: 'PIN ເກົ່າບໍ່ຖືກ', lastowner: 'ຕ້ອງມີເຈົ້າຂອງຢ່າງໜ້ອຍ 1 ຄົນທີ່ເປີດໃຊ້ຢູ່', role: 'ເລືອກໜ້າທີ່', level: 'ລະດັບບັນຊີບໍ່ຖືກ', noapp: 'ບັນຊີນີ້ບໍ່ມີສິດໃຊ້ແອັບນີ້', nohr: 'ຍັງບໍ່ໄດ້ສ້າງລະບົບ HR ໃນ server', lastsuper: 'ຕ້ອງມີ Super admin ຢ່າງໜ້ອຍ 1 ຄົນທີ່ເປີດໃຊ້ຢູ່', nomodule: 'ເລືອກຢ່າງໜ້ອຍ 1 ແອັບ (ນ້ຳມັນ ຫຼື HR)' };
/* api() ແລະ logout() ຢູ່ offline.js (ຮອງຮັບຕອນບໍ່ມີເນັດ) */

var _t;
var TOASTN = 0;
function toast(msg, kind) { /* ປອບອັບກາງຈໍ: ✓ ສຳເລັດ / ! ຜິດພາດ — ແຕະເພື່ອປິດ */
 TOASTN++; var o = document.querySelector('.toast'); if (o) o.remove(); var t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.setAttribute('role', 'status');
 t.innerHTML = '<span class="tic">' + (kind === 'bad' ? ic('alert') : kind === 'ok' ? ic('check') : ic('bell')) + '</span><span class="tmsg"></span>'; t.querySelector('.tmsg').textContent = msg; t.onclick = function () { t.remove(); }; document.body.appendChild(t); if (kind === 'ok' && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) { var cl = ['#18a8a0', '#f5b800', '#2fae7b', '#0b7e7a', '#e0a100']; for (var q = 0; q < 14; q++) { var cf = document.createElement('i'), an = Math.random() * 6.283, dd = 60 + Math.random() * 70; cf.className = 'cf'; cf.style.cssText = '--dx:' + Math.round(Math.cos(an) * dd) + 'px;--dy:' + Math.round(Math.sin(an) * dd - 40) + 'px;--r:' + Math.round(Math.random() * 540) + 'deg;background:' + cl[q % 5]; t.appendChild(cf); } }
 clearTimeout(_t); _t = setTimeout(function () { t.remove(); }, kind === 'bad' ? 4500 : 2200); }
var _bz = 0, _bzT = 0, _bzL = '';
function bzy(d, label) { /* ປອບອັບ "ກຳລັງໂຫຼດ / ກຳລັງບັນທຶກ…" ເມື່ອໃຊ້ເວລາເກີນ ~0.5 ວິ */
 _bz = Math.max(0, _bz + d); if (d > 0 && label && (!_bzL || /\u0e9a\u0eb1\u0e99\u0e97\u0eb6\u0e81/.test(label))) _bzL = label;
 if (d > 0 && _bz === 1) _bzT = setTimeout(function () { if (!_bz || document.getElementById('bz')) return; var e = document.createElement('div'); e.id = 'bz'; e.className = 'bz'; e.innerHTML = '<div class="bzc"><span class="spin"></span><b></b></div>'; e.querySelector('b').textContent = _bzL; document.body.appendChild(e); setTimeout(function () { if (e.parentNode) { _bz = 0; e.remove(); } }, 25000); }, 450);
 if (!_bz) { clearTimeout(_bzT); _bzL = ''; var x = document.getElementById('bz'); if (x) x.remove(); } }
/* ===== ກະດິ່ງແຈ້ງເຕືອນ: ຕ້ອງເຮັດ (ຈາກໜ້ານັ້ນ) + ປະຫວັດ 30 ລາຍການຫຼ້າສຸດໃນເຄື່ອງນີ້ ===== */
function nlog() { try { return JSON.parse(localStorage.getItem('ltg_notif') || '') || { l: [], r: 0 }; } catch (e) { return { l: [], r: 0 }; } }
function nsave(o) { try { localStorage.setItem('ltg_notif', JSON.stringify(o)); } catch (e) { } }
function nadd(msg, kind) { var o = nlog(); o.l.unshift({ t: Date.now(), m: msg, k: kind || '' }); o.l = o.l.slice(0, 30); nsave(o); bellPaint(); }
function nTodo() { try { return window.notifTodo ? window.notifTodo() || [] : []; } catch (e) { return []; } }
function bellPaint() { var b = document.getElementById('bell'); if (!b) return; var n = nTodo().length, d = b.querySelector('.bd'); if (!d) { d = document.createElement('i'); d.className = 'bd'; b.appendChild(d); } d.textContent = n > 9 ? '9+' : n; d.hidden = !n; }
function openNotif() { /* ກະດິ່ງ: ສະແດງສະເພາະ "ລໍຖ້າອະນຸມັດ" */
 var td = nTodo(), e = document.createElement('div'); e.className = 'nov';
 e.innerHTML = '<div class="nsh" role="dialog" aria-label="\u0ec1\u0e88\u0ec9\u0e87\u0ec0\u0e95\u0eb7\u0ead\u0e99"><div class="nhd"><span class="nbell">' + ic('bell') + '</span><h2 class="grow">\u0ec1\u0e88\u0ec9\u0e87\u0ec0\u0e95\u0eb7\u0ead\u0e99</h2><button type="button" class="nx" id="nx" aria-label="\u0e9b\u0eb4\u0e94">' + ic('x') + '</button></div>' +
  (td.length ? td.map(function (x, i) { var m = String(x.t).match(/^(\d+)\s+(.+)$/); return '<button type="button" class="nit" data-ng="' + i + '">' + (m ? '<span class="nnum">' + m[1] + '</span>' : '<span class="nnum">' + ic(x.i || 'check') + '</span>') + '<span class="grow">' + esc(m ? m[2] : x.t) + '</span>' + ic('next', 'muted') + '</button>'; }).join('') : '<div class="nempty"><span>' + ic('check') + '</span></div>') + '</div>';
 e.onclick = function (ev) { var g = ev.target.closest('[data-ng]'); if (g) { e.remove(); var it = td[+g.dataset.ng]; if (it && it.go) it.go(); return; } if (ev.target === e || ev.target.closest('#nx')) e.remove(); };
 document.body.appendChild(e);
}
document.addEventListener('click', function (ev) { if (ev.target.closest('#bell')) openNotif(); else if (ev.target.closest('#hm')) location.href = 'home.html'; });
setInterval(bellPaint, 4000); document.addEventListener('DOMContentLoaded', function () { setTimeout(bellPaint, 600); });
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
function exportPdf(o) { /* PDF = ພິມເປັນ PDF ຂອງ browser; o = 'p' ແນວຕັ້ງ | 'l' ແນວນອນ (A4) */
 var s = document.getElementById('pgs'); if (!s) { s = document.createElement('style'); s.id = 'pgs'; document.head.appendChild(s); }
 o = o === 'p' ? 'p' : 'l'; s.textContent = '@page{size:A4 ' + (o === 'p' ? 'portrait' : 'landscape') + ';margin:10mm}'; document.body.dataset.orient = o; window.print();
}
function loadXlsx() { return new Promise(function (res, rej) { if (window.XLSX) return res(); var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function exportXlsx(name, rows, widths, merges) {
 return loadXlsx().then(function () { var ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = (widths || []).map(function (w) { return { wch: w }; }); if (merges) ws['!merges'] = merges; var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); XLSX.writeFile(wb, name + '.xlsx'); toast('ບັນທຶກ Excel ແລ້ວ', 'ok'); }, function () { toast('ໂຫຼດຕົວສ້າງ Excel ບໍ່ໄດ້ — ຕ້ອງມີອິນເຕີເນັດ', 'bad'); });
}
function header(title, sub, right) { /* ໜ້າຫຼັກ: ໂລໂກ້ + ອອກຈາກລະບົບ · ໜ້າອື່ນ: ☰ ເມນູ (ຊ້າຍ) · ຊື່ · ກັບຄືນ (ຂວາ) — ຮູບແບບດຽວກັບແອັບ HR */
 var pg = location.pathname.split('/').pop(), logo = ({ 'sop.html': 'sheet', 'hrreport.html': 'xls', 'admin.html': 'key', 'home.html': 'grid' })[pg] || 'pump';
 window.__hdr = { title: title, sub: sub || '', logo: logo };
 if (pg === 'home.html') return '<div class="top"><div class="in"><div class="logo float">' + ic(logo) + '</div><div class="grow"><h1>' + esc(title) + '</h1><small>' + esc(sub || '') + '</small></div>' + (right || '') + '<button class="ic" id="bell" aria-label="ແຈ້ງເຕືອນ" title="ແຈ້ງເຕືອນ">' + ic('bell') + '</button><button class="ic" id="lo" aria-label="ອອກຈາກລະບົບ">' + ic('out') + '</button></div></div>';
 return '<div class="top"><div class="in"><button class="ic" id="mb" aria-label="ເມນູ" title="ເມນູ" style="border-radius:50%">' + ic('menu') + '</button><div class="grow"><h1>' + esc(title) + '</h1><small>' + esc(sub || '') + '</small></div>' + (right || '') + '<button class="ic" id="bell" aria-label="ແຈ້ງເຕືອນ" title="ແຈ້ງເຕືອນ">' + ic('bell') + '</button><button class="ic" id="hm" aria-label="ໜ້າຫຼັກ" title="ໜ້າຫຼັກ">' + ic('home') + '</button><button class="ic" id="hb" aria-label="ກັບຄືນ" title="ກັບຄືນ">' + ic('back') + '</button><button id="lo" hidden aria-hidden="true"></button></div></div>';
}

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
  ls('sthr-sheets-me', JSON.stringify({ member: h.member, company: h.company })); ls('sthr-online', h.member.companyId); ls('sthr-gate-at', String(Date.now()));
  location.href = '/hr/?server=' + encodeURIComponent(url);
 });
}


/* ===== ປຸ່ມ/ທ່າປັດ "ກັບຄືນ" — iPhone/iPad ທີ່ເປີດເປັນແອັບ (ໜ້າຈໍຫຼັກ) ບໍ່ມີປຸ່ມຍ້ອນກັບ ແລະ ປັດຂ້າງບໍ່ໄດ້
 * ລຳດັບ: ປິດໜ້າຕ່າງທີ່ເປີດຢູ່ (ກົດປຸ່ມ ຍົກເລີກ ຂອງມັນ) → ຂັ້ນເທິງຂອງໜ້ານັ້ນ (window.pageBack) → ໜ້າຫຼັກ */
function goBack() {
 var dr = document.querySelector('.drawer-back'); if (dr) { dr.remove(); return; }
 var ms = document.querySelectorAll('.mask'), m = ms[ms.length - 1];
 if (m) { var b = m.querySelector('#w-back') || [].slice.call(m.querySelectorAll('button')).filter(function (x) { return /ຍົກເລີກ|ປິດ|^ບໍ່$|ກັບ/.test(x.textContent.trim()); })[0]; if (b) b.click(); else m.remove(); return; }
 if (window.pageBack && window.pageBack()) return;
 if (!/home\.html$/.test(location.pathname)) location.href = 'home.html';
}
document.addEventListener('click', function (e) { if (e.target.closest('#hb')) goBack(); });
(function () { /* ທ່າປັດຈາກຂອບຊ້າຍ → ກັບ (ສະເພາະ iOS ທີ່ເປີດເປັນແອັບ; ໃນ Safari ປົກກະຕິມີທ່າປັດຂອງຕົນເອງ) */
 var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), x0 = null, y0 = 0;
 if (!ios || !navigator.standalone) return;
 document.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX < 24 ? t.clientX : null; y0 = t.clientY; }, { passive: true });
 document.addEventListener('touchend', function (e) { if (x0 == null) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0); x0 = null; if (dx > 70 && dy < 60) goBack(); }, { passive: true });
})();

/* ===== ເມນູ ☰ (drawer) ຮ່ວມທຸກໜ້າ — ໜ້າໃດຢາກມີລາຍການຂອງຕົນ ໃຫ້ກຳນົດ window.menuItems() = [{g:'ຫົວຂໍ້', items:[{t, ic, cur, act | href}]}] ແລະ window.MENU_HR = true ຖ້າມີ HR ===== */
function openMenu() {
 var H = window.__hdr || {}, items = window.menuItems ? window.menuItems() : [], d = document.createElement('div'), h = '<aside class="drawer" aria-label="ເມນູ"><div class="dr-head"><span class="logo">' + ic(H.logo || 'pump') + '</span><div><b>' + esc(H.title || '') + '</b><small>' + esc(H.sub || '') + '</small></div></div>';
 items.forEach(function (g, gi) { h += (g.g ? '<div class="dr-grp">' + esc(g.g) + '</div>' : '') + g.items.map(function (it, ii) { return '<button class="dr-item" data-gi="' + gi + '" data-ii="' + ii + '" aria-current="' + !!it.cur + '">' + ic(it.ic || 'grid') + '<span>' + esc(it.t) + '</span></button>'; }).join(''); });
 h += '<div class="dr-foot"><a class="dr-item" href="home.html">' + ic('grid') + '<span>ໜ້າຫຼັກ · ເລືອກແອັບ</span></a>' + (window.MENU_HR ? '<button class="dr-item" id="dhr">' + ic('users') + '<span>ເປີດ ST HR</span></button>' : '') + '<button class="dr-item" id="dlo">' + ic('out') + '<span>ອອກຈາກລະບົບ</span></button></div></aside>';
 d.className = 'drawer-back'; d.innerHTML = h; document.body.appendChild(d); setTimeout(function () { d.classList.add('on'); }, 20);
 d.onclick = function (e) {
  if (e.target === d) { d.remove(); return; } var b = e.target.closest('button'); if (!b) return;
  if (b.id === 'dhr') { openHr(); return; } if (b.id === 'dlo') { logout(); return; }
  if (b.dataset.gi != null) { var it = items[+b.dataset.gi].items[+b.dataset.ii]; d.remove(); if (it.href) location.href = it.href; else if (it.act) it.act(); }
 };
}
document.addEventListener('click', function (e) { if (e.target.closest('#mb')) openMenu(); });
