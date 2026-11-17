/* ໂມດູນຈັດການ: ມອບລົດໃຫ້ຄົນຂັບ · ພະນັກງານ & ສິດ (ເພີ່ມ, ກຳນົດໜ້າທີ່/ສະໜາມ/HR, ເລືອກຜູ້ອະນຸມັດ) · ຕັ້ງຄ່າ ສະໜາມ & ລົດ · ຂ້ອຍ */
'use strict';
function opts(list, sel) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join(''); }
function initial(n) { return esc(String(n || '?').trim().slice(0, 1).toUpperCase()); }

/* ===== ສິດຕາມໜ້າທີ່ (ຄຳອະທິບາຍ — ສິດຈິງກວດຢູ່ server) ===== */
function permList(level, fuel, hr, appr) {
 var out = [];
 if (level === 'superadmin' || level === 'admin') out.push('ທຸກແອັບ ແລະ ທຸກຟັງຊັນ (ນ້ຳມັນ + HR)', 'ຕັ້ງຄ່າ ສະໜາມ & ລົດ', level === 'superadmin' ? 'ຈັດການທຸກບັນຊີ ລວມ Admin' : 'ຈັດການບັນຊີຜູ້ໃຊ້ທົ່ວໄປ', 'ອະນຸມັດໃບປະຈຳວັນ');
 else {
  if (fuel === 'head') out.push('ເບີກ/ແກ້ cm ໃນສະໜາມທີ່ດູແລ', 'ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ', 'ມອບລົດໃຫ້ຄົນຂັບ', 'ອະນຸມັດໃບປະຈຳວັນ (ຫົວໜ້າອະນຸມັດໄດ້ສະເໝີ)', 'ເບິ່ງລາຍງານ');
  if (fuel === 'admin') out.push('ເບີກ/ແກ້ cm ໃນສະໜາມທີ່ດູແລ', 'ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ', 'ເບິ່ງລາຍງານ');
  if (fuel === 'office') out.push('ເບິ່ງລາຍງານ ແລະ ຍອດແທ່ງ (ທຸກສະໜາມ) — ແກ້ບໍ່ໄດ້');
  if (fuel === 'driver') out.push('ເຫັນ ແລະ ຮັບຮູ້ສະເພາະລົດທີ່ມອບໃຫ້ຕົນ');
  if (appr && (fuel === 'admin' || fuel === 'office')) out.push('ອະນຸມັດໃບປະຈຳວັນ (ຜູ້ອະນຸມັດທີ່ເຈົ້າຂອງຕັ້ງ)');
  if (hr) out.push('ເຂົ້າ ST HR (ສິດພາຍໃນ HR ກຳນົດໃນ HR)');
 }
 return out;
}
function permLegend() {
 var Y = '<td class="y" aria-label="ໄດ້">✓</td>', N = '<td class="n" aria-label="ບໍ່ໄດ້">–</td>', A = '<td aria-label="ໄດ້ຖ້າຖືກຕັ້ງເປັນຜູ້ອະນຸມັດ">✱</td>', row = function (n, c) { return '<tr><td>' + n + '</td>' + c.map(function (x) { return x === 1 ? Y : x === 2 ? A : N; }).join('') + '</tr>'; };
 return '<section class="card"><h2>' + ic('key') + 'ສິດຕາມໜ້າທີ່</h2><div class="tw"><table class="perm"><thead><tr><th>ໜ້າທີ່</th><th>ເບິ່ງ/ລາຍງານ</th><th>ເບີກ & ແກ້ cm</th><th>ຮັບເຂົ້າແທ່ງ</th><th>ມອບລົດ</th><th>ອະນຸມັດ</th><th>ຕັ້ງຄ່າ/ຜູ້ໃຊ້</th><th>ຮັບຮູ້ (ລົດຕົນ)</th></tr></thead><tbody>' +
  row('Super admin / Admin', [1, 1, 1, 1, 1, 1, 0]) + row('ຫົວໜ້າສະໜາມ', [1, 1, 1, 1, 1, 0, 0]) + row('ບໍລິຫານສະໜາມ', [1, 1, 1, 0, 2, 0, 0]) + row('ຫ້ອງການ', [1, 0, 0, 0, 2, 0, 0]) + row('ຄົນຂັບ', [0, 0, 0, 0, 0, 0, 1]) +
  '</tbody></table></div><p class="hint">✱ = ອະນຸມັດໄດ້ ຖ້າເຈົ້າຂອງຕັ້ງຄົນນັ້ນເປັນ "ຜູ້ອະນຸມັດ". ຂອບເຂດສະໜາມ: ບໍລິຫານ/ຫົວໜ້າ ເຮັດໄດ້ສະເພາະສະໜາມທີ່ເລືອກ; ຫ້ອງການ ເຫັນທຸກສະໜາມ.</p></section>';
}

/* ===== ພະນັກງານ & ສິດ ===== */
var UQ = '', UF = 'all';
function staffView() { api('userList').then(function (r) { if (MOD !== 'staff') return; USERS = r.ok ? r.data : []; drawStaff(); }); }
function uChips(u) {
 var c = '<span class="chip">' + (LVN[u.level] || u.level) + '</span>';
 if (u.level !== 'user') c += '<span class="chip ok">ທຸກແອັບ</span>'; else { if (u.fuel) c += '<span class="chip ok">ນ້ຳມັນ · ' + (RN[u.fuel] || u.fuel) + '</span>'; if (u.hr) c += '<span class="chip ok">HR</span>'; }
 if (u.approver && u.level === 'user') c += '<span class="chip warn">' + ic('shield') + 'ຜູ້ອະນຸມັດ</span>';
 if (!u.active) c += '<span class="chip bad">ປິດໃຊ້</span>';
 return c;
}
function siteNames(u) { return (u.sites || []).map(function (id) { var s = I.cfg.sites.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }).join(', '); }
function uList() {
 var q = UQ.trim().toLowerCase(), f = UF;
 var list = USERS.filter(function (u) {
  if (q && (u.name + ' ' + u.phone).toLowerCase().indexOf(q) < 0) return false;
  return f === 'all' || (f === 'fuel' && (u.level !== 'user' || u.fuel)) || (f === 'hr' && (u.level !== 'user' || u.hr)) || (f === 'appr' && (u.level !== 'user' || u.approver)) || (f === 'off' && !u.active);
 });
 return list.map(function (u, i) { return '<button class="urow' + (u.active ? '' : ' off') + '" data-u="' + esc(u.phone) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms"><span class="avatar">' + initial(u.name) + '</span><span class="grow"><b>' + esc(u.name) + '</b><small>' + esc(u.phone) + (siteNames(u) ? ' · ' + esc(siteNames(u)) : '') + '</small><span class="chips">' + uChips(u) + '</span></span><span class="muted">' + ic(u.editable ? 'edit' : 'lock') + '</span></button>'; }).join('') || '<div class="empty">ບໍ່ພົບພະນັກງານ</div>';
}
function drawStaff() {
 var c = { all: USERS.length, fuel: 0, hr: 0, appr: 0 }; USERS.forEach(function (u) { if (u.level !== 'user' || u.fuel) c.fuel++; if (u.level !== 'user' || u.hr) c.hr++; if (u.level === 'user' && u.approver) c.appr++; });
 var F = [['all', 'ທັງໝົດ'], ['fuel', 'ນ້ຳມັນ'], ['hr', 'HR'], ['appr', 'ຜູ້ອະນຸມັດ'], ['off', 'ປິດໃຊ້']];
 $('v').innerHTML = '<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="stat-card"><small>ທັງໝົດ</small><b>' + c.all + '</b></div><div class="stat-card"><small>ແອັບນ້ຳມັນ</small><b>' + c.fuel + '</b></div><div class="stat-card"><small>ແອັບ HR</small><b>' + c.hr + '</b></div><div class="stat-card"><small>ຜູ້ອະນຸມັດ</small><b>' + c.appr + '</b></div></div>' +
  '<section class="card"><div class="row wrap" style="margin-bottom:8px"><label class="f grow" style="min-width:200px">ຄົ້ນຫາຊື່ / ເບີ<input type="text" id="usearch" value="' + esc(UQ) + '" placeholder="ພິມຊື່ ຫຼື ເບີ…" autocomplete="off"></label><button class="btn" id="uadd" style="align-self:end">' + ic('plus') + 'ເພີ່ມພະນັກງານ</button></div>' +
  '<div class="seg" role="group" aria-label="ກອງ">' + F.map(function (x) { return '<button type="button" data-uf="' + x[0] + '" aria-pressed="' + (UF === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="ulist">' + uList() + '</div></section>' + permLegend();
}
function userForm(u) {
 var isNew = !u, lv = I.me.level; u = u || { level: 'user', fuel: '', hr: false, approver: false, active: true, sites: [] };
 var sw = function (id, on, t, sub) { return '<label class="sw"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="sl"></span><span class="st">' + t + (sub ? '<small>' + sub + '</small>' : '') + '</span></label>'; };
 var lvOpts = lv === 'superadmin' ? [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)'], ['admin', 'Admin (ທຸກແອັບ + ຈັດການຜູ້ໃຊ້)'], ['superadmin', 'Super admin (ທຸກຢ່າງ)']] : [['user', 'ຜູ້ໃຊ້ທົ່ວໄປ (ເລືອກແອັບ)']];
 var m = modal('<h2>' + ic('users') + (isNew ? 'ເພີ່ມພະນັກງານ' : 'ແກ້ໄຂ: ' + esc(u.name)) + '</h2>' +
  '<div class="formgrid">' + (isNew ? '<label class="f">ເບີໂທ (ໃຊ້ເຂົ້າລະບົບ)<input type="tel" inputmode="tel" id="uf-phone" placeholder="020…" autocomplete="off"></label>' : '<div class="f">ເບີໂທ<div style="padding:12px 0;font-weight:700">' + esc(u.phone) + '</div></div>') +
  '<label class="f">ຊື່<input type="text" id="uf-name" maxlength="60" value="' + esc(u.name || '') + '"></label>' +
  '<label class="f">' + (isNew ? 'PIN (4-8 ຫຼັກ)' : 'PIN ໃໝ່ (ເວັ້ນໄວ້ ຖ້າບໍ່ປ່ຽນ)') + '<input type="password" inputmode="numeric" maxlength="8" id="uf-pin" autocomplete="new-password"></label>' +
  '<label class="f">ລະດັບບັນຊີ<select id="uf-level">' + opts(lvOpts, u.level) + '</select></label></div>' +
  '<div id="uf-mods"><label class="f">ໜ້າທີ່ໃນແອັບນ້ຳມັນ<select id="uf-fuel">' + opts([['', 'ບໍ່ໃຊ້ແອັບນ້ຳມັນ'], ['driver', 'ຄົນຂັບ — ຮັບຮູ້ລົດຂອງຕົນ'], ['admin', 'ບໍລິຫານສະໜາມ — ເບີກ / ແກ້ cm'], ['head', 'ຫົວໜ້າສະໜາມ — ອະນຸມັດ / ມອບລົດ'], ['office', 'ຫ້ອງການ — ເບິ່ງລາຍງານ']], u.fuel || '') + '</select></label>' +
  '<div id="uf-sites" class="cks"><span class="hint">ສະໜາມທີ່ດູແລ</span><br>' + (I.cfg.sites.map(function (s) { return '<label><input type="checkbox" value="' + esc(s.id) + '"' + ((u.sites || []).indexOf(s.id) >= 0 ? ' checked' : '') + '> ' + esc(s.name) + '</label>'; }).join('') || '<span class="hint">ຍັງບໍ່ມີສະໜາມ — ເພີ່ມໃນ ຕັ້ງຄ່າ ກ່ອນ</span>') + '</div>' +
  '<div id="uf-apprbox">' + sw('uf-appr', u.approver, 'ເປັນຜູ້ອະນຸມັດໃບປະຈຳວັນ', 'ໃຫ້ບໍລິຫານ/ຫ້ອງການ ທີ່ໄວ້ໃຈ ກົດອະນຸມັດໄດ້') + '</div>' +
  sw('uf-hr', u.hr, 'ເຂົ້າ ST HR ໄດ້', 'ສິດພາຍໃນ HR ກຳນົດໃນແອັບ HR') + '</div>' +
  '<div id="uf-all" class="hint" style="margin:8px 0">Admin / Super admin ເຂົ້າໄດ້ທຸກແອັບ ແລະ ທຸກຟັງຊັນ ໂດຍບໍ່ຕ້ອງເລືອກ.</div>' +
  (isNew ? '' : sw('uf-active', u.active, 'ເປີດໃຊ້ບັນຊີ', 'ປິດ = ເຂົ້າລະບົບບໍ່ໄດ້ທັນທີ')) +
  '<div class="prev" id="uf-prev" aria-live="polite"></div><div class="row" style="margin-top:6px"><button class="btn line grow" id="uf-cancel" type="button">ຍົກເລີກ</button><button class="btn grow" id="uf-save" type="button">' + ic('check') + (isNew ? 'ເພີ່ມພະນັກງານ' : 'ບັນທຶກ') + '</button></div>');
 var q = function (id) { return m.querySelector('#' + id); }, sites = function () { return Array.prototype.map.call(q('uf-sites').querySelectorAll('input:checked'), function (x) { return x.value; }); };
 function refresh() {
  var adm = q('uf-level').value !== 'user', f = q('uf-fuel').value;
  q('uf-mods').classList.toggle('hide', adm); q('uf-all').classList.toggle('hide', !adm);
  q('uf-sites').classList.toggle('hide', f !== 'admin' && f !== 'head'); q('uf-apprbox').classList.toggle('hide', f !== 'admin' && f !== 'office');
  var pl = permList(q('uf-level').value, f, q('uf-hr').checked, q('uf-appr').checked);
  q('uf-prev').innerHTML = '<b>ຄົນນີ້ຈະມີສິດ:</b>' + (pl.length ? '<ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<br><span class="chip bad">ຍັງບໍ່ມີສິດໃດ — ເລືອກແອັບຢ່າງໜ້ອຍ 1 ອັນ</span>');
 }
 m.addEventListener('change', refresh); refresh(); (q('uf-phone') || q('uf-name')).focus();
 q('uf-cancel').onclick = function () { m.remove(); };
 q('uf-save').onclick = function () {
  var b = q('uf-save'), adm = q('uf-level').value !== 'user', ac = q('uf-active');
  var d = { phone: isNew ? q('uf-phone').value : u.phone, name: q('uf-name').value, level: q('uf-level').value, fuel: adm ? '' : q('uf-fuel').value, hr: adm ? false : q('uf-hr').checked, approver: adm ? false : q('uf-appr').checked, pin: q('uf-pin').value, active: ac ? ac.checked : true, sites: sites() };
  b.disabled = true; api('userSave', { user: d }).then(function (r) { b.disabled = false; if (r.ok) { m.remove(); toast(isNew ? 'ເພີ່ມພະນັກງານແລ້ວ' : 'ບັນທຶກແລ້ວ', 'ok'); staffView(); api('drivers').then(function (x) { DRV = x.ok ? x.data : DRV; }); } });
 };
}
function userView(u) { /* ບັນຊີທີ່ແກ້ບໍ່ໄດ້ (ເຊັ່ນ Admin ເບິ່ງ Super admin) — ເບິ່ງຢ່າງດຽວ */
 var pl = permList(u.level, u.fuel, u.hr, u.approver), m = modal('<h2><span class="avatar" style="display:inline-grid;vertical-align:middle;margin-right:8px">' + initial(u.name) + '</span>' + esc(u.name) + '</h2><p class="muted">' + esc(u.phone) + '</p><div class="chips">' + uChips(u) + '</div><div class="prev"><b>ສິດ:</b><ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div><p class="hint">ແກ້ໄດ້ໂດຍ Super admin ເທົ່ານັ້ນ</p><button class="btn line blk" id="vclose">ປິດ</button>');
 m.querySelector('#vclose').onclick = function () { m.remove(); };
}
$('v').addEventListener('input', function (e) { if (MOD === 'staff' && e.target.id === 'usearch') { UQ = e.target.value; $('ulist').innerHTML = uList(); } });
$('v').addEventListener('click', function (e) {
 if (MOD !== 'staff') return; var b = e.target.closest('button'); if (!b) return;
 if (b.id === 'uadd') userForm(null);
 else if (b.dataset.uf) { UF = b.dataset.uf; drawStaff(); }
 else if (b.dataset.u) { var u = USERS.filter(function (x) { return x.phone === b.dataset.u; })[0]; if (u) (u.editable ? userForm(u) : userView(u)); }
});

/* ===== ມອບລົດໃຫ້ຄົນຂັບ ===== */
function assignView() {
 var site = $('site').value, cars = I.cfg.vehicles.filter(function (v) { return v.site === site; }), canSet = isChief();
 var opt = function (cur) { var o = [['', '— ຍັງບໍ່ມອບ —']].concat(DRV.map(function (d) { return [d.phone, d.name]; })); if (cur && !DRV.some(function (d) { return d.phone === cur; })) o.push([cur, drvName(cur)]); return opts(o, cur || ''); };
 var by = {}; cars.forEach(function (v) { if (v.driver) (by[v.driver] = by[v.driver] || []).push(v.name); });
 $('v').innerHTML = '<section class="card"><h2>' + ic('truck') + 'ມອບລົດໃຫ້ຄົນຂັບ</h2><p class="hint">ຄົນຂັບຈະເຫັນ ແລະ ຮັບຮູ້ສະເພາະລົດທີ່ມອບໃຫ້ເທົ່ານັ້ນ. ປ່ຽນແລ້ວມີຜົນທັນທີ.</p>' +
  (cars.map(function (v) { return '<div class="cr"><b>' + esc(v.name) + '</b><select data-asg="' + esc(v.id) + '" aria-label="ຄົນຂັບຂອງ ' + esc(v.name) + '"' + (canSet ? '' : ' disabled') + '>' + opt(v.driver) + '</select></div>'; }).join('') || '<div class="empty">ສະໜາມນີ້ຍັງບໍ່ມີລົດ</div>') + '</section>' +
  '<section class="card"><h2>' + ic('users') + 'ສະຫຼຸບ: ໃຜຂັບຄັນໃດ</h2>' + (Object.keys(by).map(function (p) { return '<div class="cr"><b>' + esc(drvName(p)) + '</b><span>' + by[p].map(esc).join(' · ') + '</span></div>'; }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ໄດ້ມອບລົດ</div>') + (DRV.length ? '' : '<p class="chip warn">ຍັງບໍ່ມີພະນັກງານໜ້າທີ່ "ຄົນຂັບ" — ເພີ່ມໃນ ພະນັກງານ & ສິດ</p>') + '</section>';
}
$('v').addEventListener('change', function (e) {
 var id = e.target.dataset.asg; if (!id || MOD !== 'assign') return;
 api('assign', { site: $('site').value, v: id, driver: e.target.value }).then(function (r) {
  if (!r.ok) { assignView(); return; }
  r.data.forEach(function (x) { I.cfg.vehicles.forEach(function (v) { if (v.id === x.id) v.driver = x.driver; }); });
  assignView(); toast('ມອບລົດແລ້ວ', 'ok');
 });
});

/* ===== ຕັ້ງຄ່າ ສະໜາມ & ລົດ (ເຈົ້າຂອງ) ===== */
function tankIn(t) { t = t || { t: 'lpc' }; return '<div class="tk"><select data-c="tt" aria-label="ຮູບຊົງຖັງ">' + opts([['lpc', 'ລິດ ຕໍ່ 1 cm'], ['box', 'ຖັງສີ່ຫຼ່ຽມ'], ['hcyl', 'ຖັງກົມນອນ']], t.t) + '</select><input type="number" min="0" step="0.01" data-c="ta" value="' + (t.k || t.l || t.d || '') + '"><input type="number" min="0" step="0.01" data-c="tb" value="' + (t.w || t.len || '') + '"></div>'; }
function tankHint(row) { var t = row.querySelector('[data-c=tt]').value, a = row.querySelector('[data-c=ta]'), b = row.querySelector('[data-c=tb]'); a.placeholder = a.title = t === 'lpc' ? 'ລິດ/cm' : t === 'box' ? 'ຍາວ cm' : 'ເສັ້ນຜ່າກາງ cm'; b.placeholder = b.title = t === 'box' ? 'ກວ້າງ cm' : 'ຍາວ cm'; b.classList.toggle('hide', t === 'lpc'); }
function tankOut(row) { var t = row.querySelector('[data-c=tt]').value, a = row.querySelector('[data-c=ta]').value, b = row.querySelector('[data-c=tb]').value; return t === 'box' ? { t: t, l: a, w: b } : t === 'hcyl' ? { t: t, d: a, len: b } : { t: t, k: a }; }
var DELB = '<button type="button" class="btn bad" data-del="1">' + ic('trash') + 'ລຶບ</button>';
function cfgRow(kind, x) {
 var sites = I.cfg.sites.map(function (s) { return [s.id, s.name]; }), drv = [['', '— ເລືອກຄົນຂັບ —']].concat(DRV.map(function (u) { return [u.phone, u.name]; }));
 if (kind === 'site') return '<div class="cr" data-kind="site" data-id="' + esc(x.id) + '"><label class="f">ຊື່ສະໜາມ / ໂຄງການ<input type="text" data-c="name" placeholder="ຊື່ສະໜາມ" value="' + esc(x.name) + '"></label><small class="muted">ຂະໜາດແທ່ງນ້ຳມັນ</small>' + tankIn(x.tank) + DELB + '</div>';
 return '<div class="cr" data-kind="car" data-id="' + esc(x.id) + '"><label class="f">ຊື່ລົດ / ທະບຽນ<input type="text" data-c="name" placeholder="ຊື່ລົດ / ທະບຽນ" value="' + esc(x.name) + '"></label><div class="g2"><select data-c="site" aria-label="ສະໜາມ">' + opts(sites, x.site) + '</select><select data-c="driver" aria-label="ຄົນຂັບ">' + opts(drv, x.driver) + '</select></div><small class="muted">ຂະໜາດຖັງລົດ</small>' + tankIn(x.tank) + DELB + '</div>';
}
function cfgView() {
 api('drivers').then(function (d) {
  if (MOD !== 'cfg') return; if (d.ok) DRV = d.data; var c = I.cfg;
  var sec = function (id, icn, title, hint, rows, add) { return '<section class="card"><h2>' + ic(icn) + title + '</h2><small class="muted">' + hint + '</small><div id="' + id + '">' + rows + '</div><button type="button" class="btn line" data-add="' + add + '" style="margin-top:8px">' + ic('plus') + 'ເພີ່ມ</button></section>'; };
  $('v').innerHTML = '<section class="card"><label class="f">ຊື່ບໍລິສັດ (ສະແດງຫົວລາຍງານ)<input type="text" id="co" maxlength="100" value="' + esc(c.company) + '"></label></section>' +
   sec('cS', 'drop', 'ສະໜາມ', 'ເພີ່ມສະໜາມ ແລ້ວກົດ "ບັນທຶກ" ກ່ອນ ຈຶ່ງເພີ່ມລົດ', c.sites.map(function (s) { return cfgRow('site', s); }).join(''), 'site') +
   sec('cV', 'truck', 'ລົດ / ເຄື່ອງຈັກ', 'ຄົນຂັບ = ຜູ້ທີ່ຈະກົດຮັບຮູ້ໃນມືຖືຂອງຕົນ (ເພີ່ມພະນັກງານ "ຄົນຂັບ" ກ່ອນໃນ ພະນັກງານ & ສິດ)', c.vehicles.map(function (v) { return cfgRow('car', v); }).join(''), 'car') +
   '<button id="csave" class="btn blk">' + ic('check') + 'ບັນທຶກ ສະໜາມ ແລະ ລົດ</button>';
  document.querySelectorAll('#v .tk').forEach(function (t) { tankHint(t.parentNode); });
 });
}
function cfgRead() {
 var q = function (r, c) { return r.querySelector('[data-c=' + c + ']').value; }, all = function (id) { return Array.prototype.slice.call($(id).children).filter(function (x) { return x.dataset.kind; }); };
 return { company: $('co').value, sites: all('cS').map(function (r) { return { id: r.dataset.id, name: q(r, 'name'), tank: tankOut(r) }; }), vehicles: all('cV').map(function (r) { return { id: r.dataset.id, name: q(r, 'name'), site: q(r, 'site'), driver: q(r, 'driver'), tank: tankOut(r) }; }) };
}
$('v').addEventListener('change', function (e) { if (MOD === 'cfg' && e.target.dataset.c === 'tt') tankHint(e.target.closest('.cr')); });
$('v').addEventListener('click', function (e) {
 if (MOD !== 'cfg') return; var b = e.target.closest('button'); if (!b) return;
 if (b.dataset.del) { b.closest('.cr').remove(); return; }
 if (b.dataset.add) { var k = b.dataset.add, box = b.previousElementSibling; box.insertAdjacentHTML('beforeend', cfgRow(k, { id: (k === 'site' ? 's' : 'v') + Math.random().toString(36).slice(2, 9) })); tankHint(box.lastElementChild); return; }
 if (b.id === 'csave') {
  var sent = cfgRead(); b.disabled = true;
  api('cfgSave', { cfg: sent }).then(function (r) {
   b.disabled = false; if (!r.ok) return; var lost = sent.sites.length + sent.vehicles.length - r.data.sites.length - r.data.vehicles.length; I.company = r.data.company;
   api('init').then(function (i) { if (!i.ok) return; I = i.data; fillSites(); buildNav(); cfgView(); toast(lost ? 'ບັນທຶກແລ້ວ ແຕ່ ' + lost + ' ແຖວຖືກຂ້າມ (ຂາດຊື່ ຫຼື ຂະໜາດຖັງ)' : 'ບັນທຶກແລ້ວ', lost ? 'bad' : 'ok'); });
  });
 }
});

/* ===== ຂ້ອຍ ===== */
function meView() {
 var pl = permList(I.me.level, I.me.role === 'owner' ? '' : I.me.role, I.hr, I.me.approver);
 $('v').innerHTML = '<section class="card"><div class="row"><span class="avatar" style="width:56px;height:56px;border-radius:50%;font-size:22px">' + initial(I.me.name) + '</span><div class="grow"><h2 style="margin:0">' + esc(I.me.name) + '</h2><span class="muted">' + esc(I.me.phone) + '</span><div class="chips"><span class="chip">' + (LVN[I.me.level] || '') + '</span>' + (I.me.level === 'user' ? '<span class="chip ok">' + esc(RN[I.me.role] || '') + '</span>' : '') + (I.me.approver && I.me.level === 'user' ? '<span class="chip warn">' + ic('shield') + 'ຜູ້ອະນຸມັດ</span>' : '') + '</div></div></div><div class="prev"><b>ສິດຂອງຂ້ອຍ:</b><ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></section>' +
  '<section class="card"><h2>' + ic('lock') + 'ປ່ຽນ PIN</h2><div class="g2"><label class="f">PIN ເກົ່າ<input type="password" inputmode="numeric" maxlength="8" id="po" autocomplete="current-password"></label><label class="f">PIN ໃໝ່ (4-8 ຫຼັກ)<input type="password" inputmode="numeric" maxlength="8" id="pn" autocomplete="new-password"></label></div><button class="btn blk" id="pchg" style="margin-top:12px">ບັນທຶກ PIN ໃໝ່</button></section><div id="inst"></div><button class="btn bad blk" id="lo2" style="margin-top:12px">' + ic('out') + 'ອອກຈາກລະບົບ</button>';
 $('lo2').onclick = logout; installHint('inst');
}
$('v').addEventListener('click', function (e) { var b = e.target.closest('button'); if (MOD === 'me' && b && b.id === 'pchg') api('pin', { old: $('po').value, pin: $('pn').value }).then(function (r) { if (r.ok) { ls('fuel_tk', r.token); $('po').value = $('pn').value = ''; toast('ປ່ຽນ PIN ແລ້ວ', 'ok'); } }); });

start(); /* ໄຟລ໌ສຸດທ້າຍທີ່ໂຫຼດ — ທຸກໂມດູນພ້ອມແລ້ວ */
