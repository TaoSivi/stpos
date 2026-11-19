/* SOP ເຊັກລິດ: ພະນັກງານເຮັດເຊັກລິດທີ່ຖືກມອບ · ຜູ້ດູແລ: ກະດານຕິດຕາມ, ມອບໝາຍ (ຕາມເຊັກລິດ / ຕາມຄົນ), ແກ້ລາຍການ */
'use strict';
var S = { pend: {}, sopen: {}, tab: 'mine', admin: false, id: '', me: null, run: null, ass: null, asView: 'tpl', asUser: '', edit: null }, TABS = [['mine', 'ຂອງຂ້ອຍ', 'check'], ['board', 'ຕິດຕາມ', 'grid'], ['assign', 'ມອບໝາຍ', 'users'], ['edit', 'ແກ້', 'edit']];
var FQI = { daily: 'refresh', weekly: 'grid', monthly: 'ledger', event: 'sheet' }, FQ = { daily: ['ມື້', ''], weekly: ['ອາທິດ', 'w'], monthly: ['ເດືອນ', 'm'], event: ['ຄັ້ງ', 'e'] }, NOW_TXT = { daily: 'ມື້ນີ້', weekly: 'ອາທິດນີ້', monthly: 'ເດືອນນີ້' };
function fq(f) { var q = FQ[f] || FQ.event; return '<span class="fq ' + q[1] + '">' + q[0] + '</span>'; }
function tags(t) { return fq(t.freq) + (t.per ? ' <span class="fq v" title="' + (t.per === 'own' ? 'ຕໍ່ລົດທີ່ຂັບ' : 'ທຸກຄັນ') + '">' + ic('truck') + '</span>' : ''); }
function keyLabel(r) { return (r.freq === 'weekly' ? 'ອາທິດ ' : '') + String(r.key).split('@')[0]; }
function stChip(r) { if (!r) return '<span class="st none">\u2013</span>'; if (r.status === 'done') return '<span class="st done">' + ic('check') + (r.fails ? ' <b>' + r.fails + '</b>' : '') + (r.appr ? ic('shield') : '') + '</span>'; return '<span class="st open">' + r.answered + '/' + r.total + '</span>'; }
function ring(r) { var d = r && r.status === 'done'; return '<span class="cb' + (d ? ' ok' : r && r.answered ? ' part' : '') + '">' + (d ? ic('check') : r && r.answered ? '<b>' + r.answered + '/' + r.total + '</b>' : '') + '</span>'; }
function nn(i) { return '<span class="nb">' + (i < 9 ? '0' : '') + (i + 1) + '</span>'; }
function tile(t, r, attr, i) { return '<button class="tl f-' + t.freq + (r && r.status === 'done' ? ' done' : '') + '" ' + attr + ' style="animation-delay:' + i * 40 + 'ms">' + nn(i) + ring(r) + '<b class="cd">' + esc(t.code) + '</b><span class="tt">' + esc(String(t.title).replace(/\s*[—-]\s*ປະຈຳ.*$/, '')) + '</span><span class="tm"><span class="ti">' + ic(FQI[t.freq] || 'sheet') + '</span>' + fq(t.freq) + (t.per ? ' <span class="fq v">' + ic('truck') + '</span>' : '') + '</span></button>'; }
function wide(t, rows, i) { return '<div class="tl wide f-' + t.freq + '" style="animation-delay:' + i * 40 + 'ms"><div class="th">' + nn(i) + '<div class="grow"><b class="cd">' + esc(t.code) + '</b><span class="tt">' + esc(t.title) + '</span></div>' + tags(t) + '</div>' + rows + '</div>'; }
function hero(done, tot, sub) { var p = tot ? done / tot : 0, col = !p ? 'transparent' : p >= .8 ? '#7aa86b' : p >= .5 ? '#d9a35a' : '#d9776a'; return '<section class="hero"><div class="gg"><svg viewBox="0 0 120 66"><path d="M10 60A50 50 0 0 1 110 60" class="gb"/><path d="M10 60A50 50 0 0 1 110 60" class="gv" style="stroke:' + col + '" stroke-dasharray="' + (p * 157).toFixed(1) + ' 157"/></svg><div class="gn"><b>' + done + '</b><small>/' + tot + '</small></div></div>' + (sub ? '<span class="hs">' + sub + '</span>' : '') + '</section>'; }
function sopShort(c) { var t = sopTitle(c); return t.indexOf(' \u00b7 ') > 0 ? t.split(' \u00b7 ').slice(1).join(' \u00b7 ') : t; }
function bar(r) { var p = r && r.total ? Math.round(r.answered * 100 / r.total) : 0; return '<div class="bar" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div>'; }
function groups(list, key) { var o = {}, order = []; list.forEach(function (x) { var k = key(x); if (!o[k]) { o[k] = []; order.push(k); } o[k].push(x); }); return order.map(function (k) { return { k: k, list: o[k] }; }); }
function sopTitle(c) { return ({ 'SOP-FLD-01': 'SOP-FLD-01 · ເປີດ-ປິດໂຄງການ', 'SOP-FLD-02': 'SOP-FLD-02 · ຮັບນ້ຳມັນເຂົ້າສາງ ແລະ ໃສ່ນ້ຳມັນ', 'SOP-FLD-03': 'SOP-FLD-03 · ນຳໃຊ້ ແລະ ມ້ຽນລົດກິນຈັກ' })[c] || c; }
function y0() { return window.scrollY || 0; }
function paint(html, keep) { var y = y0(); $('v').innerHTML = html; if (keep) window.scrollTo(0, y); else window.scrollTo(0, 0); }

/* ===== ເລີ່ມຕົ້ນ ===== */
function load() { return api('sop.me').then(function (r) {
 if (!r.ok) { $('v').innerHTML = '<div class="card empty">ເຂົ້າແອັບ SOP ບໍ່ໄດ້ — ຕິດຕໍ່ຜູ້ດູແລລະບົບ</div>'; return; }
 S.me = r.data; S.admin = r.data.admin; S.id = r.data.id; var ht = location.hash.slice(1); if (S.admin && !S.tabSet && ['board', 'assign', 'edit'].indexOf(ht) >= 0) S.tab = ht; S.tabSet = 1; render();
}); }
function render() {
 $('hd').innerHTML = header('SOP', S.me ? S.me.name : ''); $('lo').onclick = logout;
 $('tabs').innerHTML = S.admin && !S.run && !S.edit ? '<div class="stabs" role="tablist">' + TABS.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '" aria-selected="' + (S.tab === t[0]) + '">' + ic(t[2]) + (S.tab === t[0] ? '<span>' + t[1] + '</span>' : '') + '</button>'; }).join('') + '</div>' : '';
 if (S.run) return runView();
 if (S.edit) return editView();
 if (S.tab === 'board') return boardView(); if (S.tab === 'assign') return assignView(); if (S.tab === 'edit') return editList();
 mineView();
}

/* ===== ຂອງຂ້ອຍ ===== */
function mineView() {
 var m = S.me.mine; if (!m.length) return paint('<div class="card empty"><div class="logo" style="background:#eaf0f0;color:var(--muted)">' + ic('sheet') + '</div>ຍັງບໍ່ມີເຊັກລິດ' + (S.admin ? '<br><small class="muted">' + ic('users') + '</small>' : '') + '</div>');
 var slots = []; m.forEach(function (x) { if (x.veh) x.veh.forEach(function (v) { slots.push(v.run); }); else if (x.tpl.freq !== 'event') slots.push(x.run); });
 var done = slots.filter(function (r) { return r && r.status === 'done'; }).length, h = slots.length ? hero(done, slots.length, '') : '', n = 0;
 groups(m, function (x) { return x.tpl.sop; }).forEach(function (g) {
  h += '<div class="sgrp">' + esc(sopShort(g.k)) + '</div><div class="tg">';
  g.list.forEach(function (x) {
   var t = x.tpl, r = x.run, i = n++;
   if (x.veh) h += wide(t, x.veh.length ? x.veh.map(function (v) { return '<button class="sr" data-open="' + esc(t.id) + '" data-veh="' + esc(v.id) + '"><span class="grow">' + ic('truck') + ' ' + esc(v.name) + '</span>' + stChip(v.run) + '</button>'; }).join('') : '<p class="muted sm" style="margin:8px 0 0">' + ic('alert') + ' ' + ic('truck') + '</p>', i);
   else if (t.freq === 'event') h += wide(t, x.runs.map(function (q) { return '<button class="sr" data-run="' + esc(q.id) + '"><span class="grow">' + esc(q.label || q.key) + '</span>' + stChip(q) + '</button>'; }).join('') + '<button class="btn blk" style="margin-top:8px" data-new="' + esc(t.id) + '" aria-label="ເລີ່ມໃໝ່">' + ic('plus') + '</button>', i);
   else h += tile(t, r, 'data-open="' + esc(t.id) + '"', i);
  });
  h += '</div>';
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
 h += '<div class="row noprint" style="gap:8px;margin:0 0 10px"><button type="button" class="btn line" data-xlsrun="1">' + ic('xls') + ' Excel</button><button type="button" class="btn line" data-pdfrun="1">' + ic('pdf') + ' PDF</button></div>';
 if (r.warn) h += '<details class="warnbox"><summary><b>ຂໍ້ຄວນລະວັງ</b> — ກົດເພື່ອອ່ານ</summary><p style="margin:8px 0 0">' + esc(r.warn) + '</p></details>';
 if (r.status === 'done') h += '<div class="card" style="background:#eafaf4;padding:14px 16px"><b>ສຳເລັດ ເມື່ອ ' + when(r.doneAt) + '</b>' + (r.appr ? '<br><small>' + ic('shield') + ' ' + esc(r.appr.name) + ' · ' + when(r.appr.at) + '</small>' : '<br><small class="muted">' + ic('lock') + '</small>') + (S.admin ? '<div class="row" style="margin-top:10px;gap:10px"><button class="btn" data-appr="' + (r.appr ? 0 : 1) + '">' + (r.appr ? ic('x') : ic('shield') + 'ຮັບຮອງ') + '</button><button class="btn line" data-reopen="1" aria-label="ແກ້">' + ic('edit') + '</button></div>' : '') + '</div>';
 secs.forEach(function (sc, k) {
  var done = sc.items.filter(function (i) { return isAns(r, i); }).length, key = r.id + '#' + k, open = key in S.sopen ? S.sopen[key] : (!multi || k === firstOpen), left = sc.items.length - done;
  var rows = sc.items.map(function (i) {
   var a = r.a[i.id] || {}, v = a.v, cls = i.gate ? 'gate' : v === 1 ? 'y' : v === 0 ? 'n' : '', meta = (i.by || i.co || i.doc);
   return '<div class="ir ' + cls + '" data-it="' + esc(i.id) + '"><div class="irm"><span class="cd">' + esc(i.code) + '</span><span class="tx">' + esc(i.text) + '</span></div>' +
    (edit ? '<div class="irb"><button class="y" data-v="1" aria-pressed="' + (v === 1) + '" aria-label="ຜ່ານ">✓</button><button class="n" data-v="0" aria-pressed="' + (v === 0) + '" aria-label="ບໍ່ຜ່ານ">✕</button></div>' : '<div class="irb">' + (v === 1 ? '<span class="st done">✓</span>' : v === 0 ? '<span class="st bad">✕</span>' : '<span class="st none">–</span>') + '</div>') +
    (meta ? '<details class="inf"><summary>' + ic('dots') + '</summary><div class="mt">' + (i.by ? '<span>ຜູ້ຮັບຜິດຊອບ: ' + esc(i.by) + '</span>' : '') + (i.co ? '<span>ກວດ/ປະສານ: ' + esc(i.co) + '</span>' : '') + (i.doc ? '<span>ຫຼັກຖານ: ' + esc(i.doc) + '</span>' : '') + '</div></details>' : '') +
    (edit && (v === 0 || a.note) ? '<textarea rows="2" data-note="' + esc(i.id) + '" placeholder="' + (v === 0 ? 'ຂຽນເຫດຜົນທີ່ບໍ່ຜ່ານ (ຈຳເປັນ)' : 'ໝາຍເຫດ') + '">' + esc(a.note || '') + '</textarea>' : (!edit && a.note ? '<p class="muted sm" style="margin:6px 0 0">ໝາຍເຫດ: ' + esc(a.note) + '</p>' : '')) + '</div>';
  }).join('');
  if (!multi) h += '<div class="irs">' + rows + '</div>';
  else h += '<details class="sec" data-sk="' + esc(key) + '"' + (open ? ' open' : '') + '><summary><span class="grow">' + esc(sc.t) + '</span><span class="cnt' + (left ? '' : ' ok') + '">' + done + '/' + sc.items.length + '</span>' + (edit && left ? '<button class="allp" data-allpass="' + k + '" aria-label="ຜ່ານທັງໝົດ">✓✓</button>' : '') + '</summary><div class="irs">' + rows + '</div></details>';
 });
 if (edit) { h += '<div class="sendbar"><div class="row" style="gap:10px"><button class="btn line" id="nxt" aria-label="ຂໍ້ຕໍ່ໄປ" aria-label="ຂໍ້ຕໍ່ໄປ"' + (ans === n ? ' disabled' : '') + '>ຂໍ້ຕໍ່ໄປ ' + ic('next') + '</button><button class="btn ok grow" id="send"' + (ans < n || miss ? ' disabled' : '') + '>' + ic('check') + 'ສົ່ງ</button></div><p class="muted sm" style="text-align:center;margin:6px 0 0">' + (ans < n ? 'ເຫຼືອ ' + (n - ans) : miss ? ic('alert') + ' ' + miss : ic('check')) + '</p></div>'; }
 paint(h, true);
}
/* ===== Export ລາຍງານເຊັກລິດ: Excel (ຕໍ່ໃບ + ສະຫຼຸບກະດານ) ແລະ PDF (ພິມ A4) ===== */
function stTxt(r) { return !r ? 'ຍັງບໍ່ເລີ່ມ' : r.status === 'done' ? 'ສຳເລັດ' + (r.fails ? ' · ບໍ່ຜ່ານ ' + r.fails : '') + (r.appr ? ' · ຮັບຮອງແລ້ວ' : '') : 'ກຳລັງເຮັດ ' + r.answered + '/' + r.total; }
function runMeta(r) { return [['ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'], ['ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'], ['ລາຍງານເຊັກລິດ SOP'], [r.code + ' · ' + r.title], ['ໝວດ: ' + r.sop + (r.label ? ' · ' + r.label : '') + (r.freq !== 'event' ? ' · ' + keyLabel(r) : '')], ['ຜູ້ເຮັດ: ' + r.name + ' · ສະຖານະ: ' + (r.status === 'done' ? 'ສຳເລັດ' : 'ກຳລັງເຮັດ') + (r.doneAt ? ' · ເມື່ອ ' + when(r.doneAt) : '') + (r.appr ? ' · ຮັບຮອງໂດຍ ' + r.appr.name + ' ' + when(r.appr.at) : '')]]; }
function runRows(r) { return r.items.map(function (i) { var a = r.a[i.id] || {}; return [i.code, i.text, a.v === 1 ? 'ຜ່ານ' : a.v === 0 ? 'ບໍ່ຜ່ານ' : '–', a.note || '', i.by || '', i.co || '', i.doc || '']; }); }
function runFile() { var r = S.run; return 'SOP ' + r.code + ' ' + (r.label || String(r.key).split('@')[0]).replace(/[\\/:*?"<>|]/g, '-'); }
function xlsRun() { var r = S.run, m = runMeta(r), rows = m.concat([[], ['ລະຫັດ', 'ຂໍ້ກຳນົດ', 'ຜົນ', 'ໝາຍເຫດ / ເຫດຜົນ', 'ຜູ້ຮັບຜິດຊອບ', 'ກວດ / ປະສານ', 'ຫຼັກຖານ']], runRows(r)); rows.push([], ['', 'ຜູ້ເຮັດ', '', '', 'ຜູ້ຮັບຮອງ']); exportXlsx(runFile(), rows, [10, 60, 10, 34, 20, 20, 20], [0, 1, 2, 3, 4, 5].map(function (k) { return { s: { r: k, c: 0 }, e: { r: k, c: 6 } }; })); }
function pdfRun() {
 var r = S.run, m = runMeta(r), rs = runRows(r), el = document.getElementById('sopaper');
 if (!el) { el = document.createElement('div'); el.id = 'sopaper'; document.body.appendChild(el); }
 el.innerHTML = '<div class="sp-h"><b>' + esc(m[0][0]) + '</b><span>' + esc(m[1][0]) + '</span></div><h2>' + esc(m[2][0]) + '</h2><p><b>' + esc(m[3][0]) + '</b></p><p>' + esc(m[4][0]) + '</p><p>' + esc(m[5][0]) + '</p><table><thead><tr><th>ລະຫັດ</th><th>ຂໍ້ກຳນົດ</th><th>ຜົນ</th><th>ໝາຍເຫດ</th><th>ຜູ້ຮັບຜິດຊອບ</th></tr></thead><tbody>' + rs.map(function (x) { return '<tr class="' + (x[2] === 'ບໍ່ຜ່ານ' ? 'n' : '') + '"><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td><td class="c">' + esc(x[2]) + '</td><td>' + esc(x[3]) + '</td><td>' + esc(x[4]) + '</td></tr>'; }).join('') + '</tbody></table><div class="sp-s"><span>ຜູ້ເຮັດ</span><span>ຜູ້ຮັບຮອງ</span></div>';
 document.body.classList.add('printing-sop'); var done = function () { document.body.classList.remove('printing-sop'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); exportPdf('p');
}
function xlsBoard() { var d = S.board; if (!d) return; var rows = [['ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ'], ['ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ'], ['ລາຍງານສະຫຼຸບເຊັກລິດ SOP · ມື້ ' + d.day], [], ['ມື້ນີ້ (ຕາມຄົນທີ່ມອບໝາຍ)'], ['ໃບ', 'ຊື່ໃບ', 'ຜູ້ເຮັດ', 'ລົດ', 'ສະຖານະ']]; d.rows.forEach(function (x) { rows.push([x.tpl.code, x.tpl.title, x.name, x.veh || '', x.noveh ? 'ຍັງບໍ່ມີລົດ' : stTxt(x.run)]); }); rows.push([], ['ປະຫວັດລ່າສຸດ'], ['ໃບ', 'ກຳກັບ / ວັນທີ', 'ຜູ້ເຮັດ', 'ສຳເລັດເມື່ອ', 'ສະຖານະ']); d.recent.forEach(function (q) { rows.push([q.tpl, q.label || String(q.key).split('@')[0], q.name, q.doneAt ? when(q.doneAt) : '', stTxt(q)]); }); exportXlsx('SOP ສະຫຼຸບ ' + d.day, rows, [14, 44, 24, 22, 28], [0, 1, 2].map(function (k) { return { s: { r: k, c: 0 }, e: { r: k, c: 4 } }; })); }
function nextOpen() { var r = S.run, k = 0, found = null; sectionize(r.items).forEach(function (sc, idx) { sc.items.forEach(function (i) { if (!found && !isAns(r, i)) { found = i; k = idx; } }); }); if (!found) return; var d = document.querySelector('[data-sk="' + r.id + '#' + k + '"]'); if (d) { d.open = true; S.sopen[r.id + '#' + k] = true; } var el = document.querySelector('[data-it="' + found.id + '"]'); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('pulse'); setTimeout(function () { el.classList.remove('pulse'); }, 1400); } }
function mark(item, v, note) { return api('sop.mark', { id: S.run.id, item: item, v: v, note: note }).then(function (r) { if (r.ok) { S.run = r.data; runView(); } return r; }); }

/* ===== ກະດານຕິດຕາມ (ຜູ້ດູແລ) ===== */
function boardView() {
 api('sop.board').then(function (r) {
  if (!r.ok || S.tab !== 'board' || S.run) return; var d = S.board = r.data, rows = d.rows, per = rows.filter(function (x) { return x.tpl.freq !== 'event'; }), done = per.filter(function (x) { return x.run && x.run.status === 'done'; }).length;
  var h = hero(done, per.length, esc(d.day));
  h += '<div class="row noprint" style="margin:10px 0 0"><button type="button" class="btn line" data-xlsboard="1">' + ic('xls') + ' Excel</button></div>';
  if (!rows.length) h += '<div class="card empty">' + ic('users') + '</div>';
  groups(rows, function (x) { return x.tpl.id; }).forEach(function (g) {
   var t = g.list[0].tpl; h += '<div class="sgrp">' + esc(t.code) + ' · ' + esc(t.title) + ' ' + tags(t) + '</div><div class="card" style="padding:6px 16px">' +
    g.list.map(function (x) { return '<div class="brow"' + (x.run ? ' data-run="' + esc(x.run.id) + '" style="cursor:pointer"' : '') + '><div class="grow"><b>' + esc(x.name) + '</b>' + (x.veh ? '<small class="muted" style="display:block">' + ic('truck') + ' ' + esc(x.veh) + '</small>' : '') + '</div>' + (x.noveh ? '<span class="st bad">' + ic('truck') + '</span>' : stChip(x.run)) + '</div>'; }).join('') + '</div>';
  });
  h += '<div class="sgrp">' + ic('ledger') + ' ປະຫວັດ</div>' + (d.recent.length ? '<div class="card" style="padding:6px 16px">' + d.recent.slice(0, 40).map(function (q) { return '<div class="brow" data-run="' + esc(q.id) + '" style="cursor:pointer"><div class="grow"><b>' + esc(q.name) + '</b><small class="muted" style="display:block">' + esc(q.tpl) + ' · ' + esc(q.label || q.key.split('@')[0]) + '</small></div>' + stChip(q) + '</div>'; }).join('') + '</div>' : '<p class="muted">ຍັງບໍ່ມີ</p>');
  paint(h);
 });
}

/* ===== ມອບໝາຍ (ຜູ້ດູແລ) ===== */
function assignView() {
 var go = function () {
  var A = S.ass, tp = A.tpls, as = A.assign, ppl = A.people;
  var h = '<div class="seg" role="tablist"><button role="tab" data-asv="tpl" aria-selected="' + (S.asView === 'tpl') + '">' + ic('sheet') + ' ຕາມໃບ</button><button role="tab" data-asv="user" aria-selected="' + (S.asView === 'user') + '">' + ic('user') + ' ຕາມຄົນ</button></div>';
  if (S.asView === 'tpl') h += groups(tp, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div>' + g.list.map(function (t) {
   var on = as.filter(function (a) { return a.tpl === t.id; }).map(function (a) { return a.user; });
   return '<details class="card acc" style="padding:6px 16px"><summary><span>' + esc(t.code) + ' · ' + esc(t.title) + ' ' + tags(t) + '</span><span class="cnt" data-cnt="' + esc(t.id) + '">' + on.length + ' ຄົນ</span></summary>' + ppl.map(function (p) { return '<label class="pk"><input type="checkbox" data-at="' + esc(t.id) + '" value="' + esc(p.phone) + '"' + (on.indexOf(p.phone) >= 0 ? ' checked' : '') + '><span class="grow">' + esc(p.name) + '<small class="muted" style="display:block">' + esc(p.phone) + (p.level !== 'user' ? ' · ' + (p.level === 'superadmin' ? 'Super admin' : 'Admin') : '') + '</small></span></label>'; }).join('') + '</details>'; }).join(''); }).join('');
  else {
   if (!S.asUser && ppl.length) S.asUser = ppl[0].phone; var mine = as.filter(function (a) { return a.user === S.asUser; }).map(function (a) { return a.tpl; });
   h += '<label class="field">' + ic('user') + '<select id="asu">' + ppl.map(function (p) { return '<option value="' + esc(p.phone) + '"' + (p.phone === S.asUser ? ' selected' : '') + '>' + esc(p.name) + ' · ' + esc(p.phone) + '</option>'; }).join('') + '</select></label>' +
    groups(tp, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div><div class="card" style="padding:6px 16px">' + g.list.map(function (t) { return '<label class="pk"><input type="checkbox" data-bt="' + esc(t.id) + '"' + (mine.indexOf(t.id) >= 0 ? ' checked' : '') + '><span class="grow">' + esc(t.code) + ' · ' + esc(t.title) + '</span>' + tags(t) + '</label>'; }).join('') + '</div>'; }).join('');
  }
  h += '<div class="sendbar" id="asbar"' + (Object.keys(S.pend).length ? '' : ' hidden') + '><button type="button" class="btn ok blk" id="asave">' + ic('check') + ' ບັນທຶກ</button></div>';
  paint(h, true);
 };
 if (S.ass) return go(); api('sop.tpls').then(function (r) { if (r.ok) { S.ass = r.data; go(); } });
}
function showSave() { var bar = document.getElementById('asbar'); if (bar) bar.hidden = !Object.keys(S.pend).length; }
function saveAssign(body, cb) { api('sop.assignSet', body).then(function (r) { if (r.ok) { S.ass.assign = r.data; toast('ບັນທຶກແລ້ວ ✓', 'ok'); if (cb) cb(); } else { S.ass = null; assignView(); } }); }

/* ===== ແກ້ລາຍການ (ຜູ້ດູແລ) ===== */
function editList() {
 var go = function () { var h = groups(S.ass.tpls, function (t) { return t.sop; }).map(function (g) { return '<div class="sgrp">' + esc(sopTitle(g.k)) + '</div>' + g.list.map(function (t) { return '<button class="cl" data-edit="' + esc(t.id) + '"><div class="t"><div><b>' + esc(t.code) + ' · ' + esc(t.title) + '</b><small>' + t.items.length + ' ຂໍ້' + (t.edited ? ' · ແກ້ແລ້ວ' : '') + '</small></div>' + tags(t) + '</div></button>'; }).join(''); }).join(''); paint(h); };
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
 if (d.xlsrun) return xlsRun();
 if (d.pdfrun) return pdfRun();
 if (d.xlsboard) return xlsBoard();
 if (b.id === 'nxt') { nextOpen(); return; }
 if (b.id === 'send') { b.disabled = true; return api('sop.submit', { id: S.run.id }).then(function (r) { if (r.ok) { S.run = r.data; toast('ສົ່ງເຊັກລິດແລ້ວ ✓', 'ok'); runView(); } else b.disabled = false; }); }
 if (d.appr !== undefined) return api('sop.approve', { id: S.run.id, yes: d.appr === '1' }).then(function (r) { if (r.ok) { S.run = r.data; runView(); toast(d.appr === '1' ? 'ຮັບຮອງແລ້ວ' : 'ຍົກເລີກການຮັບຮອງແລ້ວ', 'ok'); } });
 if (d.reopen) return api('sop.reopen', { id: S.run.id }).then(function (r) { if (r.ok) { S.run = r.data; runView(); } });
 if (d.asv) { if (Object.keys(S.pend).length && !confirm('ຍັງບໍ່ໄດ້ບັນທຶກ — ຖິ້ມການປ່ຽນ?')) return; S.pend = {}; S.asView = d.asv; S.ass = null; assignView(); return; }
 if (b.id === 'asave') { var keys = Object.keys(S.pend); b.disabled = true; return keys.reduce(function (p, k) { return p.then(function (ok) { if (!ok) return false; return api('sop.assignSet', S.pend[k]).then(function (r) { if (r.ok) { S.ass.assign = r.data; return true; } return false; }); }); }, Promise.resolve(true)).then(function (ok) { b.disabled = false; if (ok) { S.pend = {}; showSave(); } else { S.ass = null; S.pend = {}; assignView(); } }); }
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
 if (t.dataset.at) { var us = [].map.call(document.querySelectorAll('input[data-at="' + t.dataset.at + '"]:checked'), function (x) { return x.value; }); S.pend['t:' + t.dataset.at] = { tpl: t.dataset.at, users: us }; var c = document.querySelector('[data-cnt="' + t.dataset.at + '"]'); if (c) c.textContent = us.length + ' ຄົນ'; return showSave(); }
 if (t.dataset.bt) { var ts = [].map.call(document.querySelectorAll('input[data-bt]:checked'), function (x) { return x.dataset.bt; }); S.pend['u:' + S.asUser] = { user: S.asUser, tpls: ts }; return showSave(); }
 if (t.id === 'asu') { if (Object.keys(S.pend).length && !confirm('ຍັງບໍ່ໄດ້ບັນທຶກ — ຖິ້ມການປ່ຽນ?')) { t.value = S.asUser; return; } S.pend = {}; S.asUser = t.value; assignView(); }
});
function confirmBox(msg) { return new Promise(function (res) { var m = modal('<p style="font-size:16px">' + esc(msg) + '</p><div class="row" style="gap:10px"><button class="btn grow" id="cy">ຢືນຢັນ</button><button class="btn line" id="cn">ຍົກເລີກ</button></div>'); m.querySelector('#cy').onclick = function () { m.remove(); res(true); }; m.querySelector('#cn').onclick = function () { m.remove(); res(false); }; }); }
load();

window.notifTodo = function () { var m = S.me && S.me.mine || [], n = 0; m.forEach(function (x) { if (x.veh) x.veh.forEach(function (v) { if (!v.run || v.run.status !== 'done') n++; }); else if (x.tpl.freq !== 'event' && (!x.run || x.run.status !== 'done')) n++; }); return n ? [{ t: n + ' ເຊັກລິດຍັງບໍ່ສຳເລັດ', i: 'sheet', go: function () { S.tab = 'mine'; S.run = null; S.edit = null; render(); } }] : []; };
window.pageBack = function () { if (S.run) { S.run = null; load(); return true; } if (S.edit) { S.edit = null; render(); return true; } if (S.admin && S.tab !== 'mine') { S.tab = 'mine'; load(); return true; } return false; };

window.menuItems = function () { return S.admin ? [{ g: 'SOP', items: TABS.map(function (t) { return { t: t[1], ic: 'sheet', cur: S.tab === t[0], act: function () { S.tab = t[0]; S.run = null; S.edit = null; if (t[0] === 'mine') load(); else render(); } }; }) }] : []; };
