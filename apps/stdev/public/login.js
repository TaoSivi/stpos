/* ໜ້າເຂົ້າລະບົບ: ເບີໂທ + PIN */
'use strict';
installHint('inst');
$('lg').className = 'logo float'; $('lg').innerHTML = ic('pump');
var PIN = '', busy = false, PLEN = 0; /* PLEN = ຄວາມຍາວ PIN ຂອງເບີນີ້ (0 = ຍັງບໍ່ຮູ້ → 4-8 ໂຕ + ປຸ່ມເຂົ້າລະບົບ) */
function setLen(n) { PLEN = n >= 4 && n <= 8 ? n : 0; var h = ''; for (var i = 0; i < (PLEN || 8); i++) h += '<i></i>'; $('dots').innerHTML = h; $('go').style.display = PLEN ? 'none' : ''; if (PLEN && PIN.length > PLEN) PIN = PIN.slice(0, PLEN); paint(); }
var LK = ''; function lookLen() { var p = $('ph').value.replace(/\D/g, ''); if (p.length < 8 || p === LK) return; LK = p; var c = null; try { c = +localStorage.getItem('pl' + p) || 0; } catch (e) { } if (c) setLen(c); fetch('/api/pinlen', { method: 'POST', body: JSON.stringify({ phone: p }) }).then(function (r) { return r.json(); }).then(function (r) { if (r && r.ok && p === LK) { if (r.n) { try { localStorage.setItem('pl' + p, r.n); } catch (e) { } } setLen(r.n || c || 0); } }).catch(function () { }); }
/* ເຂົ້າລະບົບຢູ່ແລ້ວ → ໄປໜ້າຂອງຕົນເລີຍ */
if (ls('fuel_tk')) api('me').then(function (r) { if (r.ok) go((r.data.apps || []).length); });
/* ຫຼັງ login ໄປ "ໜ້າຫຼັກ" ສະເໝີ (ເລືອກແອັບ) — ຖ້າບໍ່ມີແອັບສັກອັນ ບອກໃຫ້ຕິດຕໍ່ຜູ້ດູແລ */
function go(n) { if (n > 0) location.href = 'home.html'; else { ls('fuel_tk', null); $('err').textContent = 'ບັນຊີນີ້ຍັງບໍ່ໄດ້ເປີດໃຊ້ແອັບໃດ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ'; } }
function paint() { var d = $('dots').children; for (var i = 0; i < d.length; i++) d[i].className = i < PIN.length ? 'on' : ''; $('go').disabled = PIN.length < 4 || !$('ph').value.trim() || busy; if (PLEN && PIN.length === PLEN && !busy && $('ph').value.trim()) setTimeout(function () { $('f').requestSubmit ? $('f').requestSubmit() : $('f').onsubmit({ preventDefault: function () { } }); }, 120); }
$('pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(function (k) { return k === '' ? '<span></span>' : '<button type="button" data-k="' + k + '" aria-label="' + (k === '⌫' ? 'ລຶບ' : k) + '">' + k + '</button>'; }).join('');
$('pad').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; PIN = b.dataset.k === '⌫' ? PIN.slice(0, -1) : (PIN + b.dataset.k).slice(0, PLEN || 8); $('err').textContent = ''; paint(); };
document.addEventListener('keydown', function (e) { if (document.activeElement === $('ph') || e.ctrlKey || e.metaKey) return; if (/^\d$/.test(e.key)) PIN = (PIN + e.key).slice(0, PLEN || 8); else if (e.key === 'Backspace') PIN = PIN.slice(0, -1); else return; paint(); });
$('ph').oninput = function () { paint(); lookLen(); }; $('ph').onchange = lookLen; setTimeout(lookLen, 300);
$('f').onsubmit = function (e) {
 e.preventDefault(); if ($('go').disabled) return; busy = true; paint();
 api('login', { phone: $('ph').value, pin: PIN }).then(function (r) {
  busy = false;
  if (r.ok) { try { localStorage.setItem('pl' + $('ph').value.replace(/\D/g, ''), PIN.length); } catch (e) { } ls('fuel_tk', r.token); $('go').innerHTML = ic('check') + ' ຍິນດີຕ້ອນຮັບ ' + esc(r.name); go(r.napps); return; }
  PIN = ''; paint(); $('dots').classList.remove('shake'); void $('dots').offsetWidth; $('dots').classList.add('shake');
  $('err').textContent = r.error === 'net' ? ERR.net : r.error === 'locked' ? 'ໃສ່ຜິດຫຼາຍເທື່ອ — ລໍ ' + r.min + ' ນາທີ' : 'ເບີ ຫຼື PIN ບໍ່ຖືກ' + (r.left != null ? ' (ເຫຼືອ ' + r.left + ' ເທື່ອ)' : '');
 });
};
