/* ໂມດູນຈັດການ: ມອບລົດໃຫ້ຄົນຂັບ · ຕັ້ງຄ່າ ສະໜາມ & ລົດ · ຂ້ອຍ   (ພະນັກງານ & ສິດ ຢູ່ໜ້າແພລດຟອມ people.html — people.js; ຕົວຊ່ວຍສິດ perm.js) */
'use strict';
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
