/*****************************************************************
 * ST POS - Backend (Google Apps Script) [Sync with Google Sheet]
 * Google Sheet = data store:
 *   - tab "STATE" : full JSON
 *   - readable mirror tabs: Settings, Tables, Stock, Bills, Orders...
 * First run: Run seedDemo -> Authorize. After code edit: Deploy > New version.
 *
 * ຄວາມປອດໄພ (v3):
 *  1) ຕັ້ງ API TOKEN: ແກ້ຂໍ້ຄວາມໃນ setToken() ຂ້າງລຸ່ມ ແລ້ວ Run setToken ເທື່ອດຽວ
 *     ຈາກນັ້ນໄປແອັບ → ການຕັ້ງຄ່າ → ການເຊື່ອມຕໍ່ → ໃສ່ token ດຽວກັນ
 *     (ບໍ່ຕັ້ງ token = ເປີດກວ້າງແບບເກົ່າ)
 *  2) ລູກຄ້າ QR ໄດ້ຂໍ້ມູນສະເພາະ ເມນູ+ໂຕະຕົນເອງ (getStateCust)
 *     ແລະສັ່ງຜ່ານ submitOrder — server ກວດ PIN + ໃຊ້ລາຄາຈາກ server + ຕັດສະຕ໋ອກເອງ
 *****************************************************************/

var PROP = PropertiesService.getScriptProperties();
var CELL = 45000;

/* ---- TOKEN ---- */
function setToken() { PROP.setProperty('API_TOKEN', 'st-2026-CHANGE-ME'); return 'OK - token saved'; }
function clearToken() { PROP.deleteProperty('API_TOKEN'); return 'OK - token cleared (open mode)'; }
function tokenOk_(tok) { var t = (PROP.getProperty('API_TOKEN') || '').trim(); return !t || String(tok || '') === t; }

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.callback) {
    var cb = String(p.callback).replace(/[^\w$.]/g, '');
    var payload;
    if (p.cust == '1' && p.table) {                       /* ລູກຄ້າ QR: ອ່ານສະເພາະໂຕະຕົນເອງ */
      payload = { ok: true, state: getStateCust(String(p.table)) };
    } else if (p.action && p.payload) {                    /* ລູກຄ້າ QR: ສັ່ງ/ຂໍເຊັກບິນ ຜ່ານ JSONP */
      var res; try { res = custAction_(JSON.parse(p.payload)); } catch (err) { res = { ok: false, err: 'payload' }; }
      payload = res;
    } else if (p.arch) {                                   /* ຍ້າຍບິນເກົ່າເຂົ້າຄັງ */
      payload = tokenOk_(p.token) ? archiveNow_(p.arch) : { ok: false, err: 'token' };
    } else if (p.sum == '1') {                             /* ສະຫຼຸບຫຍໍ້ ສຳລັບລວມສາຂາ */
      payload = tokenOk_(p.token) ? { ok: true, sum: branchSummary_() } : { ok: false, err: 'token' };
    } else if (p.bak) {                                    /* backup / restore */
      if (!tokenOk_(p.token)) payload = { ok: false, err: 'token' };
      else if (p.bak == 'now') payload = { ok: true, res: backupDaily() };
      else if (p.bak == 'list') payload = { ok: true, list: JSON.parse(listBackups(p.token)) };
      else if (p.bak == 'restore' && p.tag) payload = { ok: true, res: restoreBackup(p.tag, p.token) };
      else payload = { ok: false, err: 'bak' };
    } else if (!tokenOk_(p.token)) {                       /* ອ່ານ state ເຕັມ ຕ້ອງມີ token */
      payload = { ok: false, err: 'token' };
    } else {
      payload = { ok: true, state: getState_() };
    }
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(payload) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ST POS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doPost(e) {
  try {
    var json = (e && e.postData && e.postData.contents) || '';
    var p = (e && e.parameter) || {};
    var obj = null; try { obj = JSON.parse(json); } catch (e2) {}
    if (obj && (obj.action === 'order' || obj.action === 'callbill')) {
      return ContentService.createTextOutput(JSON.stringify(custAction_(obj)));
    }
    if (!tokenOk_(p.token || (obj && obj._token))) return ContentService.createTextOutput('denied');
    if (json) { var lock = LockService.getScriptLock(); try { lock.waitLock(20000); saveStateRaw_(json); } finally { try { lock.releaseLock(); } catch (e3) {} } }
    return ContentService.createTextOutput('ok');
  } catch (err) { return ContentService.createTextOutput('err'); }
}
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function getSS_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  if (!ss) { var id = PROP.getProperty('SS_ID'); if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} } }
  if (!ss) { try { ss = SpreadsheetApp.create('ST POS DB'); PROP.setProperty('SS_ID', ss.getId()); } catch (e) { return null; } }
  return ss;
}
function tab_(ss, name) { var sh = ss.getSheetByName(name); if (!sh) sh = ss.insertSheet(name); return sh; }

/* ---- ອ່ານ state (ພາຍໃນ) ---- */
function getState_() {
  try {
    var ss = getSS_(); if (!ss) return PROP.getProperty('ST_BLOB') || '';
    var sh = ss.getSheetByName('STATE'); if (!sh) return '';
    var last = sh.getLastRow(); if (last < 1) return '';
    var vals = sh.getRange(1, 1, last, 1).getValues();
    var s = ''; for (var i = 0; i < vals.length; i++) s += (vals[i][0] || '');
    return s;
  } catch (e) { return PROP.getProperty('ST_BLOB') || ''; }
}
/* ອ່ານ state ເຕັມ ຜ່ານ google.script.run — ຕ້ອງມີ token (ຖ້າຕັ້ງໄວ້) */
function getStateTok(tok) { return tokenOk_(tok) ? getState_() : 'DENIED'; }
function getState(tok) { return getStateTok(tok); }

/* ---- ຂຽນ state ---- */
/* ກັນບິນເສຍ ເມື່ອ 2 ເຄື່ອງບັນທຶກທັບກັນ: ລວມບິນຈາກ server ທີ່ບໍ່ມີໃນສະບັບໃໝ່ ເຂົ້າກັນ */
function mergeBills_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object') return inc;
    var cur = JSON.parse(curStr);
    if (!cur || !Array.isArray(cur.bills) || !cur.bills.length) return inc;
    if (!Array.isArray(inc.bills)) inc.bills = [];
    var have = {}; inc.bills.forEach(function (b) { if (b && b.receipt) have[b.receipt] = b; });
    cur.bills.forEach(function (b) {
      if (!b || !b.receipt) return;
      var m = have[b.receipt];
      if (!m) { inc.bills.push(b); have[b.receipt] = b; }
      else if (m.ts !== b.ts || m.total !== b.total) { /* ເລກບິນຊ້ຳຈາກ 2 ເຄື່ອງ — ເກັບທັງສອງ */
        var nb = JSON.parse(JSON.stringify(b)); nb.receipt = String(b.receipt) + '-B';
        if (!have[nb.receipt]) { inc.bills.push(nb); have[nb.receipt] = nb; }
      }
    });
    inc.bills.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    var maxSeq = 0; inc.bills.forEach(function (b) { var n = parseInt(b.receipt, 10); if (n > maxSeq) maxSeq = n; });
    if (maxSeq > (+inc.receiptSeq || 0)) inc.receiptSeq = maxSeq;
    return inc;
  } catch (e) { return inc; }
}
/* ຫຼາຍບ່ອນເກັບ: ຮັກສາ stock ຂອງບ່ອນອື່ນຈາກ server (ຄື 1 ຕັ້ງ/ບ່ອນ) — ບ່ອນທີ່ save (_srcLoc) ເປັນເຈົ້າຂອງ bucket ຕົນເອງ */
function mergeStock_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object') return inc;
    var src = inc._srcLoc; if (!src) return inc;
    var cur = JSON.parse(curStr); if (!cur || !cur.ingredients) return inc;
    if (!inc.ingredients) inc.ingredients = cur.ingredients;
    var incIng = inc.ingredients, curIng = cur.ingredients;
    Object.keys(curIng).forEach(function (code) {
      var ci = curIng[code], ii = incIng[code];
      if (!ii) { incIng[code] = ci; return; }          /* ວັດຖຸດິບຫາຍໃນ incoming → ເກັບຂອງ server */
      if (!ci || !ci.locs) return;
      if (!ii.locs) ii.locs = {};
      Object.keys(ci.locs).forEach(function (loc) { if (loc !== src) ii.locs[loc] = ci.locs[loc]; }); /* ບ່ອນອື່ນ = ຂອງ server */
    });
    if (Array.isArray(cur.stockLog)) {                   /* ລວມ ledger ຂ້າມບ່ອນ (ກັນເສຍ log) */
      if (!Array.isArray(inc.stockLog)) inc.stockLog = [];
      var seen = {}; inc.stockLog.forEach(function (l) { seen[l.ts + '|' + l.code + '|' + l.delta + '|' + (l.loc || '') + '|' + (l.reason || '')] = 1; });
      cur.stockLog.forEach(function (l) { var k = l.ts + '|' + l.code + '|' + l.delta + '|' + (l.loc || '') + '|' + (l.reason || ''); if (!seen[k]) { inc.stockLog.push(l); seen[k] = 1; } });
      inc.stockLog.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      if (inc.stockLog.length > 4000) inc.stockLog = inc.stockLog.slice(-4000);
    }
    if (Array.isArray(cur.transfers)) {                  /* ລວມໃບໂອນ: ຄົງໃບຂອງເຄື່ອງອື່ນ + ໃຫ້ສະຖານະທີ່ຄືບໜ້າກວ່າຊະນະ */
      if (!Array.isArray(inc.transfers)) inc.transfers = [];
      var rank = function (s) { return s === 'received' ? 3 : (s === 'void' ? 2 : 1); };
      var byId = {}; inc.transfers.forEach(function (t) { byId[t.id] = t; });
      cur.transfers.forEach(function (t) {
        var e = byId[t.id];
        if (!e) { inc.transfers.push(t); byId[t.id] = t; }
        else if (rank(t.status) > rank(e.status)) { inc.transfers[inc.transfers.indexOf(e)] = t; byId[t.id] = t; }
      });
      inc.transfers.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    }
    return inc;
  } catch (e) { return inc; }
}
function saveStateRaw_(json, skipMerge) {
  json = String(json == null ? '' : json);
  if (!skipMerge) { try { var inc = JSON.parse(json); if (inc && typeof inc === 'object' && !inc.cust) { var cur = getState_(); inc = mergeBills_(cur, inc); inc = mergeStock_(cur, inc); json = JSON.stringify(inc); } } catch (e) {} }
  var ss = getSS_();
  if (!ss) { PROP.setProperty('ST_BLOB', json.substring(0, 9000)); return true; }
  var sh = tab_(ss, 'STATE'); sh.clearContents();
  var rows = []; for (var i = 0; i < json.length; i += CELL) rows.push([json.substr(i, CELL)]);
  if (rows.length) sh.getRange(1, 1, rows.length, 1).setValues(rows);
  try { writeMirrors_(ss, JSON.parse(json)); } catch (e) {}
  SpreadsheetApp.flush();
  return true;
}
function saveState(json, tok) {
  if (!tokenOk_(tok)) return false;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); return saveStateRaw_(json); }
  catch (e) { return false; } finally { try { lock.releaseLock(); } catch (e2) {} }
}

/* ---- ລູກຄ້າ QR: ຂໍ້ມູນສະເພາະໂຕະຕົນເອງ (ບໍ່ມີ ບິນ/ລາຍຈ່າຍ/ຜູ້ໃຊ້/ສະຕ໋ອກ/ກະ) ---- */
function custFilter_(st, table) {
  var out = { cust: true, shopName: st.shopName || '', catalog: st.catalog || {}, menuImg: st.menuImg || {},
    soldOut: st.soldOut || {}, modGroups: st.modGroups || [], serviceChargePct: st.serviceChargePct || 0, vatPct: st.vatPct || 0,
    billDiscPct: st.billDiscPct || 0, qrGlobal: st.qrGlobal, qrPinRequired: st.qrPinRequired,
    qrExpires: st.qrExpires, activeTable: table, orderNo: st.orderNo || 1, tables: {}, qr: {}, orders: [], _v: st._v || 0 };
  var t = (st.tables || {})[table];
  if (t) out.tables[table] = { name: t.name, floor: t.floor, status: t.status, items: t.items || [], customer: t.customer || null };
  var q = (st.qr || {})[table];
  if (q) out.qr[table] = q;
  out.orders = (st.orders || []).filter(function (o) { return o.table === table; });
  return out;
}
function getStateCust(table) {
  try { var s = getState_(); if (!s) return ''; return JSON.stringify(custFilter_(JSON.parse(s), String(table))); }
  catch (e) { return ''; }
}

/* ---- ລູກຄ້າ QR: ສັ່ງອາຫານ / ຂໍເຊັກບິນ (server ກວດ PIN + ຕັດສະຕ໋ອກ) ---- */
function custAction_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var s = getState_(); if (!s) return { ok: false, err: 'ບໍ່ມີຂໍ້ມູນຮ້ານ' };
    var st = JSON.parse(s);
    var _qloc = (st.locations && st.locations.length) ? ((st.locations.filter(function (l) { return l.type === 'branch'; })[0]) || st.locations[0]) : { id: 'main', name: 'ສາຂາຫຼັກ' };
    var qrLoc = _qloc.id, qrLocName = _qloc.name;
    var table = String(payload.table || '');
    var t = st.tables && st.tables[table];
    if (!t) return { ok: false, err: 'ບໍ່ພົບໂຕະ ' + table };
    if (st.qrGlobal === false) return { ok: false, err: 'ການສັ່ງຜ່ານ QR ຖືກປິດ' };
    var q = st.qr && st.qr[table];
    if (q && q.enabled === false) return { ok: false, err: 'QR ໂຕະນີ້ຖືກປິດ' };
    if (st.qrPinRequired !== false) {
      if (!q) return { ok: false, err: 'QR ໝົດອາຍຸ — ຂໍ QR ໃໝ່ຈາກພະນັກງານ' };
      if (st.qrExpires !== false && q.expiry < Date.now()) return { ok: false, err: 'QR ໝົດອາຍຸ — ຂໍ QR ໃໝ່ຈາກພະນັກງານ' };
      if (String(payload.pin || '') !== String(q.pin)) return { ok: false, err: 'ລະຫັດ PIN ບໍ່ຖືກຕ້ອງ' };
    }
    var now = Date.now();
    if (payload.action === 'callbill') {
      if (!(t.items && t.items.length)) return { ok: false, err: 'ຍັງບໍ່ມີອໍເດີ' };
      if (t.status !== 'bill') t.status = 'callbill';
      if (!st.orderLog) st.orderLog = [];
      st.orderLog.push({ ts: now, table: table, action: 'ຂໍເຊັກບິນ (QR)', detail: '', by: 'ລູກຄ້າ QR ໂຕະ ' + table });
      st._v = Date.now(); saveStateRaw_(JSON.stringify(st));
      return { ok: true, state: custFilter_(st, table) };
    }
    /* action === 'order' */
    var items = payload.items || [];
    if (!items.length) return { ok: false, err: 'ບໍ່ມີລາຍການ' };
    if (items.length > 60) return { ok: false, err: 'ລາຍການຫຼາຍເກີນໄປ' };
    var cat = st.catalog || {}; var map = {};
    for (var c in cat) for (var sub in cat[c]) (cat[c][sub] || []).forEach(function (pp) { map[pp.c] = pp; });
    var promo = activePromo_(st);
    var cnt = 0, skipped = 0;
    items.forEach(function (it) {
      var def = map[String(it.code || '')];
      if (!def) { skipped++; return; }
      if (st.soldOut && st.soldOut[def.c]) { skipped++; return; }
      var qn = Math.max(1, Math.min(99, Math.round(+it.qty || 1)));
      var mp = Math.max(0, Math.min(500000, +it.modPrice || 0));
      var line = { id: now + Math.random(), code: def.c, name: def.n, price: def.p, qty: qn,
        mods: (it.mods || []).slice(0, 12).map(function (m) { return String(m).slice(0, 60); }),
        modPrice: mp, disc: 0, k: def.k, note: String(it.note || '').slice(0, 120), ts: now };
      t.items.push(line); cnt += qn;
      if (!st.orders) st.orders = [];
      st.orders.push({ id: line.id, table: table, code: def.c, name: def.n, qty: qn, k: def.k, mods: line.mods, note: line.note, status: 'wait', ts: now });
      (def.bom || []).forEach(function (b) {
        var ing = st.ingredients && st.ingredients[b[0]];
        if (ing) {
          if (!ing.locs) { ing.locs = {}; if (typeof ing.stock === 'number') ing.locs['main'] = ing.stock; }
          ing.locs[qrLoc] = Math.round(((+ing.locs[qrLoc] || 0) - b[1] * qn) * 1000) / 1000;
          if (!st.stockLog) st.stockLog = [];
          st.stockLog.push({ ts: now, code: b[0], name: ing.name, unit: ing.unit, delta: -(b[1] * qn),
            after: ing.locs[qrLoc], reason: 'ຂາຍ', ref: qn + '× ' + def.n + ' (QR ໂຕະ ' + table + ')', by: 'ລູກຄ້າ QR', loc: qrLoc, locName: qrLocName });
          if (st.stockLog.length > 4000) st.stockLog = st.stockLog.slice(-4000);
        }
      });
    });
    if (!cnt) return { ok: false, err: 'ລາຍການບໍ່ຖືກຕ້ອງ ຫຼື ໝົດ' };
    if (t.status === 'free') t.status = 'busy';
    st.orderNo = (st.orderNo || 1) + 1;
    if (!st.orderLog) st.orderLog = [];
    st.orderLog.push({ ts: now, table: table, action: 'ສັ່ງຜ່ານ QR', detail: cnt + ' ລາຍການ' + (skipped ? ' (ຂ້າມ ' + skipped + ')' : ''), by: 'ລູກຄ້າ QR ໂຕະ ' + table });
    st._v = Date.now(); saveStateRaw_(JSON.stringify(st));
    return { ok: true, n: cnt, skipped: skipped, state: custFilter_(st, table) };
  } catch (e) { return { ok: false, err: 'server: ' + (e && e.message || e) }; }
  finally { try { lock.releaseLock(); } catch (e2) {} }
}
/* ເອີ້ນຈາກ google.script.run (ໂໝດ HtmlService) */
function submitOrder(json) { var o = null; try { o = JSON.parse(json); } catch (e) {} return JSON.stringify(custAction_(o || {})); }

/* ---- BACKUP ອັດຕະໂນມັດ + RESTORE ---- */
/* ແລ່ນ setupBackup ເທື່ອດຽວ ເພື່ອຕັ້ງ trigger ສຳຮອງທຸກມື້ 03:00 */
function setupBackup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'backupDaily') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('backupDaily').timeBased().everyDays(1).atHour(3).create();
  return 'OK - ສຳຮອງອັດຕະໂນມັດທຸກມື້ 03:00 (ເກັບ 14 ມື້ຫຼ້າສຸດ)';
}
function backupDaily() {
  var s = getState_(); if (!s) return 'no data';
  var ss = getSS_(); if (!ss) return 'no sheet';
  var tag = 'BAK_' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd_HHmm');
  var sh = tab_(ss, tag); sh.clearContents(); sh.hideSheet();
  var rows = []; for (var i = 0; i < s.length; i += CELL) rows.push([s.substr(i, CELL)]);
  if (rows.length) sh.getRange(1, 1, rows.length, 1).setValues(rows);
  var all = ss.getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf('BAK_') === 0; }).sort();
  while (all.length > 14) { var old = all.shift(); var oh = ss.getSheetByName(old); if (oh) ss.deleteSheet(oh); }
  return tag;
}
function listBackups(tok) {
  if (!tokenOk_(tok)) return 'DENIED';
  var ss = getSS_(); if (!ss) return '[]';
  return JSON.stringify(ss.getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf('BAK_') === 0; }).sort().reverse());
}
function restoreBackup(tag, tok) {
  if (!tokenOk_(tok)) return 'DENIED';
  var ss = getSS_(); if (!ss) return 'no sheet';
  var sh = ss.getSheetByName(String(tag)); if (!sh) return 'NOTFOUND';
  var last = sh.getLastRow(); if (last < 1) return 'EMPTY';
  var vals = sh.getRange(1, 1, last, 1).getValues();
  var s = ''; for (var i = 0; i < vals.length; i++) s += (vals[i][0] || '');
  try { JSON.parse(s); } catch (e) { return 'CORRUPT'; }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); saveStateRaw_(s, true); } finally { try { lock.releaseLock(); } catch (e2) {} }
  return 'OK';
}
/* ---- ໂປຣໂມຊັນ (Happy Hour) — ໃຊ້ຮ່ວມ POS ແລະ QR ---- */
function activePromo_(st) {
  var ps = st.promos || []; var hm = Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm');
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i]; if (!p || p.active === false) continue;
    if (p.from && p.to) { if (hm < p.from || hm >= p.to) continue; }
    return p;
  }
  return null;
}
/* ---- ສະຫຼຸບຫຍໍ້ ສຳລັບໜ້າລວມສາຂາ (ບໍ່ສົ່ງ state ເຕັມ) ---- */
function branchSummary_() {
  var s = getState_(); if (!s) return null;
  var st; try { st = JSON.parse(s); } catch (e) { return null; }
  var tz = 'GMT+7';
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'); var month = today.substring(0, 7);
  var out = { shopName: st.shopName || '', today: { sales: 0, bills: 0, voids: 0, voidAmt: 0, byPay: {} }, month: { sales: 0, bills: 0 }, busy: 0, lowStock: 0, shift: (st.curShift ? st.curShift.name : null), _t: Date.now() };
  (st.bills || []).forEach(function (b) {
    var dd = Utilities.formatDate(new Date(b.ts), tz, 'yyyy-MM-dd');
    if (dd.substring(0, 7) === month && !b.voided) { out.month.sales += b.total; out.month.bills++; }
    if (dd === today) {
      if (b.voided) { out.today.voids++; out.today.voidAmt += b.total; }
      else { out.today.sales += b.total; out.today.bills++; out.today.byPay[b.pay] = (out.today.byPay[b.pay] || 0) + b.total; }
    }
  });
  var tb = st.tables || {}; Object.keys(tb).forEach(function (k) { if (tb[k].status !== 'free' && tb[k].status !== 'merged') out.busy++; });
  var ing = st.ingredients || {}; Object.keys(ing).forEach(function (k) { var x = ing[k], tot = x.locs ? Object.keys(x.locs).reduce(function (s, l) { return s + (+x.locs[l] || 0); }, 0) : (+x.stock || 0); if (tot <= x.reorder) out.lowStock++; });
  return out;
}
function getBranchSummary(tok) { return tokenOk_(tok) ? JSON.stringify(branchSummary_()) : 'DENIED'; }

/* ---- ARCHIVE ບິນເກົ່າ (ຫຍໍ້ state ໃຫ້ນ້ອຍ, ຂໍ້ມູນບໍ່ເສຍ) ---- */
function archiveNow_(days) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var s = getState_(); if (!s) return { ok: false, err: 'nodata' };
    var st = JSON.parse(s);
    var cutoff = Date.now() - Math.max(1, +days || 60) * 86400000;
    var bills = st.bills || [], keep = [], arch = [];
    bills.forEach(function (b) {
      var creditOpen = b.credit && !b.creditSettled;           /* ຕິດໜີ້ຍັງບໍ່ຈ່າຍ = ຫ້າມ archive */
      if (b.ts >= cutoff || creditOpen) keep.push(b); else arch.push(b);
    });
    if (!arch.length) return { ok: true, archived: 0, kept: keep.length };
    var ss = getSS_(); var sh = tab_(ss, 'ບິນ-ຄັງ');
    if (sh.getLastRow() < 1) { sh.getRange(1, 1, 1, 9).setValues([['Receipt', 'Time', 'Table', 'Total', 'Pay', 'Cashier', 'Voided', 'Refund', 'Items']]); sh.setFrozenRows(1); }
    var rows = arch.map(function (b) {
      return [b.receipt, new Date(b.ts), b.table, b.total, b.pay, b.cashier, b.voided ? 'VOID' : '', (b.refundAmt || 0),
        (b.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join('; ')];
    });
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
    st.bills = keep; st._v = Date.now();
    saveStateRaw_(JSON.stringify(st), true);
    return { ok: true, archived: arch.length, kept: keep.length };
  } catch (e) { return { ok: false, err: (e && e.message) || e }; }
  finally { try { lock.releaseLock(); } catch (e2) {} }
}
/* ເອີ້ນຈາກ google.script.run */
function archiveBills(days, tok) { return tokenOk_(tok) ? JSON.stringify(archiveNow_(days)) : 'DENIED'; }

function putTable_(ss, name, header, rows) {
  var sh = tab_(ss, name);
  sh.clearContents();
  var data = [header];
  for (var i = 0; i < rows.length; i++) data.push(rows[i]);
  sh.getRange(1, 1, data.length, header.length).setValues(data);
  sh.setFrozenRows(1);
}
function lineTot_(i) { return ((i.price + (i.modPrice || 0)) * i.qty) * (1 - (i.disc || 0) / 100); }
function writeMirrors_(ss, st) {
  st = st || {};
  putTable_(ss, 'Settings', ['Item', 'Value'], [
    ['shopName', st.shopName || ''], ['Service %', st.serviceChargePct || 0], ['VAT %', st.vatPct || 0],
    ['Discount %', st.billDiscPct || 0], ['QR', st.qrGlobal ? 'on' : 'off'], ['Sound', st.soundOn ? 'on' : 'off'],
    ['Shift', st.activeShift || ''], ['Staff', st.activeStaff || ''],
    ['Floors', (st.floors || []).join(', ')], ['Shifts', (st.shifts || []).join(', ')], ['StaffList', (st.staff || []).join(', ')],
    ['Receipt', st.receiptSeq || 0]
  ]);
  var tb = st.tables || {};
  putTable_(ss, 'Tables', ['Table', 'Floor', 'Status', 'Customer', 'Amount'],
    Object.keys(tb).map(function (k) {
      var t = tb[k], tot = (t.items || []).reduce(function (s, i) { return s + lineTot_(i); }, 0);
      return [t.name, t.floor, t.status, t.customer || '', Math.round(tot)];
    }));
  var ing = st.ingredients || {};
  var cat = st.catalog || {};
  var locs = st.locations || [];
  function locNm_(id){ for(var i=0;i<locs.length;i++) if(locs[i].id===id) return locs[i].name; return id; }
  function totStock_(x){ if(x.locs){ var s=0; for(var l in x.locs) s+=(+x.locs[l]||0); return s; } return +x.stock||0; }
  var menuRows = [];
  Object.keys(cat).forEach(function (mn) { var subs = cat[mn]; Object.keys(subs).forEach(function (sb) { (subs[sb] || []).forEach(function (it) { menuRows.push([it.c, it.n, mn, sb, it.k, it.p]); }); }); });
  putTable_(ss, 'Menu', ['Code', 'Name', 'Category', 'Sub', 'Kind', 'Price'], menuRows);
  putTable_(ss, 'ບ່ອນເກັບ', ['ID', 'Name', 'Type'], locs.map(function(l){ return [l.id, l.name, l.type||'']; }));
  var perLoc = [];
  Object.keys(ing).forEach(function (k) { var x = ing[k]; if (x.locs) Object.keys(x.locs).forEach(function(lid){ perLoc.push([x.code, x.name, x.unit, locNm_(lid), +x.locs[lid]||0]); }); });
  putTable_(ss, 'ສະຕ໋ອກຕາມບ່ອນ', ['Code', 'Name', 'Unit', 'Location', 'Stock'], perLoc);
  var groups = { 'ວັດຖຸດິບ': [], 'ສິນຄ້າ': [], 'ເຄື່ອງໃຊ້': [] };
  Object.keys(ing).forEach(function (k) {
    var x = ing[k]; var c = x.cat || 'ວັດຖຸດິບ'; if (!groups[c]) groups[c] = [];
    var tot = totStock_(x);
    groups[c].push([x.code, x.name, x.unit, tot, x.reorder, (tot <= x.reorder ? 'LOW' : 'ok')]);
  });
  ['ວັດຖຸດິບ', 'ສິນຄ້າ', 'ເຄື່ອງໃຊ້'].forEach(function (c) {
    putTable_(ss, c, ['Code', 'Name', 'Unit', 'Stock(ລວມທຸກບ່ອນ)', 'Reorder', 'Status'], groups[c] || []);
  });
  putTable_(ss, 'Bills', ['Receipt', 'Time', 'Table', 'Total', 'Pay', 'Cashier', 'Voided', 'Items'],
    (st.bills || []).map(function (b) {
      return [b.receipt, new Date(b.ts), b.table, b.total, b.pay, b.cashier, b.voided ? ('VOID: ' + (b.voidReason || '')) : '',
        (b.items || []).map(function (i) { return i.qty + 'x ' + i.name; }).join('; ')];
    }));
  var sales = [];
  (st.bills || []).forEach(function (b) {
    (b.items || []).forEach(function (it) {
      sales.push([b.receipt, b.table, it.name, it.qty, (it.price + (it.modPrice || 0)), Math.round(lineTot_(it)),
        it.ts ? new Date(it.ts) : new Date(b.ts), new Date(b.ts), b.pay, b.cashier, b.voided ? 'VOID' : '']);
    });
  });
  putTable_(ss, 'ການຂາຍ', ['Receipt', 'Table', 'Menu', 'Qty', 'UnitPrice', 'Total', 'OrderTime', 'PayTime', 'Pay', 'Cashier', 'Void'], sales);
  putTable_(ss, 'ໂອນສະຕ໋ອກ', ['No', 'From', 'To', 'Status', 'Items', 'Sent', 'Received', 'By', 'RecvBy'],
    (st.transfers || []).map(function (t) {
      return [t.no, locNm_(t.from), locNm_(t.to), t.status, (t.items || []).map(function (i) { return i.qty + ' ' + (i.unit || '') + ' ' + (i.name || i.code); }).join('; '),
        new Date(t.ts), t.recvTs ? new Date(t.recvTs) : '', t.by || '', t.recvBy || ''];
    }));
  putTable_(ss, 'Orders', ['Table', 'Item', 'Qty', 'Type', 'Status', 'Time'],
    (st.orders || []).map(function (o) {
      return [o.table, o.name, o.qty, (o.k === 'food' ? 'food' : 'drink'), o.status, new Date(o.ts)];
    }));
  putTable_(ss, 'ລາຍຈ່າຍ', ['Date', 'Category', 'Note', 'Amount', 'By'],
    (st.expenses || []).map(function (e) {
      return [new Date(e.ts), e.cat, e.note || '', Math.round(e.amount || 0), e.by || ''];
    }));
  putTable_(ss, 'ເຄື່ອນໄຫວສະຕ໋ອກ', ['Time', 'Location', 'Code', 'Name', 'Delta', 'Unit', 'After', 'Reason', 'Ref', 'By'],
    (st.stockLog || []).map(function (l) {
      return [new Date(l.ts), l.locName || l.loc || '', l.code, l.name, l.delta, l.unit, (l.after == null ? '' : l.after), l.reason, l.ref || '', l.by || ''];
    }));
  putTable_(ss, 'ປິດກະ', ['Shift', 'OpenedBy', 'Open', 'ClosedBy', 'Close', 'Sales', 'Bills', 'Float', 'CashIn', 'CashOut', 'Expected', 'Counted', 'Diff', 'Voids'],
    (st.shiftLog || []).map(function (sft) {
      return [sft.name, sft.openedBy || '', new Date(sft.openTs), sft.closedBy || '', new Date(sft.closeTs), sft.sales || 0, sft.bills || 0,
        sft.float || 0, sft.cin || 0, sft.cout || 0, sft.expectedCash || 0, sft.countedCash || 0, (sft.countedCash || 0) - (sft.expectedCash || 0), sft.voids || 0];
    }));
}

function resetState() {
  try {
    var ss = getSS_();
    if (ss) { ['STATE', 'Settings', 'Tables', 'Stock', 'Menu', 'ວັດຖຸດິບ', 'ສິນຄ້າ', 'ເຄື່ອງໃຊ້', 'Bills', 'Orders', 'ການຂາຍ', 'ລາຍຈ່າຍ', 'ເຄື່ອນໄຫວສະຕ໋ອກ', 'ປິດກະ'].forEach(function (n) { var sh = ss.getSheetByName(n); if (sh) sh.clearContents(); }); }
    PROP.deleteProperty('ST_BLOB');
  } catch (e) {}
  return true;
}

/* ແລ່ນ rebuild ເພື່ອສ້າງ/ອັບເດດ sheet ທັງໝົດຈາກຂໍ້ມູນປັດຈຸບັນ */
function rebuild() {
  var ss = getSS_(); if (!ss) return 'no sheet';
  var s = getState_(); if (!s) return 'no data';
  writeMirrors_(ss, JSON.parse(s)); SpreadsheetApp.flush();
  return 'OK - sheets updated';
}

function seedDemo() {
  var demo = {
    shopName: 'ST POS - LaoFe Cafe', serviceChargePct: 0, vatPct: 0, billDiscPct: 0, qrGlobal: true, soundOn: true,
    activeShift: 'A', activeStaff: 'Namfon', floors: ['F1', 'F2'], shifts: ['A', 'B'], staff: ['Namfon', 'Pam'], receiptSeq: 10529,
    tables: { A1: { name: 'A1', floor: 'F1', status: 'busy', customer: null, items: [{ name: 'Ice Latte', price: 55000, qty: 2, disc: 0, modPrice: 0 }] } },
    ingredients: { COFFEE: { code: 'COFFEE', name: 'Coffee', unit: 'g', stock: 4928, reorder: 500 } },
    bills: [], orders: []
  };
  saveStateRaw_(JSON.stringify(demo));
  return 'OK';
}

/* diag: line-length signature of served Index (to detect save mangling) */
function getLineLens() {
  var c = HtmlService.createHtmlOutputFromFile('Index').getContent();
  var L = c.split('\n');
  var a = [];
  for (var i = 0; i < L.length; i++) a.push(L[i].length);
  return a.join(',');
}
