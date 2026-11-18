/* ລາຍງານ HR (Excel): ເລືອກຮອບວັນທີ + ສາຂາ/ພະແນກ → ດາວໂຫຼດ .xlsx (ແຖວຕໍ່ຄົນຕໍ່ວັນ + ແຜ່ນສະຫຼຸບ) */
'use strict';
var INFO = null, F = { from: '', to: '', branchId: '', dept: '', pick: 'prev' };
function dmyS(s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : ''; }
function load() { api('hrreport.info').then(function (r) {
 if (!r.ok) { $('v').innerHTML = '<div class="card empty">ເຂົ້າລາຍງານນີ້ບໍ່ໄດ້ — ' + (r.error === 'nohr' ? 'ຍັງບໍ່ໄດ້ສ້າງ HR' : 'ບໍ່ມີສິດ') + '</div>'; return; }
 INFO = r.data; F.from = INFO.cycles.previous.from; F.to = INFO.cycles.previous.to; draw();
}); }
function draw() {
 var fromHr = /[?&]from=hr(&|$)/.test(location.search); $('hd').innerHTML = header('ລາຍງານ HR (Excel)', 'ການເຂົ້າວຽກ ລາ OT', fromHr ? '<a class="ic" href="/hr/" aria-label="ກັບໄປ HR" title="ກັບໄປ HR" style="text-decoration:none">' + ic('back') + '</a>' : ''); $('lo').onclick = logout; window.MENU_HR = true;
 $('v').innerHTML = '<section class="card"><h2>' + ic('xls') + 'ເລືອກຊ່ວງວັນທີ</h2>' +
  '<div class="chips" role="group"><button data-pick="prev" aria-pressed="' + (F.pick === 'prev') + '">ຮອບກ່ອນ ' + dmyS(INFO.cycles.previous.from).slice(0, 5) + '–' + dmyS(INFO.cycles.previous.to).slice(0, 5) + '</button><button data-pick="cur" aria-pressed="' + (F.pick === 'cur') + '">ຮອບປັດຈຸບັນ ' + dmyS(INFO.cycles.current.from).slice(0, 5) + '–' + dmyS(INFO.cycles.current.to).slice(0, 5) + '</button><button data-pick="custom" aria-pressed="' + (F.pick === 'custom') + '">ເລືອກເອງ</button></div>' +
  '<div class="g2r"><label class="field">ຈາກວັນທີ<input type="date" id="f-from" value="' + F.from + '"></label><label class="field">ເຖິງວັນທີ<input type="date" id="f-to" value="' + F.to + '"></label></div>' +
  '<div class="g2r"><label class="field">ສາຂາ<select id="f-br"><option value="">ທັງໝົດ</option>' + INFO.branches.map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === F.branchId ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>' +
  '<label class="field">ພະແນກ<select id="f-dp"><option value="">ທັງໝົດ</option>' + INFO.depts.map(function (d) { return '<option value="' + esc(d) + '"' + (d === F.dept ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select></label></div>' +
  '<button class="btn ok blk" id="go" style="margin-top:6px">' + ic('xls') + 'ດາວໂຫຼດ Excel</button><p class="hint" id="msg" style="margin:10px 0 0">ຮອບເດືອນ 26 → 25 (ປ່ຽນເປັນ "ເລືອກເອງ" ໄດ້ ສູງສຸດ 93 ມື້). ມີ ' + INFO.employees + ' ພະນັກງານໃນ HR.</p></section>' +
  '<section class="card"><h2>' + ic('sheet') + 'ໃນໄຟລ໌ມີຫຍັງ</h2><ul class="hrl"><li><b>ແຜ່ນ "ລາຍວັນ"</b> — ແຖວຕໍ່ຄົນຕໍ່ວັນ: ກະ, ເຂົ້າ/ເລີກວຽກ (ກຳນົດ · ຕົວຈິງ · ສ່ວນຕ່າງ · ສະຖານະ · ວິທີ · ສະຖານທີ່ · ພິກັດ), ພັກ, ການລາ, OT, ຊົ່ວໂມງຄິດເງິນເດືອນ, ພາບລວມ</li><li><b>ແຜ່ນ "ສະຫຼຸບ"</b> — ຕໍ່ຄົນ: ມື້ມາວຽກ, ມາຊ້າ, ອອກກ່ອນ, ຂາດ, ລາແຕ່ລະປະເພດ, OT, ຊົ່ວໂມງປົກກະຕິ</li><li>ສີ: ມາຊ້າ/ອອກກ່ອນ = ເຫຼືອງ-ສົ້ມ · ຂາດງານ = ແດງ · ລາ = ຟ້າ · ວັນຢຸດ = ເທົາ</li><li>ບໍ່ມີຂໍ້ມູນເງິນເດືອນ ຫຼື ເງິນ OT ໃນໄຟລ໌</li></ul></section>';
}
document.addEventListener('click', function (e) {
 var b = e.target.closest('button'); if (!b || !INFO) return;
 if (b.dataset.pick) { F.pick = b.dataset.pick; if (F.pick === 'prev') { F.from = INFO.cycles.previous.from; F.to = INFO.cycles.previous.to; } else if (F.pick === 'cur') { F.from = INFO.cycles.current.from; F.to = INFO.cycles.current.to; } F.branchId = $('f-br').value; F.dept = $('f-dp').value; draw(); return; }
 if (b.id === 'go') {
  F.from = $('f-from').value; F.to = $('f-to').value; F.branchId = $('f-br').value; F.dept = $('f-dp').value; if (!F.from || !F.to || F.from > F.to) return toast('ເລືອກວັນທີໃຫ້ຖືກ (ຈາກ ≤ ເຖິງ)', 'bad');
  b.disabled = true; var old = b.innerHTML; b.textContent = 'ກຳລັງສ້າງໄຟລ໌…';
  api('hrreport.build', { from: F.from, to: F.to, branchId: F.branchId, dept: F.dept }).then(function (r) {
   b.disabled = false; b.innerHTML = old; if (!r.ok) return;
   var bin = atob(r.data.b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
   var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = r.data.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
   $('msg').textContent = 'ສຳເລັດ: ' + r.data.employees + ' ຄົນ × ' + r.data.days + ' ມື້ (' + r.data.rows + ' ແຖວ) — ' + r.data.name;
  });
 }
});
load();
