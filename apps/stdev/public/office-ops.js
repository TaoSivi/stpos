/* ໂມດູນຂັ້ນຕອນການເຮັດວຽກ: ພາບລວມ · ເບີກ & ຈ່າຍນ້ຳມັນ · ຮັບເຂົ້າແທ່ງ & ແທກ · ຮັບຮູ້ & ອະນຸມັດ — ພະນັກງານກອກແຕ່ cm, ລິດມາຈາກ server */
'use strict';
function chip(r) {
 if (r.ack) return '<span class="chip ok">' + ic('check') + esc(r.ack.name) + ' · ' + when(r.ack.at) + '</span>';
 if (r.rej) return '<span class="chip bad">' + ic('x') + esc(r.rej.name) + ': ' + esc(r.rej.why || '-') + '</span>';
 return r.add != null ? '<span class="chip warn">ລໍຮັບຮູ້</span>' : '<span class="chip">ຍັງບໍ່ເຕີມ</span>';
}
function gapHtml(r) { /* ສ່ວນຕ່າງຂ້າມຄືນ: ກ່ອນເຕີມມື້ນີ້ ທຽບ ຫຼັງເລີກວຽກມື້ກ່ອນ (ຍັງຕ້ອງແທກກ່ອນເຕີມທຸກຄັ້ງ) */
 if (!r.prev) return ''; var big = r.gap != null && Math.abs(r.gap) > Tank.GAP;
 return '<div class="gap">ມື້ວານ (' + dmy(r.prev.date) + ') ຫຼັງເລີກວຽກ ' + r.prev.cm2 + ' cm = ' + L(r.prev.L2) + (r.gap != null ? ' · ຕ່າງ <span class="chip ' + (big ? 'bad' : 'ok') + '">' + (r.gap > 0 ? '+' : '') + Math.round(r.gap) + ' L</span>' + (big ? ' <b style="color:#b4361f">ກວດຄືນ: ນ້ຳມັນເພີ່ມ/ຫາຍໃນຄືນ</b>' : '') : ' · <span class="muted">ແທກ ກ່ອນເຕີມ ເພື່ອເບິ່ງສ່ວນຕ່າງ</span>') + '</div>';
}
var HL = { cm0: 'ກ່ອນເຕີມ', cm1: 'ຫຼັງເຕີມ', cm2: 'ຫຼັງເລີກວຽກ' };
function histHtml(r) { /* ປະຫວັດການແກ້ຄ່າທີ່ເຄີຍກອກແລ້ວ: ໃຜ · ເມື່ອໃດ · ເດີມ → ໃໝ່ · ເຫດຜົນ */
 if (!r.h || !r.h.length) return '';
 return '<details class="hist"><summary>ປະຫວັດການແກ້ ' + r.h.length + ' ຄັ້ງ</summary>' + r.h.slice().reverse().slice(0, 8).map(function (x) { return '<div class="hi"><b>' + esc(HL[x.k] || x.k) + ': ' + (x.from == null ? '–' : x.from) + ' → ' + (x.to == null ? '–' : x.to) + ' cm</b><small>' + when(x.at) + ' · ' + esc(x.name || '–') + (x.why ? ' · ເຫດຜົນ: ' + esc(x.why) : '') + '</small></div>'; }).join('') + '</details>';
}
function photoAcked(key) { var m = /^(.+)_(?:b|a|e|p[1-6])$/.exec(key), r = m && S.rows.filter(function (x) { return x.v === m[1]; })[0]; return !!(r && r.ack); }
function rowOld(vid, k) { var r = S.rows.filter(function (x) { return x.v === vid; })[0]; return r ? r[k] : null; }
function editedKeys(vid, vals) { /* ຊ່ອງ cm ທີ່ເຄີຍມີຄ່າແລ້ວ ແລະຖືກປ່ຽນ → ຕ້ອງໃສ່ເຫດຜົນ */
 return ['cm0', 'cm1', 'cm2'].filter(function (k) { if (!(k in vals)) return false; var old = rowOld(vid, k); if (old == null) return false; var n = vals[k] === '' || vals[k] == null ? null : parseFloat(vals[k]); return n !== old; });
}
function calcHtml(r) {
 var w = (r.add != null && r.add < 0 ? '<span class="chip bad">' + ic('alert') + 'ຫຼັງ &lt; ກ່ອນ</span> ' : '') + (r.used != null && r.used < 0 ? '<span class="chip bad">' + ic('alert') + 'ຕອນແລງ &gt; ຫຼັງ</span> ' : '');
 return gapHtml(r) + (r.L0 != null || r.L1 != null ? L(r.L0) + ' → ' + L(r.L1) + ' · ເຕີມ <b>' + L(r.add) + '</b>' : '') + (r.L2 != null ? '<br>ຄ້າງ ' + L(r.L2) + ' · ໃຊ້ <b>' + L(r.used) + '</b>' : '') + '<br>' + w + chip(r);
}
function tol() { var v = siteObj().tol; return v == null ? 20 : v; } /* ເກນເຕືອນຕັ້ງຕໍ່ສະໜາມ (ຕັ້ງຄ່າ → ສະໜາມ) */
function cmOn() { return false; } /* ບໍ່ແທກ cm ຫຼັງເລີກວຽກແລ້ວ: ໃຊ້ມິເຕີ ຫຼື ຊື້ທີ່ປໍ້າ */
function tankHtml(t) { if (!cmOn() && t.meter) return 'ຮັບ <b>' + L(t.recv || 0) + '</b> · ຈ່າຍ <b>' + L(t.out) + '</b> · ເຫຼືອ <b>' + L(t.bal) + '</b>';
  if (!cmOn()) { var r = t.recv || 0, x = r - t.out; return 'ຊື້ມື້ນີ້ <b>' + L(r) + '</b> · ຈ່າຍອອກມື້ນີ້ <b>' + L(t.out) + '</b><br>ຕ່າງ (ຊື້ − ຈ່າຍ) <span class="chip ' + (Math.abs(x) > tol() ? 'bad' : 'ok') + '">' + (x > 0 ? '+' : '') + Math.round(x) + ' L</span> · ຍອດຄ້າງສະສົມ <b>' + L(t.bal) + '</b>' + (Math.abs(x) > tol() ? '<br><small>ຊື້ກັບຈ່າຍບໍ່ເທົ່າກັນ — ກວດໃບຊື້ ແລະ ລິດທີ່ເບີກ</small>' : ''); } var d = t.diff != null ? t.diff : null; return 'ຈ່າຍອອກມື້ນີ້ <b>' + L(t.out) + '</b> · ຍອດເຫຼືອຕາມບັນຊີ <b>' + L(t.bal) + '</b><br>ແທກແທ່ງໄດ້ ' + L(t.measured) + (d != null ? ' · ຕ່າງຈາກບັນຊີ <span class="chip ' + (Math.abs(d) > tol() ? 'bad' : 'ok') + '">' + (d > 0 ? '+' : '') + Math.round(d) + ' L</span>' : ''); }
function phBtns(keys) { return '<div class="ph">' + keys.map(function (k) { return '<button type="button" data-ph="' + k[0] + '" data-t="' + k[1] + '"></button>'; }).join('') + '</div>'; }
function paintPhotos() { document.querySelectorAll('[data-nb]').forEach(function (e) { e.hidden = !!P[e.dataset.nb]; }); document.querySelectorAll('[data-ph]').forEach(function (b) { var d = P[b.dataset.ph]; b.className = d ? 'has' : ''; var m = PM[b.dataset.ph], late = m && m.taken && m.at - m.taken > 18e5, bad = m && (m.how === 'file' || late); b.innerHTML = (d ? '<img alt="" src="' + d + '">' : ic('cam')) + esc(b.dataset.t) + (d && m ? '<small class="pm' + (bad ? ' bad' : '') + '">' + when(m.at) + ' ' + esc(m.name || '') + (m.how === 'file' ? ' · ຈາກຄັງ' : '') + (late ? ' · ອັບຊ້າ' : '') + '</small>' : ''); }); }
function numIn(k, val, dis) { return '<input type="number" inputmode="decimal" min="0" step="0.1" data-k="' + k + '" value="' + (val == null ? '' : val) + '"' + (dis ? ' disabled' : '') + '>'; }
function totals() { var a = 0, u = 0; S.rows.forEach(function (r) { a += r.add > 0 && r.src !== 'shop' ? r.add : 0; u += r.used > 0 ? r.used : 0; }); return [a, u]; } /* ເບີກ = ຫັກຈາກແທ່ງ (ບໍ່ນັບທີ່ເຕີມຮ້ານອື່ນ) */
function approvedBanner() { return S.approved ? '<div class="card dark row">' + ic('shield') + '<div>ອະນຸມັດແລ້ວ ໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '<br><small style="opacity:.75">ໃບນີ້ຖືກລັອກ — ແກ້ບໍ່ໄດ້ຈົນກວ່າຈະຍົກເລີກການອະນຸມັດ</small>' + (R('approve') ? '<br><button type="button" class="btn line" id="unappr" style="margin-top:8px;min-height:44px">' + ic('x') + 'ຍົກເລີກການອະນຸມັດ ເພື່ອແກ້ໄຂ</button>' : '') + '</div></div>' : ''; }
window.notifTodo = function () { /* ກະດິ່ງ: ສະເພາະສິ່ງທີ່ລໍຖ້າ "ອະນຸມັດ" */
 if (typeof S === 'undefined' || !S || !S.rows) return []; var o = [], reqs = S.reqs || [], pend = reqs.filter(function (x) { return x.state === 'pending'; }).length, filled = S.rows.filter(function (x) { return x.add != null; }), acked = filled.filter(function (x) { return x.ack; }).length;
 if (rqSite() && pend && hasRight('reqOk')) o.push({ t: pend + ' ຄຳຂໍລໍອະນຸມັດ', i: 'check', go: function () { go('rqok'); } });
 if (!S.approved && S.rows.length && canApprove() && filled.length && acked === filled.length) o.push({ t: 'ໃບປະຈຳວັນລໍອະນຸມັດ', i: 'shield', go: function () { go('appr'); } });
 return o;
};
function noCars() { return '<div class="card empty"><div class="logo">' + ic('truck') + '</div>ສະໜາມນີ້ຍັງບໍ່ມີລົດ' + (I.me.boss ? '<br><button class="btn line" data-go="cfg" style="margin-top:10px">ໄປ ຕັ້ງຄ່າ ສະໜາມ & ລົດ</button>' : '') + '</div>'; }
function driverTag(r) { return r.driver ? '<small class="muted">ຄົນຂັບ: ' + esc(drvName(r.driver) || '–') + '</small>' : '<small class="chip warn">ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ</small>'; }

/* ===== ພາບລວມ ===== */
/* ===== ໜ້າພາບລວມແບບ Dashboard: ຫົວ + ຕົວເລກຫຼັກ + ກຣິດຂອງກ່ອງ (ຕີມ/ສີຄືເກົ່າ) ===== */
function dashCu(v, sfx) { return '<span data-cu="' + (+v || 0) + '" data-sfx="' + (sfx || '') + '">' + Math.round(+v || 0).toLocaleString('en') + (sfx || '') + '</span>'; }
function dashAnim() { /* ຕົວເລກນັບຂຶ້ນ */
 if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
 document.querySelectorAll('[data-cu]').forEach(function (e) { var v = +e.dataset.cu, s = e.dataset.sfx || '', t0 = null; if (!v) return; var step = function (t) { if (t0 === null) t0 = t; var k = Math.min(1, (t - t0) / 800), q = 1 - Math.pow(1 - k, 3); e.textContent = Math.round(v * q).toLocaleString('en') + s; if (k < 1) requestAnimationFrame(step); }; e.textContent = '0' + s; requestAnimationFrame(step); });
}
function dashSpark(v) { var mx = Math.max.apply(null, v.concat([1])), n = v.length, pts = v.map(function (y, i) { return [n > 1 ? i * 160 / (n - 1) : 80, 46 - y * 42 / mx]; }), line = pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '), last = pts[pts.length - 1]; return '<svg class="spark" viewBox="0 0 160 50" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a7e7a" stop-opacity=".32"/><stop offset="1" stop-color="#0a7e7a" stop-opacity="0"/></linearGradient></defs><polygon class="sa" points="0,50 ' + line + ' 160,50" fill="url(#spg)"/><polyline class="sl" pathLength="1" points="' + line + '" fill="none" stroke="#0a7e7a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' + (last ? '<circle class="sd" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.2" fill="#fff" stroke="#0a7e7a" stroke-width="2"/>' : '') + '</svg>'; }
function dashRing(pct) { var c = 2 * Math.PI * 34; return '<div class="ringw"><svg class="ring" viewBox="0 0 80 80" aria-hidden="true"><circle class="rb" cx="40" cy="40" r="34"/><circle class="rv" cx="40" cy="40" r="34" style="stroke-dasharray:' + (c * Math.min(100, pct) / 100).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg><b>' + dashCu(pct, '%') + '</b></div>'; }
function dashLayout(o) {
 var tones = ['t-teal', 't-amber', 't-green'];
 var h = '<div class="dh"><div class="dh-t"><small class="muted">' + o.sub + '</small><h1>' + o.title + '</h1></div><div class="dk">' + o.kpis.map(function (k, i) { return '<div class="dk-i ' + tones[i % 3] + '"><span class="dk-ic">' + ic(k[3]) + '</span><div><small>' + k[0] + '</small><b>' + dashCu(k[1], k[2] === 'L' ? '\u00a0L' : '') + '</b></div></div>'; }).join('') + '</div></div>' + dashCtl() + '<div id="ahead"></div><div class="dg">';
 /* A ຄຳຂໍລໍອະນຸມັດ */
 h += '<section class="card dc dca"><div class="dc-h"><h2><span class="dic am">' + ic('check') + '</span>ລໍອະນຸມັດ</h2><span class="chip ' + (o.pend ? 'warn pulse' : 'ok') + '">' + o.pend + '</span></div>' + (o.pendList ? (o.pendList.length ? o.pendList.slice(0, 4).map(function (x) { return '<div class="dl"><b>' + esc(x.car) + '</b><span class="lit">' + L(x.lit) + '</span></div>'; }).join('') + (o.pendList.length > 4 ? '<small class="muted">+' + (o.pendList.length - 4) + '</small>' : '') : '<div class="dc-e"><span class="dic gr big">' + ic('check') + '</span></div>') : '<div class="dbig">' + dashCu(o.pend) + '</div>') + (o.canOk && o.pend ? '<button type="button" class="btn line blk" data-go="rqok">' + ic('check') + ' ອະນຸມັດ</button>' : '') + '</section>';
 /* B ຕ້ອງເຮັດດຽວນີ້ (ກ່ອງເດັ່ນ) */
 var t0 = o.todo && o.todo[0];
 if (!o.hideB) h += '<section class="card dc dhl"><div class="dc-h"><span class="dhl-i">' + ic('bell') + '</span><span class="chip">' + (o.todo ? o.todo.length : 0) + '</span></div><h2>ຕ້ອງເຮັດດຽວນີ້</h2><p>' + (t0 ? t0.t : '<span style="opacity:.9">' + ic('check') + '</span>') + '</p>' + (t0 ? '<button type="button" class="btn dhl-b" data-go="' + t0.go + '">' + ic('next') + '</button>' : '') + '</section>';
 /* C ຮັບຮູ້: ວົງ % + ເສັ້ນແນວໂນ້ມ */
 h += '<section class="card dc"><div class="dc-h"><h2><span class="dic">' + ic('shield') + '</span>ຮັບຮູ້</h2><span class="chip ' + (o.pct >= 100 ? 'ok' : o.pct ? 'warn' : '') + '">' + o.ack + '/' + o.filled + '</span></div><div class="dpct">' + dashRing(o.pct) + '<div class="dpt"><small>7 ມື້</small>' + dashSpark(o.spark) + '</div></div></section>';
 /* D ຂັ້ນຕອນ */
 var sc = ['s1', 's2', 's3', 's4'];
 h += '<section class="card dc"><div class="dc-h"><h2><span class="dic">' + ic('pump') + '</span>ຄວາມຄືບໜ້າ</h2></div>' + o.steps.map(function (s, k) { var pc = s[2] ? Math.min(100, Math.round(s[1] * 100 / s[2])) : 0; return '<div class="dp ' + sc[k % 4] + '"><div class="dp-t"><span><i class="dot"></i>' + s[0] + '</span><b>' + dashCu(s[1]) + '</b></div><div class="bar"><i style="width:' + pc + '%"></i></div></div>'; }).join('') + '</section>';
 /* E ແທ່ງນ້ຳມັນ */
 var tk = o.tank, gp = tk ? Math.max(0, Math.min(100, Math.round((tk.bal || 0) * 100 / Math.max(tk.open + tk.recv, tk.bal || 0, 1)))) : 0;
 h += '<section class="card dc dtank"><div class="dc-h"><h2><span class="dic">' + ic('inbox') + '</span>ແທ່ງ</h2>' + (tk && tk.free != null ? '<span class="chip ' + (tk.free < 0 ? 'bad' : 'ok') + '">' + L(tk.free) + '</span>' : '') + '</div>' + (tk ? '<div class="gauge"><i style="width:' + gp + '%"></i></div><div class="dt">' + [['ຍົກມາ', dashCu(tk.open, '\u00a0L'), 'k1'], ['ຮັບ', '+' + dashCu(tk.recv, '\u00a0L'), 'k2'], ['ຈ່າຍ', '\u2212' + dashCu(tk.out, '\u00a0L'), 'k3'], ['ເຫຼືອ', dashCu(tk.bal, '\u00a0L'), 'k4']].concat(tk.res ? [['ຈອງລໍເຕີມ', '\u2212' + dashCu(tk.res, '\u00a0L'), 'k3']] : []).map(function (r) { return '<div class="' + r[2] + '"><small>' + r[0] + '</small><b>' + r[1] + '</b></div>'; }).join('') + '</div>' : '<div class="dc-e">\u2013</div>') + (o.src && o.src.length ? '<div class="fs-s">' + ic('drop') + o.src.map(function (k) { return '<span class="chip">' + k[0] + ' ' + L(k[1]) + '</span>'; }).join('') + '</div>' : '') + '</section>';
 /* F ເຕີມຕໍ່ວັນ */
 var mx = Math.max.apply(null, o.bars.map(function (b) { return b.v; }).concat([1]));
 h += '<section class="card dc dw3"><div class="dc-h"><h2><span class="dic">' + ic('report') + '</span>ເຕີມຕໍ່ວັນ</h2><span class="chip">' + L(o.bars.reduce(function (t, b) { return t + b.v; }, 0)) + '</span></div><div class="dchart" role="img" aria-label="ລິດທີ່ເຕີມຕໍ່ວັນ">' + o.bars.map(function (b, k) { return '<div class="dcol' + (k === o.bars.length - 1 ? ' cur' : '') + '" title="' + dmy(b.d) + ' · ' + L(b.v) + '" style="--d:' + (k * 70) + 'ms"><b>' + (b.v ? Math.round(b.v) : '') + '</b><i style="height:' + Math.max(3, Math.round(b.v * 100 / mx)) + '%"></i><small>' + b.d.slice(8) + '</small></div>'; }).join('') + '</div></section>';
 /* G ລົດ */
 if (o.cars) h += '<section class="card dc dw4"><div class="dc-h"><h2><span class="dic">' + ic('truck') + '</span>ລົດ</h2><span class="chip">' + o.cars.length + '</span></div>' + (o.cars.length ? '<div class="dcl">' + o.cars.map(function (c) { return '<div class="dl dcar"><span class="dic sm">' + ic('truck') + '</span><b>' + esc(c.name) + '</b><span class="chip ' + c.v[0] + '">' + ic(c.v[3]) + ' ' + c.v[1] + '</span><span class="lit">' + c.meta + '</span></div>'; }).join('') + '</div>' : '<div class="dc-e">' + ic('truck') + '</div>') + '</section>';
 return h + '</div>';
}
function fuelStatusHtml(reqs, rows, tk) { /* ສະຖານະນ້ຳມັນມື້ນີ້: ສາຍການໄຫຼຂອງຄຳຂໍ + ແທ່ງ + ແຫຼ່ງທີ່ເຕີມ */
 var sm = function (l, f) { return l.reduce(function (t, x) { return t + (+f(x) || 0); }, 0); }, st = function (s) { return reqs.filter(function (x) { return x.state === s; }); },
  live = reqs.filter(function (x) { return x.state !== 'rejected' && x.state !== 'cancel'; }), pend = st('pending'), appr = st('approved'),
  filled = rows.filter(function (x) { return x.add != null; }), wack = filled.filter(function (x) { return !x.ack; }), ack = filled.filter(function (x) { return x.ack; }),
  stg = [['rq', 'edit', 'ຂໍແລ້ວ', live.length, sm(live, function (x) { return x.lit; }), ''], ['rqok', 'check', 'ລໍອະນຸມັດ', pend.length, sm(pend, function (x) { return x.lit; }), pend.length ? 'warn' : ''],
   ['issue', 'pump', 'ລໍເຕີມ', appr.length, sm(appr, function (x) { return x.ok && x.ok.lit; }), appr.length ? 'warn' : ''], ['appr', 'user', 'ລໍຮັບຮູ້', wack.length, sm(wack, function (x) { return x.add; }), wack.length ? 'warn' : ''], ['appr', 'shield', 'ຮັບຮູ້ແລ້ວ', ack.length, sm(ack, function (x) { return x.add; }), ack.length ? 'ok' : '']],
  h = '<section class="card fs"><h2>' + ic('pump') + 'ສະຖານະນ້ຳມັນ</h2><div class="fs-g">' + stg.map(function (g, k) { return '<button type="button" class="fs-c ' + g[5] + '" data-go="' + g[0] + '"><span class="fs-i">' + ic(g[1]) + '</span><small>' + g[2] + '</small><b>' + g[3] + '</b><span class="fs-l">' + (g[4] ? L(g[4]) : '\u2013') + '</span></button>'; }).join('') + '</div>';
 if (tk) {
  var open = (tk.bal || 0) - (tk.recv || 0) + (tk.out || 0), res = sm(appr.filter(function (x) { return x.ok && x.ok.src === 'tank'; }), function (x) { return x.ok.lit; }), free = (tk.bal || 0) - res, top = Math.max(open + (tk.recv || 0), tk.bal || 0, 1), pc = Math.max(0, Math.min(100, Math.round((tk.bal || 0) * 100 / top)));
  h += '<div class="fs-t"><div class="fs-th">' + ic('inbox') + '<b>ແທ່ງ</b><span class="grow"></span><span class="chip ' + (free < 0 ? 'bad' : 'ok') + '">' + ic(free < 0 ? 'alert' : 'check') + ' ' + L(free) + '</span></div><div class="bar" aria-hidden="true"><i style="width:' + pc + '%"></i></div>' +
   '<div class="fs-n"><span><small>ຍົກມາ</small><b>' + L(open) + '</b></span><span><small>ຮັບ</small><b>+' + L(tk.recv || 0) + '</b></span><span><small>ຈ່າຍ</small><b>\u2212' + L(tk.out || 0) + '</b></span><span><small>ເຫຼືອ</small><b>' + L(tk.bal) + '</b></span>' + (res ? '<span class="warn"><small>ຈອງລໍເຕີມ</small><b>\u2212' + L(res) + '</b></span>' : '') + '</div></div>';
 }
 var src = [['tank', 'ແທ່ງ'], ['shop', 'ປໍ້າ'], ['jug', 'ຕຸກ']].map(function (k) { return [k[1], sm(filled.filter(function (x) { return (x.src || 'tank') === k[0]; }), function (x) { return x.add; })]; }).filter(function (k) { return k[1] > 0; });
 if (src.length) h += '<div class="fs-s">' + ic('drop') + src.map(function (k) { return '<span class="chip">' + k[0] + ' ' + L(k[1]) + '</span>'; }).join('') + '</div>';
 return h + '</section>';
}
/* ===== Dashboard: ເລືອກຊ່ວງວັນ (ວັນ · 7 ມື້ · 30 ມື້ · ເດືອນ · ກຳນົດເອງ) · ທຸກສະໜາມ (ສະເພາະເຈົ້າຂອງ / Admin) ===== */
var DASH = { p: 'day', from: '', to: '', all: false };
function dashAllOk() { return I.cfg.sites.length > 1 && (I.me.boss || I.me.level === 'admin' || I.me.level === 'superadmin'); }
function dashRangeOf() { var td = today(), f = td, t = td; if (DASH.p === '7') f = addDays(td, -6); else if (DASH.p === '30') f = addDays(td, -29); else if (DASH.p === 'month') f = td.slice(0, 8) + '01'; else if (DASH.p === 'cus') { f = DASH.from || addDays(td, -6); t = DASH.to || td; if (f > t) { var x = f; f = t; t = x; } } return [f, t]; }
function dashCtl() {
 var ch = [['day', 'ວັນ'], ['7', '7 ມື້'], ['30', '30 ມື້'], ['month', 'ເດືອນ'], ['cus', 'ກຳນົດ']], rg = dashRangeOf();
 return '<div class="drange noprint"><div class="dflt" id="dseg">' + ch.map(function (c) { return '<button type="button" data-dp="' + c[0] + '" aria-pressed="' + (DASH.p === c[0]) + '">' + (c[0] === 'cus' ? ic('calendar') + ' ' : '') + c[1] + '</button>'; }).join('') + (dashAllOk() ? '<button type="button" data-dall="1" aria-pressed="' + DASH.all + '">' + ic('grid') + ' ທຸກສະໜາມ</button>' : '') + '</div>' +
  (DASH.p === 'cus' ? '<div class="row wrap" style="gap:8px;margin-top:10px"><input type="date" id="df" value="' + rg[0] + '" max="' + today() + '" aria-label="ຈາກວັນທີ"><span class="muted">\u2192</span><input type="date" id="dt" value="' + rg[1] + '" max="' + today() + '" aria-label="ເຖິງວັນທີ"></div>' : '') + '</div>';
}
function rangeDash() {
 var mine = MOD, rg = dashRangeOf(), rl = I.me.roles || {}, ids = (DASH.all && dashAllOk() ? I.cfg.sites.map(function (s) { return s.id; }).filter(function (id) { return I.me.boss || rl[id]; }) : [$('site').value]);
 $('v').innerHTML = dashCtl() + '<div class="skel"></div><div class="skel"></div>';
 Promise.all(ids.map(function (id) { return api('dash', { site: id, from: rg[0], to: rg[1] }); })).then(function (rs) {
  if (MOD !== mine) return; var list = rs.filter(function (r) { return r.ok; }).map(function (r) { return r.data; });
  var T = { n: 0, pend: 0, wait: 0, rej: 0, litReq: 0, litOk: 0, fn: 0, lit: 0, tank: 0, shop: 0, jug: 0, ack: 0, recv: 0, out: 0, open: 0, close: 0 }, byDay = {}, sm = function (a, b) { return a + (+b || 0); };
  list.forEach(function (s) { T.open += s.open; T.close += s.close; s.days.forEach(function (d) { var k = byDay[d.date] || (byDay[d.date] = { date: d.date, n: 0, lit: 0, recv: 0, out: 0, ack: 0, fn: 0, ap: true }); k.n += d.rq.n; k.lit += d.fl.lit; k.recv += d.recv; k.out += d.out; k.ack += d.fl.ack; k.fn += d.fl.n; if (!d.approved) k.ap = false;
   T.n += d.rq.n; T.pend += d.rq.pend; T.wait += d.rq.wait; T.rej += d.rq.rej; T.litReq += d.rq.litReq; T.litOk += d.rq.litOk; T.fn += d.fl.n; T.lit += d.fl.lit; T.tank += d.fl.tank; T.shop += d.fl.shop; T.jug += d.fl.jug; T.ack += d.fl.ack; T.recv += d.recv; T.out += d.out; }); });
  var days = Object.keys(byDay).sort().map(function (k) { return byDay[k]; }), mx = Math.max.apply(null, days.map(function (d) { return d.lit; }).concat([1])), many = list.length > 1;
  var bars = days.slice(-7).map(function (d) { return { d: d.date, v: d.lit }; }); if (!bars.length) bars = [{ d: rg[1], v: 0 }];
  var h = dashLayout({ title: many ? 'ທຸກສະໜາມ' : esc((list[0] && list[0].name) || siteObj().name), sub: 'ພາບລວມ · ' + (rg[0] === rg[1] ? dmy(rg[0]) : dmy(rg[0]) + ' \u2192 ' + dmy(rg[1])), hideB: true,
   kpis: [['ເຕີມແລ້ວ', T.lit, 'L', 'pump'], ['ແທ່ງເຫຼືອ', T.close, 'L', 'inbox'], ['ລໍອະນຸມັດ', T.pend, '', 'check']], pend: T.pend, pendList: null, canOk: false, todo: null, pct: T.fn ? Math.round(T.ack * 100 / T.fn) : 0, ack: T.ack, filled: T.fn, spark: bars.map(function (b) { return b.v; }),
   steps: [['ຂໍແລ້ວ', T.n, Math.max(T.n, 1)], ['ລໍເຕີມ', T.wait, Math.max(T.n, 1)], ['ເຕີມແລ້ວ', T.fn, Math.max(T.n, T.fn, 1)], ['ຮັບຮູ້', T.ack, Math.max(T.fn, 1)]],
   tank: { open: T.open, recv: T.recv, out: T.out, bal: T.close, res: 0, free: T.close }, src: [['ແທ່ງ', T.tank], ['ປໍ້າ', T.shop], ['ຕຸກ', T.jug]].filter(function (k) { return k[1] > 0; }), bars: bars, cars: null });
  if (days.length) {
   if (many) h += '<section class="card"><h2>' + ic('pump') + 'ຕາມສະໜາມ</h2><div class="tw"><table class="mini"><thead><tr><th>ສະໜາມ</th><th>ຂໍ</th><th>ເຕີມ</th><th>ຮັບຮູ້</th><th>ເຫຼືອ</th></tr></thead><tbody>' + list.map(function (s) { var a = s.days.reduce(function (t, d) { t.n += d.rq.n; t.l += d.fl.lit; t.k += d.fl.ack; return t; }, { n: 0, l: 0, k: 0 }); return '<tr><td>' + esc(s.name) + '</td><td>' + a.n + '</td><td>' + L(a.l) + '</td><td>' + a.k + '</td><td><b>' + L(s.close) + '</b></td></tr>'; }).join('') + '</tbody></table></div></section>';
   h += '<section class="card"><h2>' + ic('ledger') + 'ຕໍ່ວັນ</h2><div class="tw"><table class="mini"><thead><tr><th>ວັນທີ</th><th>ຂໍ</th><th>ເຕີມ</th><th>ຮັບ</th><th>ຈ່າຍ</th><th>ໃບ</th></tr></thead><tbody>' + days.slice().reverse().map(function (d) { return '<tr><td>' + dmy(d.date).slice(0, 5) + '</td><td>' + d.n + '</td><td>' + (d.lit ? L(d.lit) : '') + '</td><td>' + (d.recv ? L(d.recv) : '') + '</td><td>' + (d.out ? L(d.out) : '') + '</td><td>' + (d.ap && d.fn ? ic('shield') : '') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }
  $('v').innerHTML = h; dashAnim();
 });
}
function dashView() {
 if (DASH.p !== 'day' || DASH.all) return rangeDash();
 var mine = MOD, dSite = $('site').value, dDate = $('date').value;
 var pLed = api('ledger', { site: dSite }), pDash = api('dash', { site: dSite, from: addDays(dDate, -6), to: dDate }); /* ຂໍພ້ອມກັນ ບໍ່ລໍກັນເປັນແຖວ (ເຊີບເວີ ~0.4 ວິ/ຄັ້ງ) */
 withSheet(false, function () {
  pLed.then(function (r) {
   if (MOD !== mine) return; LEDGER = r.ok ? r.data : [];
   var n = S.rows.length, filled = S.rows.filter(function (x) { return x.add != null; }), acked = filled.filter(function (x) { return x.ack; }).length, pct = filled.length ? Math.round(acked * 100 / filled.length) : 0, t = totals(), tk = S.tank;
   var todo = [], todoD = [], add = function (tone, icn, title, sub, go) { todoD.push({ t: title, go: go, tone: tone }); todo.push('<button class="todo ' + tone + '" data-go="' + go + '"><span class="ti">' + ic(icn) + '</span><span><b>' + title + '</b>' + (tone === 'bad' ? '<small>' + sub + '</small>' : '') + '</span><span class="go">' + ic('next') + '</span></button>'); };
   if (S.approved) add('ok', 'shield', 'ໃບມື້ນີ້ອະນຸມັດແລ້ວ', 'ໂດຍ ' + esc(S.approved.name) + ' · ' + when(S.approved.at), 'report');
   var rqm = rqSite(), reqs = S.reqs || [], qPend = reqs.filter(function (x) { return x.state === 'pending'; }).length, qWait = reqs.filter(function (x) { return x.state === 'approved'; }).length, lim = !['view', 'issue', 'tank', 'approve'].some(hasRight);
   if (rqm && qPend && hasRight('reqOk')) add('warn', 'check', qPend + ' ຄຳຂໍລໍອະນຸມັດ', 'ເລືອກແຫຼ່ງ (ແທ່ງ / ຊື້ປໍ້າ) ແລ້ວອະນຸມັດ', 'rqok');
   if (rqm && qWait && hasRight('issue')) add('warn', 'pump', qWait + ' ຄຳຂໍອະນຸມັດແລ້ວ ລໍເຕີມເຂົ້າລົດ', 'ກົດ "ເລີ່ມເຕີມ"', 'issue');
   var noFill = 0;
   S.rows.forEach(function (x) {
    if (rqm && !x.rqi && x.cm0 == null && x.cm1 == null) return;
    if (x.gap != null && Math.abs(x.gap) > Tank.GAP) add('warn', 'drop', esc(x.name) + ': ກ່ອນເຕີມຕ່າງຈາກມື້ວານ ' + (x.gap > 0 ? '+' : '') + Math.round(x.gap) + ' L', 'ກວດນ້ຳມັນເພີ່ມ/ຫາຍໃນຄືນ', hasRight('issue') ? 'issue' : 'appr');
    if (x.rej) add('bad', 'alert', esc(x.name) + ': ຄົນຂັບບໍ່ຍອມຮັບ', esc(x.rej.name) + ' — ' + esc(x.rej.why || '-'), hasRight('issue') ? 'issue' : 'appr');
    else if (x.add == null) noFill++;
    else if (!x.ack) add('warn', 'user', 'ລໍຖ້າ ' + esc(drvName(x.driver) || 'ຄົນຂັບ') + ' ຮັບຮູ້', esc(x.name) + ' · ເຕີມ ' + L(x.add), 'appr');
   });
   if (noFill) add('warn', 'edit', noFill + ' ຄັນ ຍັງບໍ່ໄດ້ເຕີມ', 'ກົດເພື່ອເລືອກລົດ ແລ້ວກອກ', hasRight('issue') ? 'issue' : 'appr');
   if (!S.approved && n && canApprove() && filled.length && acked === filled.length) add('ok', 'check', 'ພ້ອມອະນຸມັດໃບປະຈຳວັນ', 'ຄົນຂັບຮັບຮູ້ຄົບ ' + acked + ' ຄັນ', 'appr');
   if (tk && tk.mdiff != null && Math.abs(tk.mdiff) > tol()) add('warn', 'drop', 'ມິເຕີຕ່າງຈາກໃບເບີກ ' + (tk.mdiff > 0 ? '+' : '') + Math.round(tk.mdiff) + ' L', 'ກວດເລກມິເຕີ / ການເບີກ', 'tank');
   if (tk && tk.diff != null && Math.abs(tk.diff) > tol()) add('warn', 'drop', 'ແທ່ງແທກໄດ້ຕ່າງຈາກບັນຊີ ' + (tk.diff > 0 ? '+' : '') + Math.round(tk.diff) + ' L', 'ກວດການຮັບເຂົ້າ / ການຈ່າຍ', 'tank');
   var cnt = { rq: reqs.filter(function (x) { return x.state === 'pending'; }).length, rqok: qPend, issue: qWait, appr: filled.length - acked }, qa = ['rq', 'rqok', 'tank', 'issue', 'appr', 'report'].map(modOf).filter(function (m) { return m && m.show(); }).map(function (m) { return '<button class="fn" data-go="' + m.id + '">' + ic(m.ic) + '<b>' + esc(m.t) + '</b>' + (cnt[m.id] ? '<i class="nb">' + cnt[m.id] + '</i>' : '') + '</button>'; }).join('');
   if (lim) { $('v').innerHTML = stepsCard() + '<section class="card"><h2>' + ic('ledger') + 'ຄຳຂໍຂອງຂ້ອຍມື້ນີ້</h2>' + (reqs.map(function (x) { return rqItem(x); }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຄຳຂໍ</div>') + '</section>'; return; }
   var rqOfRow = function (x) { var l = reqs.filter(function (q) { return q.v === (x.base || x.v) && q.state !== 'rejected' && q.state !== 'cancel'; }); return l[l.length - 1] || null; },
    vst = function (x) { var q = rqOfRow(x); return x.ack ? ['ok', 'ຮັບຮູ້ແລ້ວ', 100, 'check'] : x.rej ? ['bad', 'ບໍ່ຍອມຮັບ', 100, 'x'] : x.add != null ? ['warn', 'ລໍຮັບຮູ້', 75, 'shield'] : q ? (q.state === 'pending' ? ['warn', 'ລໍອະນຸມັດ', 25, 'check'] : ['warn', 'ລໍເຕີມ', 50, 'pump']) : ['', rqm ? 'ຍັງບໍ່ຂໍ' : 'ຍັງບໍ່ເຕີມ', 0, 'drop']; },
    live = reqs.filter(function (x) { return x.state !== 'rejected' && x.state !== 'cancel'; }), pendL = reqs.filter(function (x) { return x.state === 'pending'; }), apprL = reqs.filter(function (x) { return x.state === 'approved'; }), sm = function (l, f) { return l.reduce(function (a, x) { return a + (+f(x) || 0); }, 0); },
    open = tk ? (tk.bal || 0) - (tk.recv || 0) + (tk.out || 0) : 0, res = sm(apprL.filter(function (x) { return x.ok && x.ok.src === 'tank'; }), function (x) { return x.ok.lit; });
   var srcL = [['ແທ່ງ', 'tank'], ['ປໍ້າ', 'shop'], ['ຕຸກ', 'jug']].map(function (k) { return [k[0], sm(filled.filter(function (x) { return (x.src || 'tank') === k[1]; }), function (x) { return x.add; })]; }).filter(function (k) { return k[1] > 0; });
   var from7 = addDays(S.date, -6);
   pDash.then(function (dr) {
    if (MOD !== mine) return; var byD = {}; (dr.ok ? dr.data.days : []).forEach(function (d) { byD[d.date] = d; }); var bars = []; for (var k = -6; k <= 0; k++) { var dd = addDays(S.date, k); bars.push({ d: dd, v: byD[dd] ? byD[dd].fl.lit : 0 }); }
    var ackPc = filled.length ? Math.round(acked * 100 / filled.length) : 0;
    $('v').innerHTML = dashLayout({ title: 'ສະບາຍດີ ' + esc((I.me.name || '').split(' ')[0]), sub: 'ພາບລວມ · ' + esc(siteObj().name) + ' · ' + dmy(S.date),
     kpis: [['ເຕີມແລ້ວ', sm(filled, function (x) { return x.add; }), 'L', 'pump'], ['ແທ່ງເຫຼືອ', tk ? tk.bal : 0, 'L', 'inbox'], ['ລໍອະນຸມັດ', pendL.length, '', 'check']],
     pend: pendL.length, pendList: pendL.map(function (x) { return { car: x.car, lit: x.lit }; }), canOk: hasRight('reqOk'), todo: todoD, pct: ackPc, ack: acked, filled: filled.length, spark: bars.map(function (b) { return b.v; }),
     steps: [['ຂໍແລ້ວ', live.length, Math.max(live.length, 1)], ['ອະນຸມັດ', apprL.length + filled.length, Math.max(live.length, 1)], ['ເຕີມແລ້ວ', filled.length, Math.max(live.length, filled.length, 1)], ['ຮັບຮູ້', acked, Math.max(filled.length, 1)]],
     tank: tk ? { open: open, recv: tk.recv || 0, out: tk.out || 0, bal: tk.bal || 0, res: res, free: (tk.bal || 0) - res } : null, src: srcL, bars: bars,
     cars: n ? S.rows.map(function (x) { var q = rqOfRow(x); return { name: x.name, v: vst(x), meta: x.add != null ? L(x.add) : q ? L(q.state === 'pending' ? q.lit : q.ok && q.ok.lit) : '\u2013' }; }).sort(function (a, b) { return (a.v[2] === 0) - (b.v[2] === 0); }) : [] });
    dashAnim(); if (rqm && (hasRight('reqOk') || hasRight('request'))) aheadFill($('ahead'), hasRight('reqOk') ? 'rqok' : 'rq');
   });
  });
 });
}

/* ===== ເບີກ & ຈ່າຍນ້ຳມັນ (ຕໍ່ລົດ) ===== */
function issueView() { withSheet(true, function (ph) { if (ph) return paintPhotos(); drawIssue(); }); }
var CARSEL = '', RQCAR = '';
function drvSelect(r) { /* ຄົນຂັບຂ້ອຍ ບໍ່ມາ → ປ່ຽນຄົນຂັບໄດ້ທັນທີ (ຕ້ອງມີສິດ ມອບລົດ) */
 if (!R('assign') || !DRV.length) return driverTag(r);
 var o = [['', '— ຍັງບໍ່ມອບ —']].concat(DRV.map(function (d) { return [d.phone, d.name]; })); if (r.driver && !DRV.some(function (d) { return d.phone === r.driver; })) o.push([r.driver, drvName(r.driver)]);
 return '<label class="f" style="margin-top:6px">ຄົນຂັບ<select data-asgi="' + esc(r.v) + '">' + opts(o, r.driver || '') + '</select></label>';
}
/* ===== ຄຳຂໍນ້ຳມັນ: ວິຊາການຂໍ → ບໍລິຫານອະນຸມັດ (ແຫຼ່ງ + ລິດ) → ເຕີມເຂົ້າລົດ → ຄົນຂັບຮັບຮູ້ ===== */
var SRCN = { tank: 'ແທ່ງ', shop: 'ປໍ້າ / ຮ້ານ', jug: 'ຕຸກ' };
function rqChip(x) {
 var s = x.state, o = x.ok || {};
 return s === 'pending' ? '<span class="chip warn dot">ລໍອະນຸມັດ</span>' : s === 'approved' ? '<span class="chip ok dot">' + (o.lit != null ? L(o.lit) : '') + ' · ' + (SRCN[o.src] || '') + (o.shop ? ' · ' + esc(o.shop) : '') + ' · ລໍເຕີມ</span>' : s === 'filling' ? '<span class="chip warn">ກຳລັງເຕີມ</span>' : s === 'done' ? '<span class="chip ok">ເຕີມແລ້ວ ' + L(x.fill) + '</span>' : s === 'rejected' ? '<span class="chip bad">ປະຕິເສດ: ' + esc(x.why || '-') + '</span>' : '<span class="chip">ຍົກເລີກ</span>';
}
function rqItem(x, acts, bare) { return '<div class="cr" data-rq="' + esc(x.id) + '"><div class="row wrap"><b class="grow">' + ic('truck') + ' ' + esc(x.car) + '</b><span class="muted sm">' + (x.lit != null ? L(x.lit) : 'ດ່ວນ') + '</span></div>' + (bare ? '' : '<small class="muted">' + esc(x.name) + ' · ' + when(x.at) + (x.note ? ' · ' + esc(x.note) : '') + '</small>') + '<div>' + rqChip(x) + (x.urgent ? ' <span class="chip bad">ດ່ວນ</span>' : '') + '</div>' + (acts || '') + '</div>'; }
function siteCars() { return I.cfg.vehicles.filter(function (v) { return v.site === $('site').value; }); }
function carOpts() { return siteCars().map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.name) + '</option>'; }).join(''); }
function srcOpts(sel) { return ['tank', 'shop', 'jug'].map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + SRCN[k] + '</option>'; }).join(''); }
function rqOff() { return '<div class="card empty">ສະໜາມນີ້ຍັງບໍ່ເປີດໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ' + (I.me.boss ? '<br><button class="btn line" data-go="staff" style="margin-top:10px">ໄປ ຕັ້ງຄ່າ → ສະໜາມ ແລ້ວເປີດ "ໃຊ້ລະບົບຄຳຂໍນ້ຳມັນ"</button>' : '') + '</div>'; }
function rqView() { withSheet(false, function () { loadAppr(function () { drawRq(); }); }); }
function rqGroups(list) { /* ຈັດຄຳຂໍເປັນ "ໃບ" (ຫຼາຍຄັນໃນໃບດຽວ); ຄຳຂໍເກົ່າ (ຄັນດຽວ) = 1 ໃບຕໍ່ 1 ແຖວ */
 var g = [], idx = {}; list.forEach(function (x) { var k = x.bid || ('_' + x.id); if (idx[k] == null) { idx[k] = g.length; g.push({ k: k, bid: x.bid || '', no: x.bno || 0, by: x.name, at: x.at, note: x.note, items: [] }); } g[idx[k]].items.push(x); }); return g;
}
function sheetHead(g) { return '<div class="row wrap sheet-h"><b class="grow">' + (g.no ? 'ໃບຂໍທີ ' + g.no : 'ຄຳຂໍ') + ' · ' + g.items.length + ' ຄັນ</b><span class="muted sm">' + esc(g.by) + ' · ' + when(g.at) + '</span></div>' + (g.note && g.items.length > 1 ? '<small class="muted">' + esc(g.note) + '</small>' : ''); }
function leftTxt(id) { var l = S.left && S.left[id]; return l && l.L != null ? '<span title="ນ້ຳມັນທີ່ເຫຼືອໃນລົດ ຕາມການແທກຫຼັງເລີກວຽກຄັ້ງຫຼ້າສຸດ">' + ic('drop') + ' ເຫຼືອ ~' + L(l.L) + '</span>' : ''; } /* ເຫຼືອໃນລົດ: ມີຂໍ້ມູນຈຶ່ງສະແດງ (ໄອຄອນຢອດນ້ຳມັນ + ລິດ) */
function rqSum() { var n = 0, t = 0; document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { var v = parseFloat(i.value); if (v > 0) { n++; t += v; } }); var e = $('rqsum'); if (e) e.innerHTML = n ? ic('truck') + ' <b>' + n + '</b> · <b>' + L(t) + '</b>' : ''; var b = $('rqsend'); if (b) b.disabled = !n; }
var RQKEEP = null;
function addDays(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10); }
function aheadFill(el, to) { /* ຄຳຂໍລ່ວງໜ້າ: ລາຍການວັນທີທີ່ມີຄຳຂໍ ແຕະເພື່ອໄປວັນນັ້ນ */
 if (!el || !rqSite()) return; api('rqAhead', here()).then(function (r) { if (!r.ok || !r.data.length || !$('ahead')) return;
  $('ahead').innerHTML = '<section class="card ahead"><h2>' + ic('edit') + 'ຄຳຂໍລ່ວງໜ້າ</h2>' + r.data.map(function (x) { return '<button type="button" class="todo ' + (x.pending ? 'warn' : '') + '" data-ahead="' + x.date + '" data-to="' + to + '"><span class="ti">' + ic(x.pending ? 'alert' : 'check') + '</span><span><b>' + dmy(x.date) + ' · ' + x.total + ' ແຖວ</b><small>' + (x.pending ? 'ລໍອະນຸມັດ ' + x.pending + ' ແຖວ' : 'ອະນຸມັດແລ້ວ — ເຕີມໄດ້ໃນມື້ນັ້ນ') + '</small></span><span class="go">' + ic('next') + '</span></button>'; }).join('') + '</section>'; });
}
function drvLine(id) { var d = S.drv && S.drv[id]; if (!d) return ''; if (!d.d) return '<span class="chip bad">' + ic('alert') + 'ບໍ່ມີຄົນຂັບ</span>'; return '<small>' + ic('user') + ' ' + esc(drvName(d.d) || '–') + (d.sub ? ' <span class="chip warn">ແທນ</span>' : '') + '</small>'; }
function canSub() { return (hasRight('request') || hasRight('assign')) && !S.approved && S.date >= today(); }
function subBox(id) { var d = (S.drv && S.drv[id]) || {}; return '<div class="subbox" id="sub_' + esc(id) + '" hidden><label class="f">ຄົນຂັບຂອງລົດຄັນນີ້ ສະເພາະມື້ນີ້<select id="subsel_' + esc(id) + '"><option value="__reset">ຄົນຂັບປະຈຳ (ຍົກເລີກການແທນ)</option><option value="__park"' + (d.sub && !d.d ? ' selected' : '') + '>ຄົນຂັບລາ ບໍ່ມີຄົນແທນ — ຈອດ ບໍ່ເຕີມ</option>' + DRV.map(function (u) { return '<option value="' + esc(u.phone) + '"' + (d.sub && d.d === u.phone ? ' selected' : '') + '>ແທນໂດຍ ' + esc(u.name) + '</option>'; }).join('') + '</select></label><div class="row wrap"><button type="button" class="btn ok" data-subsave="' + esc(id) + '">' + ic('check') + 'ບັນທຶກ</button><button type="button" class="btn line" data-subopen="' + esc(id) + '">ປິດ</button></div></div>'; }
function drawRq() {
 if (!rqSite()) { $('v').innerHTML = rqOff(); return; }
 var h = approvedBanner(), reqs = S.reqs || [], cars = siteCars().map(function (v, i) { return { v: v, i: i, nd: !!(S.drv && S.drv[v.id] && !S.drv[v.id].d) }; }).sort(function (x, y) { return (x.nd - y.nd) || (x.i - y.i); }).map(function (x) { return x.v; }); /* ລົດທີ່ບໍ່ມີຄົນຂັບ ໄປທ້າຍ */
 var td = today(), dayChip = function (n, lab) { var d = addDays(td, n); return '<button type="button" data-day="' + n + '" aria-pressed="' + (S.date === d) + '">' + lab + ' <small>' + dmy(d).slice(0, 5) + '</small></button>'; };
 h += '<div id="ahead"></div><section class="card"><h2>' + ic('edit') + 'ຂໍນ້ຳມັນ</h2><div class="seg noprint" id="rqday" aria-label="ຂໍສຳລັບວັນ">' + dayChip(0, 'ມື້ນີ້') + dayChip(1, 'ມື້ອື່ນ') + dayChip(2, 'ມື້ຕໍ່ໄປ') + '<label class="cal' + ([0, 1, 2].some(function (n) { return S.date === addDays(td, n); }) ? '' : ' on') + '" title="ເລືອກວັນທີ">' + ic('calendar') + ([0, 1, 2].some(function (n) { return S.date === addDays(td, n); }) ? '' : ' <small>' + dmy(S.date).slice(0, 5) + '</small>') + '<input type="date" id="rqdate" min="' + td + '" max="' + addDays(td, 7) + '" value="' + S.date + '" aria-label="ເລືອກວັນທີ"></label></div>' + (S.date > td ? '<p class="chip warn" style="margin:0 0 8px">ລ່ວງໜ້າ ' + dmy(S.date) + '</p>' : '') + (cars.length > 8 ? '<label class="f noprint"><input type="text" id="rqq" placeholder="ຄົ້ນຫາລົດ…" autocomplete="off"></label>' : '') +
  '<div class="carlist" id="rqlist">' + cars.map(function (v) { var nd = S.drv && S.drv[v.id] && !S.drv[v.id].d; return '<div class="rql' + (nd ? ' nodrv' : '') + '" data-n="' + esc(v.name.toLowerCase()) + '"><span class="grow"><b>' + esc(v.name) + '</b><small>' + leftTxt(v.id) + '</small>' + drvLine(v.id) + (canSub() ? '<button type="button" class="ibtn sw" data-subopen="' + esc(v.id) + '" aria-label="ປ່ຽນຄົນຂັບມື້ນີ້" title="ປ່ຽນຄົນຂັບມື້ນີ້">' + ic('users') + '</button>' : '') + '</span><input type="number" inputmode="decimal" min="0" step="1" data-rql="' + esc(v.id) + '" placeholder="ລິດ"' + (nd ? ' disabled' : '') + ' aria-label="ລິດທີ່ຂໍ ' + esc(v.name) + '"></div>' + (canSub() ? subBox(v.id) : ''); }).join('') + '</div>' +
  '<p class="sum" id="rqsum" aria-live="polite"></p><label class="f" style="margin-top:8px">ໝາຍເຫດ<input type="text" id="rqnote" maxlength="200"></label>' +
  '<button type="button" class="btn ok blk" id="rqsend" style="margin-top:12px" disabled>' + ic('check') + 'ສົ່ງໃບຂໍ</button></section>' +
  '<section class="card"><h2>' + ic('ledger') + 'ໃບຂໍ (' + reqs.length + ')</h2>' + (rqGroups(reqs).map(function (g) { return '<div class="rqsheet">' + sheetHead(g) + g.items.map(function (x) { return rqItem(x, x.state === 'pending' ? '<div class="row wrap" style="margin-top:6px"><button type="button" class="btn line ibtn" data-rqcancel="' + esc(x.id) + '" aria-label="ຍົກເລີກ" title="ຍົກເລີກ">' + ic('x') + '</button></div>' : '', true); }).join('') + '</div>'; }).join('') || '<div class="empty" style="padding:14px">ຍັງບໍ່ມີໃບຂໍ</div>') + (reqs.length ? '<div class="row wrap noprint" style="margin-top:12px;align-items:center">' + (function () { var np = reqs.filter(function (x) { return x.state === 'pending'; }), mine = np.filter(function (x) { return x.by !== I.me.id; }).length; if (!np.length) return ''; return hasRight('reqOk') && mine ? '<button type="button" class="btn ok" data-go="rqok">' + ic('check') + ' ອະນຸມັດ (' + mine + ')</button>' : '<span class="chip warn">' + ic('user') + ' ລໍ ' + (apprNames() || '\u2013') + '</span>'; })() + '<button type="button" class="btn line" data-go="rqrep" aria-label="ແບບຟອມ PDF / Excel">' + ic('pdf') + 'ແບບຟອມ</button></div>' : '') + '</section>';
 $('v').innerHTML = h; aheadFill($('ahead'), 'rq'); if (RQKEEP) { document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { if (RQKEEP[i.dataset.rql]) i.value = RQKEEP[i.dataset.rql]; }); if ($('rqnote') && RQKEEP._note) $('rqnote').value = RQKEEP._note; RQKEEP = null; } rqSum();
}
var APPR = {};
function loadAppr(cb) { var s = $('site').value; if (APPR[s]) return cb(); api('approvers', { site: s }).then(function (r) { APPR[s] = r.ok ? r.data : []; cb(); }); }
function apprNames() { return (APPR[$('site').value] || []).filter(function (a) { return !a.me; }).map(function (a) { return esc(a.name); }).join(', '); }
function rqokView() { withSheet(false, function () { loadAppr(function () { drawRqok(); }); }); }
function drawRqok() {
 if (!rqSite()) { $('v').innerHTML = rqOff(); return; }
 var h = '<div id="ahead"></div>' + approvedBanner(), reqs = S.reqs || [], me = I.me.id, pend = reqs.filter(function (x) { return x.state === 'pending'; }), wait = reqs.filter(function (x) { return x.state === 'approved'; }), rest = reqs.filter(function (x) { return x.state !== 'pending' && x.state !== 'approved'; });
 if (S.stock) h += '<div class="stockbar">' + ic('inbox') + ' <span>ແທ່ງ <b>' + L(S.stock.have) + '</b></span>' + (S.stock.pend ? ' <span>− ລໍເຕີມ <b>' + L(S.stock.pend) + '</b></span> <span>= <b class="' + (S.stock.have - S.stock.pend < 0 ? 'neg' : '') + '">' + L(S.stock.have - S.stock.pend) + '</b></span>' : '') + '</div>';
 h += '<div class="apprl noprint">' + ic('shield') + '<span>ຜູ້ອະນຸມັດ</span>' + ((APPR[$('site').value] || []).map(function (a) { return '<span class="chip ' + (a.me ? 'ok' : '') + '">' + ic('user') + ' ' + esc(a.name) + (a.me ? ' (ເຈົ້າ)' : '') + '</span>'; }).join('') || '<span class="chip bad">' + ic('alert') + '</span>') + '</div>';
 h += '<section class="card"><h2>' + ic('check') + 'ລໍອະນຸມັດ (' + pend.length + ')</h2>' + (rqGroups(pend).map(function (g) {
  var others = g.items.filter(function (x) { return x.by !== me; });
  return '<div class="rqsheet">' + sheetHead(g) +
   (others.length > 1 ? '<div class="allbox" data-rq="_all"><div class="g2"><label class="f">ແຫຼ່ງ<select data-f="src">' + srcOpts('tank') + '</select></label><label class="f hide" data-shopf="1">ຊື່ປໍ້າ / ຮ້ານ<input type="text" data-f="shop" maxlength="60"></label></div><button type="button" class="btn ok blk" data-rqall="' + esc(g.items.filter(function (x) { return x.by !== me; }).map(function (x) { return x.id; }).join(',')) + '" style="margin-top:8px">' + ic('check') + 'ອະນຸມັດທັງໝົດ (' + others.length + ')</button></div>' : '') +
   g.items.map(function (x) {
    return rqItem(x, x.by === me ? '<p class="chip warn" style="margin-top:6px">' + ic('user') + (apprNames() ? 'ຄຳຂໍຂອງເຈົ້າ — ລໍ ' + apprNames() : 'ຄຳຂໍຂອງເຈົ້າ — ບໍ່ມີຜູ້ອະນຸມັດຄົນອື່ນ') + '</p>' : '<div class="g2" style="margin-top:8px"><label class="f">ອະນຸມັດ (ລິດ)<input type="number" inputmode="decimal" min="0" data-f="lit" value="' + esc(x.lit) + '"></label><label class="f">ແຫຼ່ງ<select data-f="src">' + srcOpts('tank') + '</select></label></div>' +
     '<label class="f hide" data-shopf="1" style="margin-top:8px">ຊື່ປໍ້າ / ຮ້ານ<input type="text" data-f="shop" maxlength="60"></label>' +
     '<div class="row wrap" style="margin-top:10px"><button type="button" class="btn ok grow" data-rqapprove="' + esc(x.id) + '">' + ic('check') + 'ອະນຸມັດ</button><button type="button" class="btn line" data-rqreject="' + esc(x.id) + '">ຕີກັບ</button></div>', true);
   }).join('') + '</div>';
 }).join('') || '<div class="empty" style="padding:14px">ບໍ່ມີຄຳຂໍທີ່ລໍ</div>') + '</section>';
 if (wait.length) h += '<section class="card"><h2>' + ic('pump') + 'ລໍເຕີມ (' + wait.length + ')</h2>' + wait.map(function (x) { return rqItem(x, '<div class="row wrap" style="margin-top:6px"><button type="button" class="btn line ibtn" data-rqcancel="' + esc(x.id) + '" aria-label="ຍົກເລີກ" title="ຍົກເລີກ">' + ic('x') + '</button></div>', true); }).join('') + '</section>';
 if (rest.length) h += '<section class="card"><h2>' + ic('ledger') + 'ສຳເລັດ (' + rest.length + ')</h2>' + rest.map(function (x) { return rqItem(x, '', true); }).join('') + '</section>';
 if (reqs.length) h += '<div class="row wrap noprint" style="margin:0 0 14px"><button type="button" class="btn line" data-go="rqrep" aria-label="ແບບຟອມ PDF / Excel">' + ic('pdf') + 'ແບບຟອມ</button></div>';
 $('v').innerHTML = h; aheadFill($('ahead'), 'rqok');
}
function rqIssueTop(ed) {
 var w = (S.reqs || []).filter(function (x) { return x.state === 'approved'; }), h = '';
 if (w.length) h += '<section class="card"><h2>' + ic('check') + 'ລໍເຕີມ (' + w.length + ')</h2>' + w.map(function (x) { var o = x.ok || {}; return rqItem(x, ed ? '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn ok grow" data-rqstart="' + esc(x.id) + '">' + ic('pump') + 'ເລີ່ມເຕີມ ' + (o.lit != null ? L(o.lit) : '') + '</button></div>' : '', true); }).join('') + '</section>';
 if (ed && hasRight('urgent')) h += '<details class="card noprint"><summary><b>ເຕີມດ່ວນ</b></summary><p class="hint">ໃຊ້ໃນກໍລະນີຮີບ — ລະບົບບັນທຶກເປັນ "ເຕີມດ່ວນ" ຕິດຊື່ຜູ້ເຮັດ</p><label class="f">ລົດ<select id="uqcar">' + carOpts() + '</select></label><div class="g2" style="margin-top:8px"><label class="f">ແຫຼ່ງ<select id="uqsrc">' + srcOpts('tank') + '</select></label><label class="f">ຊື່ຮ້ານ / ປໍ້າ<input type="text" id="uqshop" maxlength="60"></label></div><button type="button" class="btn ok blk" id="rqurgent" style="margin-top:10px">' + ic('pump') + 'ເລີ່ມເຕີມດ່ວນ</button></details>';
 return h;
}
function carStat(r) { /* ສະຖານະຂອງລົດ 1 ຄັນ (ລວມທຸກຮອບ) — ບອກດ້ວຍຕົວໜັງສື ບໍ່ໃຊ້ສີຢ່າງດຽວ */
 var ids = S.rows.filter(function (x) { return x.v === r.v || x.base === r.v; }), any = ids.some(function (x) { return x.add != null; }), add = ids.reduce(function (t, x) { return t + (x.add > 0 ? x.add : 0); }, 0);
 return ids.some(function (x) { return x.rej; }) ? ['bad', 'ຄົນຂັບບໍ່ຍອມຮັບ'] : !any ? ['', 'ຍັງບໍ່ໄດ້ເຕີມ'] : ids.every(function (x) { return x.add == null || x.ack; }) ? ['ok', 'ຮັບຮູ້ແລ້ວ ' + L(add)] : ['warn', 'ລໍຮັບຮູ້ ' + L(add)];
}
function carList(bases, attr) { /* ລາຍການລົດໃຫ້ແຕະເລືອກ: ຊື່ · ຄົນຂັບ · ສະຖານະ */
 return (bases.length > 8 ? '<label class="f noprint">ຄົ້ນຫາລົດ<input type="text" id="carq" placeholder="ພິມຊື່ / ທະບຽນລົດ" autocomplete="off"></label>' : '') + '<div class="carlist" id="carlist">' + bases.map(function (r) { var st = carStat(r); return '<button type="button" class="carrow" ' + attr + '="' + esc(r.v) + '" data-n="' + esc(r.name.toLowerCase()) + '"><span class="grow"><b>' + esc(r.name) + '</b><small>' + (r.driver ? 'ຄົນຂັບ: ' + esc(drvName(r.driver) || '–') : 'ຍັງບໍ່ໄດ້ມອບໃຫ້ຄົນຂັບ') + '</small></span><span class="chip ' + st[0] + '">' + st[1] + '</span>' + ic('next', 'muted') + '</button>'; }).join('') + '</div>';
}
function drawIssue() {
 var ed = canEdit(), h = approvedBanner(), n = 0, rqm = rqSite();
 var rows = rqm ? S.rows.filter(function (x) { return x.rqi || x.cm0 != null || x.cm1 != null || x.ack || x.rej; }) : S.rows; /* ສະໜາມທີ່ໃຊ້ຄຳຂໍ: ສະແດງສະເພາະລົດທີ່ມີການເຕີມ */
 if (rqm) h += rqIssueTop(ed && hasRight('issue'));
 if (!S.rows.length) h += noCars(); else if (rqm && !rows.length) h += '<p class="hint">ຍັງບໍ່ມີການເຕີມ — ເມື່ອມີຄຳຂໍທີ່ອະນຸມັດແລ້ວ ກົດ "ເລີ່ມເຕີມ" ຢູ່ດ້ານເທິງ.</p>';
 var bases = rows.filter(function (x) { return !x.base; });
 var many = bases.length > 2; if (!many) CARSEL = ''; if (CARSEL && !bases.some(function (x) { return x.v === CARSEL; })) CARSEL = '';
 if (many && !CARSEL) h += '<section class="card"><h2>' + ic('truck') + 'ເລືອກລົດ (' + bases.length + ' ຄັນ)</h2><p class="hint">ແຕະລົດຄັນທີ່ຈະກອກ cm / ເຕີມ</p>' + carList(bases, 'data-pickcar') + '</section>';
 if (many && CARSEL) { var bi = bases.map(function (x) { return x.v; }).indexOf(CARSEL); h += '<div class="row noprint" style="margin-bottom:10px"><button type="button" class="btn line" data-pickcar="">‹ ທຸກຄັນ</button><span class="grow"></span>' + (bi > 0 ? '<button type="button" class="btn line" data-pickcar="' + esc(bases[bi - 1].v) + '">‹ ກ່ອນໜ້າ</button>' : '') + (bi < bases.length - 1 ? '<button type="button" class="btn line" data-pickcar="' + esc(bases[bi + 1].v) + '">ຄັນຕໍ່ໄປ ›</button>' : '') + '</div>'; }
 (many && !CARSEL ? [] : CARSEL ? rows.filter(function (x) { return x.v === CARSEL || x.base === CARSEL; }) : rows).forEach(function (r) {
  var lock = !ed || (r.ack && !isChief()), rd = r.round > 1, bid = r.base || r.v, last = !S.rows.some(function (x) { return x.base === bid && x.round > r.round; }), srcLock = lock || (!!r.rqi && !isChief()); n++;
  var qi = r.rqi ? '<div class="chips" style="margin:6px 0 0">' + (r.rqi.urgent ? '<span class="chip bad">ດ່ວນ</span>' : (r.rqi.ok != null && r.rqi.ask !== r.rqi.ok ? '<span class="chip">ຂໍ ' + L(r.rqi.ask) + '</span>' : '')) + (r.rqi.ok != null ? '<span class="chip ok">' + L(r.rqi.ok) + '</span>' : '') + '<span class="chip">' + esc(SRCN[r.src] || '') + '</span>' + (r.rqi.max != null ? '<span class="chip">≤ ' + L(r.rqi.max) + '</span>' : '') + (r.rqi.ok != null && r.add != null && Math.abs(r.add - r.rqi.ok) > Math.max(5, r.rqi.ok * 0.1) ? '<span class="chip warn">' + ic('alert') + (r.add > r.rqi.ok ? '+' : '') + Math.round(r.add - r.rqi.ok) + ' L</span>' : '') + '</div>' : '';
  h += '<section class="card" data-v="' + esc(r.v) + '" style="animation-delay:' + n * 60 + 'ms"><h2>' + ic('truck') + esc(r.name) + '</h2>' + (rd || r.sub ? driverTag(r) : drvSelect(r)) + (r.sub ? '<span class="chip warn" style="margin-top:6px">ຄົນຂັບແທນມື້ນີ້ · ປະຈຳ: ' + esc(drvName(r.regular) || '–') + '</span>' : '') + qi + '<div class="g2" style="margin-top:8px">' +
   '<label class="f">ກ່ອນເຕີມ (cm)' + numIn('cm0', r.cm0, lock) + '</label><label class="f">ຫຼັງເຕີມ (cm)' + numIn('cm1', r.cm1, lock) + '</label>' +
   (rqm && r.rqi ? '' : '<label class="f">ເຕີມຈາກ<select data-k="src"' + (srcLock ? ' disabled' : '') + '><option value="tank">ແທ່ງນ້ຳມັນ</option><option value="jug"' + (r.src === 'jug' ? ' selected' : '') + '>ຕຸກ (ພາໄປສະໜາມ)</option><option value="shop"' + (r.src === 'shop' ? ' selected' : '') + '>ຮ້ານ / ປໍ້າອື່ນ (ບໍ່ຫັກແທ່ງ)</option></select></label>') +
   (rd ? '' : '<label class="f">ຫຼັງເລີກວຽກ (cm)' + numIn('cm2', r.cm2, !ed) + '</label>') + '</div>' +
   (r.src === 'shop' && !(rqm && r.rqi) ? '<label class="f" style="margin-top:8px">ຊື່ຮ້ານ / ປໍ້າ<input type="text" data-k="shop" maxlength="60" value="' + esc(r.shop) + '"' + (srcLock ? ' disabled' : '') + '></label>' : '') + '<label class="f" style="margin-top:8px">ໝາຍເຫດ<input type="text" data-k="note" maxlength="200" value="' + esc(r.note) + '"' + (ed ? '' : ' disabled') + '></label>' +
   '<div class="calc">' + calcHtml(r) + '</div>' + histHtml(r) + phBtns([[r.v + '_b', 'ກ່ອນເຕີມ'], [r.v + '_a', 'ຫຼັງເຕີມ']].concat(rd ? [] : [[r.v + '_e', 'ຕອນແລງ']]).concat(r.src === 'shop' ? [[r.v + '_p1', 'ບິນປໍ້າ 1'], [r.v + '_p2', 'ບິນປໍ້າ 2'], [r.v + '_p3', 'ບິນປໍ້າ 3']] : [])) +
   (!lock || (ed && last) ? '<div class="row wrap noprint" style="margin-top:12px">' + (!lock ? '<button type="button" class="btn ok" data-savecar="' + esc(r.v) + '">' + ic('check') + 'ບັນທຶກ</button>' : '') + (ed && last ? (!rqm && (r.round || 1) < 9 ? '<button type="button" class="btn line" data-addround="' + esc(bid) + '">' + ic('plus') + 'ເຕີມອີກຄັ້ງ (ຄັ້ງທີ ' + ((r.round || 1) + 1) + ')</button>' : '') + (rd && !r.ack ? '<button type="button" class="btn line" data-delround="' + esc(r.v) + '">ລຶບຄັ້ງນີ້</button>' : '') : '') + '</div>' : '') + '</section>';
 });
 if (S.rows.length && !ed && !S.approved) h += '<p class="hint">ບົດບາດຂອງເຈົ້າເບິ່ງໄດ້ຢ່າງດຽວ — ບໍ່ສາມາດແກ້ cm</p>';
 $('v').innerHTML = h; paintPhotos();
}

/* ===== ຮັບເຂົ້າແທ່ງ & ແທກ ===== */
function tankView() {
 withSheet(true, function (ph) {
  if (ph) return paintPhotos();
  var mine = MOD; api('ledger', { site: $('site').value }).then(function (r) { if (MOD !== mine) return; LEDGER = r.ok ? r.data : []; drawTank(); });
 });
}
function recvHtml(t, ed) { /* ຮັບເຂົ້າ / ຊື້ ໄດ້ຫຼາຍຄັ້ງຕໍ່ມື້: ແຕ່ລະຄັ້ງມີລິດ + ມາຈາກໃສ + ຮູບບິນ; ຍອດລວມຄິດໃຫ້ເອງ. ບັນທຶກແລ້ວແກ້ເອງບໍ່ໄດ້ — ມີແຕ່ Admin ແກ້ໄດ້ ພ້ອມເຫດຜົນ ແລະ log */
 var lst = t.recvs && t.recvs.length ? t.recvs : t.recv > 0 ? [{ id: 'r0', lit: t.recv, from: '' }] : [], w = t.meter ? 'ຮັບເຂົ້າ' : 'ຊື້ທີ່ປໍ້າ', tot = lst.reduce(function (s, x) { return s + x.lit; }, 0), adm = !!(I.me && I.me.boss);
 return '<div class="f">' + w + 'ມື້ນີ້ <b>' + L(tot) + '</b> <small class="muted">(' + lst.length + ' ຄັ້ງ)</small></div>' + lst.map(function (x, i) { return '<div class="cr"><div class="row wrap"><b class="grow">ຄັ້ງທີ ' + (i + 1) + ' · ' + L(x.lit) + '</b>' + (adm ? '<button type="button" class="btn line ibtn" data-rvedit="' + esc(x.id) + '" aria-label="ແກ້ໄຂ" title="ແກ້ໄຂ">' + ic('edit') + '</button>' : '') + '</div>' + (x.from || x.note ? '<small class="muted">' + (x.from ? esc(x.from) : '') + (x.from && x.note ? ' · ' : '') + esc(x.note || '') + '</small>' : '') + '<div data-nb="' + (x.id === 'r0' ? 'tank' : 'tank_' + x.id) + '"' + (P[x.id === 'r0' ? 'tank' : 'tank_' + x.id] ? ' hidden' : '') + '><span class="chip bad">' + ic('alert') + 'ຕ້ອງແນບຮູບບິນ</span></div>' + (x.edited ? '<div><span class="chip warn">ແກ້ໂດຍ ' + esc(x.edited.name) + ' · ' + when(x.edited.at) + ' — ' + esc(x.edited.reason) + '</span></div>' : '') + phBtns([[x.id === 'r0' ? 'tank' : 'tank_' + x.id, 'ຮູບບິນ / ໃບສົ່ງ']]) +
  (adm ? '<div class="subbox rvf" id="rvf_' + esc(x.id) + '" hidden><div class="g2"><label class="f">ລິດ<input type="number" inputmode="decimal" min="0" step="0.1" data-rvl value="' + esc(x.lit) + '"></label><label class="f">ມາຈາກ<input type="text" maxlength="60" data-rvf value="' + esc(x.from || '') + '"></label></div><label class="f">ໝາຍເຫດ<input type="text" maxlength="200" data-rvn value="' + esc(x.note || '') + '"></label><label class="f">ເຫດຜົນຂອງການແກ້ໄຂ (ຕ້ອງໃສ່)<input type="text" maxlength="200" data-rvr placeholder="ເຊັ່ນ ພິມຕົວເລກຜິດ"></label><div class="row wrap"><button type="button" class="btn ok" data-rvsave="' + esc(x.id) + '">' + ic('check') + 'ບັນທຶກການແກ້</button><button type="button" class="btn line" data-rvvoid="' + esc(x.id) + '">ຍົກເລີກລາຍການນີ້</button></div><p class="hint">ການແກ້/ຍົກເລີກຖືກບັນທຶກໃນ "ລາຍງານການປັບປຸງ"</p></div>' : '') + '</div>'; }).join('') +
  (ed ? '<div class="cr noprint"><b>ເພີ່ມການ' + w + 'ຄັ້ງໃໝ່</b><div class="g2"><label class="f">ຈຳນວນ (ລິດ)<input type="number" inputmode="decimal" min="0" step="0.1" id="rvlit"></label><label class="f">ມາຈາກ<input type="text" id="rvfrom" maxlength="60" list="rvfl" autocomplete="off"></label></div><datalist id="rvfl"><option value="ແທ່ງສະໜາມອື່ນ"><option value="ປໍ້າ"><option value="ຜູ້ຂາຍ / ບໍລິສັດ"><option value="ຮັບຄືນຈາກລົດ"></datalist><label class="f">ໝາຍເຫດ<input type="text" id="rvnote" maxlength="200"></label><button type="button" class="btn ok" id="addRv">' + ic('plus') + 'ເພີ່ມການ' + w + '</button><p class="muted sm">' + ic('lock') + ' ບັນທຶກແລ້ວແກ້ເອງບໍ່ໄດ້</p></div>' : '');
}
function drawTank() {
 var ed = canTank(), t = S.tank, h = approvedBanner();
 if (!t) { $('v').innerHTML = h + '<div class="card empty">ບົດບາດຂອງເຈົ້າບໍ່ມີສິດເບິ່ງແທ່ງນ້ຳມັນ</div>'; return; }
 h += '<section class="card" data-tank="1"><h2>' + ic('inbox') + (cmOn() ? 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ · ແທກແທ່ງ' : t.meter ? 'ຮັບນ້ຳມັນເຂົ້າແທ່ງ' : 'ຊື້ນ້ຳມັນທີ່ປໍ້າ · ກວດກັບການຈ່າຍ') + '</h2>' + recvHtml(t, ed) + '<div class="g2">' + (cmOn() ? '<label class="f">ແທກແທ່ງຫຼັງເລີກວຽກ (cm)' + numIn('cm', t.cm, !ed) + '</label>' : '') + '</div><div class="calc">' + tankHtml(t) + '</div>' + '' + '<div class="row wrap noprint" style="margin-top:14px">' + (ed && cmOn() ? '<button type="button" class="btn ok" id="savT">' + ic('check') + 'ບັນທຶກ</button>' : '') + '<button type="button" class="btn line" id="xlsT">' + ic('xls') + 'Excel</button></div></section>';
 var rows = LEDGER.slice(-7).reverse();
 h += '<section class="card"><h2>' + ic('ledger') + 'ຍ້ອນຫຼັງ 7 ມື້</h2>' + (rows.length ? '<div class="tw"><table class="mini"><thead><tr><th>ວັນທີ</th><th>' + (cmOn() ? 'ຮັບເຂົ້າ' : 'ຊື້') + '</th><th>ຈ່າຍອອກ</th><th>ເຫຼືອ</th><th>' + (cmOn() ? 'ແທກໄດ້' : 'ຕ່າງມື້') + '</th></tr></thead><tbody>' + rows.map(function (x) { return '<tr><td>' + dmy(x.date) + '</td><td>' + (x.recv ? L(x.recv) : '') + '</td><td>' + (x.out ? L(x.out) : '') + '</td><td><b>' + L(x.bal) + '</b></td><td>' + (cmOn() ? (x.measured != null ? L(x.measured) : '') : (x.recv || x.out ? (x.recv - x.out > 0 ? '+' : '') + Math.round(x.recv - x.out) : '')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty" style="padding:14px">ຍັງບໍ່ມີຂໍ້ມູນ</div>') + '</section>';
 $('v').innerHTML = h; paintPhotos();
}

/* ===== ຮັບຮູ້ & ອະນຸມັດ ===== */
function apprView() { withSheet(false, function () { loadAppr(function () { drawAppr(); }); }); }
function drawAppr() {
 var shownRows = S.rows.filter(function (x) { return x.add != null || x.rej || x.rqi || S.rows.length <= 3; }), idle = S.rows.length - shownRows.length, h = approvedBanner(), filled = S.rows.filter(function (x) { return x.add != null; }), un = filled.filter(function (x) { return !x.ack; }), ok = canApprove(), edit = hasRight('issue'), openq = (S.reqs || []).filter(function (x) { return x.state === 'pending' || x.state === 'approved'; });
 if (!S.rows.length) { $('v').innerHTML = noCars(); return; }
 h += '<section class="card"><h2>' + ic('check') + 'ຄົນຂັບຮັບຮູ້ ' + (filled.length - un.length) + '/' + filled.length + ' ຄັນ</h2>' +
  shownRows.map(function (x) { return '<div class="cr"><div class="row wrap"><b class="grow">' + ic('truck') + ' ' + esc(x.name) + '</b><span class="muted sm">ເຕີມ ' + L(x.add) + '</span></div>' + (x.ack ? '' : '<small class="muted">' + ic('user') + ' ' + esc(drvName(x.driver) || '–') + '</small>') + '<div>' + chip(x) + '</div>' + (x.mine && x.add != null && !x.ack && !S.approved ? '<div class="row wrap" style="margin-top:8px"><button type="button" class="btn ok grow" data-ackyes="' + esc(x.v) + '">' + ic('check') + 'ຮັບຮູ້ ' + L(x.add) + '</button><button type="button" class="btn line" data-ackno="' + esc(x.v) + '">ບໍ່ຖືກ</button></div>' : '') + (x.rej && edit && !S.approved ? '<button class="btn line" data-go="issue" style="min-height:40px;align-self:start">' + ic('edit') + 'ກວດ ແລະ ແກ້ cm</button>' : '') + '</div>'; }).join('') + (idle ? '<p class="muted sm">+' + idle + ' ບໍ່ເຕີມ</p>' : '') + '</section>';
 h += '<section class="card"><h2>' + ic('shield') + 'ອະນຸມັດໃບປະຈຳວັນ</h2>';
 if (S.approved) h += '<p>ອະນຸມັດແລ້ວໂດຍ <b>' + esc(S.approved.name) + '</b> · ' + when(S.approved.at) + '</p>' + (ok ? '<button id="appr" class="btn bad blk">' + ic('x') + 'ຍົກເລີກການອະນຸມັດ</button>' : '');
 else if (!ok) h += '<p class="hint">ເຈົ້າບໍ່ມີສິດອະນຸມັດ. ຜູ້ອະນຸມັດ = ຫົວໜ້າສະໜາມ, ເຈົ້າຂອງ ແລະ ຄົນທີ່ເຈົ້າຂອງຕັ້ງເປັນ "ຜູ້ອະນຸມັດ" ໃນ ພະນັກງານ & ສິດ.</p>';
 else if (un.length || openq.length) h += (un.length ? '<div class="chip warn" style="margin-bottom:8px">' + ic('alert') + 'ຍັງມີ ' + un.length + ' ຄັນທີ່ຄົນຂັບບໍ່ທັນຮັບຮູ້</div><div class="pendl">' + un.map(function (x) { return '<div class="pendi"><span class="dic sm">' + ic('user') + '</span><span class="grow"><b>' + esc(x.name) + '</b><small>ລໍ ' + esc(drvName(x.driver) || 'ຄົນຂັບ') + ' ຮັບຮູ້</small></span><span class="muted">' + L(x.add) + '</span></div>'; }).join('') + '</div>' : '') + (openq.length ? '<div class="chip warn" style="margin-bottom:8px">' + ic('alert') + 'ຄຳຂໍຄ້າງ ' + openq.length + '</div><div class="pendl">' + openq.map(function (x) { var pd = x.state === 'pending'; return '<button type="button" class="pendi" data-go="' + (pd ? 'rqok' : 'issue') + '"><span class="dic ' + (pd ? 'am' : '') + ' sm">' + ic(pd ? 'check' : 'pump') + '</span><span class="grow"><b>' + esc(x.car) + '</b><small>' + (pd ? 'ລໍອະນຸມັດ' + (apprNames() ? ' · ' + apprNames() : '') : 'ອະນຸມັດແລ້ວ · ລໍເຕີມເຂົ້າລົດ') + '</small></span><span class="muted">' + L(pd ? x.lit : x.ok && x.ok.lit) + '</span>' + ic('next', 'muted') + '</button>'; }).join('') + '</div>' : '') + '<button class="btn blk" disabled>' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 else if (rqSite() && !S.rows.some(function (x) { return x.rqi; })) h += '<p>ມື້ນີ້ <b>ບໍ່ມີການເຕີມ</b> — ບໍ່ຕ້ອງອະນຸມັດໃບ ແລະບໍ່ຕ້ອງເຮັດຫຍັງ. ເມື່ອມີຄຳຂໍ ແລະເຕີມແລ້ວ ຈຶ່ງອະນຸມັດໃບໄດ້.</p>';
 else h += '<p class="hint">ກວດຕົວເລກແລ້ວ ກົດອະນຸມັດ — ໃບຈະຖືກລັອກ ແລະ ຂຶ້ນລາຍງານ.</p><button id="appr" class="btn ok blk">' + ic('check') + 'ອະນຸມັດໃບປະຈຳວັນ</button>';
 $('v').innerHTML = h + '</section>';
}

/* ===== ການກະທຳທີ່ໃຊ້ຮ່ວມ: ບັນທຶກທັນທີເມື່ອປ່ຽນຄ່າ (ປ່ຽນສະເພາະສ່ວນຄິດໄລ່ ບໍ່ແຕ້ມໃໝ່ທັງໜ້າ → ບໍ່ເສຍ focus) ===== */
function vfil() { var q = ($('dq') ? $('dq').value : '').trim().toLowerCase(), f = ((document.querySelector('#vseg [aria-pressed=true]') || {}).dataset || {}).vf || ''; document.querySelectorAll('#vgrid .vcard').forEach(function (c) { c.classList.toggle('hide', (!!q && c.dataset.n.indexOf(q) < 0) || (!!f && c.dataset.vs !== f)); }); }
$('v').addEventListener('input', function (e) { /* ຄົ້ນຫາລົດ */
 var id = e.target.id; if (id === 'dq') { vfil(); return; } if (e.target.dataset && e.target.dataset.rql !== undefined) { rqSum(); return; } if (id !== 'carq' && id !== 'rqq') return; var q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#' + (id === 'carq' ? 'carlist' : 'rqlist') + ' .carrow, #rqlist .rql').forEach(function (r) { r.classList.toggle('hide', !!q && r.dataset.n.indexOf(q) < 0); });
});
$('v').addEventListener('change', function (e) {
 if (e.target.id === 'rqdate') { if (!e.target.value) return; RQKEEP = { _note: $('rqnote') ? $('rqnote').value : '' }; document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { if (i.value) RQKEEP[i.dataset.rql] = i.value; }); $('date').value = e.target.value; go('rq'); return; }
 if (e.target.id === 'df' || e.target.id === 'dt') { DASH.from = $('df').value; DASH.to = $('dt').value; dashView(); return; }
 if (e.target.dataset && e.target.dataset.f === 'src') { var sf = e.target.closest('[data-rq]').querySelector('[data-shopf]'); sf.classList.toggle('hide', e.target.value !== 'shop'); return; }
 if (e.target.id === 'carpick' && MOD === 'issue') { CARSEL = e.target.value; drawIssue(); return; }
 var ai = e.target.dataset.asgi; if (ai && MOD === 'issue') { api('assign', { site: $('site').value, v: ai, driver: e.target.value }).then(function (r) { if (!r.ok) { drawIssue(); return; } r.data.forEach(function (x) { I.cfg.vehicles.forEach(function (v) { if (v.id === x.id) v.driver = x.driver; }); S.rows.forEach(function (w) { if (w.v === x.id) w.driver = x.driver; }); }); drawIssue(); toast('ປ່ຽນຄົນຂັບແລ້ວ ✓', 'ok'); }); return; }
 var k = e.target.dataset.k, sec = e.target.closest('section'); if (!k || !sec || (MOD !== 'issue' && MOD !== 'tank')) return;
 var b = here(); b[k] = e.target.value; if (sec.dataset.v) b.v = sec.dataset.v;
 if (sec.dataset.v && editedKeys(sec.dataset.v, b).length) { toast('ແກ້ຄ່າທີ່ບັນທຶກແລ້ວ — ກົດ "ບັນທຶກ" ແລ້ວໃສ່ເຫດຜົນ', 'bad'); return; }
 api(sec.dataset.v ? 'row' : 'tank', b).then(function (r) {
  if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); if (k === 'src' && MOD === 'issue') { drawIssue(); return; }
  document.querySelectorAll('section[data-v]').forEach(function (s) { var row = S.rows.filter(function (x) { return x.v === s.dataset.v; })[0], c = s.querySelector('.calc'); if (row && c) c.innerHTML = calcHtml(row); });
  var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank);
 });
});
$('v').addEventListener('click', function (e) {
 if (e.target.closest('#xlsT')) { xlsLedger(); return; }
 var ar = e.target.closest('#addRv'); if (ar) { var al = $('rvlit').value; if (!(+al > 0)) { toast('ໃສ່ຈຳນວນລິດ', 'bad'); return; } var ab = here(); ab.add = { lit: al, from: $('rvfrom').value, note: $('rvnote').value }; ar.disabled = true; api('tank', ab).then(function (r) { ar.disabled = false; if (!r.ok) { toast('ບັນທຶກບໍ່ໄດ້ — ກວດຕົວເລກ', 'bad'); return; } S = r.data; drawTank(); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ເພີ່ມແລ້ວ — ແນບຮູບບິນຕໍ່', 'ok'); }); return; }
 var re2 = e.target.closest('[data-rvedit]'); if (re2) { var pn = $('rvf_' + re2.dataset.rvedit); if (pn) pn.hidden = !pn.hidden; return; }
 var rs2 = e.target.closest('[data-rvsave],[data-rvvoid]'); if (rs2) { var rid = rs2.dataset.rvsave || rs2.dataset.rvvoid, pn2 = $('rvf_' + rid), why = pn2.querySelector('[data-rvr]').value.trim(); if (!why) { toast('ໃສ່ເຫດຜົນຂອງການແກ້ໄຂ', 'bad'); return; } var rb = here(); rb.reason = why; if (rs2.dataset.rvvoid) { if (!confirm('ຍົກເລີກລາຍການຮັບເຂົ້ານີ້? (ບັນທຶກໃນລາຍງານການປັບປຸງ)')) return; rb.del = rid; } else rb.edit = { id: rid, lit: pn2.querySelector('[data-rvl]').value, from: pn2.querySelector('[data-rvf]').value, note: pn2.querySelector('[data-rvn]').value }; rs2.disabled = true; api('tank', rb).then(function (r) { rs2.disabled = false; if (!r.ok) return; if (rb.del) delete P[rid === 'r0' ? 'tank' : 'tank_' + rid]; S = r.data; drawTank(); toast('ບັນທຶກການແກ້ໄຂແລ້ວ ✓', 'ok'); }); return; }
 var sv = e.target.closest('#savT'); if (sv) { var b = here(); document.querySelectorAll('section[data-tank] input[data-k]').forEach(function (i) { b[i.dataset.k] = i.value; }); sv.disabled = true; api('tank', b).then(function (r) { sv.disabled = false; if (!r.ok) { toast('ບັນທຶກບໍ່ໄດ້ — ກວດຕົວເລກອີກຄັ້ງ', 'bad'); return; } S = r.data; var t = document.querySelector('section[data-tank] .calc'); if (t) t.innerHTML = tankHtml(S.tank); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ບັນທຶກແລ້ວ ✓', 'ok'); }); return; }
 var g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
 var b = e.target.closest('button'); if (!b) return;
 if (b.dataset.ph) { if (((MOD === 'issue' && canEdit()) || (MOD === 'tank' && canTank())) && !(MOD === 'tank' && /^tank/.test(b.dataset.ph) && P[b.dataset.ph] && !I.me.boss) && !(MOD === 'issue' && P[b.dataset.ph] && !isChief() && photoAcked(b.dataset.ph))) { PHK = b.dataset.ph; $('file').value = ''; var key0 = PHK; liveCam(((I && I.me && I.me.name) || '') + ' · ' + (($('site').selectedOptions[0] || {}).text || '') + ' · ' + b.dataset.t, function (d) { if (d === undefined) return; if (d === null) { toast('ເປີດກ້ອງບໍ່ໄດ້ — ອະນຸຍາດກ້ອງໃນ browser; ຖ້າເລືອກຈາກຄັງ ລະບົບຈະຕິດປ້າຍ "ຈາກຄັງ"', 'bad'); $('file').click(); return; } sendPhoto(key0, d, 'cam'); }); } else if (P[b.dataset.ph]) viewPhoto(P[b.dataset.ph]); return; }
 if (b.dataset.pickcar !== undefined) { var pv = b.dataset.pickcar; CARSEL = pv; drawIssue(); window.scrollTo(0, 0); return; }
 if (b.dataset.ahead) { $('date').value = b.dataset.ahead; go(b.dataset.to || MOD); return; }
 if (b.dataset.day !== undefined) { RQKEEP = { _note: $('rqnote') ? $('rqnote').value : '' }; document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { if (i.value) RQKEEP[i.dataset.rql] = i.value; }); $('date').value = addDays(today(), +b.dataset.day); go('rq'); return; }
 if (b.dataset.dp) { DASH.p = b.dataset.dp; if (DASH.p === 'cus' && !DASH.from) { DASH.from = addDays(today(), -6); DASH.to = today(); } dashView(); return; }
 if (b.dataset.dall) { DASH.all = !DASH.all; dashView(); return; }
 if (b.dataset.vf !== undefined) { document.querySelectorAll('#vseg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); vfil(); return; }
 if (b.dataset.subopen) { var bx = $('sub_' + b.dataset.subopen); if (bx) bx.hidden = !bx.hidden; return; }
 if (b.dataset.subsave) { var sv2 = b.dataset.subsave, val = $('subsel_' + sv2).value, sbd = here(); sbd.v = sv2; if (val === '__reset') sbd.reset = 1; else sbd.driver = val === '__park' ? '' : val; RQKEEP = { _note: $('rqnote') ? $('rqnote').value : '' }; document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { if (i.value) RQKEEP[i.dataset.rql] = i.value; }); b.disabled = true; api('subDriver', sbd).then(function (r) { b.disabled = false; if (!r.ok) { RQKEEP = null; return; } toast('ບັນທຶກຄົນຂັບແລ້ວ ✓', 'ok'); go(MOD); }); return; }
 if (b.id === 'rqsend') { var qb = here(); qb.note = $('rqnote').value; qb.lines = []; document.querySelectorAll('#rqlist [data-rql]').forEach(function (i) { if (parseFloat(i.value) > 0) qb.lines.push({ v: i.dataset.rql, lit: i.value }); }); if (!qb.lines.length) { toast('ໃສ່ຈຳນວນລິດຢ່າງໜ້ອຍ 1 ຄັນ', 'bad'); return; } b.disabled = true; api('rqNew', qb).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; drawRq(); window.scrollTo(0, 0); toast('ສົ່ງໃບຂໍແລ້ວ ✓ (' + qb.lines.length + ' ຄັນ)', 'ok'); }); return; }
 if (b.dataset.rqall) { var box = b.closest('[data-rq]'), qm = here(); qm.ids = b.dataset.rqall.split(','); qm.src = box.querySelector('[data-f=src]').value; qm.shop = box.querySelector('[data-f=shop]').value; b.disabled = true; api('rqDecideMany', qm).then(function (r) { b.disabled = false; if (!r.ok) return; var sk = r.data.skipped || 0; toast(sk ? 'ອະນຸມັດ ' + (qm.ids.length - sk) + ' ແຖວ · ຂ້າມ ' + sk + ' ແຖວ (ແທ່ງເຫຼືອບໍ່ພໍ) — ອະນຸມັດແຍກ ຫຼືປ່ຽນແຫຼ່ງ' : 'ອະນຸມັດແລ້ວ ✓ (' + qm.ids.length + ' ແຖວ)', sk ? 'bad' : 'ok'); go(MOD); }); return; }
 if (b.dataset.rqcancel) { if (!confirm('ຍົກເລີກຄຳຂໍນີ້?')) return; var qc = here(); qc.id = b.dataset.rqcancel; b.disabled = true; api('rqCancel', qc).then(function (r) { b.disabled = false; if (!r.ok) return; toast('ຍົກເລີກແລ້ວ', 'ok'); go(MOD); }); return; }
 if (b.dataset.rqapprove) { var card = b.closest('[data-rq]'), qa2 = here(); qa2.id = b.dataset.rqapprove; qa2.yes = 1; qa2.lit = card.querySelector('[data-f=lit]').value; qa2.src = card.querySelector('[data-f=src]').value; qa2.shop = card.querySelector('[data-f=shop]').value; b.disabled = true; api('rqDecide', qa2).then(function (r) { b.disabled = false; if (!r.ok) return; toast('ອະນຸມັດແລ້ວ ✓', 'ok'); go(MOD); }); return; }
 if (b.dataset.rqreject) { var qr = here(); qr.id = b.dataset.rqreject; qr.yes = 0; ask('ປະຕິເສດຄຳຂໍ', 'ບອກເຫດຜົນ (ເຊັ່ນ: ມີນ້ຳມັນໃນລົດພໍແລ້ວ)', 'ສົ່ງ').then(function (why) { if (why == null) return; qr.why = why; api('rqDecide', qr).then(function (r) { if (!r.ok) return; toast('ປະຕິເສດແລ້ວ', 'ok'); go(MOD); }); }); return; }
 if (b.dataset.rqstart) { var qs = here(); qs.id = b.dataset.rqstart; b.disabled = true; api('rqStart', qs).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); var sx = (S.reqs || []).filter(function (x) { return x.id === qs.id; })[0]; if (sx) CARSEL = sx.v; drawIssue(); window.scrollTo(0, 0); toast('ເລີ່ມເຕີມແລ້ວ — ກອກ cm ກ່ອນ / ຫຼັງເຕີມ', 'ok'); }); return; }
 if (b.id === 'rqurgent') { var uq = here(); uq.v = $('uqcar').value; uq.src = $('uqsrc').value; uq.shop = $('uqshop').value; b.disabled = true; api('rqUrgent', uq).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); CARSEL = uq.v; drawIssue(); window.scrollTo(0, 0); toast('ເລີ່ມເຕີມດ່ວນແລ້ວ', 'ok'); }); return; }
 if (b.dataset.ackyes) { var ay = here(); ay.v = b.dataset.ackyes; ay.yes = 1; b.disabled = true; api('ack', ay).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawAppr(); toast('ຮັບຮູ້ແລ້ວ ✓', 'ok'); }); return; }
 if (b.dataset.ackno) { var an = here(); an.v = b.dataset.ackno; an.yes = 0; ask('ບໍ່ຍອມຮັບ', 'ບອກວ່າບໍ່ຖືກບ່ອນໃດ (ເຊັ່ນ: ກ່ອນເຕີມບໍ່ຕົງ)', 'ສົ່ງ').then(function (why) { if (why == null) return; an.why = why; api('ack', an).then(function (r) { if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawAppr(); toast('ສົ່ງເຫດຜົນແລ້ວ', 'ok'); }); }); return; }
 if (b.dataset.savecar) { var sc = b.closest('section'), sb = here(); sb.v = b.dataset.savecar; sc.querySelectorAll('[data-k]:not(:disabled)').forEach(function (i) { sb[i.dataset.k] = i.value; });
  var send = function () { b.disabled = true; api('row', sb).then(function (r) { b.disabled = false; if (!r.ok) return; S = r.data; setBadge(pendingOf(S)); drawIssue(); toast(r.queued ? 'ບັນທຶກແລ້ວ — ຈະສົ່ງເມື່ອມີເນັດ' : 'ບັນທຶກແລ້ວ ✓', 'ok'); }); };
  var ek = editedKeys(sb.v, sb); if (ek.length) { ask('ແກ້ຄ່າທີ່ບັນທຶກແລ້ວ', 'ເຫດຜົນ ເຊັ່ນ ກອກເລກຜິດ (ຕ້ອງໃສ່) — ' + ek.map(function (k) { return HL[k] + ' ' + rowOld(sb.v, k) + ' → ' + (sb[k] === '' ? '–' : sb[k]); }).join(', '), 'ບັນທຶກການແກ້').then(function (why) { if (why == null) return; why = String(why).trim(); if (!why) { toast('ໃສ່ເຫດຜົນຂອງການແກ້ໄຂ', 'bad'); return; } sb.reason = why; send(); }); return; }
  send(); return; }
 if (b.dataset.addround) { var pc = b.closest('section').querySelector('input[data-k="cm1"]'); if (!pc || pc.value === '') { toast('ກອກ "ຫຼັງເຕີມ (cm)" ຂອງຄັ້ງນີ້ກ່ອນ ຈຶ່ງເພີ່ມຄັ້ງຕໍ່ໄປໄດ້', 'bad'); return; } var nb = b.dataset.addround, nn = S.rows.filter(function (x) { return x.base === nb; }).length + 2, ar = here(); ar.v = nb + '_r' + nn; ar.note = ''; b.disabled = true; api('row', ar).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawIssue(); } }); return; }
 if (b.dataset.delround) { var dr = here(); dr.v = b.dataset.delround; dr.del = 1; b.disabled = true; api('row', dr).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawIssue(); } }); return; }
 if (b.id === 'unappr') { if (!confirm('ຍົກເລີກການອະນຸມັດ ເພື່ອແກ້ໄຂໃບນີ້?')) return; var ua = here(); ua.yes = 0; b.disabled = true; api('approve', ua).then(function (r) { b.disabled = false; if (!r.ok) { toast('ຍົກເລີກບໍ່ໄດ້', 'bad'); return; } S = r.data; setBadge(pendingOf(S)); toast('ຍົກເລີກການອະນຸມັດແລ້ວ — ແກ້ໄຂໄດ້', 'ok'); go(MOD); }); return; }
 if (b.id === 'appr') { var a = here(); a.yes = S.approved ? 0 : 1; b.disabled = true; api('approve', a).then(function (r) { b.disabled = false; if (r.ok) { S = r.data; setBadge(pendingOf(S)); drawAppr(); toast(a.yes ? 'ອະນຸມັດແລ້ວ' : 'ຍົກເລີກການອະນຸມັດແລ້ວ', 'ok'); } }); }
});
function sendPhoto(key, d, how) { var b = here(); b.key = key; b.data = d; b.takenAt = Date.now(); b.how = how; api('photo', b).then(function (r) { if (r.ok) { P[key] = d; PM[key] = { at: Date.now(), name: (I && I.me && I.me.name) || '', taken: b.takenAt, how: how }; paintPhotos(); } }); }
$('file').onchange = function () { /* ທາງສຳຮອງ ເມື່ອກ້ອງສົດໃຊ້ບໍ່ໄດ້ — ຖືກຕິດປ້າຍ "ຈາກຄັງ" */
 var f = this.files[0], key = PHK; if (!f || !key) return;
 shrink(f).then(function (d) { sendPhoto(key, d, 'file'); }, function () { toast('ເປີດຮູບບໍ່ໄດ້', 'bad'); });
};
