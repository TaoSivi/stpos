/* ພະນັກງານ & ສິດ (ແພລດຟອມ — ໃຊ້ໄດ້ທຸກແອັບ): ເພີ່ມຄົນ "ຄັ້ງດຽວ" ແລ້ວກຳນົດສິດທຸກແອັບໃນຟອມດຽວ
 * ບັດຕໍ່ແອັບ: ນ້ຳມັນ (ໜ້າທີ່, ສະໜາມ, ຜູ້ອະນຸມັດ) · HR (ເປີດ + ໜ້າທີ່ໃນ HR — ສ້າງພະນັກງານໃນ HR ໃຫ້ເອງ) · ແອັບອື່ນ (ສະວິດ). ສິດຈິງກວດຢູ່ server */
'use strict';
var ME = null, SITES = [], USERS = [], CAT = [], UQ = '', UF = 'all';
var HRROLES = [['employee', 'ພະນັກງານ — ເຂົ້າ HR ເປັນພະນັກງານທົ່ວໄປ'], ['head', 'ຫົວໜ້າ — ອະນຸມັດລາ/ເບີກ ຕາມທີ່ HR ກຳນົດ'], ['accountant', 'ບັນຊີ — ເງິນເດືອນ/ລາຍຈ່າຍ'], ['auditor', 'ຜູ້ກວດສອບ — ເບິ່ງ/ກວດ']];
function catName(id) { var c = CAT.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; }
function siteNames(u) { return (u.sites || []).map(function (id) { var s = SITES.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }).join(', '); }

function start() {
 Promise.all([api('init'), api('userList'), api('catalog')]).then(function (a) {
  if (!a[0].ok) return; var d = a[0].data; ME = d.me; SITES = d.cfg.sites || [];
  if (ME.level === 'user') { location.href = 'home.html'; return; }
  $('hd').innerHTML = header('ພະນັກງານ & ສິດ', ME.name); $('lo').onclick = logout;
  USERS = a[1].ok ? a[1].data : []; CAT = a[2].ok ? a[2].data : []; draw();
 });
}
function reload() { return api('userList').then(function (r) { if (r.ok) { USERS = r.data; draw(); } }); }

function chips(u) {
 var c = '<span class="chip">' + (LVN[u.level] || u.level) + '</span>';
 if (u.level !== 'user') c += '<span class="chip ok">ທຸກແອັບ</span>';
 else { if (u.fuel) c += '<span class="chip ok">ນ້ຳມັນ · ' + (RN[u.fuel] || u.fuel) + '</span>'; if (u.hr) c += '<span class="chip ok">HR · ' + (HRN[u.hrRole] || HRN.employee) + '</span>'; (u.apps || []).forEach(function (id) { c += '<span class="chip ok">' + esc(catName(id)) + '</span>'; }); }
 if (u.approver && u.level === 'user') c += '<span class="chip warn">' + ic('shield') + 'ຜູ້ອະນຸມັດ</span>';
 if (!u.active) c += '<span class="chip bad">ປິດໃຊ້</span>';
 return c;
}
function list() {
 var q = UQ.trim().toLowerCase(), f = UF;
 var rows = USERS.filter(function (u) {
  if (q && (u.name + ' ' + u.phone).toLowerCase().indexOf(q) < 0) return false;
  return f === 'all' || (f === 'fuel' && (u.level !== 'user' || u.fuel)) || (f === 'hr' && (u.level !== 'user' || u.hr)) || (f === 'appr' && (u.level !== 'user' || u.approver)) || (f === 'off' && !u.active);
 });
 return rows.map(function (u, i) { return '<button class="urow' + (u.active ? '' : ' off') + '" data-u="' + esc(u.phone) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms"><span class="avatar">' + initial(u.name) + '</span><span class="grow"><b>' + esc(u.name) + '</b><small>' + esc(u.phone) + (siteNames(u) ? ' · ' + esc(siteNames(u)) : '') + '</small><span class="chips">' + chips(u) + '</span></span><span class="muted">' + ic(u.editable ? 'edit' : 'lock') + '</span></button>'; }).join('') || '<div class="empty">ບໍ່ພົບພະນັກງານ</div>';
}
function draw() {
 var c = { all: USERS.length, fuel: 0, hr: 0, appr: 0 }; USERS.forEach(function (u) { if (u.level !== 'user' || u.fuel) c.fuel++; if (u.level !== 'user' || u.hr) c.hr++; if (u.level === 'user' && u.approver) c.appr++; });
 var F = [['all', 'ທັງໝົດ'], ['fuel', 'ນ້ຳມັນ'], ['hr', 'HR'], ['appr', 'ຜູ້ອະນຸມັດ'], ['off', 'ປິດໃຊ້']];
 $('v').innerHTML = '<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="stat-card"><small>ທັງໝົດ</small><b>' + c.all + '</b></div><div class="stat-card"><small>ແອັບນ້ຳມັນ</small><b>' + c.fuel + '</b></div><div class="stat-card"><small>ແອັບ HR</small><b>' + c.hr + '</b></div><div class="stat-card"><small>ຜູ້ອະນຸມັດ</small><b>' + c.appr + '</b></div></div>' +
  '<section class="card"><div class="row wrap" style="margin-bottom:8px"><label class="f grow" style="min-width:200px">ຄົ້ນຫາຊື່ / ເບີ<input type="text" id="usearch" value="' + esc(UQ) + '" placeholder="ພິມຊື່ ຫຼື ເບີ…" autocomplete="off"></label><button class="btn" id="uadd" style="align-self:end">' + ic('plus') + 'ເພີ່ມພະນັກງານ</button></div>' +
  '<div class="seg" role="group" aria-label="ກອງ">' + F.map(function (x) { return '<button type="button" data-uf="' + x[0] + '" aria-pressed="' + (UF === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="ulist">' + list() + '</div></section>' + permLegend();
}

/* ===== ຟອມດຽວ: ຄົນ + ສິດທຸກແອັບ ===== */
function form(u) {
 var isNew = !u, lv = ME.level; u = u || { level: 'user', fuel: '', hr: false, hrRole: 'employee', approver: false, active: true, sites: [], apps: [] };
 var sw = function (id, on, t, sub) { return '<label class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="sl"></span><span class="st">' + t + (sub ? '<small>' + sub + '</small>' : '') + '</span></label>'; };
 var lvOpts = lv === 'superadmin' ? [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)'], ['admin', 'Admin (ທຸກແອັບ + ຈັດການຜູ້ໃຊ້)'], ['superadmin', 'Super admin (ທຸກຢ່າງ)']] : [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)']];
 var card = function (icn, title, body) { return '<div class="appcard"><div class="row" style="margin-bottom:6px"><span class="ti" style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:var(--ok-bg);color:var(--primary)">' + ic(icn) + '</span><b>' + title + '</b></div>' + body + '</div>'; };
 var m = modal('<h2>' + ic('users') + (isNew ? 'ເພີ່ມພະນັກງານ — ຄັ້ງດຽວ ໃຊ້ໄດ້ທຸກແອັບ' : 'ແກ້ໄຂ: ' + esc(u.name)) + '</h2>' +
  '<div class="formgrid">' + (isNew ? '<label class="f">ເບີໂທ (ໃຊ້ເຂົ້າລະບົບ)<input type="tel" inputmode="tel" id="uf-phone" placeholder="020…" autocomplete="off"></label>' : '<div class="f">ເບີໂທ<div style="padding:12px 0;font-weight:700">' + esc(u.phone) + '</div></div>') +
  '<label class="f">ຊື່<input type="text" id="uf-name" maxlength="60" value="' + esc(u.name || '') + '"></label>' +
  '<label class="f">' + (isNew ? 'PIN (4-8 ຫຼັກ)' : 'PIN ໃໝ່ (ເວັ້ນໄວ້ ຖ້າບໍ່ປ່ຽນ)') + '<input type="password" inputmode="numeric" maxlength="8" id="uf-pin" autocomplete="new-password"></label>' +
  '<label class="f">ລະດັບບັນຊີ<select id="uf-level">' + opts(lvOpts, u.level) + '</select></label></div>' +
  '<div id="uf-mods"><p class="hint" style="margin:10px 0 0">ສິດໃນແຕ່ລະແອັບ — ຕັ້ງຄັ້ງດຽວຢູ່ບ່ອນນີ້</p>' +
  card('pump', 'ຕິດຕາມນ້ຳມັນ', '<label class="f">ໜ້າທີ່<select id="uf-fuel">' + opts([['', 'ບໍ່ໃຊ້ແອັບນ້ຳມັນ'], ['driver', 'ຄົນຂັບ — ຮັບຮູ້ລົດຂອງຕົນ'], ['admin', 'ບໍລິຫານສະໜາມ — ເບີກ / ແກ້ cm'], ['head', 'ຫົວໜ້າສະໜາມ — ອະນຸມັດ / ມອບລົດ'], ['office', 'ຫ້ອງການ — ເບິ່ງລາຍງານ']], u.fuel || '') + '</select></label>' +
   '<div id="uf-sites" class="cks"><span class="hint">ສະໜາມທີ່ດູແລ</span><br>' + (SITES.map(function (s) { return '<label><input type="checkbox" value="' + esc(s.id) + '"' + ((u.sites || []).indexOf(s.id) >= 0 ? ' checked' : '') + '> ' + esc(s.name) + '</label>'; }).join('') || '<span class="hint">ຍັງບໍ່ມີສະໜາມ — ເພີ່ມໃນແອັບນ້ຳມັນ ຕັ້ງຄ່າ ກ່ອນ</span>') + '</div>' +
   '<div id="uf-apprbox">' + sw('uf-appr', u.approver, 'ເປັນຜູ້ອະນຸມັດໃບປະຈຳວັນ', 'ໃຫ້ບໍລິຫານ/ຫ້ອງການ ທີ່ໄວ້ໃຈ ກົດອະນຸມັດໄດ້') + '</div>') +
  card('users', 'ST HR', sw('uf-hr', u.hr, 'ເຂົ້າ ST HR ໄດ້', 'ສ້າງພະນັກງານໃນ HR ໃຫ້ເອງ — ບໍ່ຕ້ອງເພີ່ມຊ້ຳໃນ HR') + '<div id="uf-hrbox"><label class="f">ໜ້າທີ່ໃນ HR<select id="uf-hrrole">' + opts(HRROLES, u.hrRole || 'employee') + '</select></label></div>') +
  CAT.map(function (a) { return card('sheet', esc(a.name), sw('uf-app-' + a.id, (u.apps || []).indexOf(a.id) >= 0, 'ເຂົ້າ ' + esc(a.name) + ' ໄດ້')); }).join('') + '</div>' +
  '<div id="uf-all" class="hint" style="margin:8px 0">Admin / Super admin ເຂົ້າໄດ້ທຸກແອັບ ແລະ ທຸກຟັງຊັນ ໂດຍບໍ່ຕ້ອງເລືອກ.</div>' +
  (isNew ? '' : sw('uf-active', u.active, 'ເປີດໃຊ້ບັນຊີ', 'ປິດ = ເຂົ້າລະບົບບໍ່ໄດ້ທັນທີ ທຸກແອັບ')) +
  '<div class="prev" id="uf-prev" aria-live="polite"></div><div class="row" style="margin-top:6px"><button class="btn line grow" id="uf-cancel" type="button">ຍົກເລີກ</button><button class="btn grow" id="uf-save" type="button">' + ic('check') + (isNew ? 'ເພີ່ມພະນັກງານ' : 'ບັນທຶກ') + '</button></div>');
 var q = function (id) { return m.querySelector('#' + id); }, sitesOf = function () { return Array.prototype.map.call(q('uf-sites').querySelectorAll('input:checked'), function (x) { return x.value; }); };
 function refresh() {
  var adm = q('uf-level').value !== 'user', f = q('uf-fuel').value;
  q('uf-mods').classList.toggle('hide', adm); q('uf-all').classList.toggle('hide', !adm);
  q('uf-sites').classList.toggle('hide', f !== 'admin' && f !== 'head'); q('uf-apprbox').classList.toggle('hide', f !== 'admin' && f !== 'office'); q('uf-hrbox').classList.toggle('hide', !q('uf-hr').checked);
  var pl = permList(q('uf-level').value, f, q('uf-hr').checked, q('uf-appr').checked, q('uf-hrrole').value); if (q('uf-level').value === 'user') CAT.forEach(function (a) { if (q('uf-app-' + a.id).checked) pl.push(a.name + ': ເຂົ້າໃຊ້ໄດ້'); });
  q('uf-prev').innerHTML = '<b>ຄົນນີ້ຈະມີສິດ:</b>' + (pl.length ? '<ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<br><span class="chip bad">ຍັງບໍ່ມີສິດໃດ — ເລືອກແອັບຢ່າງໜ້ອຍ 1 ອັນ</span>');
 }
 m.addEventListener('change', refresh); refresh(); (q('uf-phone') || q('uf-name')).focus();
 q('uf-cancel').onclick = function () { m.remove(); };
 q('uf-save').onclick = function () {
  var b = q('uf-save'), adm = q('uf-level').value !== 'user', ac = q('uf-active');
  var d = { phone: isNew ? q('uf-phone').value : u.phone, name: q('uf-name').value, level: q('uf-level').value, fuel: adm ? '' : q('uf-fuel').value, hr: adm ? false : q('uf-hr').checked, hrRole: q('uf-hrrole').value, approver: adm ? false : q('uf-appr').checked, apps: adm ? [] : CAT.filter(function (a) { return q('uf-app-' + a.id).checked; }).map(function (a) { return a.id; }), pin: q('uf-pin').value, active: ac ? ac.checked : true, sites: sitesOf() };
  b.disabled = true; api('userSave', { user: d }).then(function (r) {
   b.disabled = false; if (!r.ok) return; m.remove(); var h = r.data && r.data.hr;
   toast((isNew ? 'ເພີ່ມພະນັກງານແລ້ວ' : 'ບັນທຶກແລ້ວ') + (h === 'ok' ? ' · ສ້າງ/ອັບເດດໃນ HR ແລ້ວ' : h === 'nohr' ? ' (ຍັງບໍ່ໄດ້ຕັ້ງລະບົບ HR ໃນ server)' : ''), h === 'error' ? 'bad' : 'ok');
   if (h === 'error') toast('ບັນທຶກບັນຊີແລ້ວ ແຕ່ອັບເດດ HR ບໍ່ສຳເລັດ — ກົດບັນທຶກອີກຄັ້ງ', 'bad'); reload();
  });
 };
}
function view(u) { /* ແກ້ບໍ່ໄດ້ (ເຊັ່ນ Admin ເບິ່ງ Super admin) */
 var pl = permList(u.level, u.fuel, u.hr, u.approver, u.hrRole), m = modal('<h2><span class="avatar" style="display:inline-grid;vertical-align:middle;margin-right:8px">' + initial(u.name) + '</span>' + esc(u.name) + '</h2><p class="muted">' + esc(u.phone) + '</p><div class="chips">' + chips(u) + '</div><div class="prev"><b>ສິດ:</b><ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div><p class="hint">ແກ້ໄດ້ໂດຍ Super admin ເທົ່ານັ້ນ</p><button class="btn line blk" id="vclose">ປິດ</button>');
 m.querySelector('#vclose').onclick = function () { m.remove(); };
}
$('v').addEventListener('input', function (e) { if (e.target.id === 'usearch') { UQ = e.target.value; $('ulist').innerHTML = list(); } });
$('v').addEventListener('click', function (e) {
 var b = e.target.closest('button'); if (!b) return;
 if (b.id === 'uadd') form(null);
 else if (b.dataset.uf) { UF = b.dataset.uf; draw(); }
 else if (b.dataset.u) { var u = USERS.filter(function (x) { return x.phone === b.dataset.u; })[0]; if (u) (u.editable ? form(u) : view(u)); }
});
start();
