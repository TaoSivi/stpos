/* ໂມດູນຈັດການໃນແອັບນ້ຳມັນ: ມອບລົດໃຫ້ຄົນຂັບ · ຂ້ອຍ   (ຄົນ & ສິດ · ສະໜາມ & ລົດ ຢູ່ສູນຈັດການ admin.html — admin.js) */
'use strict';
/* ===== ມອບລົດໃຫ້ຄົນຂັບ ===== */
function assignView() {
 var site = $('site').value, cars = I.cfg.vehicles.filter(function (v) { return v.site === site; }), canSet = R('assign');
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

/* ===== ຂ້ອຍ ===== */
function meView() {
 var rl = (I.me.rights || {})[$('site').value] || [], pl = I.me.level !== 'user' ? permList(I.me.level, '', I.hr, true) : (function () { var lab = { view: 'ເບິ່ງລາຍງານ & ຍອດແທ່ງ', issue: 'ເບີກ & ແກ້ cm ຂອງລົດ', tank: 'ຮັບເຂົ້າແທ່ງ & ແທກແທ່ງ', assign: 'ມອບລົດໃຫ້ຄົນຂັບ', approve: 'ອະນຸມັດໃບປະຈຳວັນ', ack: 'ຮັບຮູ້ການເຕີມຂອງລົດຕົນ', fixAck: 'ແກ້ cm ຫຼັງຄົນຂັບຮັບຮູ້ແລ້ວ' }; return rl.map(function (k) { return 'ນ້ຳມັນ: ' + (lab[k] || k); }).concat(I.hr ? ['HR: ເຂົ້າ ST HR (ສິດພາຍໃນ HR ກຳນົດໃນ HR)'] : []); })();
 $('v').innerHTML = '<section class="card"><div class="row"><span class="avatar" style="width:56px;height:56px;border-radius:50%;font-size:22px">' + initial(I.me.name) + '</span><div class="grow"><h2 style="margin:0">' + esc(I.me.name) + '</h2><span class="muted">' + esc(I.me.phone) + '</span><div class="chips"><span class="chip">' + (LVN[I.me.level] || '') + '</span>' + (I.me.level === 'user' ? '<span class="chip ok">' + esc(RN[I.me.role] || '') + '</span>' : '') + (I.me.approver && I.me.level === 'user' ? '<span class="chip warn">' + ic('shield') + 'ຜູ້ອະນຸມັດ</span>' : '') + '</div></div></div><div class="prev"><b>ສິດຂອງຂ້ອຍ:</b><ul>' + pl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></section>' +
  '<section class="card"><h2>' + ic('lock') + 'ປ່ຽນ PIN</h2><div class="g2"><label class="f">PIN ເກົ່າ<input type="password" inputmode="numeric" maxlength="8" id="po" autocomplete="current-password"></label><label class="f">PIN ໃໝ່ (4-8 ຫຼັກ)<input type="password" inputmode="numeric" maxlength="8" id="pn" autocomplete="new-password"></label></div><button class="btn blk" id="pchg" style="margin-top:12px">ບັນທຶກ PIN ໃໝ່</button></section><div id="inst"></div><button class="btn bad blk" id="lo2" style="margin-top:12px">' + ic('out') + 'ອອກຈາກລະບົບ</button>';
 $('lo2').onclick = logout; installHint('inst');
}
$('v').addEventListener('click', function (e) { var b = e.target.closest('button'); if (MOD === 'me' && b && b.id === 'pchg') api('pin', { old: $('po').value, pin: $('pn').value }).then(function (r) { if (r.ok) { ls('fuel_tk', r.token); $('po').value = $('pn').value = ''; toast('ປ່ຽນ PIN ແລ້ວ', 'ok'); } }); });

start(); /* ໄຟລ໌ສຸດທ້າຍທີ່ໂຫຼດ — ທຸກໂມດູນພ້ອມແລ້ວ */
