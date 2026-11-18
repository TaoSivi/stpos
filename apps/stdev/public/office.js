/* ໜ້າບໍລິຫານ — ໂຄງຫຼັກ: ສະຖານະ, ສິດ, ເມນູໂມດູນ (ຂ້າງ / ແຖບລຸ່ມ / ເພີ່ມເຕີມ), ຕົວຈັດເສັ້ນທາງ
 * ໂມດູນຢູ່ 3 ໄຟລ໌: office-ops.js (ພາບລວມ, ເບີກ&ຈ່າຍ, ຮັບເຂົ້າແທ່ງ&ແທກ, ຮັບຮູ້&ອະນຸມັດ) · office-rep.js (ລາຍງານ, ຍອດແທ່ງ, PDF/Excel) · office-admin.js (ມອບລົດ, ພະນັກງານ&ສິດ, ຕັ້ງຄ່າ, ຂ້ອຍ) */
'use strict';
var I = null, S = null, P = {}, PM = {}, LEDGER = [], USERS = [], DRV = [], PHK = null, MOD = 'dash', LOADED = '';
var WD = ['ວັນອາທິດ', 'ວັນຈັນ', 'ວັນອັງຄານ', 'ວັນພຸດ', 'ວັນພະຫັດ', 'ວັນສຸກ', 'ວັນເສົາ'], MO = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
function drvName(ph) { var d = DRV.filter(function (x) { return x.phone === ph; })[0]; return d ? d.name : ph && DRV.length ? ph + ' (ບໍ່ພົບ/ປິດ)' : ''; }
function longDate(d) { var x = new Date(d + 'T00:00:00Z'); return WD[x.getUTCDay()] + ' ' + x.getUTCDate() + ' ' + MO[x.getUTCMonth()]; }

/* ===== ສິດ (ຝັ່ງໜ້າຈໍເທົ່ານັ້ນ ເພື່ອສະແດງ/ຊ່ອນ — server ກວດສິດຈິງທຸກຄັ້ງ) ===== */
function role() { return I.me.roles[$('site').value]; }
/* ສິດເປັນຟັງຊັນ (view, issue, tank, assign, approve, ack, fixAck) — server ສົ່ງ me.rights ຕໍ່ສະໜາມ */
function R(k) { return I.me.boss || ((I.me.rights || {})[$('site').value] || []).indexOf(k) >= 0; }
function hasRight(k) { return I.me.boss || Object.keys(I.me.rights || {}).some(function (s) { return I.me.rights[s].indexOf(k) >= 0; }); }
function hasOps() { return ['view', 'issue', 'tank', 'assign', 'approve'].some(hasRight); }
function hasAny() { return hasOps() || hasRight('request') || hasRight('reqOk'); } /* ວິຊາການ ມີແຕ່ ຂໍນ້ຳມັນ — ບໍ່ເຫັນໃບເບີກ/ລາຍງານ */
function rqAny() { return I.cfg.sites.some(function (s) { return s.rq; }); } /* ມີສະໜາມທີ່ໃຊ້ລະບົບຄຳຂໍ */
function rqSite() { return !!siteObj().rq; }
function isChief() { return R('fixAck'); }
function canEdit() { return R('issue') && !(S && S.approved); }
function canTank() { return R('tank') && !(S && S.approved); }
function canApprove() { return R('approve'); }
function hasSites() { return I.cfg.sites.length > 0; }
function here() { return { site: $('site').value, date: $('date').value }; }
function siteObj() { return I.cfg.sites.filter(function (s) { return s.id === $('site').value; })[0] || {}; }
function fillSites() { var cur = $('site').value; $('site').innerHTML = I.cfg.sites.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join(''); if (cur) $('site').value = cur; }

/* ===== ໂມດູນ: id, ຊື່, ໄອຄອນ, ກຸ່ມ, ສິດເຫັນ, ຕົວເລືອກສະໜາມ/ວັນທີ, ຕົວແຕ້ມ ===== */
var MODS = [
 { id: 'dash', t: 'ພາບລວມ', ic: 'grid', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && hasAny(); }, run: function () { dashView(); } },
 { id: 'rq', t: 'ຂໍນ້ຳມັນ', ic: 'edit', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && rqAny() && hasRight('request'); }, run: function () { rqView(); } },
 { id: 'rqok', t: 'ອະນຸມັດຄຳຂໍ', ic: 'check', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && rqAny() && hasRight('reqOk'); }, run: function () { rqokView(); } },
 { id: 'issue', t: 'ເບີກອອກ / ເຕີມເຂົ້າລົດ', ic: 'pump', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && hasRight('issue'); }, run: function () { issueView(); } },
 { id: 'tank', t: 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ', ic: 'inbox', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && hasRight('tank'); }, run: function () { tankView(); } },
 { id: 'appr', t: 'ຮັບຮູ້ & ອະນຸມັດໃບ', ic: 'shield', g: 'ປະຕິບັດການ', pick: 'both', show: function () { return hasSites() && hasOps(); }, run: function () { apprView(); } },
 { id: 'report', t: 'ລາຍງານປະຈຳວັນ', ic: 'report', g: 'ລາຍງານ', pick: 'both', show: function () { return hasSites() && hasOps(); }, run: function () { reportView(); } },
 { id: 'ledger', t: 'ຍອດແທ່ງ', ic: 'ledger', g: 'ລາຍງານ', pick: 'site', show: function () { return hasSites() && hasOps(); }, run: function () { ledgerLoad(); } },
 { id: 'assign', t: 'ມອບລົດໃຫ້ຄົນຂັບ', ic: 'truck', g: 'ຈັດການ', pick: 'site', show: function () { return hasSites() && hasRight('assign') && I.me.level === 'user'; }, run: function () { assignView(); } },
 { id: 'staff', t: 'ຕັ້ງຄ່າ (ຄົນ, ສິດ, ສະໜາມ, SOP, HR)', ic: 'gear', g: 'ຈັດການ', pick: 'none', show: function () { return I.me.level === 'superadmin' || I.me.level === 'admin' || I.me.boss; }, run: function () { location.href = 'admin.html'; } },
 { id: 'me', t: 'ຂ້ອຍ', ic: 'user', g: 'ບັນຊີ', pick: 'none', show: function () { return true; }, run: function () { meView(); } }
];
function vis() { return MODS.filter(function (m) { return m.show(); }); }
function modOf(id) { return MODS.filter(function (m) { return m.id === id; })[0]; }

function start() {
 api('init').then(function (r) {
  if (!r.ok) return; I = r.data;
  if (!hasAny()) { location.href = 'driver.html'; return; } /* ມີແຕ່ສິດຮັບຮູ້ = ໜ້າຄົນຂັບ */
  $('date').value = today(); fillSites(); buildNav();
  api('drivers').then(function (d) { DRV = d.ok ? d.data : []; if (MOD === 'assign') assignView(); });
  go(hasSites() ? 'dash' : I.me.boss ? 'cfg' : 'me');
 });
}
function navBtn(m, cls) { return '<button class="' + cls + '" data-m="' + m.id + '" aria-current="' + (m.id === MOD) + '">' + ic(m.ic) + '<span>' + esc(m.t) + '</span>' + (m.id === 'appr' ? '<i class="nb" aria-label="ລໍຖ້າຮັບຮູ້"></i>' : '') + '</button>'; }
function buildNav() {
 var list = vis(), groups = [], seen = {}, side = '';
 list.forEach(function (m) { if (!seen[m.g]) { seen[m.g] = 1; groups.push(m.g); } });
 side += '<div class="side-head"><div class="avatar">' + ic('pump') + '</div><div><b>ນ້ຳມັນສະໜາມ</b><small>' + esc(I.me.name) + ' · ' + esc(RN[I.me.role] || '') + '</small></div></div>';
 groups.forEach(function (g) { side += '<div class="side-grp">' + esc(g) + '</div>' + list.filter(function (m) { return m.g === g; }).map(function (m) { return navBtn(m, 'nav-item'); }).join(''); });
 side += '<div class="side-foot"><a class="nav-item" href="home.html" style="text-decoration:none">' + ic('grid') + '<span>ໜ້າຫຼັກ · ເລືອກແອັບ</span></a>' + (I.hr ? '<button class="nav-item" id="sidehr">' + ic('users') + '<span>ເປີດ ST HR</span></button>' : '') + '<button class="nav-item" id="sidelo">' + ic('out') + '<span>ອອກຈາກລະບົບ</span></button></div>';
 $('side').innerHTML = side;
 var prim = ['rqok', 'rq', 'tank', 'issue', 'appr', 'dash'].map(modOf).filter(function (m) { return m && m.show(); }).slice(0, 4); /* ລຳດັບຕາມຂັ້ນຕອນ: ອະນຸມັດຄຳຂໍ · ຂໍ · ຮັບເຂົ້າແທ່ງ · ເຕີມເຂົ້າລົດ */
 if (prim.length < 4) { var rp = modOf('report'); if (rp && rp.show() && prim.indexOf(rp) < 0) prim.push(rp); }
 $('nav').innerHTML = prim.map(function (m) { return '<button data-m="' + m.id + '" aria-current="' + (m.id === MOD) + '">' + ic(m.ic) + '<span>' + esc(m.t.split(' ')[0]) + '</span>' + (m.id === 'appr' ? '<i class="nb"></i>' : '') + '</button>'; }).join('');
 $('hd').innerHTML = header('ນ້ຳມັນສະໜາມ', I.me.name + ' · ' + (RN[I.me.role] || ''), '');
 window.MENU_HR = !!I.hr; window.menuItems = function () { return groups.map(function (g) { return { g: g, items: vis().filter(function (m) { return m.g === g; }).map(function (m) { return { t: m.t, ic: m.ic, cur: m.id === MOD, act: function () { go(m.id); } }; }) }; }); };
 $('sidelo').onclick = logout; if ($('sidehr')) $('sidehr').onclick = openHr;
}
function setBadge(n) { document.querySelectorAll('[data-m=appr] .nb').forEach(function (b) { b.textContent = n > 0 ? n : ''; }); }
function pendingOf(s) { return s ? s.rows.filter(function (r) { return r.add != null && !r.ack && !r.rej; }).length : 0; }

function go(id) {
 var m = modOf(id); if (!m || !m.show()) m = modOf(hasSites() ? 'dash' : 'me'); MOD = m.id;
 document.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.m === MOD); });
 $('pht').textContent = m.t; $('phd').textContent = longDate($('date').value || today());
 $('pick').classList.toggle('hide', m.pick === 'none' || !hasSites()); $('date').classList.toggle('hide', m.pick !== 'both');
 $('v').innerHTML = '<div class="skel"></div><div class="skel"></div>'; window.scrollTo(0, 0);
 m.run();
}
$('nav').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.m) go(b.dataset.m); };
$('side').onclick = function (e) { var b = e.target.closest('[data-m]'); if (b) go(b.dataset.m); };
$('site').onchange = $('date').onchange = function () { go(MOD); };
/* ສົ່ງຄິວຄົບແລ້ວ → ໂຫຼດໜ້າໃໝ່ (ຖ້າບໍ່ໄດ້ກຳລັງພິມຢູ່) */
document.addEventListener('synced', function () { var a = document.activeElement; if (I && ['cfg', 'me', 'staff'].indexOf(MOD) < 0 && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) go(MOD); });

/* ຕົວຊ່ວຍໂຫຼດໃບປະຈຳວັນ (+ ຮູບ ຖ້າຕ້ອງການ) ແລ້ວເອີ້ນ cb */
function withSheet(photos, cb) {
 var key = $('site').value + '|' + $('date').value, mine = MOD;
 api('sheet', here()).then(function (r) {
  if (!r.ok || MOD !== mine) return; S = r.data; P = {}; PM = {}; setBadge(pendingOf(S)); cb();
  if (photos) Promise.all([api('photos', here()), api('photometa', here())]).then(function (a) { if (a[0].ok && MOD === mine) { P = a[0].data; PM = a[1].ok ? a[1].data : {}; cb(true); } });
 });
}

window.pageBack = function () { if (hasSites() && MOD && MOD !== 'dash') { go('dash'); return true; } return false; };
