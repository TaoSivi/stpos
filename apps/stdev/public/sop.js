/* SOP ເຊັກລິດ: ພະນັກງານເຮັດເຊັກລິດທີ່ຖືກມອບ · ຜູ້ດູແລ: ກະດານຕິດຕາມ, ມອບໝາຍ (ຕາມເຊັກລິດ / ຕາມຄົນ), ແກ້ລາຍການ */
'use strict';
var S = { sopen: {}, tab: 'mine', admin: false, id: '', me: null, run: null, ass: null, asView: 'tpl', asUser: '', edit: null }, TABS = [['mine', 'ຂອງຂ້ອຍ'], ['board', 'ກະດານຕິດຕາມ'], ['assign', 'ມອບໝາຍ'], ['edit', 'ແກ້ລາຍການ']];
var FQ = { daily: ['ທຸກມື້', ''], weekly: ['ທຸກອາທິດ', 'w'], monthly: ['ທຸກເດືອນ', 'm'], event: ['ເປັນຄັ້ງ', 'e'] }, NOW_TXT = { daily: 'ມື້ນີ້', weekly: 'ອາທິດນີ້', monthly: 'ເດືອນນີ້' };
function fq(f) { var q = FQ[f] || FQ.event; return '<span class="fq ' + q[1] + '">' + q[0] + '</span>'; }
function tags(t) { return fq(t.freq) + (t.per ? ' <span class="fq v">' + (t.per === 'own' ? 'ຕໍ່ລົດທີ່ຂັບ' : 'ທຸກຄັນ') + '</span>' : ''); }
function keyLabel(r) { return (r.freq === 'weekly' ? 'ອາທິດ ' : '') + String(r.key).split('@')[0]; }
function stChip(r) { if (!r) return '<span class="st none">ຍັງບໍ່ເລີ່ມ</span>'; if (r.status === 'done') return '<span class="st done">ສຳເລັດ' + (r.fails ? ' · ບໍ່ຜ່ານ ' + r.fails : '') + (r.appr ? ' · ຮັບຮອງແລ້ວ' : '') + '</span>'; return '<span class="st open">ກຳລັງເຮັດ ' + r.answered + '/' + r.total + '</span>'; }
function bar(r) { var p = r && r.total ? Math.round(r.answered * 100 / r.total) : 0; return '<div class="bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div>'; }
function groups(list, key) { var o = {}, order = []; list.forEach(function (x) { var k = key(x); if (!o[k]) { o[k] = []; order.push(k); } o[k].push(x); }); return order.map(function (k) { return { k: k, list: o[k] }; }); }
function sopTitle(c) { return ({ 'SOP-FLD-01': 'SOP-FLD-01 · ເປີດ-ປິດໂຄງການ', 'SOP-FLD-02': 'SOP-FLD-02 · ຮັບນ້ຳມັນເຂົ້າສາງ ແລະ ໃສ່ນ້ຳມັນ', 'SOP-FLD-03': 'SOP-FLD-03 · ນຳໃຊ້ ແລະ ມ້ຽນລົດກິນຈັກ' })[c] || c; }
function y0() { return window.scrollY || 0; }
function paint(html, keep) { var y = y0(); $('v').innerHTML = html; if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0); }

/* ===== ເລີ່ມຕົ້ນ ===== */
function load() { return api('sop.me').then(function (r) {
 if (!r.ok) { $('v').innerHTML = '<div class="card empty">ເຂົ້າແອັບ SOP ບໍ່ໄດ້ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ</div>'; return; }
 S.me = r.data; S.admin = r.data.admin; S.id = r.data.id; render();
}); }
function render() {
 $('hd').innerHTML = header('SOP ເຊັກລິດ', S.me ? S.me.name : ''); $('lo').onclick = logout;
 $('tabs').innerHTML = S.admin && !S.run && !S.edit ? '<div class="stabs" role="tablist">' + TABS.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' : '';
 if (S.run) return runView();
 if (S.edit) return editView();
 if (S.tab === 'board') return boardView(); if (S.tab === 'assign') return assignView(); if (S.tab === 'edit') return editList();
 mineView();
}

/* ===== ຂອງຂ້ອຍ ===== */
function mineView() {
 var m = S.me.mine; if (!m.length) return paint('<div class="card empty"><div class="logo" style="background:#eaf0f0;color:var(--muted)">' + ic('sheet') + '</div>ຍັງບໍ່ມີເຊັກລິດທີ່ມອບໝາຍໃຫ້ເຈົ້າ' + (S.admin ? '<br><small class="muted">ໄປແຖບ "ມອບໝາຍ" ເພື່ອກຳນົດວ່າໃຜເຮັດເຊັກລິດໃດ</small>' : '<br><small class="muted">ຖາມຜູ້ດູແລລະບົບ</small>') + '</div>');
 var slots = []; m.forEach(function (x) { if (x.veh) x.veh.forEach(function (v) { slots.push(v.run); }); else if (x.tpl.freq !== 'event') slots.push(x.run); });
 var done = slots.filter(function (r) { return r && r.status === 'done'; }).length;
 var h = slots.length ? '<section class="card dark" style="margin-bottom:18px"><small style="opacity:.75">ວຽກປະຈຳຂອງເຈົ້າ (ມື້ / ອາທິດ / ເດືອນນີ້)</small><div style="font-size:26px;font-weight:700">' + done + ' / ' + slots.length + ' ສຳເລັດ</div></section>' : '';
 groups(m, function (x) { return x.tpl.sop; }).forEach(function (g) {
  h += '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div>';
  g.list.forEach(function (x, i) {
   var t = x.tpl, r = x.run, dl = 'animation-delay:' + i * 50 + 'ms';
   if (x.veh) { /* ໃບຕໍ່ລົດ: ແຕ່ລະຄັນມີໃບຂອງຕົນ */
    h += '<div class="cl" style="' + dl + '"><div class="t"><div><b>' + esc(t.code) + ' · ' + esc(t.title) + '</b><small>' + t.n + ' ຂໍ້ຕໍ່ລົດ · ' + NOW_TXT[t.freq] + '</small></div>' + tags(t) + '</div>' +
     (x.veh.length ? x.veh.map(function (v) { return '<button class="btn line blk" style="margin-top:10px;justify-content:space-between;text-align:left" data-open="' + esc(t.id) + '" data-veh="' + esc(v.id) + '"><span>' + ic('truck') + ' ' + esc(v.name) + '</span>' + stChip(v.run) + '</button>'; }).join('') : '<p class="muted sm" style="margin:10px 0 0">ຍັງບໍ່ມີລົດທີ່ມອບໃຫ້ເຈົ້າ — ໃຫ້ຜູ້ດູແລມອບລົດໃນແອັບ "ຕິດຕາມນ້ຳມັນ" ກ່ອນ</p>') + '</div>';
   } else if (t.freq === 'event') {
    h += '<div class="cl" style="' + dl + '"><div class="t"><div><b>' + esc(t.code) + ' · ' + esc(t.title) + '</b><small>' + t.n + ' ຂໍ້</small></div>' + tags(t) + '</div>' +
     x.runs.map(function (q) { return '<button class="btn line blk" style="margin-top:10px;justify-content:space-between" data-run="' + esc(q.id) + '"><span>' + esc(q.label || q.key) + '</span>' + stChip(q) + '</button>'; }).join('') +
     '<button class="btn blk" style="margin-top:10px" data-new="' + esc(t.id) + '">' + ic('plus') + 'ເລີ່ມເຊັກລິດໃໝ່</button></div>';
   } else h += '<button class="cl' + (r && r.status === 'done' ? ' done' : '') + '" data-open="' + esc(t.id) + '" style="' + dl + '"><div class="t"><div><b>' + esc(t.code) + ' · ' + esc(t.title) + '</b><small>' + t.n + ' ຂໍ້ · ' + NOW_TXT[t.freq] + '</small></div>' + tags(t) + '</div><div class="row" style="justify-content:space-between;margin-top:10px">' + stChip(r) + ic('next', 'muted') + '</div>' + bar(r) + '</button>';
  });
 });
 paint(h);
}

/* ===== ໃບເຊັກ (ເຮັດ / ເບິ່ງ) — ແຖວກະທັດຮັດ, ແບ່ງເປັນໝວດພັບໄດ້ ເມື່ອມີຫຼາຍຂໍ້ ===== */
function sectionize(items) {
 var has = items.some(function (x) { return x.sec; }); if (has) return groups(items, function (x) { return x.sec || 'ອື່ນໆ'; }).map(function (g) { return { t: g.k, items: g.list }; });
 if (items.length <= 8) return [{ t: '', items: items }];
 var out = []; for (var k = 0; k < items.length; k += 6) out.push({ t: 'ຂໍ້ ' + (k + 1) + '–' + Math.min(k + 6, items.length), items: items.slice(k, k + 6) }); return out;
}
function isAns(r, i) { var a = r.a[i.id]; return a && (a.v === 1 || a.v === 0); }
function runView() {
 var r = S.run, mine = r.user === S.id, edit = r.status === 'open' && mine, n = r.items.length, ans = 0, bad = 0, miss = 0;
 r.items.forEach(function (i) { var a = r.a[i.id]; if (isAns(r, i)) { ans++; if (a.v === 0) { bad++; if (!a.note) miss++; } } });
 var secs = sectionize(r.items), multi = secs.length > 1, firstOpen = -1; secs.forEach(function (sc, k) { if (firstOpen < 0 && sc.items.some(function (i) { return !isAns(r, i); })) firstOpen = k; });
 var h = '<div class="runhd"><div class="row" style="gap:10px"><button class="btn line sm" data-back="1" aria-label="ກັບຄືນ" style="min-height:40px;padding:0 12px">' + ic('back') + '</button><div class="grow" style="min-width:0"><b style="font-size:16px;display:block">' + esc(r.code) + ' · ' + esc(r.title) + '</b><small class="muted" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.sop) + (r.label ? ' · ' + esc(r.label) : '') + (r.freq !== 'event' ? ' · ' + esc(keyLabel(r)) : '') + (mine ? '' : ' · ຜູ້ເຮັດ: ' + esc(r.name)) + '</small></div>' + stChip({ status: r.status, answered: ans, total: n, fails: bad, appr: r.appr }) + '</div>' + bar({ answered: ans, total: n }) + '</div>';
 if (r.warn) h += '<details class="warnbox"><summary><b>ຂໍ້ຄວນລະວັງ</b> — ກົດເພື່ອອ່ານ</summary><p style="margin:8px 0 0">' + esc(r.warn) + '</p></details>';
 if (r.status === 'done') h += '<div class="card" style="background:#eafaf4;padding:14px 16px"><b>ສຳເລັດ ເມື່ອ ' + when(r.doneAt) + '</b>' + (r.appr ? '<br><small>ຮັບຮອງໂດຍ ' + esc(r.appr.name) + ' · ' + when(r.appr.at) + '</small>' : '<br><small class="muted">ລໍຖ້າຜູ້ດູແລຮັບຮອງ</small>') + (S.admin ? '<div class="row" style="margin-top:10px;gap:10px"><button class="btn" data-appr="' + (r.appr ? 0 : 1) + '">' + (r.appr ? 'ຍົກເລີກການຮັບຮອງ' : 'ຮັບຮອງ') + '</button><button class="btn line" data-reopen="1">ເປີດແກ້ຄືນ</button></div>' : '') + '</div>';
 secs.forEach(function (sc, k) {
  var done = sc.items.filter(function (i) { return isAns(r, i); }).length, key = r.id + '#' + k, open = key in S.sopen ? S.sopen[key] : (!multi || k === firstOpen), left = sc.items.length - done;
  var rows = sc.items.map(function (i) {
   var a = r.a[i.id] || {}, v = a.v, cls = i.gate ? 'gate' : v === 1 ? 'y' : v === 0 ? 'n' : '', meta = (i.by || i.co || i.doc);
   return '<div class="ir ' + cls + '" data-it="' + esc(i.id) + '"><div class="irm"><span class="cd">' + esc(i.code) + '</span><span class="tx">' + esc(i.text) + '</span></div>' +
    (edit ? '<div class="irb"><button class="y" data-v="1" aria-pressed="' + (v === 1) + '" aria-label="ຜ່ານ">✓</button><button class="n" data-v="0" aria-pressed="' + (v === 0) + '" aria-label="ບໍ່ຜ່ານ">✕</button></div>' : '<div class="irb">' + (v === 1 ? '<span class="st done">✓</span>' : v === 0 ? '<span class="st bad">✕</span>' : '<span class="st none">–</span>') + '</div>') +
    (meta ? '<details class="inf"><summary>ລາຍລະອຽດ</summary><div class="mt">' + (i.by ? '<span>ຜູ້ຮັບຜິດຊອບ: ' + esc(i.by) + '</span>' : '') + (i.co ? '<span>ກວດ/ປະສານ: ' + esc(i.co) + '</span>' : '') + (i.doc ? '<span>ຫຼັກຖານ: ' + esc(i.doc) + '</span>' : '') + '</div></details>' : '') +
    (edit && (v === 0 || a.note) ? '<textarea rows="2" data-note="' + esc(i.id) + '" placeholder="' + (v === 0 ? 'ຂຽນເຫດຜົນທີ່ບໍ່ຜ່ານ (ຈຳເປັນ)' : 'ໝາຍເຫດ') + '">' + esc(a.note || '') + '</textarea>' : (!edit && a.note ? '<p class="muted sm" style="margin:6px 0 0">ໝາຍເຫດ: ' + esc(a.note) + '</p>' : '')) + '</div>';
  }).join('');
  if (!multi) h += '<div class="irs">' + rows + '</div>';
  else h += '<details class="sec" data-sk="' + esc(key) + '"' + (open ? ' open' : '') + '><summary><span class="grow">' + esc(sc.t) + '</span><span class="cnt' + (left ? '' : ' ok') + '">' + done + '/' + sc.items.length + '</span>' + (edit && left ? '<button class="allp" data-allpass="' + k + '">✓ ຜ່ານທັງໝົດ</button>' : '') + '</summary><div class="irs">' + rows + '</div></details>';
 });
 if (edit) { h += '<div class="sendbar"><div class="row" style="gap:10px"><button class="btn line" id="nxt"' + (ans === n ? ' disabled' : '') + '>ຂໍ້ຕໍ່ໄປ ' + ic('next') + '</button><button class="btn ok grow" id="send"' + (ans < n || miss ? ' disabled' : '') + '>' + ic('check') + 'ສົ່ງເຊັກລິດ</button></div><p class="muted sm" style="text-align:center;margin:6px 0 0">' + (ans < n ? 'ຍັງເຫຼືອ ' + (n - ans) + ' ຂໍ້' : miss ? 'ຂໍ້ທີ່ "ບໍ່ຜ່ານ" ຕ້ອງຂຽນເຫດຜົນ ' + miss + ' ຂໍ້' : 'ຕອບຄົບແລ້ວ — ກົດສົ່ງໄດ້') + '</p></div>'; }
 paint(h, true);
}
function nextOpen() { var r = S.run, k = 0, found = null; sectionize(r.items).forEach(function (sc, idx) { sc.items.forEach(function (i) { if (!found && !isAns(r, i)) { found = i; k = idx; } }); }); if (!found) return; var d = document.querySelector('[data-sk="' + r.id + '#' + k + '"]'); if (d) { d.open = true; S.sopen[r.id + '#' + k] = true; } var el = document.querySelector('[data-it="' + found.id + '"]'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('pulse'); setTimeout(function () { el.classList.remove('pulse'); }, 1400); } }
function mark(item, v, note) { return api('sop.mark', { id: S.run.id, item: item, v: v, note: note }).then(function (r) { if (r.ok) { S.run = r.data; runView(); } return r; }); }

/* ===== ກະດານຕິດຕາມ (ຜູ້ດູແລ) ===== */
function boardView() {
 api('sop.board').then(function (r) {
  if (!r.ok || S.tab !== 'board' || S.run) return; var d = r.data, rows = d.rows, per = rows.filter(function (x) { return x.tpl.freq !== 'event'; }), done = per.filter(function (x) { return x.run && x.run.status === 'done'; }).length;
  var h = '<section class="card dark"><small style="opacity:.75">ວຽກປະຈຳ ມື້ນີ້ ' + esc(d.day) + '</small><div style="font-size:26px;font-weight:700">' + done + ' / ' + per.length + ' ສຳເລັດ</div></section>';
  if (!rows.length) h += '<div class="card empty">ຍັງບໍ່ໄດ້ມອບໝາຍເຊັກລິດໃຫ້ໃຜ — ໄປແຖບ "ມອບໝາຍ"</div>';
  groups(rows, function (x) { return x.tpl.id; }).forEach(function (g) {
   var t = g.list[0].tpl; h += '<div class="sgrp">' + esc(t.code) + ' · ' + esc(t.title) + ' ' + tags(t) + '</div><div class="card" style="padding:6px 16px">' +
    g.list.map(function (x) { return '<div class="brow"' + (x.run ? ' data-run="' + esc(x.run.id) + '" style="cursor:pointer"' : '') + '><div class="grow"><b>' + esc(x.name) + '</b>' + (x.veh ? '<small class="muted" style="display:block">' + ic('truck') + ' ' + esc(x.veh) + '</small>' : '') + '</div>' + (x.noveh ? '<span class="st bad">ຍັງບໍ່ມີລົດ</span>' : stChip(x.run)) + '</div>'; }).join('') + '</div>';
  });
  h += '<div class="sgrp">ປະຫວັດລ່າສຸດ</div>' + (d.recent.length ? '<div class="card" style="padding:6px 16px">' + d.recent.slice(0, 40).map(function (q) { return '<div class="brow" data-run="' + esc(q.id) + '" style="cursor:pointer"><div class="grow"><b>' + esc(q.name) + '</b><small class="muted" style="display:block">' + esc(q.tpl) + ' · ' + esc(q.label || q.key.split('@')[0]) + '</small></div>' + stChip(q) + '</div>'; }).join('') + '</div>' : '<p class="muted">ຍັງບໍ່ມີ</p>');
  paint(h);
 });
}

/* ===== ມອບໝາຍ (ຜູ້ດູແລ) ===== */
function assignView() {
 var go = function () {
  var A = S.ass, tp = A.tpls, as = A.assign, ppl = A.people;
  var h = '<p class="muted" style="margin:0 4px 12px">ກຳນົດວ່າພະນັກງານຄົນໃດຕ້ອງເຮັດເຊັກລິດໃດ. ຄົນທີ່ຖືກເລືອກຈະເຫັນເຊັກລິດນັ້ນໃນແອັບ SOP ຂອງຕົນເອງ (ລະບົບເປີດແອັບ SOP ໃຫ້ອັດຕະໂນມັດ). ໃບທີ່ຕິດປ້າຍ <b>ຕໍ່ລົດ</b> ຈະແຍກເປັນໃບຕໍ່ຄັນ ໂດຍລົດມາຈາກໜ້າ "ມອບລົດໃຫ້ຄົນຂັບ" ໃນແອັບຕິດຕາມນ້ຳມັນ (ບໍ່ຕ້ອງມອບຊ້ຳ).</p>' +
   '<div class="seg" role="tablist"><button role="tab" data-asv="tpl" aria-selected="' + (S.asView === 'tpl') + '">ຕາມເຊັກລິດ</button><button role="tab" data-asv="user" aria-selected="' + (S.asView === 'user') + '">ຕາມພະນັກງານ</button></div>';
  if (S.asView === 'tpl') h += groups(tp, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div>' + g.list.map(function (t) {
   var on = as.filter(function (a) { return a.tpl === t.id; }).map(function (a) { return a.user; });
   return '<details class="card acc" style="padding:6px 16px"><summary><span>' + esc(t.code) + ' · ' + esc(t.title) + ' ' + tags(t) + '</span><span class="cnt" data-cnt="' + esc(t.id) + '">' + on.length + ' ຄົນ</span></summary>' + ppl.map(function (p) { return '<label class="pk"><input type="checkbox" data-at="' + esc(t.id) + '" value="' + esc(p.phone) + '"' + (on.indexOf(p.phone) >= 0 ? ' checked' : '') + '><span class="grow">' + esc(p.name) + '<small class="muted" style="display:block">' + esc(p.phone) + (p.level !== 'user' ? ' · ' + (p.level === 'superadmin' ? 'Super admin' : 'Admin') : '') + '</small></span></label>'; }).join('') + '</details>'; }).join(''); }).join('');
  else {
   if (!S.asUser && ppl.length) S.asUser = ppl[0].phone; var mine = as.filter(function (a) { return a.user === S.asUser; }).map(function (a) { return a.tpl; });
   h += '<label class="field">ເລືອກພະນັກງານ<select id="asu">' + ppl.map(function (p) { return '<option value="' + esc(p.phone) + '"' + (p.phone === S.asUser ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(p.phone) + '</option>'; }).join('') + '</select></label>' +
    groups(tp, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div><div class="card" style="padding:6px 16px">' + g.list.map(function (t) { return '<label class="pk"><input type="checkbox" data-bt="' + esc(t.id) + '"' + (mine.indexOf(t.id) >= 0 ? ' checked' : '') + '><span class="grow">' + esc(t.code) + ' · ' + esc(t.title) + '</span>' + tags(t) + '</label>'; }).join('') + '</div>'; }).join('');
  }
  paint(h, true);
 };
 if (S.ass) return go(); api('sop.tpls').then(function (r) { if (r.ok) { S.ass = r.data; go(); } });
}
function saveAssign(body, cb) { api('sop.assignSet', body).then(function (r) { if (r.ok) { S.ass.assign = r.data; toast('ບັນທຶກແລ້ວ ✓', 'ok'); if (cb) cb(); } else { S.ass = null; assignView(); } }); }

/* ===== ແກ້ລາຍການ (ຜູ້ດູແລ) ===== */
function editList() {
 var go = function () { var h = '<p class="muted" style="margin:0 4px 12px">ຂໍ້ຄວາມຖືກຖອດຈາກ PDF ສະແກນ — ກວດ ແລະ ແກ້ຄຳຜິດໄດ້ທີ່ນີ້. ໃບທີ່ເຮັດແລ້ວຈະບໍ່ປ່ຽນ (ເກັບສຳເນົາໄວ້ໃນໃບນັ້ນ).</p>' + groups(S.ass.tpls, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div>' + g.list.map(function (t) { return '<button class="cl" data-edit="' + esc(t.id) + '"><div class="t"><div><b>' + esc(t.code) + ' · ' + esc(t.title) + '</b><small>' + t.items.length + ' ຂໍ້' + (t.edited ? ' · ແກ້ແລ້ວ' : '') + '</small></div>' + tags(t) + '</div></button>'; }).join(''); }).join(''); paint(h); };
 if (S.ass) return go(); api('sop.tpls').then(function (r) { if (r.ok) { S.ass = r.data; go(); } });
}
function readEd() { var e = S.edit; if (!e || !$('ed-title')) return; e.title = $('ed-title').value; e.items.forEach(function (i, n) { var g = function (k) { var x = document.querySelector('[data-ek="' + k + '"][data-en="' + n + '"]'); return x ? (x.type === 'checkbox' ? x.checked : x.value) : ''; }; i.code = g('code'); i.text = g('text'); i.by = g('by'); i.co = g('co'); i.doc = g('doc'); i.gate = g('gate') === true; }); }
function editView() {
 var e = S.edit, h = '<div class="runhd"><button class="btn line" data-eback="1">' + ic('back') + 'ກັບຄືນ</button><div style="margin-top:10px"><b style="font-size:18px">ແກ້ລາຍການ · ' + esc(e.code) + '</b><small class="muted" style="display:block">' + esc(e.sop) + '</small></div></div><div class="ed">' +
  '<label class="field">ຊື່ເຊັກລິດ<input id="ed-title" type="text" value="' + esc(e.title) + '"></label>' + e.items.map(function (i, n) {
   return '<div class="row2"><div class="row" style="gap:8px"><input type="text" data-ek="code" data-en="' + n + '" value="' + esc(i.code) + '" style="width:92px;margin:0" aria-label="ລະຫັດ"><label class="row" style="gap:6px;margin-left:auto"><input type="checkbox" data-ek="gate" data-en="' + n + '"' + (i.gate ? ' checked' : '') + ' style="width:20px;height:20px">ດ່ານອະນຸມັດ</label><button class="btn bad" data-del="' + n + '" aria-label="ລຶບຂໍ້ນີ້" style="min-height:40px;padding:0 12px">' + ic('trash') + '</button></div>' +
    '<textarea rows="3" data-ek="text" data-en="' + n + '" aria-label="ຂໍ້ຄວາມ">' + esc(i.text) + '</textarea><details><summary>ຜູ້ຮັບຜິດຊອບ / ກວດ / ຫຼັກຖານ</summary><input type="text" data-ek="by" data-en="' + n + '" value="' + esc(i.by) + '" placeholder="ຜູ້ຮັບຜິດຊອບ"><input type="text" data-ek="co" data-en="' + n + '" value="' + esc(i.co) + '" placeholder="ກວດ / ປະສານ"><input type="text" data-ek="doc" data-en="' + n + '" value="' + esc(i.doc) + '" placeholder="ຫຼັກຖານ (ເອກະສານ)"></details></div>';
  }).join('') + '<button class="btn line blk" data-add="1">' + ic('plus') + 'ເພີ່ມຂໍ້</button></div><div class="sendbar"><div class="row" style="gap:10px"><button class="btn ok grow" id="edsave">' + ic('check') + 'ບັນທຶກ</button>' + (e.edited ? '<button class="btn bad" id="edreset">ຄືນຄ່າເດີມ</button>' : '') + '</div></div>';
 paint(h, true);
}

/* ===== ຕົວຈັດການຄລິກ / ປ່ຽນ ===== */
document.addEventListener('click', function (ev) {
 var b = ev.target.closest('button,[data-run]'); if (!b || !$('v').contains(b) && !$('tabs').contains(b)) return; var d = b.dataset;
 if (d.tab) { S.tab = d.tab; S.run = null; S.edit = null; if (d.tab === 'mine') load(); else render(); return; }
 if (d.open) return api('sop.open', { tpl: d.open, veh: d.veh }).then(function (r) { if (r.ok) { S.run = r.data; render(); } });
 if (d.run) return api('sop.open', { id: d.run }).then(function (r) { if (r.ok) { S.run = r.data; render(); } });
 if (d['new']) return ask('ເລີ່ມເຊັກລິດໃໝ່', 'ຊື່ກຳກັບ (ເຊັ່ນ ຊື່ໂຄງການ ຫຼື ເລກໃບສົ່ງນ້ຳມັນ)', 'ເລີ່ມ').then(function (t) { if (!t) return; api('sop.new', { tpl: d['new'], label: t }).then(function (r) { if (r.ok) { S.run = r.data; render(); } }); });
 if (d.back) { S.run = null; load(); return; }
 if (d.v !== undefined) { var it = b.closest('[data-it]'), id = it.dataset.it, cur = (S.run.a[id] || {}).v, v = +d.v, ta = it.querySelector('textarea'); return mark(id, cur === v ? null : v, ta ? ta.value : (S.run.a[id] || {}).note); }
 if (d.allpass !== undefined) { ev.preventDefault(); var sc = sectionize(S.run.items)[+d.allpass]; return api('sop.markMany', { id: S.run.id, items: sc.items.map(function (x) { return x.id; }) }).then(function (r) { if (r.ok) { S.run = r.data; S.sopen[S.run.id + '#' + d.allpass] = false; runView(); } }); }
 if (b.id === 'nxt') { nextOpen(); return; }
 if (b.id === 'send') { b.disabled = true; return api('sop.submit', { id: S.run.id }).then(function (r) { if (r.ok) { S.run = r.data; toast('ສົ່ງເຊັກລິດແລ້ວ ✓', 'ok'); runView(); } else b.disabled = false; }); }
 if (d.appr !== undefined) return api('sop.approve', { id: S.run.id, yes: d.appr === '1' }).then(function (r) { if (r.ok) { S.run = r.data; runView(); toast(d.appr === '1' ? 'ຮັບຮອງແລ້ວ' : 'ຍົກເລີກການຮັບຮອງແລ້ວ', 'ok'); } });
 if (d.reopen) return api('sop.reopen', { id: S.run.id }).then(function (r) { if (r.ok) { S.run = r.data; runView(); } });
 if (d.asv) { S.asView = d.asv; assignView(); return; }
 if (d.edit) { var t = S.ass.tpls.filter(function (x) { return x.id === d.edit; })[0]; S.edit = JSON.parse(JSON.stringify(t)); render(); return; }
 if (d.eback) { S.edit = null; render(); return; }
 if (d.add) { readEd(); S.edit.items.push({ id: '', code: '', text: '', by: '', co: '', doc: '', gate: false }); editView(); return; }
 if (d.del !== undefined) { readEd(); S.edit.items.splice(+d.del, 1); editView(); return; }
 if (b.id === 'edsave') { readEd(); b.disabled = true; return api('sop.tplSave', { id: S.edit.id, title: S.edit.title, items: S.edit.items }).then(function (r) { b.disabled = false; if (r.ok) { S.ass = null; S.edit = null; toast('ບັນທຶກລາຍການແລ້ວ ✓', 'ok'); S.tab = 'edit'; render(); } }); }
 if (b.id === 'edreset') return confirmBox('ຄືນເປັນຂໍ້ຄວາມເດີມທີ່ຖອດຈາກ SOP?').then(function (y) { if (y) api('sop.tplReset', { id: S.edit.id }).then(function (r) { if (r.ok) { S.ass = null; S.edit = null; S.tab = 'edit'; render(); toast('ຄືນຄ່າເດີມແລ້ວ', 'ok'); } }); });
});
document.addEventListener('toggle', function (ev) { var t = ev.target; if (t.dataset && t.dataset.sk) S.sopen[t.dataset.sk] = t.open; }, true);
document.addEventListener('change', function (ev) {
 var t = ev.target; if (t.dataset.note) return mark(t.dataset.note, (S.run.a[t.dataset.note] || {}).v == null ? null : S.run.a[t.dataset.note].v, t.value);
 if (t.dataset.at) { var us = [].map.call(document.querySelectorAll('input[data-at="' + t.dataset.at + '"]:checked'), function (x) { return x.value; }); return saveAssign({ tpl: t.dataset.at, users: us }, function () { var c = document.querySelector('[data-cnt="' + t.dataset.at + '"]'); if (c) c.textContent = us.length + ' ຄົນ'; }); }
 if (t.dataset.bt) { var ts = [].map.call(document.querySelectorAll('input[data-bt]:checked'), function (x) { return x.dataset.bt; }); return saveAssign({ user: S.asUser, tpls: ts }); }
 if (t.id === 'asu') { S.asUser = t.value; assignView(); }
});
function confirmBox(msg) { return new Promise(function (res) { var m = modal('<p style="font-size:16px">' + esc(msg) + '</p><div class="row" style="gap:10px"><button class="btn grow" id="cy">ຢືນຢັນ</button><button class="btn line" id="cn">ຍົກເລີກ</button></div>'); m.querySelector('#cy').onclick = function () { m.remove(); res(true); }; m.querySelector('#cn').onclick = function () { m.remove(); res(false); }; }); }
load();
