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
 { id: 'dash', t: 'ພາບລວມ', ic: 'grid', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && hasAny(); }, run: function () { dashView(); } },
 { id: 'rq', t: 'ຂໍນ້ຳມັນ', ic: 'edit', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && rqAny() && hasRight('request'); }, run: function () { rqView(); } },
 { id: 'rqok', t: 'ອະນຸມັດຄຳຂໍ', ic: 'check', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && rqAny() && hasRight('reqOk'); }, run: function () { rqokView(); } },
 { id: 'tank', t: 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ', ic: 'inbox', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && hasRight('tank'); }, run: function () { tankView(); } },
 { id: 'issue', t: 'ຕິດຕາມລົດ', ic: 'truck', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && hasRight('issue'); }, run: function () { issueView(); } },
 { id: 'appr', t: 'ຮັບຮູ້ & ອະນຸມັດໃບ', ic: 'shield', g: 'ຂັ້ນຕອນການເຮັດວຽກ', pick: 'both', show: function () { return hasSites() && hasOps(); }, run: function () { apprView(); } },
 { id: 'report', t: 'ໃບຕິດຕາມປະຈຳວັນ', ic: 'report', g: 'ລາຍງານ', pick: 'both', show: function () { return hasSites() && hasOps(); }, run: function () { reportView(); } },
 { id: 'rqrep', t: 'ແບບຟອມໃບຂໍ', hid: 1, ic: 'report', g: 'ລາຍງານ', pick: 'both', show: function () { return hasSites() && (hasOps() || hasRight('request')) && rqAny(); }, run: function () { rqRepView(); } },
 { id: 'ledger', t: 'ຍອດເຫຼືອ', hid: 1, ic: 'ledger', g: 'ລາຍງານ', pick: 'site', show: function () { return hasSites() && hasOps(); }, run: function () { ledgerLoad(); } },
 { id: 'adjrep', t: 'ການປັບປຸງ (Admin)', hid: 1, ic: 'report', g: 'ລາຍງານ', pick: 'site', show: function () { return hasSites() && I.me.boss; }, run: function () { adjLoad(); } },
 { id: 'assign', t: 'ມອບລົດໃຫ້ຄົນຂັບ', ic: 'truck', g: 'ຈັດການ', pick: 'site', show: function () { return hasSites() && hasRight('assign') && I.me.level === 'user'; }, run: function () { assignView(); } },
 { id: 'staff', t: 'ຕັ້ງຄ່າ', ic: 'gear', g: 'ຈັດການ', pick: 'none', show: function () { return I.me.level === 'superadmin' || I.me.level === 'admin' || I.me.boss; }, run: function () { location.href = 'admin.html'; } },
 { id: 'me', t: 'ຂ້ອຍ', ic: 'user', g: 'ບັນຊີ', pick: 'none', show: function () { return true; }, run: function () { meView(); } }
];
/* ===== ຂັ້ນຕອນການເຮັດວຽກ: ຂໍ > ອະນຸມັດ > ຮັບເຂົ້າແທ່ງ > ເຕີມເຂົ້າລົດ > ຮັບຮູ້/ອະນຸມັດໃບ > ລາຍງານ (ສະແດງສະເພາະຂັ້ນທີ່ເຈົ້າມີສິດ) ===== */
var STEPS = [['rq', 'ຂໍນ້ຳມັນ'], ['rqok', 'ອະນຸມັດຄຳຂໍ'], ['tank', 'ຮັບເຂົ້າແທ່ງ'], ['issue', 'ຕິດຕາມ'], ['appr', 'ຮັບຮູ້ & ອະນຸມັດໃບ'], ['report', 'ລາຍງານ']];
function stepList() { return STEPS.filter(function (s) { var m = modOf(s[0]); return m && m.show(); }); }
function stepNo(id) { var l = stepList().map(function (s) { return s[0]; }), i = l.indexOf(id); return i < 0 ? 0 : i + 1; }
function stepState(id) { /* [tone, ຂໍ້ຄວາມ] ຈາກຂໍ້ມູນໃບມື້ນີ້ (S): ບອກດ້ວຍຕົວໜັງສື ບໍ່ແມ່ນສີຢ່າງດຽວ */
 if (!S) return ['', ''];
 var reqs = S.reqs || [], pend = reqs.filter(function (x) { return x.state === 'pending'; }).length, wait = reqs.filter(function (x) { return x.state === 'approved'; }).length, rows = S.rows || [], filled = rows.filter(function (x) { return x.add != null; }), un = filled.filter(function (x) { return !x.ack; }).length;
 if (id === 'rq') return reqs.length ? ['ok', reqs.length + ' ຄຳຂໍ'] : ['', 'ຍັງບໍ່ມີ'];
 if (id === 'rqok') return pend ? ['warn', pend + ' ລໍອະນຸມັດ'] : reqs.length ? ['ok', 'ຄົບແລ້ວ'] : ['', '-'];
 if (id === 'tank') return S.tank && S.tank.recv > 0 ? ['ok', 'ຮັບ ' + L(S.tank.recv)] : ['', 'ຍັງບໍ່ມີ'];
 if (id === 'issue') return wait ? ['warn', wait + ' ລໍເຕີມ'] : filled.length ? ['ok', 'ເຕີມ ' + filled.length + ' ຄັນ'] : ['', 'ຍັງບໍ່ເຕີມ'];
 if (id === 'appr') return S.approved ? ['ok', 'ອະນຸມັດແລ້ວ'] : un ? ['warn', 'ລໍຮັບຮູ້ ' + un] : filled.length ? ['warn', 'ພ້ອມອະນຸມັດ'] : ['', '-'];
 return S.approved ? ['ok', 'ພ້ອມ'] : ['', 'ຫຼັງອະນຸມັດ'];
}
var STEPIC = { rq: 'edit', rqok: 'check', tank: 'inbox', issue: 'truck', appr: 'shield', report: 'report' };
var STEPSHORT = { rq: 'ຂໍນ້ຳມັນ', rqok: 'ອະນຸມັດ', tank: 'ຮັບເຂົ້າ', issue: 'ຕິດຕາມ', appr: 'ຮັບຮູ້', report: 'ລາຍງານ' };
function stepBar() { /* ແຖບລຸ່ມ = ຂັ້ນຕອນ 1–6 (ວົງເລກ + ຊື່ສັ້ນ); ບໍ່ມີຂັ້ນ → ເມນູສັ້ນແບບເກົ່າ */
 var old = $('steps'); if (old) { old.innerHTML = ''; old.hidden = true; }
 if (!I) return; var l = stepList();
 if (!l.length) { var prim = ['rqok', 'rq', 'tank', 'issue', 'appr', 'dash'].map(modOf).filter(function (m) { return m && m.show(); }).slice(0, 4); $('nav').className = 'tabs'; $('nav').innerHTML = prim.map(function (m) { return '<button data-m="' + m.id + '" aria-current="' + (m.id === MOD) + '">' + ic(m.ic) + '<span>' + esc(m.t.split(' ')[0]) + '</span></button>'; }).join('') + '<button type="button" class="homeb" data-home aria-label="ໜ້າຫຼັກ">' + ic('home') + '<span>ໜ້າຫຼັກ</span></button>'; return; }
 var nav = $('nav'); nav.className = 'tabs steps'; nav.innerHTML = l.map(function (s, i) { var st = stepState(s[0]), cur = s[0] === MOD || (s[0] === 'report' && REPS.indexOf(MOD) >= 0), bd = s[0] === 'appr' && S ? pendingOf(S) : 0; return '<button type="button" data-m="' + s[0] + '" class="' + st[0] + '" aria-current="' + cur + '" aria-label="' + esc(s[1]) + '"><span class="si">' + ic(STEPIC[s[0]] || 'grid') + (st[0] ? '<i class="sd ' + st[0] + '"></i>' : '') + '</span><span class="sl">' + esc(STEPSHORT[s[0]] || s[1]) + '</span>' + (bd ? '<i class="nb">' + bd + '</i>' : '') + '</button>'; }).join('') + '<button type="button" class="homeb" data-home aria-label="ໜ້າຫຼັກ"><span class="si">' + ic('home') + '</span><span class="sl">ໜ້າຫຼັກ</span></button>';
 var c = nav.querySelector('[aria-current=true]'); if (c) nav.scrollLeft = c.offsetLeft - (nav.clientWidth - c.offsetWidth) / 2;
}
function stepsCard() { /* ໜ້າພາບລວມ: ລາຍການຂັ້ນຕອນເປັນເລກ ແຕະເພື່ອໄປຂັ້ນນັ້ນ */
 var l = stepList(); if (l.length < 2) return '';
 return '<section class="card"><h2>' + ic('check') + 'ຂັ້ນຕອນຂອງມື້ນີ້</h2><ol class="steps">' + l.map(function (s, i) { var st = stepState(s[0]), m = modOf(s[0]); return '<li><button type="button" class="stp ' + st[0] + '" data-go="' + s[0] + '"><span class="sn">' + ic(STEPIC[s[0]] || 'grid') + '</span><span class="grow"><b>' + esc(s[1]) + '</b><small>' + esc(st[1] || m.t) + '</small></span>' + ic('next', 'muted') + '</button></li>'; }).join('') + '</ol></section>';
}
new MutationObserver(function () { if (window.I) stepBar(); }).observe($('v'), { childList: true });
function vis() { return MODS.filter(function (m) { return m.show(); }); }
function navVis() { return vis().filter(function (m) { return !m.hid; }); }
var REPS = ['report', 'rqrep', 'ledger', 'adjrep'];
function repTabs() { /* ລາຍງານທັງໝົດຢູ່ບ່ອນດຽວ: ປຸ່ມສະຫຼັບຊະນິດລາຍງານ */
 var l = REPS.map(modOf).filter(function (m) { return m && m.show(); }), bar = typeof entryBar === 'function' ? entryBar() : ''; if (l.length < 2) return bar; return '<div class="rtabs noprint" role="tablist">' + l.map(function (m) { return '<button type="button" role="tab" data-go="' + m.id + '" aria-selected="' + (m.id === MOD) + '">' + ic(m.ic) + '<span>' + esc(m.t.replace(' (Admin)', '')) + '</span></button>'; }).join('') + '</div>' + bar; }
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
 var list = navVis(), groups = [], seen = {}, side = '';
 list.forEach(function (m) { if (!seen[m.g]) { seen[m.g] = 1; groups.push(m.g); } });
 side += '<div class="side-head"><div class="avatar">' + ic('pump') + '</div><div><b>LTG Track</b><small>' + esc(I.me.name) + ' · ' + esc(RN[I.me.role] || '') + '</small></div></div>';
 groups.forEach(function (g) { side += '<div class="side-grp">' + esc(g) + '</div>' + list.filter(function (m) { return m.g === g; }).map(function (m) { return navBtn(m, 'nav-item'); }).join(''); });
 side += '<div class="side-foot"><a class="nav-item" href="home.html" style="text-decoration:none">' + ic('home') + '<span>ໜ້າຫຼັກ</span></a>' + '<button class="nav-item" id="sidelo">' + ic('out') + '<span>ອອກຈາກລະບົບ</span></button></div>';
 $('side').innerHTML = side;
 stepBar();
 $('hd').innerHTML = header('ນ້ຳມັນສະໜາມ', I.me.name + ' · ' + (RN[I.me.role] || ''), '');
 window.menuItems = function () { return groups.map(function (g) { return { g: g, items: navVis().filter(function (m) { return m.g === g; }).map(function (m) { return { t: m.t, ic: m.ic, cur: m.id === MOD, act: function () { go(m.id); } }; }) }; }); };
 $('sidelo').onclick = logout;
}
function setBadge(n) { document.querySelectorAll('[data-m=appr] .nb').forEach(function (b) { b.textContent = n > 0 ? n : ''; }); }
function pendingOf(s) { return s ? s.rows.filter(function (r) { return r.add != null && !r.ack && !r.rej; }).length : 0; }

function go(id) {
 var m = modOf(id); if (!m || !m.show()) m = modOf(hasSites() ? 'dash' : 'me'); MOD = m.id;
 document.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-current', b.dataset.m === MOD || (b.dataset.m === 'report' && REPS.indexOf(MOD) >= 0)); });
 $('pht').textContent = m.t; $('phd').textContent = longDate($('date').value || today());
 $('pick').classList.toggle('hide', m.pick === 'none' || !hasSites()); $('date').classList.toggle('hide', m.pick !== 'both');
 $('v').innerHTML = '<div class="skel"></div><div class="skel"></div>'; window.scrollTo(0, 0);
 m.run();
}
$('nav').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.m) go(b.dataset.m); };
$('side').onclick = function (e) { var b = e.target.closest('[data-m]'); if (b) go(b.dataset.m); };
$('site').onchange = $('date').onchange = function () { go(MOD); };
if ($('rf')) $('rf').onclick = function () { go(MOD); };
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
