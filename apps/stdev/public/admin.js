/* ສູນຈັດການ (Admin Hub) — ບ່ອນດຽວສຳລັບ Super admin / Admin: ຄົນ & ສິດ · ສະໜາມ & ລົດ · ມອບລົດ
 * ອອກແບບໃຫ້ຄົນທົ່ວໄປໃຊ້ໄດ້: ປຸ່ມໃຫຍ່, ຄຳຖາມສັ້ນ, ເຮັດທີລະບາດ (ເພີ່ມຄົນ 4 ຂັ້ນ), ບັດເລືອກແທນ dropdown, ຕິກລະອຽດເກັບໃນ "ປັບສິດລະອຽດ"
 * ສິດຈິງກວດຢູ່ server ທຸກຄັ້ງ — ໜ້ານີ້ເປັນຕົວຊ່ວຍກອກ */
'use strict';
var ME = null, CFG = { company: '', sites: [], vehicles: [] }, USERS = [], CAT = [], SCH = null, DRV = [], VIEW = 'home', UQ = '';
var FUELCARDS = [['', 'ບໍ່ໃຊ້ແອັບນ້ຳມັນ', 'ຄົນນີ້ບໍ່ຕ້ອງໃຊ້ແອັບນ້ຳມັນ', 'x'], ['driver', 'ຄົນຂັບລົດ', 'ເຫັນລົດຂອງຕົນ ແລະ ກົດ "ຮັບຮູ້" ວ່າເຕີມນ້ຳມັນແລ້ວ', 'truck'], ['admin', 'ຄົນເບີກນ້ຳມັນ', 'ກອກ cm ຂອງລົດ, ຮັບນ້ຳມັນເຂົ້າແທ່ງ, ເບິ່ງລາຍງານ', 'edit'], ['head', 'ຫົວໜ້າສະໜາມ', 'ເຮັດໄດ້ທຸກຢ່າງໃນສະໜາມ: ກອກ, ອະນຸມັດ, ມອບລົດ', 'shield'], ['office', 'ຫ້ອງການ', 'ເບິ່ງລາຍງານຂອງທຸກສະໜາມ (ແກ້ບໍ່ໄດ້)', 'report']];
var HRCARDS = [['', 'ບໍ່ໃຊ້ HR', 'ຄົນນີ້ບໍ່ຕ້ອງເຂົ້າ HR', 'x'], ['employee', 'ພະນັກງານ', 'ລົງເວລາ, ຂໍລາ, ເບິ່ງເງິນເດືອນຂອງຕົນ', 'user'], ['head', 'ຫົວໜ້າ', 'ອະນຸມັດລາ / OT ຂອງທີມ', 'shield'], ['accountant', 'ບັນຊີ', 'ຈັດການເງິນເດືອນ', 'ledger'], ['auditor', 'ຜູ້ກວດສອບ', 'ເບິ່ງ ແລະ ກວດຂໍ້ມູນ HR', 'search']];
function fuelPreset(r) { return ((SCH && SCH.fuel.presets) || {})[r] || []; }
function hrPreset(r) { return ((SCH && SCH.hr && SCH.hr.presets) || {})[r] || []; }
function sameSet(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; }); }
function catName(id) { var c = CAT.filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; }
function siteName(id) { var s = CFG.sites.filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }
function nameOf(ph) { var d = DRV.filter(function (x) { return x.phone === ph; })[0]; return d ? d.name : (ph || ''); }
function uid(p) { return p + Math.random().toString(36).slice(2, 9); }
var BACKB = '<button class="back" data-go="home">' + '‹ ກັບໄປສູນຈັດການ</button>';

function start() {
 Promise.all([api('init'), api('userList'), api('catalog'), api('schema'), api('drivers')]).then(function (a) {
  if (!a[0].ok) return; ME = a[0].data.me; if (ME.level === 'user') { location.href = 'home.html'; return; }
  CFG = a[0].data.cfg || CFG; USERS = a[1].ok ? a[1].data : []; CAT = a[2].ok ? a[2].data : []; SCH = a[3].ok ? a[3].data : { fuel: { rights: [], presets: {} }, hr: null }; DRV = a[4].ok ? a[4].data : [];
  $('hd').innerHTML = header('ຈັດການລະບົບ', ME.name); $('lo').onclick = logout;
  go((location.hash || '').slice(1) || 'home');
 });
}
function go(v) { if (['home', 'people', 'setup', 'assign'].indexOf(v) < 0) v = 'home'; VIEW = v; history.replaceState(null, '', '#' + v); window.scrollTo(0, 0); ({ home: home, people: people, setup: setup, assign: assign })[v](); }
function refreshAll() { return Promise.all([api('userList'), api('drivers'), api('init')]).then(function (a) { if (a[0].ok) USERS = a[0].data; if (a[1].ok) DRV = a[1].data; if (a[2].ok) CFG = a[2].data.cfg || CFG; }); }

/* ===== ໜ້າຫຼັກຂອງສູນຈັດການ ===== */
function home() {
 var cars = CFG.vehicles, noDrv = cars.filter(function (c) { return !c.driver; }).length, people = USERS.filter(function (u) { return u.level === 'user'; }).length;
 var steps = [[CFG.sites.length > 0, 'ເພີ່ມສະໜາມ (ບ່ອນເຮັດວຽກ + ແທ່ງນ້ຳມັນ)', 'setup'], [cars.length > 0, 'ເພີ່ມລົດ ແລະ ບອກຂະໜາດຖັງ', 'setup'], [people > 0, 'ເພີ່ມຄົນ (ຄົນຂັບ, ບໍລິຫານ, HR…)', 'people'], [cars.length > 0 && noDrv === 0, 'ມອບລົດໃຫ້ຄົນຂັບ', 'assign']], all = steps.every(function (s) { return s[0]; });
 $('v').innerHTML = '<p class="hello">ສະບາຍດີ ' + esc(ME.name) + ' — ເລືອກສິ່ງທີ່ຢາກເຮັດ</p><div class="hub">' +
  '<button class="hubtile" data-go="people"><span class="logo">' + ic('users') + '</span><span class="grow"><b>ຄົນ & ສິດ</b><span class="sub">ເພີ່ມຄົນ · ບອກວ່າເຮັດວຽກຫຍັງ ໃນແອັບນ້ຳມັນ ແລະ HR — ຄັ້ງດຽວ</span><span class="chip">' + USERS.length + ' ຄົນ</span></span>' + ic('next', 'muted') + '</button>' +
  '<button class="hubtile" data-go="setup" style="animation-delay:70ms"><span class="logo">' + ic('pump') + '</span><span class="grow"><b>ສະໜາມ & ລົດ</b><span class="sub">ເພີ່ມສະໜາມ, ລົດ, ແລະ ຂະໜາດຖັງ</span><span class="chip">' + CFG.sites.length + ' ສະໜາມ · ' + cars.length + ' ຄັນ</span></span>' + ic('next', 'muted') + '</button>' +
  '<button class="hubtile" data-go="assign" style="animation-delay:140ms"><span class="logo">' + ic('truck') + '</span><span class="grow"><b>ມອບລົດໃຫ້ຄົນຂັບ</b><span class="sub">ບອກວ່າໃຜຂັບລົດຄັນໃດ</span>' + (noDrv ? '<span class="chip warn">' + noDrv + ' ຄັນຍັງບໍ່ມີຄົນຂັບ</span>' : cars.length ? '<span class="chip ok">ມອບຄົບແລ້ວ</span>' : '') + '</span>' + ic('next', 'muted') + '</button></div>' +
  '<section class="card" style="margin-top:14px"><h2>' + ic('check') + (all ? 'ທຸກຢ່າງພ້ອມແລ້ວ' : 'ເລີ່ມຕົ້ນ — ເຮັດຕາມລຳດັບ') + '</h2><ul class="todoList">' + steps.map(function (s, i) { return '<li><span class="dot' + (s[0] ? ' ok' : '') + '">' + (s[0] ? ic('check') : i + 1) + '</span><span class="grow">' + s[1] + '</span>' + (s[0] ? '' : '<button class="btn" data-go="' + s[2] + '" style="min-height:44px">ເຮັດເລີຍ</button>') + '</li>'; }).join('') + '</ul></section>';
}

/* ===== ຄົນ & ສິດ ===== */
function chips(u) {
 var c = '<span class="chip">' + (LVN[u.level] || u.level) + '</span>';
 if (u.level !== 'user') c += '<span class="chip ok">ທຸກແອັບ</span>';
 else { if (u.fuel) c += '<span class="chip ok">ນ້ຳມັນ · ' + (RN[u.fuel] || u.fuel) + '</span>'; if (u.hr) c += '<span class="chip ok">HR · ' + (HRN[u.hrRole] || HRN.employee) + '</span>'; (u.apps || []).forEach(function (id) { c += '<span class="chip ok">' + esc(catName(id)) + '</span>'; }); }
 if (u.approver && u.level === 'user') c += '<span class="chip warn">' + ic('shield') + 'ອະນຸມັດໄດ້</span>';
 if (!u.active) c += '<span class="chip bad">ປິດໃຊ້</span>';
 return c;
}
function ulist() {
 var q = UQ.trim().toLowerCase(), rows = USERS.filter(function (u) { return !q || (u.name + ' ' + u.phone).toLowerCase().indexOf(q) >= 0; });
 return rows.map(function (u, i) { return '<button class="urow' + (u.active ? '' : ' off') + '" data-u="' + esc(u.phone) + '" style="animation-delay:' + Math.min(i, 12) * 30 + 'ms"><span class="avatar">' + initial(u.name) + '</span><span class="grow"><b>' + esc(u.name) + '</b><small>' + esc(u.phone) + '</small><span class="chips">' + chips(u) + '</span></span><span class="muted">' + ic(u.editable ? 'edit' : 'lock') + '</span></button>'; }).join('') || '<div class="empty">ບໍ່ພົບໃຜ</div>';
}
function people() {
 $('v').innerHTML = BACKB + '<h1 style="margin:0 0 10px">ຄົນ & ສິດ</h1><section class="card"><button class="btn ok bigbtn" id="uadd">' + ic('plus') + 'ເພີ່ມຄົນໃໝ່</button><label class="field" style="margin-top:14px">ຄົ້ນຫາ<input type="text" id="usearch" value="' + esc(UQ) + '" placeholder="ພິມຊື່ ຫຼື ເບີ…" autocomplete="off"></label><div id="ulist">' + ulist() + '</div></section>' +
  '<details class="adv"><summary>ເບິ່ງຕາຕະລາງສິດຕາມໜ້າທີ່</summary>' + permLegend() + '</details>';
}

/* ===== ເພີ່ມ / ແກ້ໄຂຄົນ — ເຮັດທີລະບາດ ===== */
function summary(W) {
 if (W.level !== 'user') return ['ເຮັດໄດ້ທຸກຢ່າງ ໃນທຸກແອັບ', 'ຕັ້ງຄ່າ ສະໜາມ & ລົດ', W.level === 'superadmin' ? 'ຈັດການທຸກບັນຊີ ລວມ Admin' : 'ຈັດການບັນຊີຜູ້ໃຊ້ທົ່ວໄປ'];
 var out = [];
 if (W.fuel) { var on = fuelOn(W), lab = (SCH.fuel.rights || []).filter(function (r) { return on.indexOf(r.k) >= 0; }).map(function (r) { return r.label; }); out.push('ແອັບນ້ຳມັນ — ' + W.fuels.map(function (r) { return RN[r] || r; }).join(' + ') + (lab.length ? ': ' + lab.join(' · ') : ' (ຍັງບໍ່ໄດ້ຕິກສິດໃດ)')); }
 if (W.hrRole) { var h = hrOn(W), base = hrPreset(W.hrRole), add = h.filter(function (k) { return base.indexOf(k) < 0; }).length, del = base.filter(function (k) { return h.indexOf(k) < 0; }).length; out.push('ແອັບ HR — ' + (HRN[W.hrRole] || W.hrRole) + ' (' + h.length + ' ສິດ' + (add || del ? ', ປັບ +' + add + ' / −' + del : '') + ')'); }
 W.apps.forEach(function (id) { out.push(catName(id) + ' — ເຂົ້າໃຊ້ໄດ້'); });
 return out;
}
/* ໜ້າວຽກນ້ຳມັນເລືອກໄດ້ຫຼາຍ: ຄົນຂັບ + (ຄົນເບີກ ຫຼື ຫົວໜ້າ ຫຼື ຫ້ອງການ ອັນໃດອັນໜຶ່ງ). server ເກັບເປັນ role ຫຼັກ + ສິດລວມ */
function fuelMain(a) { var m = ['head', 'admin', 'office'].filter(function (x) { return a.indexOf(x) >= 0; })[0]; return m || (a.indexOf('driver') >= 0 ? 'driver' : ''); }
function fuelsOf(u) { var a = u.fuel ? [u.fuel] : []; if (u.fuel && u.fuel !== 'driver' && Array.isArray(u.fuelRights) && u.fuelRights.indexOf('ack') >= 0) a.push('driver'); return a; }
function fuelBase(W) { var l = []; W.fuels.forEach(function (r) { fuelPreset(r).forEach(function (k) { if (l.indexOf(k) < 0) l.push(k); }); }); return l; }
function fuelOn(W) { if (Array.isArray(W.advF)) return W.advF; var b = fuelBase(W); return W.approve && b.indexOf('approve') < 0 ? b.concat('approve') : b; }
function hrOn(W) { return Array.isArray(W.advH) ? W.advH : hrPreset(W.hrRole); }
function needSites(W) { return W.level === 'user' && W.fuel && W.fuel !== 'office'; }
function rcards(list, cur, attr, multi) { var is = function (v) { return Array.isArray(cur) ? cur.indexOf(v) >= 0 : v === cur; }; return '<div class="rgrid" role="' + (multi ? 'group' : 'radiogroup') + '">' + list.map(function (c) { return '<button type="button" class="rcard" role="' + (multi ? 'checkbox' : 'radio') + '" aria-checked="' + is(c[0]) + '" data-' + attr + '="' + esc(c[0]) + '"><span class="ri">' + ic(c[3]) + '</span><span><b>' + esc(c[1]) + '</b><small>' + esc(c[2]) + '</small></span></button>'; }).join('') + '</div>'; }
function tickBox(name, items, on) { return '<div class="ticks">' + items.map(function (i) { return '<label class="tick"><input type="checkbox" data-t="' + name + '" value="' + esc(i.k) + '"' + (on.indexOf(i.k) >= 0 ? ' checked' : '') + '><span>' + esc(i.label) + '</span></label>'; }).join('') + '</div>'; }

function wizard(u) {
 var isNew = !u; u = u || { level: 'user', fuel: '', hr: false, hrRole: '', approver: false, active: true, sites: [], apps: [], fuelRights: null, hrRights: null };
 var W = { isNew: isNew, phone: u.phone || '', name: u.name || '', pin: '', level: u.level, fuel: u.fuel || '', fuels: fuelsOf(u), approve: !!u.approver, advF: Array.isArray(u.fuelRights) ? u.fuelRights : null, hrRole: u.hr ? (u.hrRole || 'employee') : '', advH: Array.isArray(u.hrRights) ? u.hrRights : null, sites: (u.sites || []).slice(), apps: (u.apps || []).slice(), active: u.active !== false }, step = isNew ? 0 : 1, err = '';
 var m = modal('<div id="wz"></div>');
 var lv = ME.level;
 function stepList() { return ['ໃຜ', 'ວຽກ'].concat(needSites(W) ? ['ສະໜາມ'] : [], ['ກວດ']); }
 function check(i) {
  var k = stepList()[i];
  if (k === 'ໃຜ') { if (!W.name.trim()) return 'ກະລຸນາໃສ່ຊື່'; if (isNew && W.phone.replace(/\D/g, '').length < 8) return 'ເບີໂທຕ້ອງມີຢ່າງໜ້ອຍ 8 ໂຕເລກ'; if ((isNew || W.pin) && !/^\d{4,8}$/.test(W.pin)) return 'PIN ຕ້ອງເປັນຕົວເລກ 4 ຫາ 8 ໂຕ'; }
  if (k === 'ວຽກ' && W.level === 'user' && !W.fuel && !W.hrRole && !W.apps.length) return 'ເລືອກຢ່າງໜ້ອຍ 1 ວຽກ (ນ້ຳມັນ ຫຼື HR)';
  return '';
 }
 function body(k) {
  if (k === 'ໃຜ') return '<div class="q">ຄົນນີ້ແມ່ນໃຜ?</div><p class="qs">ໃສ່ຊື່ ແລະ ເບີໂທ. ເບີໂທນີ້ໃຊ້ເຂົ້າລະບົບ.</p>' +
   '<label class="field">ຊື່<input type="text" id="w-name" maxlength="60" value="' + esc(W.name) + '" autocomplete="off"></label>' +
   (isNew ? '<label class="field">ເບີໂທ<input type="tel" inputmode="tel" id="w-phone" value="' + esc(W.phone) + '" placeholder="020 xxxx xxxx" autocomplete="off"></label>' : '<div class="field">ເບີໂທ<div style="font-size:20px;padding:8px 0">' + esc(W.phone) + '</div></div>') +
   '<label class="field">' + (isNew ? 'ລະຫັດ PIN (ຕົວເລກ 4 ຫາ 8 ໂຕ)' : 'ປ່ຽນ PIN ໃໝ່ (ເວັ້ນໄວ້ ຖ້າບໍ່ປ່ຽນ)') + '<small>ຄົນນີ້ໃຊ້ PIN ນີ້ເຂົ້າລະບົບ — ບອກເຂົາໂດຍກົງ</small><input type="password" inputmode="numeric" maxlength="8" id="w-pin" value="' + esc(W.pin) + '" autocomplete="new-password"></label>' +
   (isNew ? '' : '<label class="sw"><input type="checkbox" id="w-active"' + (W.active ? ' checked' : '') + '><span class="sl"></span><span class="st">ເປີດໃຊ້ບັນຊີ<small>ປິດ = ເຂົ້າລະບົບບໍ່ໄດ້ທັນທີ ທຸກແອັບ</small></span></label>');
  if (k === 'ວຽກ') {
   var h = '<div class="q">ຄົນນີ້ເຮັດວຽກຫຍັງ?</div><p class="qs">ແຕະບັດທີ່ຖືກ. ເລືອກໄດ້ທັງ ນ້ຳມັນ ແລະ HR.</p>';
   var lvCards = rcards([['user', 'ຜູ້ໃຊ້ທົ່ວໄປ', 'ເລືອກວຽກ (ນ້ຳມັນ / HR) ຕາມປົກກະຕິ', 'user'], ['admin', 'ແອດມິນ', 'ເຮັດໄດ້ທຸກຢ່າງ ແລະ ຈັດການຄົນ', 'shield']].concat(lv === 'superadmin' ? [['superadmin', 'Super admin', 'ຄວບຄຸມທຸກຢ່າງ ລວມແອດມິນ', 'key']] : []), W.level, 'lv');
   if (W.level !== 'user') return h + '<p class="prev">ແອດມິນ ເຂົ້າໄດ້ທຸກແອັບ ແລະ ທຸກຟັງຊັນ — ບໍ່ຕ້ອງເລືອກວຽກ. ຢາກປ່ຽນກັບເປັນຜູ້ໃຊ້ທົ່ວໄປ ແຕະ "ຜູ້ໃຊ້ທົ່ວໄປ".</p>' + lvCards;
   h += '<div class="sect">' + ic('pump') + 'ແອັບນ້ຳມັນ</div>' + rcards(FUELCARDS, W.fuels.length ? W.fuels : '', 'fuel', true) + '<p class="hint">ເລືອກໄດ້ຫຼາຍໜ້າວຽກ ເຊັ່ນ ຄົນຂັບ + ຄົນເບີກນ້ຳມັນ (ຄົນຄົນດຽວເຮັດສອງຢ່າງ).</p>';
   if ((W.fuel === 'admin' || W.fuel === 'office') && !Array.isArray(W.advF)) h += '<label class="sw"><input type="checkbox" id="w-appr"' + (W.approve ? ' checked' : '') + '><span class="sl"></span><span class="st">ໃຫ້ກົດ "ອະນຸມັດໃບປະຈຳວັນ" ໄດ້ດ້ວຍ<small>ສຳລັບຄົນທີ່ໄວ້ໃຈ</small></span></label>';
   h += '<div class="sect">' + ic('users') + 'ແອັບ HR</div>' + (SCH.hr ? rcards(HRCARDS, W.hrRole, 'hr') : '<p class="hint">ຍັງບໍ່ໄດ້ຕັ້ງລະບົບ HR ໃນ server — ຕິດຕໍ່ຜູ້ດູແລ</p>');
   CAT.forEach(function (a) { h += '<div class="sect">' + ic('sheet') + esc(a.name) + '</div><label class="sw"><input type="checkbox" data-app="' + esc(a.id) + '"' + (W.apps.indexOf(a.id) >= 0 ? ' checked' : '') + '><span class="sl"></span><span class="st">ເຂົ້າ ' + esc(a.name) + ' ໄດ້</span></label>'; });
   if (W.fuel || W.hrRole) h += '<details class="adv"><summary>ປັບສິດລະອຽດ (ສຳລັບຜູ້ຊຳນານ — ບໍ່ຈຳເປັນ)</summary>' + (W.fuel ? '<div class="ticks-title">ນ້ຳມັນ — ຟັງຊັນທີ່ເຮັດໄດ້</div>' + tickBox('f', SCH.fuel.rights, fuelOn(W)) : '') + (W.hrRole && SCH.hr ? SCH.hr.groups.map(function (g) { return '<div class="ticks-title">HR — ' + esc(g.label) + '</div>' + tickBox('h:' + g.id, g.items, hrOn(W)); }).join('') : '') + '<p class="hint">ປ່ຽນບັດວຽກ = ເຕີມຕິກໃໝ່ຕາມບັດ. ຕິກທີ່ຕ່າງຈາກບັດ ຈະຖືກບັນທຶກເປັນສິດສ່ວນຕົວ.</p></details>';
   if (lv === 'superadmin') h += '<details class="adv"><summary>ເຮັດໃຫ້ຄົນນີ້ເປັນແອດມິນ? (ສຳລັບເຈົ້າຂອງ)</summary>' + lvCards + '</details>';
   return h;
  }
  if (k === 'ສະໜາມ') return '<div class="q">ເຮັດວຽກຢູ່ສະໜາມໃດ?</div><p class="qs">ແຕະເລືອກສະໜາມທີ່ຄົນນີ້ດູແລ' + (W.fuel === 'driver' ? ' (ຄົນຂັບປົກກະຕິຂ້າມໄດ້ — ເຫັນລົດຂອງຕົນຢູ່ແລ້ວ)' : '') + '.</p>' + (CFG.sites.map(function (s) { var on = W.sites.indexOf(s.id) >= 0; return '<button type="button" class="sitecard" role="checkbox" aria-checked="' + on + '" data-site="' + esc(s.id) + '"><span class="cb">' + (on ? ic('check') : '') + '</span><b>' + esc(s.name) + '</b></button>'; }).join('') || '<p class="chip warn">ຍັງບໍ່ມີສະໜາມ — ປິດໜ້ານີ້ ແລ້ວໄປ "ສະໜາມ & ລົດ" ເພີ່ມກ່ອນ</p>');
  /* ກວດ */ var pl = summary(W);
  return '<div class="q">ກວດອີກຄັ້ງ</div><p class="qs">ຖ້າຖືກຕ້ອງ ກົດ "ບັນທຶກ".</p><div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="row"><span class="avatar" style="border-radius:50%">' + initial(W.name) + '</span><div><b style="font-size:18px">' + esc(W.name) + '</b><div class="muted">' + esc(W.phone) + '</div></div></div><ul style="margin:10px 0 0;padding-left:20px;line-height:1.7">' + (pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') || '<li>ຍັງບໍ່ໄດ້ເລືອກວຽກ</li>') + '</ul></div>' + (W.hrRole && W.isNew ? '<p class="hint">ບັນທຶກແລ້ວ ລະບົບຈະສ້າງຄົນນີ້ໃນ HR ໃຫ້ເອງ — ບໍ່ຕ້ອງເພີ່ມຊ້ຳ.</p>' : '');
 }
 function paint() {
  var keys = stepList(); if (step >= keys.length) step = keys.length - 1;
  var last = step === keys.length - 1;
  $('wz').innerHTML = '<div class="steps" role="tablist">' + keys.map(function (k, i) { return '<button type="button" role="tab" data-step="' + i + '" aria-current="' + (i === step) + '" class="' + (i < step ? 'done' : '') + '">' + (i + 1) + '. ' + k + '</button>'; }).join('') + '</div>' +
   body(keys[step]) + '<div class="err2" role="alert">' + esc(err) + '</div><div class="bar2"><button type="button" class="btn line grow" id="w-back">' + (step === 0 ? 'ຍົກເລີກ' : '‹ ຍ້ອນກັບ') + '</button><button type="button" class="btn ok grow" id="w-next">' + (last ? ic('check') + 'ບັນທຶກ' : 'ຕໍ່ໄປ ›') + '</button></div>';
 }
 function read() { /* ດຶງຄ່າຈາກຊ່ອງໃນໜ້າປັດຈຸບັນ */
  var g = function (id) { return $('wz').querySelector('#' + id); };
  if (g('w-name')) W.name = g('w-name').value; if (g('w-phone')) W.phone = g('w-phone').value; if (g('w-pin')) W.pin = g('w-pin').value; if (g('w-active')) W.active = g('w-active').checked; if (g('w-appr')) W.approve = g('w-appr').checked;
  $('wz').querySelectorAll('input[data-app]').forEach(function (x) { var i = W.apps.indexOf(x.dataset.app); if (x.checked && i < 0) W.apps.push(x.dataset.app); if (!x.checked && i >= 0) W.apps.splice(i, 1); });
 }
 function save(btn) {
  var keys = stepList(); for (var i = 0; i < keys.length; i++) { var e = check(i); if (e) { err = e; step = i; paint(); return; } }
  var adm = W.level !== 'user', f = adm ? null : fuelOn(W), d = { phone: W.phone, name: W.name, level: W.level, fuel: adm ? '' : W.fuel, hr: adm ? false : !!W.hrRole, hrRole: W.hrRole || 'employee', approver: adm ? false : fuelOn(W).indexOf('approve') >= 0, apps: adm ? [] : W.apps, pin: W.pin, active: W.active, sites: needSites(W) || W.fuel === 'office' ? W.sites : W.sites };
  d.fuelRights = adm || !W.fuel ? null : (sameSet(f, fuelPreset(W.fuel)) ? null : f);
  if (!adm && W.hrRole && SCH.hr) d.hrRights = hrOn(W);
  btn.disabled = true; api('userSave', { user: d }).then(function (r) {
   btn.disabled = false; if (!r.ok) { err = ERR[r.error] || 'ບັນທຶກບໍ່ໄດ້ — ກວດຂໍ້ມູນອີກຄັ້ງ'; paint(); return; }
   m.remove(); var h = r.data && r.data.hr; toast((isNew ? 'ເພີ່ມ ' : 'ບັນທຶກ ') + W.name + ' ແລ້ວ ✓' + (h === 'ok' ? ' · ສ້າງໃນ HR ແລ້ວ' : ''), h === 'error' ? 'bad' : 'ok'); if (h === 'error') toast('ອັບເດດ HR ບໍ່ສຳເລັດ — ກົດບັນທຶກໃໝ່', 'bad');
   refreshAll().then(function () { if (VIEW === 'people') people(); else go(VIEW); });
  });
 }
 m.addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return; var z = $('wz'); if (!z || !z.contains(b)) return;
  read();
  if (b.dataset.step) { var t = +b.dataset.step; if (isNew && t > step) { var ee = check(step); if (ee) { err = ee; paint(); return; } } err = ''; step = t; paint(); return; }
  if (b.id === 'w-back') { if (step === 0) m.remove(); else { err = ''; step--; paint(); } return; }
  if (b.id === 'w-next') { var keys = stepList(), er = check(step); if (er) { err = er; paint(); return; } err = ''; if (step === keys.length - 1) save(b); else { step++; paint(); } return; }
  if (b.dataset.lv) { W.level = b.dataset.lv; err = ''; paint(); return; }
  if (b.dataset.fuel !== undefined) { var fv = b.dataset.fuel, M = ['head', 'admin', 'office']; if (!fv) W.fuels = []; else if (W.fuels.indexOf(fv) >= 0) W.fuels = W.fuels.filter(function (x) { return x !== fv; }); else W.fuels = (M.indexOf(fv) >= 0 ? W.fuels.filter(function (x) { return M.indexOf(x) < 0; }) : W.fuels).concat(fv); W.fuel = fuelMain(W.fuels); W.advF = null; W.approve = false; err = ''; paint(); return; }
  if (b.dataset.hr !== undefined) { W.hrRole = b.dataset.hr; W.advH = null; err = ''; paint(); return; }
  if (b.dataset.site) { var i = W.sites.indexOf(b.dataset.site); if (i >= 0) W.sites.splice(i, 1); else W.sites.push(b.dataset.site); paint(); return; }
 });
 m.addEventListener('change', function (e) {
  var t = e.target; if (t.dataset && t.dataset.t) { /* ຕິກລະອຽດ */ var z = $('wz'); W.advF = [].map.call(z.querySelectorAll('input[data-t="f"]:checked'), function (x) { return x.value; }); if (SCH.hr) { var l = []; z.querySelectorAll('input[data-t^="h:"]:checked').forEach(function (x) { l.push(x.value); }); W.advH = l; } if (!z.querySelector('input[data-t="f"]')) W.advF = null; return; }
  read(); if (t.id === 'w-appr' || t.dataset.app) paint();
 });
 paint();
}

/* ===== ສະໜາມ & ລົດ ===== */
function tankText(t) { if (!t) return '–'; return t.t === 'hcyl' ? 'ຖັງກົມນອນ Ø' + t.d + ' × ຍາວ ' + t.len + ' cm' : t.t === 'box' ? 'ຖັງສີ່ຫຼ່ຽມ ' + t.l + ' × ' + t.w + ' cm' : '1 cm = ' + t.k + ' ລິດ'; }
function saveCfg(next, done) { api('cfgSave', { cfg: next }).then(function (r) { if (!r.ok) return; CFG = r.data; toast('ບັນທຶກແລ້ວ ✓', 'ok'); if (done) done(); if (VIEW === 'setup') setup(); }); }
function setup() {
 $('v').innerHTML = BACKB + '<h1 style="margin:0 0 10px">ສະໜາມ & ລົດ</h1>' +
  '<section class="card"><label class="field" style="margin-top:0">ຊື່ບໍລິສັດ <small>ສະແດງຢູ່ຫົວລາຍງານ</small><input type="text" id="co" maxlength="100" value="' + esc(CFG.company) + '"></label><button class="btn line" id="cosave" style="min-height:48px">ບັນທຶກຊື່</button></section>' +
  '<section class="card"><h2>' + ic('drop') + 'ສະໜາມ</h2><p class="hint" style="margin:0">ສະໜາມ = ບ່ອນເຮັດວຽກ ທີ່ມີແທ່ງນ້ຳມັນ 1 ແທ່ງ</p>' + (CFG.sites.map(function (s) { var n = CFG.vehicles.filter(function (v) { return v.site === s.id; }).length; return '<div class="itemrow"><span class="grow"><b>' + esc(s.name) + '</b><small>' + esc(tankText(s.tank)) + ' · ' + n + ' ຄັນ</small></span><button class="btn line" data-site-edit="' + esc(s.id) + '">ແກ້ໄຂ</button></div>'; }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີສະໜາມ</div>') + '<button class="btn ok bigbtn" id="site-add" style="margin-top:12px">' + ic('plus') + 'ເພີ່ມສະໜາມ</button></section>' +
  '<section class="card"><h2>' + ic('truck') + 'ລົດ / ເຄື່ອງຈັກ</h2>' + (CFG.vehicles.map(function (v) { return '<div class="itemrow"><span class="grow"><b>' + esc(v.name) + '</b><small>' + esc(siteName(v.site)) + ' · ຄົນຂັບ: ' + esc(nameOf(v.driver) || 'ຍັງບໍ່ມີ') + ' · ' + esc(tankText(v.tank)) + '</small></span><button class="btn line" data-car-edit="' + esc(v.id) + '">ແກ້ໄຂ</button></div>'; }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີລົດ</div>') + (CFG.sites.length ? '<button class="btn ok bigbtn" id="car-add" style="margin-top:12px">' + ic('plus') + 'ເພີ່ມລົດ</button>' : '<p class="chip warn" style="margin-top:10px">ເພີ່ມສະໜາມກ່ອນ ຈຶ່ງເພີ່ມລົດໄດ້</p>') + '</section>';
}
/* ຕົວຊ່ວຍເລືອກຮູບຖັງ + ທົດສອບລິດທັນທີ */
var TANKTYPES = [['hcyl', 'ຖັງກົມນອນ', 'ແທ່ງໃຫຍ່ຮູບກົມ ວາງນອນ (ຄືຮູບແທ່ງນ້ຳມັນ)', 'drop'], ['box', 'ຖັງສີ່ຫຼ່ຽມ', 'ຖັງຮູບກ່ອງ — ວັດ ຍາວ × ກວ້າງ', 'sheet'], ['lpc', 'ຮູ້ລິດຕໍ່ 1 cm ແລ້ວ', 'ຖ້າຮູ້ຢູ່ແລ້ວວ່າ 1 cm = ກີ່ລິດ', 'report']];
function tankPicker(t) {
 t = t || { t: 'hcyl' }; var st = { t: t.t, a: t.k || t.l || t.d || '', b: t.w || t.len || '' }, root = document.createElement('div');
 var fields = { hcyl: [['ເສັ້ນຜ່າກາງ (cm)', 'a'], ['ຄວາມຍາວ (cm)', 'b']], box: [['ຍາວ (cm)', 'a'], ['ກວ້າງ (cm)', 'b']], lpc: [['1 cm = ກີ່ລິດ', 'a']] };
 function val() { var a = +st.a, b = +st.b; if (st.t === 'hcyl') return a > 0 && b > 0 ? { t: 'hcyl', d: a, len: b } : null; if (st.t === 'box') return a > 0 && b > 0 ? { t: 'box', l: a, w: b } : null; return a > 0 ? { t: 'lpc', k: a } : null; }
 function paint() {
  root.innerHTML = rcards(TANKTYPES, st.t, 'tt') + (fields[st.t].map(function (f) { return '<label class="field">' + f[0] + '<input type="number" inputmode="decimal" min="0" step="0.01" data-tf="' + f[1] + '" value="' + esc(st[f[1]]) + '"></label>'; }).join('')) + '<div class="test">ທົດສອບ: ຖ້າແທກໄດ້ <input type="number" inputmode="decimal" min="0" id="tcm" value="10"> cm → ປະມານ <b id="tl">–</b> ລິດ</div>'; test();
 }
 function test() { var tl = root.querySelector('#tl'); if (!tl) return; var v = val(), cm = +root.querySelector('#tcm').value, L = v && cm >= 0 ? Tank.liters(v, cm) : null; tl.textContent = L == null ? 'ໃສ່ຂະໜາດກ່ອນ' : L.toLocaleString('en'); }
 root.addEventListener('click', function (e) { var b = e.target.closest('[data-tt]'); if (b) { st.t = b.dataset.tt; st.a = st.b = ''; paint(); } });
 root.addEventListener('input', function (e) { if (e.target.dataset.tf) st[e.target.dataset.tf] = e.target.value; test(); });
 paint(); return { el: root, get: val };
}
function confirmBox(title, text, okText, fn) { var m = modal('<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="bar2"><button class="btn line grow" id="c-no">ບໍ່</button><button class="btn bad grow" id="c-yes" style="background:var(--bad);color:#fff">' + esc(okText) + '</button></div>'); m.querySelector('#c-no').onclick = function () { m.remove(); }; m.querySelector('#c-yes').onclick = function () { m.remove(); fn(); }; }
function siteForm(s) {
 var isNew = !s, m = modal('<h2>' + ic('drop') + (isNew ? 'ເພີ່ມສະໜາມ' : 'ແກ້ໄຂສະໜາມ') + '</h2><label class="field">ຊື່ສະໜາມ<input type="text" id="s-name" maxlength="80" value="' + esc(s ? s.name : '') + '" placeholder="ເຊັ່ນ ບ້ານນາເລີດ"></label><div class="sect">' + ic('drop') + 'ແທ່ງນ້ຳມັນຂອງສະໜາມ ເປັນແບບໃດ?</div><div id="s-tank"></div><div class="err2" id="s-err" role="alert"></div><div class="bar2"><button class="btn line grow" id="s-cancel">ຍົກເລີກ</button><button class="btn ok grow" id="s-save">' + ic('check') + 'ບັນທຶກ</button></div>' + (isNew ? '' : '<button class="btn bad blk" id="s-del" style="margin-top:12px">ລຶບສະໜາມນີ້</button>'));
 var tp = tankPicker(s && s.tank); m.querySelector('#s-tank').appendChild(tp.el); m.querySelector('#s-cancel').onclick = function () { m.remove(); };
 m.querySelector('#s-save').onclick = function () {
  var name = m.querySelector('#s-name').value.trim(), t = tp.get(), er = m.querySelector('#s-err'); if (!name) { er.textContent = 'ກະລຸນາໃສ່ຊື່ສະໜາມ'; return; } if (!t) { er.textContent = 'ໃສ່ຂະໜາດແທ່ງນ້ຳມັນ ໃຫ້ຄົບ'; return; }
  var next = JSON.parse(JSON.stringify(CFG)); if (isNew) next.sites.push({ id: uid('s'), name: name, tank: t }); else next.sites.forEach(function (x) { if (x.id === s.id) { x.name = name; x.tank = t; } });
  saveCfg(next, function () { m.remove(); });
 };
 if (!isNew) m.querySelector('#s-del').onclick = function () { var n = CFG.vehicles.filter(function (v) { return v.site === s.id; }).length; confirmBox('ລຶບສະໜາມ "' + s.name + '"?', n ? 'ລົດ ' + n + ' ຄັນໃນສະໜາມນີ້ຈະຖືກລຶບນຳ. ຂໍ້ມູນໃບເກົ່າຍັງຢູ່.' : 'ລຶບສະໜາມນີ້?', 'ລຶບ', function () { var next = JSON.parse(JSON.stringify(CFG)); next.sites = next.sites.filter(function (x) { return x.id !== s.id; }); saveCfg(next, function () { m.remove(); }); }); };
}
function carForm(v) {
 var isNew = !v, drv = [['', 'ຍັງບໍ່ມອບ']].concat(DRV.map(function (d) { return [d.phone, d.name]; }));
 var m = modal('<h2>' + ic('truck') + (isNew ? 'ເພີ່ມລົດ' : 'ແກ້ໄຂລົດ') + '</h2><label class="field">ຊື່ລົດ / ທະບຽນ<input type="text" id="c-name" maxlength="60" value="' + esc(v ? v.name : '') + '" placeholder="ເຊັ່ນ ລົດເກດ 3069"></label><label class="field">ຢູ່ສະໜາມ<select id="c-site">' + opts(CFG.sites.map(function (s) { return [s.id, s.name]; }), v ? v.site : (CFG.sites[0] || {}).id) + '</select></label><label class="field">ຄົນຂັບ<small>ຄົນທີ່ຈະກົດຮັບຮູ້ໃນມືຖື (ເພີ່ມຄົນຂັບໃນ "ຄົນ & ສິດ" ກ່ອນ)</small><select id="c-drv">' + opts(drv, v ? v.driver : '') + '</select></label><div class="sect">' + ic('drop') + 'ຖັງນ້ຳມັນຂອງລົດ ເປັນແບບໃດ?</div><div id="c-tank"></div><div class="err2" id="c-err" role="alert"></div><div class="bar2"><button class="btn line grow" id="c-cancel">ຍົກເລີກ</button><button class="btn ok grow" id="c-save">' + ic('check') + 'ບັນທຶກ</button></div>' + (isNew ? '' : '<button class="btn bad blk" id="c-del" style="margin-top:12px">ລຶບລົດຄັນນີ້</button>'));
 var tp = tankPicker(v && v.tank); m.querySelector('#c-tank').appendChild(tp.el); m.querySelector('#c-cancel').onclick = function () { m.remove(); };
 m.querySelector('#c-save').onclick = function () {
  var name = m.querySelector('#c-name').value.trim(), t = tp.get(), er = m.querySelector('#c-err'); if (!name) { er.textContent = 'ກະລຸນາໃສ່ຊື່ລົດ'; return; } if (!t) { er.textContent = 'ໃສ່ຂະໜາດຖັງ ໃຫ້ຄົບ'; return; }
  var rec = { name: name, site: m.querySelector('#c-site').value, driver: m.querySelector('#c-drv').value, tank: t }, next = JSON.parse(JSON.stringify(CFG));
  if (isNew) next.vehicles.push(Object.assign({ id: uid('v') }, rec)); else next.vehicles.forEach(function (x) { if (x.id === v.id) Object.assign(x, rec); });
  saveCfg(next, function () { m.remove(); });
 };
 if (!isNew) m.querySelector('#c-del').onclick = function () { confirmBox('ລຶບລົດ "' + v.name + '"?', 'ຂໍ້ມູນໃບເກົ່າຍັງຢູ່ ແຕ່ລົດຄັນນີ້ຈະບໍ່ຂຶ້ນໃນລາຍການ.', 'ລຶບ', function () { var next = JSON.parse(JSON.stringify(CFG)); next.vehicles = next.vehicles.filter(function (x) { return x.id !== v.id; }); saveCfg(next, function () { m.remove(); }); }); };
}

/* ===== ມອບລົດໃຫ້ຄົນຂັບ ===== */
var ASITE = '';
function assign() {
 if (!CFG.sites.length) { $('v').innerHTML = BACKB + '<div class="card empty">ຍັງບໍ່ມີສະໜາມ — ໄປ "ສະໜາມ & ລົດ" ເພີ່ມກ່ອນ<br><button class="btn ok" data-go="setup" style="margin-top:12px">ໄປເພີ່ມສະໜາມ</button></div>'; return; }
 if (!ASITE || !CFG.sites.some(function (s) { return s.id === ASITE; })) ASITE = CFG.sites[0].id;
 var cars = CFG.vehicles.filter(function (v) { return v.site === ASITE; }), drv = [['', '— ຍັງບໍ່ມອບ —']].concat(DRV.map(function (d) { return [d.phone, d.name]; }));
 $('v').innerHTML = BACKB + '<h1 style="margin:0 0 10px">ມອບລົດໃຫ້ຄົນຂັບ</h1>' + (CFG.sites.length > 1 ? '<label class="field">ສະໜາມ<select id="asite">' + opts(CFG.sites.map(function (s) { return [s.id, s.name]; }), ASITE) + '</select></label>' : '') +
  '<section class="card"><p class="hint" style="margin:0 0 6px">ເລືອກຄົນຂັບຂອງລົດແຕ່ລະຄັນ — ບັນທຶກທັນທີ. ຄົນຂັບຈະເຫັນສະເພາະລົດຂອງຕົນ.</p>' + (cars.map(function (v) { return '<label class="field"><span>' + ic('truck') + ' ' + esc(v.name) + '</span><select data-asg="' + esc(v.id) + '">' + opts(drv, v.driver || '') + '</select></label>'; }).join('') || '<div class="empty">ສະໜາມນີ້ຍັງບໍ່ມີລົດ</div>') + (DRV.length ? '' : '<p class="chip warn">ຍັງບໍ່ມີຄົນຂັບ — ເພີ່ມໃນ "ຄົນ & ສິດ" ກ່ອນ (ເລືອກ ແອັບນ້ຳມັນ → ຄົນຂັບລົດ)</p>') + '</section>';
}

/* ===== ເຫດການຮ່ວມ ===== */
$('v').addEventListener('click', function (e) {
 var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
 var b = e.target.closest('button'); if (!b) return;
 if (b.id === 'uadd') wizard(null);
 else if (b.dataset.u) { var u = USERS.filter(function (x) { return x.phone === b.dataset.u; })[0]; if (u) { if (u.editable) wizard(u); else { var m = modal('<h2>' + esc(u.name) + '</h2><p class="muted">' + esc(u.phone) + '</p><div class="chips">' + chips(u) + '</div><p class="hint">ແກ້ໄດ້ໂດຍ Super admin ເທົ່ານັ້ນ</p><button class="btn line blk" id="vc">ປິດ</button>'); m.querySelector('#vc').onclick = function () { m.remove(); }; } } }
 else if (b.id === 'site-add') siteForm(null);
 else if (b.dataset.siteEdit) siteForm(CFG.sites.filter(function (s) { return s.id === b.dataset.siteEdit; })[0]);
 else if (b.id === 'car-add') carForm(null);
 else if (b.dataset.carEdit) carForm(CFG.vehicles.filter(function (v) { return v.id === b.dataset.carEdit; })[0]);
 else if (b.id === 'cosave') { var next = JSON.parse(JSON.stringify(CFG)); next.company = $('co').value; saveCfg(next); }
});
$('v').addEventListener('input', function (e) { if (e.target.id === 'usearch') { UQ = e.target.value; $('ulist').innerHTML = ulist(); } });
$('v').addEventListener('change', function (e) {
 if (e.target.id === 'asite') { ASITE = e.target.value; assign(); return; }
 var id = e.target.dataset.asg; if (!id) return;
 api('assign', { site: ASITE, v: id, driver: e.target.value }).then(function (r) { if (!r.ok) { assign(); return; } r.data.forEach(function (x) { CFG.vehicles.forEach(function (v) { if (v.id === x.id) v.driver = x.driver; }); }); toast('ມອບລົດແລ້ວ ✓', 'ok'); });
});
window.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); if (h && h !== VIEW && ME) go(h); });
start();
