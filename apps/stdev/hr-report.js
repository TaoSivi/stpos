/* ລາຍງານ HR ສົ່ງອອກ Excel — ແຖວຕໍ່ພະນັກງານຕໍ່ວັນ (ແບບຕົວຢ່າງ "Time for Jun.xlsx") + ແຜ່ນ "ສະຫຼຸບ" ຕໍ່ຄົນ.
 * ອ່ານຂໍ້ມູນ HR ທີ່ມີຢູ່ (employees, shifts, scans, leaves, ots, overrides, branches, settings) ບໍ່ແກ້ຫຍັງໃນ HR.
 * ກົດທີ່ໃຊ້ຄືກັບແອັບ HR: ມາຊ້າເມື່ອເກີນ graceMinutes · ມື້ພັກ = overrides ຫຼື dayOff (ຄ່າເລີ່ມຕົ້ນ ອາທິດ) · ວັນພັກບໍລິສັດ = settings.holidays ·
 * ກະຂ້າມຄືນ: scan ທີ່ຕາມຫຼັງ "ເຂົ້າ" ພາຍໃນ 18 ຊົ່ວໂມງ ນັບເປັນມື້ເຂົ້າວຽກດຽວກັນ · ເວລາທ້ອງຖິ່ນ = UTC+7.
 * shortcut: OT ໃສ່ໃນຖັນຕົວຄູນ settings.otRate (ໃກ້ສຸດໃນ 1/1.5/2/2.5/3/3.5) ແລະ ບໍ່ຄິດເປັນເງິນ (ບໍ່ເປີດເຜີຍເງິນເດືອນ). */
'use strict';
const X = require('./xlsx');

const OFF = 7 * 36e5, DAY = 864e5;
const LAO_DAYS = ['ອາທິດ', 'ຈັນ', 'ອັງຄານ', 'ພຸດ', 'ພະຫັດ', 'ສຸກ', 'ເສົາ'];
const LEAVE_ORDER = ['personal', 'annual', 'sick', 'special', 'unpaid', 'comp'];
const LEAVE_NAME = { personal: 'ລາກິດ', annual: 'ລາພັກປະຈຳປີ', sick: 'ລາປ່ວຍ', special: 'ລາພັກພິເສດ', unpaid: 'ລາບໍ່ຮັບເງິນເດືອນ', comp: 'ພັກຊົດເຊີຍ' };
const OT_MULT = [1, 1.5, 2, 2.5, 3, 3.5];
const DEFAULT_SHIFTS = [{ id: 'morning', name: 'ກະເຊົ້າ', start: '06:00', end: '14:00', breakStart: '10:00', breakEnd: '10:30' }, { id: 'evening', name: 'ກະແລງ', start: '14:00', end: '22:00', breakStart: '18:00', breakEnd: '18:30' }, { id: 'flex', name: 'ຢືດຢຸ່ນ (ອອຟຟິດ)', start: '08:00', end: '17:00', breakStart: '12:00', breakEnd: '13:00', flexible: true, dailyHours: 8 }];
const ST = { ok: 'ປົກກະຕິ', late: 'ມາຊ້າ', early: 'ອອກກ່ອນ', none: 'ບໍ່ລົງເວລາ', absent: 'ຂາດງານ', leave: 'ລາ', part: 'ລາບໍ່ເຕັມວັນ', off: 'ວັນຢຸດ', workedOff: 'ເຮັດວຽກວັນຢຸດ' };

const p2 = function (n) { return ('0' + n).slice(-2); };
const loc = function (iso) { return new Date(Date.parse(iso) + OFF); };                       /* ເວລາທ້ອງຖິ່ນ — ອ່ານດ້ວຍ getUTC* */
const ymd = function (d) { return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); };
const hm = function (d) { return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
const toMin = function (s) { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
const dmy = function (s) { return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); };
const serial = function (msLocal) { return msLocal / DAY + 25569; };                       /* ms (ເວລາທ້ອງຖິ່ນ ເປັນ UTC) → ເລກວັນ Excel */
const dstr = function (min) { const a = Math.abs(Math.round(min)); return (min < 0 ? '-' : '') + p2(Math.floor(a / 60)) + ':' + p2(a % 60); }; /* ±HH:MM */
const dateMs = function (s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
const addDays = function (s, n) { return ymd(new Date(dateMs(s) + n * DAY)); };
const eachDay = function (a, b) { const o = []; for (let d = a; d <= b; d = addDays(d, 1)) o.push(d); return o; };

/* ຮອບເດືອນ 26 → 25 ຄືຕົວຢ່າງ: ຮອບທີ່ຈົບແລ້ວຫຼ້າສຸດ ແລະ ຮອບປັດຈຸບັນ */
function cycles(todayStr) {
  const y = +todayStr.slice(0, 4), m = +todayStr.slice(5, 7), d = +todayStr.slice(8, 10);
  const at = function (yy, mm, dd) { const t = new Date(Date.UTC(yy, mm - 1, dd)); return ymd(t); };
  const curStart = d >= 26 ? at(y, m, 26) : at(y, m - 1, 26), curEnd = d >= 26 ? at(y, m + 1, 25) : at(y, m, 25);
  return { current: { from: curStart, to: curEnd }, previous: { from: at(+curStart.slice(0, 4), +curStart.slice(5, 7) - 1, 26), to: addDays(curStart, -1) } };
}

/* ກຸ່ມ scan ເປັນ "ມື້ເຂົ້າວຽກ": ເຂົ້າ → ເລີ່ມ session; ຕົວຕໍ່ມາ (ຈົນ out) ຢູ່ໃນ session ນັ້ນ ຖ້າຫ່າງຈາກເວລາເຂົ້າບໍ່ເກີນ 18 ຊົ່ວໂມງ */
function sessions(scans) {
  const list = scans.filter(function (s) { return s.status !== 'rejected' && s.deviceTime; }).sort(function (a, b) { return a.deviceTime < b.deviceTime ? -1 : 1; }), out = {}; let cur = null;
  list.forEach(function (s) {
    const t = loc(s.deviceTime), day = ymd(t);
    if (s.kind === 'in') { cur = { day: day, t0: t.getTime(), scans: [s], closed: false }; (out[day] = out[day] || []).push(cur); return; }
    if (cur && !cur.closed && t.getTime() - cur.t0 <= 18 * 36e5) { cur.scans.push(s); if (s.kind === 'out') cur.closed = true; return; }
    const one = { day: day, scans: [s], closed: s.kind === 'out' }; (out[day] = out[day] || []).push(one);
  });
  return out;
}

function shiftMins(sh) { /* ນາທີເຮັດວຽກຕາມກະ (ລົບເວລາພັກ) */
  if (!sh) return 0; if (sh.flexible) return Math.round((sh.dailyHours || 8) * 60);
  const a = toMin(sh.start), b = toMin(sh.end); if (a == null || b == null) return 0; let n = b - a; if (n <= 0) n += 1440;
  const bs = toMin(sh.breakStart), be = toMin(sh.breakEnd); if (bs != null && be != null && be > bs) n -= be - bs; return n;
}

/* ຄິດ 1 ວັນຂອງ 1 ຄົນ → ອອບເຈັກ (ໃຊ້ທັງແຜ່ນລາຍວັນ ແລະ ສະຫຼຸບ) */
function computeDay(ctx, emp, date) {
  const R = { date: date, status: [], hasIn: false };
  const ov = ctx.overrides[emp.id + '|' + date], dow = new Date(dateMs(date)).getUTCDay();
  const shiftId = ov ? (ov.shiftId === 'off' ? null : ov.shiftId) : ((emp.dayOff || [0]).indexOf(dow) >= 0 ? null : emp.shiftId);
  const sh = shiftId ? (ctx.shifts[shiftId] || null) : null, holiday = ctx.holidays.has(date);
  const leaves = (ctx.leaves[emp.id] || []).filter(function (l) { return l.status === 'approved' && l.from <= date && l.to >= date; });
  const fullLeave = leaves.filter(function (l) { return !l.part; }), partLeave = leaves.filter(function (l) { return l.part; });
  const ses = (ctx.sess[emp.id] || {})[date] || [], scans = [].concat.apply([], ses.map(function (s) { return s.scans; })).sort(function (a, b) { return a.deviceTime < b.deviceTime ? -1 : 1; });
  const inS = scans.filter(function (s) { return s.kind === 'in'; })[0], outS = scans.filter(function (s) { return s.kind === 'out'; }).slice(-1)[0];
  const bS = scans.filter(function (s) { return s.kind === 'breakStart'; })[0], bE = scans.filter(function (s) { return s.kind === 'breakEnd'; }).slice(-1)[0];
  const working = !!sh && !holiday, past = date < ctx.today, sched = shiftMins(sh), flex = !!(sh && sh.flexible);
  Object.assign(R, { shift: sh, inS: inS, outS: outS, bS: bS, bE: bE, sched: working ? sched : 0, working: working, holiday: holiday, fullLeave: fullLeave, partLeave: partLeave, scans: scans.length });
  R.hasIn = !!(inS || outS);
  /* ເວລາຕາມກະ (ms ທ້ອງຖິ່ນ) */
  let sIn = null, sOut = null;
  if (sh && toMin(sh.start) != null) { sIn = dateMs(date) + toMin(sh.start) * 60000; sOut = dateMs(date) + (toMin(sh.end) <= toMin(sh.start) ? toMin(sh.end) + 1440 : toMin(sh.end)) * 60000; }
  R.sIn = sIn; R.sOut = sOut;
  const inMs = inS ? loc(inS.deviceTime).getTime() : null, outMs = outS ? loc(outS.deviceTime).getTime() : null;
  R.inMs = inMs; R.outMs = outMs;
  R.lateMin = 0; R.earlyMin = 0; R.late = false; R.early = false;
  if (working && !flex && inMs != null && sIn != null) { const d = Math.round((inMs - sIn) / 60000); if (d > (ctx.grace || 0)) { R.lateMin = d; R.late = true; } }
  if (working && !flex && outMs != null && sOut != null) { const d = Math.round((sOut - outMs) / 60000); if (d > 0) { R.earlyMin = d; R.early = true; } }
  R.actual = inMs != null && outMs != null ? Math.round((outMs - inMs) / 60000) : null;
  R.breakMin = bS && bE ? Math.max(0, Math.round((Date.parse(bE.deviceTime) - Date.parse(bS.deviceTime)) / 60000)) : 0;
  /* ການລາ ໃນມື້ນີ້ (ຊົ່ວໂມງທີ່ລາ) */
  const lh = function (l) { return l.part === 'hours' ? (l.hours || 0) * 60 : sched / 2; };
  R.leaveMinPaid = 0; R.leaveMinUnpaid = 0;
  if (working || fullLeave.length) {
    fullLeave.forEach(function (l) { if (l.type === 'unpaid') R.leaveMinUnpaid = sched; else R.leaveMinPaid = sched; });
    if (!fullLeave.length) partLeave.forEach(function (l) { if (l.type === 'unpaid') R.leaveMinUnpaid += lh(l); else R.leaveMinPaid += lh(l); });
  }
  /* ສະຖານະ */
  const full = fullLeave.length > 0;
  R.absent = working && !full && past && (inMs == null || outMs == null);
  R.stIn = ''; R.stOut = '';
  if (full) { R.stIn = R.stOut = ST.leave; R.status = [ST.leave]; }
  else if (partLeave.length && working) { R.stIn = R.stOut = ST.part; R.status = R.absent ? [ST.absent, ST.part] : [R.late ? ST.late : (R.early ? ST.early : ST.ok), ST.part].filter(function (x, i, a) { return a.indexOf(x) === i; }); if (R.late && R.early) R.status = [ST.late, ST.early, ST.part]; }
  else if (!working) { R.stIn = R.stOut = R.hasIn ? ST.workedOff : ST.off; R.status = [R.hasIn ? ST.workedOff : ST.off]; }
  else {
    R.stIn = inMs != null ? (R.late ? ST.late : ST.ok) : (past ? ST.none : '');
    R.stOut = outMs != null ? (R.early ? ST.early : ST.ok) : (past ? ST.none : '');
    R.status = R.absent ? [ST.absent] : (past || (inMs != null && outMs != null)) ? (R.late || R.early ? [R.late ? ST.late : null, R.early ? ST.early : null].filter(Boolean) : [ST.ok]) : [];
  }
  /* ຊົ່ວໂມງສຳລັບຄິດເງິນເດືອນ */
  R.deduct = R.lateMin + R.earlyMin; R.absentMin = 0; R.normalMin = 0;
  if (working && !full) {
    const rest = Math.max(0, sched - R.leaveMinPaid - R.leaveMinUnpaid);
    if (R.absent) R.absentMin = rest;
    else if (inMs != null && outMs != null) R.normalMin = Math.max(0, rest - R.deduct);
  }
  if (!working || full) R.deduct = full ? 0 : R.deduct;
  /* OT ທີ່ອະນຸມັດ */
  R.otMin = (ctx.ots[emp.id + '|' + date] || 0);
  return R;
}

function buildContext(snap, opts) {
  const shifts = {}; (snap.shifts && snap.shifts.length ? snap.shifts : DEFAULT_SHIFTS).forEach(function (s) { shifts[s.id] = s; });
  const branches = {}; (snap.branches || []).forEach(function (b) { branches[b.id] = b; });
  const ov = {}; (snap.overrides || []).forEach(function (o) { if (o.employeeId && o.date) ov[o.employeeId + '|' + o.date] = o; });
  const leaves = {}; (snap.leaves || []).forEach(function (l) { (leaves[l.employeeId] = leaves[l.employeeId] || []).push(l); });
  const ots = {}; (snap.ots || []).filter(function (o) { return o.status === 'approved'; }).forEach(function (o) { const k = o.employeeId + '|' + o.date; ots[k] = (ots[k] || 0) + (+o.minutes || 0); });
  const byEmp = {}; (snap.scans || []).forEach(function (s) { (byEmp[s.employeeId] = byEmp[s.employeeId] || []).push(s); });
  const sess = {}; Object.keys(byEmp).forEach(function (k) { sess[k] = sessions(byEmp[k]); });
  const st = snap.settings || {}, hol = new Set((st.holidays || []).map(function (h) { return typeof h === 'string' ? h : h && h.date; }).filter(Boolean));
  return { shifts: shifts, branches: branches, overrides: ov, leaves: leaves, ots: ots, sess: sess, holidays: hol, grace: st.graceMinutes == null ? 5 : +st.graceMinutes, otRate: +st.otRate || 1.5, today: opts.today };
}

function selectEmployees(snap, opts) {
  return (snap.employees || []).filter(function (e) {
    if (opts.branchId && e.homeBranchId !== opts.branchId) return false;
    if (opts.dept && e.dept !== opts.dept) return false;
    if (e.startDate && e.startDate > opts.to) return false; if (e.endDate && e.endDate < opts.from) return false; return true;
  }).sort(function (a, b) { return String(a.code || '').localeCompare(String(b.code || ''), 'en', { numeric: true }); });
}

function info(snap, todayStr) {
  const depts = {}; (snap.employees || []).forEach(function (e) { if (e.dept) depts[e.dept] = 1; });
  return { branches: (snap.branches || []).map(function (b) { return { id: b.id, name: b.name }; }), depts: Object.keys(depts).sort(), cycles: cycles(todayStr), employees: (snap.employees || []).length };
}

function build(snap, o) { /* o = {from, to, branchId?, dept?, today?} → {buffer, name, days, employees} */
  const today = o.today || ymd(new Date(Date.now() + OFF)), ctx = buildContext(snap, { today: today }), emps = selectEmployees(snap, o), days = eachDay(o.from, o.to);
  if (days.length > 93) throw Object.assign(new Error('range'), { code: 'range' });
  const wb = X.workbook(), S = {};
  const base = { border: 1, v: 'center' };
  const sty = function (k, extra) { return wb.style(Object.assign({}, base, extra)); };
  S.hInfo = sty('h', { bold: true, fill: 'FF0F4C4A', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hIn = sty('h', { bold: true, fill: 'FF1F5FA8', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hOut = sty('h', { bold: true, fill: 'FF2E7D5B', color: 'FFFFFFFF', h: 'center', wrap: true });
  S.hBrk = sty('h', { bold: true, fill: 'FF7A6A1F', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hLeave = sty('h', { bold: true, fill: 'FF8A4B9C', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hOT = sty('h', { bold: true, fill: 'FFB7561F', color: 'FFFFFFFF', h: 'center', wrap: true });
  S.hAct = sty('h', { bold: true, fill: 'FF2F6F73', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hPay = sty('h', { bold: true, fill: 'FF5B4B8A', color: 'FFFFFFFF', h: 'center', wrap: true }); S.hAll = sty('h', { bold: true, fill: 'FF444444', color: 'FFFFFFFF', h: 'center', wrap: true });
  S.title = wb.style({ bold: true, size: 14 });
  S.txt = sty('t', {}); S.ctr = sty('c', { h: 'center' }); S.date = sty('d', { h: 'center', fmt: 'dd/mm/yyyy' }); S.tm = sty('tm', { h: 'center', fmt: 'hh:mm' }); S.dur = sty('du', { h: 'center', fmt: '[h]:mm' }); S.num = sty('n', { h: 'center', fmt: '0.0' }); S.int = sty('i', { h: 'center', fmt: '0' });
  const stFill = { 'ມາຊ້າ': 'FFFFF1C2', 'ອອກກ່ອນ': 'FFFFE3B3', 'ບໍ່ລົງເວລາ': 'FFFAD4CF', 'ຂາດງານ': 'FFF6B8B0', 'ລາ': 'FFD6E6FA', 'ລາບໍ່ເຕັມວັນ': 'FFE3EDFA', 'ວັນຢຸດ': 'FFE9ECEC', 'ເຮັດວຽກວັນຢຸດ': 'FFE7DDF5', 'ປົກກະຕິ': 'FFE8F6EE' };
  const stSty = {}; const stat = function (t) { if (!t) return S.ctr; return stSty[t] || (stSty[t] = sty('s', { h: 'center', wrap: true, fill: stFill[t.split(', ')[0]] || null })); };
  const statAll = function (arr) { const t = arr.join(', '), f = arr.indexOf(ST.absent) >= 0 ? ST.absent : arr.indexOf(ST.late) >= 0 ? ST.late : arr.indexOf(ST.early) >= 0 ? ST.early : arr[0]; return stSty['A' + t] || (stSty['A' + t] = sty('s', { h: 'center', wrap: true, fill: stFill[f] || null, bold: true })); };

  /* ===== ແຜ່ນ 1: ລາຍວັນ ===== */
  const ws = wb.sheet('ລາຍວັນ');
  ws.set(1, 1, 'ລາຍລະອຽດການເຂົ້າວຽກ ຂໍ້ມູນຕັ້ງແຕ່ ' + dmy(o.from) + ' - ' + dmy(o.to) + (o.branchId && snap.branches ? ' · ' + ((snap.branches.filter(function (b) { return b.id === o.branchId; })[0] || {}).name || '') : '') + (o.dept ? ' · ' + o.dept : ''), S.title);
  const H1 = [['ລຳດັບ', 'No'], ['ລະຫັດ'], ['ຊື່'], ['ສາຂາ'], ['ພະແນກ'], ['ຕຳແໜ່ງ'], ['ວັນທີ'], ['ວັນ'], ['ກະ']];
  H1.forEach(function (h, i) { ws.set(3, i + 1, h[0], S.hInfo); ws.set(4, i + 1, null, S.hInfo); ws.merge(X.colName(i + 1) + '3:' + X.colName(i + 1) + '4'); });
  const group = function (from, n, title, st, subs) { ws.set(3, from, title, st); for (let i = 1; i < n; i++) ws.set(3, from + i, null, st); ws.merge(X.colName(from) + '3:' + X.colName(from + n - 1) + '3'); subs.forEach(function (s, i) { ws.set(4, from + i, s, st); }); };
  group(10, 9, 'ເຂົ້າວຽກ', S.hIn, ['ກຳນົດ', 'ເຂົ້າວຽກ', 'ສ່ວນຕ່າງ', 'ສະຖານະເຂົ້າ', 'ວິທີລົງເວລາ', 'ເຫດຜົນ', 'ສະຖານທີ່', 'ໄລຍະຫ່າງ (ມ.)', 'ພິກັດ']);
  group(19, 9, 'ເລີກວຽກ', S.hOut, ['ກຳນົດ', 'ເລີກວຽກ', 'ສ່ວນຕ່າງ', 'ສະຖານະອອກ', 'ວິທີລົງເວລາ', 'ເຫດຜົນ', 'ສະຖານທີ່', 'ໄລຍະຫ່າງ (ມ.)', 'ພິກັດ']);
  group(28, 3, 'ພັກ', S.hBrk, ['ເລີ່ມ', 'ສຳເລັດ', 'ນາທີ']);
  group(31, 7, 'ການລາ', S.hLeave, LEAVE_ORDER.map(function (k) { return LEAVE_NAME[k]; }).concat(['ເຫດຜົນການລາ / ບັນທຶກຜູ້ອະນຸມັດ']));
  group(38, 6, 'OT', S.hOT, OT_MULT.map(function (m) { return m + ' ເທົ່າ'; }));
  group(44, 3, 'ໄລຍະເວລາເຮັດວຽກຕົວຈິງ', S.hAct, ['ກຳນົດ', 'ເວລາຈິງ', 'ສ່ວນຕ່າງ']);
  group(47, 6, 'ຊົ່ວໂມງເພື່ອຄິດເງິນເດືອນ', S.hPay, ['ປົກກະຕິ', 'ລາ', 'ລາຫັກເງິນ', 'ມາຊ້າ/ອອກກ່ອນ', 'ເວລາທີ່ຖືກຫັກເງິນ', 'ຂາດ']);
  ws.set(3, 53, 'ພາບລວມ', S.hAll); ws.set(4, 53, null, S.hAll); ws.merge('BA3:BA4');
  ws.height(3, 24); ws.height(4, 42);
  ws.cols([6, 10, 24, 14, 16, 20, 12, 9, 12, 8, 8, 8, 12, 12, 16, 22, 9, 22, 8, 8, 8, 12, 12, 16, 22, 9, 22, 8, 8, 8, 8, 14, 12, 12, 12, 14, 12, 26, 8, 8, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 16]);
  /* ຖັນ: ຂໍ້ມູນ A..I · ເຂົ້າ J..R · ອອກ S..AA · ພັກ AB..AD · ລາ AE..AK · OT AL..AQ · ຈິງ AR..AT · ເງິນເດືອນ AU..AZ · ພາບລວມ BA */
  const methodOf = function (s) { return s ? (s.manual ? 'ເລືອກສາຂາເອງ' : s.faceScore != null ? 'ສະແກນໃບໜ້າ' : 'ອື່ນໆ') : ''; };
  const placeOf = function (s) { return s && s.branchId && ctx.branches[s.branchId] ? ctx.branches[s.branchId].name : ''; };
  const reasonOf = function (s) { return s && s.reasons && s.reasons.length ? s.reasons.join('; ') : ''; };
  const coord = function (s) { return s && s.lat != null && s.lng != null ? s.lat + ', ' + s.lng : ''; };
  const sum = {};
  let row = 5, no = 0;
  emps.forEach(function (e) {
    no++; const bn = ctx.branches[e.homeBranchId] ? ctx.branches[e.homeBranchId].name : '';
    const acc = sum[e.id] = { e: e, bn: bn, work: 0, present: 0, lateN: 0, lateMin: 0, earlyN: 0, earlyMin: 0, absent: 0, leave: {}, workedOff: 0, otMin: 0, normalMin: 0, deduct: 0 };
    days.forEach(function (d) {
      if (e.startDate && d < e.startDate) return; if (e.endDate && d > e.endDate) return;
      const R = computeDay(ctx, e, d), c = function (col, v, st) { ws.set(row, col, v, st || S.ctr); };
      c(1, no, S.int); c(2, e.code || '', S.ctr); c(3, e.name || '', S.txt); c(4, bn, S.txt); c(5, e.dept || '', S.txt); c(6, e.position || '', S.txt);
      c(7, serial(dateMs(d)), S.date); c(8, LAO_DAYS[new Date(dateMs(d)).getUTCDay()], S.ctr); c(9, R.shift && R.working ? R.shift.name : '', S.ctr);
      if (R.working) {
        c(10, R.sIn != null ? serial(R.sIn) : '', S.tm); c(19, R.sOut != null ? serial(R.sOut) : '', S.tm);
        if (R.inMs != null) { c(11, serial(R.inMs), S.tm); c(12, R.sIn != null ? dstr((R.sIn - R.inMs) / 60000) : '', S.ctr); }
        if (R.outMs != null) { c(20, serial(R.outMs), S.tm); c(21, R.sOut != null ? dstr((R.outMs - R.sOut) / 60000) : '', S.ctr); }
        c(44, dstr(R.sched), S.ctr); if (R.actual != null) { c(45, dstr(R.actual), S.ctr); c(46, dstr(R.actual - R.sched), S.ctr); } else if (R.absent) c(46, dstr(-R.sched), S.ctr);
      } else if (R.hasIn) { if (R.inMs != null) c(11, serial(R.inMs), S.tm); if (R.outMs != null) c(20, serial(R.outMs), S.tm); if (R.actual != null) c(45, dstr(R.actual), S.ctr); }
      c(13, R.stIn, stat(R.stIn)); c(22, R.stOut, stat(R.stOut));
      c(14, methodOf(R.inS)); c(15, reasonOf(R.inS), S.txt); c(16, placeOf(R.inS), S.txt); c(17, R.inS && R.inS.distanceM != null ? R.inS.distanceM : '', S.int); c(18, coord(R.inS), S.txt);
      c(23, methodOf(R.outS)); c(24, reasonOf(R.outS), S.txt); c(25, placeOf(R.outS), S.txt); c(26, R.outS && R.outS.distanceM != null ? R.outS.distanceM : '', S.int); c(27, coord(R.outS), S.txt);
      if (R.bS) c(28, serial(loc(R.bS.deviceTime).getTime()), S.tm); if (R.bE) c(29, serial(loc(R.bE.deviceTime).getTime()), S.tm); c(30, R.breakMin || 0, S.int);
      /* ການລາ */
      const lv = R.fullLeave.concat(R.partLeave), note = [];
      LEAVE_ORDER.forEach(function (k, i) {
        const l = lv.filter(function (x) { return x.type === k; }); if (!l.length) return;
        c(31 + i, l.map(function (x) { return !x.part ? 'ເຕັມມື້' : x.part === 'hours' ? (x.hours || 0) + ' ຊມ' : x.part === 'am' ? 'ເຄິ່ງເຊົ້າ' : x.part === 'pm' ? 'ເຄິ່ງບ່າຍ' : String(x.part); }).join(', '), S.ctr);
      });
      lv.forEach(function (x) { if (x.reason) note.push(String(x.reason).trim()); }); c(37, note.join(' | '), S.txt);
      if (R.otMin) { const idx = OT_MULT.reduce(function (b, m, i) { return Math.abs(m - ctx.otRate) < Math.abs(OT_MULT[b] - ctx.otRate) ? i : b; }, 0); c(38 + idx, R.otMin / 1440, S.dur); }
      const tm = function (col, min) { if (min > 0) c(col, min / 1440, S.dur); };
      tm(47, R.normalMin); tm(48, R.leaveMinPaid); tm(49, R.leaveMinUnpaid); tm(50, R.lateMin + R.earlyMin); tm(51, R.deduct); tm(52, R.absentMin);
      c(53, R.status.join(', '), R.status.length ? statAll(R.status) : S.ctr);
      /* ສະຫຼຸບ */
      if (R.working) { acc.work++; if (R.normalMin > 0 || (R.inMs != null && R.outMs != null)) acc.present++; if (R.late) { acc.lateN++; acc.lateMin += R.lateMin; } if (R.early) { acc.earlyN++; acc.earlyMin += R.earlyMin; } if (R.absent) acc.absent += R.sched ? R.absentMin / R.sched : 1; }
      if (!R.working && R.hasIn) acc.workedOff++;
      lv.forEach(function (x) { acc.leave[x.type] = (acc.leave[x.type] || 0) + (!x.part ? 1 : x.part === 'hours' ? (x.hours || 0) * 60 / (R.sched || 480) : 0.5); });
      acc.otMin += R.otMin; acc.normalMin += R.normalMin; acc.deduct += R.deduct;
      row++;
    });
  });
  ws.freeze(4, 5); ws.filter('A4:BA' + Math.max(row - 1, 5));

  /* ===== ແຜ່ນ 2: ສະຫຼຸບຕໍ່ຄົນ ===== */
  const w2 = wb.sheet('ສະຫຼຸບ');
  w2.set(1, 1, 'ສະຫຼຸບການເຂົ້າວຽກ ' + dmy(o.from) + ' - ' + dmy(o.to), S.title);
  const H2 = ['ລະຫັດ', 'ຊື່', 'ສາຂາ', 'ພະແນກ', 'ມື້ຕາມກະ', 'ມື້ມາວຽກ', 'ມາຊ້າ (ຄັ້ງ)', 'ມາຊ້າ (ນາທີ)', 'ອອກກ່ອນ (ຄັ້ງ)', 'ອອກກ່ອນ (ນາທີ)', 'ຂາດງານ (ມື້)'].concat(LEAVE_ORDER.map(function (k) { return LEAVE_NAME[k] + ' (ມື້)'; })).concat(['ເຮັດວຽກວັນຢຸດ (ມື້)', 'OT (ຊົ່ວໂມງ)', 'ຊົ່ວໂມງປົກກະຕິ (ຄິດເງິນເດືອນ)', 'ເວລາຖືກຫັກ (ນາທີ)']);
  H2.forEach(function (h, i) { w2.set(3, i + 1, h, S.hInfo); }); w2.height(3, 48);
  w2.cols([10, 24, 14, 16].concat(H2.slice(4).map(function () { return 12; })));
  let r2 = 4; Object.keys(sum).forEach(function (k) {
    const a = sum[k], v = [a.e.code || '', a.e.name || '', a.bn, a.e.dept || '', a.work, a.present, a.lateN, a.lateMin, a.earlyN, a.earlyMin, Math.round(a.absent * 10) / 10].concat(LEAVE_ORDER.map(function (t) { return Math.round((a.leave[t] || 0) * 10) / 10; })).concat([a.workedOff, a.otMin / 60, a.normalMin / 60, a.deduct]);
    v.forEach(function (x, i) { w2.set(r2, i + 1, x, i < 4 ? S.txt : (typeof x === 'number' && i >= 15 && i <= 16 ? S.num : S.ctr)); }); r2++;
  });
  w2.freeze(3, 4);
  return { buffer: wb.build(), name: 'HR_attendance_' + o.from + '_' + o.to + '.xlsx', days: days.length, employees: emps.length, rows: row - 5, summary: sum };
}

module.exports = { build: build, info: info, computeDay: computeDay, buildContext: buildContext, cycles: cycles, ST: ST, sessions: sessions, shiftMins: shiftMins };
