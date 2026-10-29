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
      payload = { ok: true, state: getStateCust(String(p.table), String(p.pin || '')) };
    } else if (p.book == '1' && p.payload) {               /* ຄົນເຈັບຈອງນັດເອງ (ຄລີນິກ) */
      var bres; try { bres = bookAction_(JSON.parse(p.payload)); } catch (err) { bres = { ok: false, err: 'payload' }; }
      payload = bres;
    } else if (p.action && p.payload) {                    /* ລູກຄ້າ QR: ສັ່ງ/ຂໍເຊັກບິນ ຜ່ານ JSONP */
      var res; try { res = custAction_(JSON.parse(p.payload)); } catch (err) { res = { ok: false, err: 'payload' }; }
      payload = res;
    } else if (p.chat == '1' && p.p) {                    /* ແຊັດ ລູກຄ້າ ↔ ພະນັກງານ (ລູກຄ້າໃຊ້ token ແຊັດ, ພະນັກງານໃຊ້ API token) */
      var cr; try { cr = chatApi_(JSON.parse(p.p)); } catch (err) { cr = { ok: false, err: 'payload' }; }
      payload = cr;
    } else if (p.arch) {                                   /* ຍ້າຍບິນເກົ່າເຂົ້າຄັງ */
      payload = tokenOk_(p.token) ? archiveNow_(p.arch) : { ok: false, err: 'token' };
    } else if (p.sum == '1') {                             /* ສະຫຼຸບຫຍໍ້ ສຳລັບລວມສາຂາ */
      payload = tokenOk_(p.token) ? { ok: true, sum: branchSummary_() } : { ok: false, err: 'token' };
    } else if (p.report) {                                 /* ລາຍງານປະຈຳວັນ: preview / test (ສົ່ງ WhatsApp ດຽວນີ້) */
      if (!tokenOk_(p.token)) payload = { ok: false, err: 'token' };
      else if (p.report == 'stock' || p.report == 'stocktest') { var stt = null; try { stt = JSON.parse(getState_() || 'null'); } catch (e) { } var sl = stt ? stockLowList_(stt) : [], smsg = stockMsg_(stt || {}, sl, '📦 ສະຕ໋ອກໃກ້ໝົດ / ໝົດ (ດຽວນີ້)'); payload = { ok: true, text: smsg || '✓ ບໍ່ມີວັດຖຸດິບທີ່ຕ່ຳກວ່າ Min', count: sl.length, tg: !!(PROP.getProperty('TG_BOT') && PROP.getProperty('TG_CHAT')), wa: waTargets_().length }; if (p.report == 'stocktest') payload.sent = smsg ? tgSend_(smsg) : tgSend_('🧪 ST POS: ທົດສອບແຈ້ງສະຕ໋ອກ — ຕອນນີ້ບໍ່ມີວັດຖຸດິບທີ່ຕ່ຳກວ່າ Min ✓'); }
      else if (p.report == 'test') { var txt = buildDailyReport_(new Date()); payload = { ok: true, text: txt, sent: sendReport_('🧪 ທົດສອບ' + String.fromCharCode(10) + txt) }; }
      else payload = { ok: true, text: buildDailyReport_(new Date()), targets: waTargets_().length, tg: !!PROP.getProperty('TG_BOT'), trigger: ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'dailyReport'; }) };
    } else if (p.bak) {                                    /* backup / restore */
      if (!tokenOk_(p.token)) payload = { ok: false, err: 'token' };
      else if (p.bak == 'now') payload = { ok: true, res: backupDaily() };
      else if (p.bak == 'list') payload = { ok: true, list: JSON.parse(listBackups(p.token)) };
      else if (p.bak == 'restore' && p.tag) payload = { ok: true, res: restoreBackup(p.tag, p.token) };
      else payload = { ok: false, err: 'bak' };
    } else if (!tokenOk_(p.token)) {                       /* ອ່ານ state ເຕັມ ຕ້ອງມີ token */
      payload = { ok: false, err: 'token' };
    } else if (p.ver == '1') {                             /* ກວດເລກເວີຊັນຢ່າງດຽວ (ນ້ອຍຫຼາຍ) — ດຶງເຕັມສະເພາະເມື່ອມີການປ່ຽນ */
      payload = { ok: true, v: +(PROP.getProperty('STATE_V') || 0) };
    } else if (p.gz == '1') {                              /* state ເຕັມ ແບບບີບອັດ gzip+base64 (ນ້ອຍລົງ ~5 ເທົ່າ) */
      var raw = getState_();
      payload = { ok: true, gz: Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(raw, 'application/json')).getBytes()), v: +(PROP.getProperty('STATE_V') || 0) };
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
    if (json.indexOf('GZ:') === 0) {                       /* ແອັບສົ່ງແບບບີບອັດ */
      json = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(json.substring(3)), 'application/x-gzip')).getDataAsString('UTF-8');
    }
    var obj = null; try { obj = JSON.parse(json); } catch (e2) {}
    if (obj && (obj.action === 'order' || obj.action === 'callbill' || obj.action === 'payinfo' || obj.action === 'paidnotice')) {
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
    /* ບິນ 1 ໃບ = (ເວລາ + ໂຕະ + ຍອດ) — ບໍ່ແມ່ນເລກບິນ: ຫຼາຍເຄື່ອງອອກເລກບິນເລກດຽວກັນພ້ອມກັນໄດ້ (ຍັງບໍ່ທັນ sync). ເລກຊ້ຳແຕ່ເປັນຄົນລະບິນ → ເກັບທຸກໃບ ແລະ ເຕີມ -B/-C/-D… ໃຫ້ໃບຫຼັງ;
       ບິນດຽວກັນທີ່ມາຈາກເຄື່ອງເກົ່າ (ເລກເກົ່າ) → ໃຊ້ເລກທີ່ server ຕັດສິນແລ້ວ (ບໍ່ເກີດບິນຜີຊ້ຳ ແລະ ບໍ່ຫາຍ) */
    var bk = function (b) { return (b.ts || 0) + '|' + (b.table || '') + '|' + (+b.total || 0); };
    var out = [], byKey = {}, used = {};
    cur.bills.forEach(function (b) { if (!b || !b.receipt) return; var k = bk(b); if (byKey[k]) return; byKey[k] = b; used[b.receipt] = 1; out.push(b); });
    inc.bills.forEach(function (b) {
      if (!b || !b.receipt) return; var k = bk(b), old = byKey[k];
      if (old) { var i = out.indexOf(old); b.receipt = old.receipt; byKey[k] = b; if (i >= 0) out[i] = b; return; }   /* ບິນເກົ່າ (ອາດຖືກ void/ຄືນເງິນ) = ເອົາຂອງເຄື່ອງ ແຕ່ເກັບເລກຂອງ server */
      if (used[b.receipt]) { var base = String(b.receipt).replace(/(-[B-Z])+$/, ''), c = 66, r; do { r = base + '-' + String.fromCharCode(c++); } while (used[r] && c < 91); if (used[r]) r = base + '-' + (b.ts || Date.now()); b.receipt = r; }
      used[b.receipt] = 1; byKey[k] = b; out.push(b);
    });
    inc.bills = out;
    inc.bills.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    /* ຈ່າຍໂຕະ/ລາຍການດຽວກັນ 2 ເຄື່ອງ (ຄົນລະເຄື່ອງ ຍັງບໍ່ທັນ sync) → ບິນຊ້ຳ ເກັບເງິນຊ້ຳ: ເກັບບິນທຳອິດ, ບິນຫຼັງທີ່ມີລາຍການ (id) ຊ້ຳໝົດ → ຕັດອອກ + ບັນທຶກໃນ dupPays ໃຫ້ກວດ */
    var own = {}, kept = [], dups = [];
    inc.bills.forEach(function (b) {
      var ids = (b && !b.voided && Array.isArray(b.items)) ? b.items.map(function (i) { return i && i.id; }).filter(function (x) { return x !== undefined && x !== null && x !== ''; }) : [];
      if (ids.length && ids.every(function (id) { return own[id]; })) {
        dups.push({ receipt: b.receipt, of: own[ids[0]], ts: b.ts, total: b.total, table: b.table, by: b.by || b.cashier || '', memberId: b.memberId || '', walletPaid: b.walletPaid || 0, pointsUsed: b.pointsUsed || 0, pointsEarned: b.pointsEarned || 0, credit: b.credit ? (b.creditOwed || 0) : 0, at: Date.now() });
        return;
      }
      ids.forEach(function (id) { if (!own[id]) own[id] = b.receipt; });
      kept.push(b);
    });
    if (dups.length) {
      inc.bills = kept;
      var seen = {}; var all = (Array.isArray(cur.dupPays) ? cur.dupPays : []).concat(Array.isArray(inc.dupPays) ? inc.dupPays : []).concat(dups);
      inc.dupPays = all.filter(function (d) { var k = d.receipt + '|' + d.ts; if (seen[k]) return false; seen[k] = 1; return true; }).slice(-100);
    } else if (Array.isArray(cur.dupPays) && cur.dupPays.length && !Array.isArray(inc.dupPays)) inc.dupPays = cur.dupPays;
    var maxSeq = 0; inc.bills.forEach(function (b) { var n = parseInt(b.receipt, 10); if (n > maxSeq) maxSeq = n; });
    if (maxSeq > (+inc.receiptSeq || 0)) inc.receiptSeq = maxSeq;
    return inc;
  } catch (e) { return inc; }
}
/* ຫຼາຍບ່ອນເກັບ: ຮັກສາ stock ຂອງບ່ອນອື່ນຈາກ server (ຄື 1 ຕັ້ງ/ບ່ອນ) — ບ່ອນທີ່ save (_srcLoc) ເປັນເຈົ້າຂອງ bucket ຕົນເອງ */
function mergeStock_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object') return inc;
    var cur = JSON.parse(curStr); if (!cur) return inc;
    /* ວັດຖຸດິບທີ່ຖືກລຶບ (tombstone) — ລວມຈາກທຸກເຄື່ອງ ແລະ ບໍ່ເອົາກັບຄືນ */
    if (cur.ingDel && typeof cur.ingDel === 'object') { if (!inc.ingDel || typeof inc.ingDel !== 'object') inc.ingDel = {}; Object.keys(cur.ingDel).forEach(function (c) { if (!(inc.ingDel[c] >= cur.ingDel[c])) inc.ingDel[c] = cur.ingDel[c]; }); }
    var tomb = function (code, it) { return inc.ingDel && inc.ingDel[code] && !((it && +it.addTs || 0) > inc.ingDel[code]); };
    if (inc.ingDel && inc.ingredients) Object.keys(inc.ingredients).forEach(function (c) { if (tomb(c, inc.ingredients[c])) delete inc.ingredients[c]; });
    var src = inc._srcLoc; if (!src) return inc;
    if (!cur.ingredients) return inc;
    if (!inc.ingredients) inc.ingredients = cur.ingredients;
    var incIng = inc.ingredients, curIng = cur.ingredients;
    Object.keys(curIng).forEach(function (code) {
      var ci = curIng[code], ii = incIng[code];
      if (!ii) { if (tomb(code, ci)) return; incIng[code] = ci; return; }          /* ວັດຖຸດິບຫາຍໃນ incoming → ເກັບຂອງ server */
      /* ຊັ້ນວາງ (rack) ແລະ ຈຳນວນຕໍ່ຊັ້ນ (bins) ແຍກຕາມບ່ອນເກັບ: ບ່ອນອື່ນ = ຂອງ server (ເຄື່ອງເກົ່າຂອງຄົວ ຕ້ອງບໍ່ລຶບຊັ້ນຂອງສາງໃຫຍ່) */
      if (ci) ['rack', 'bins'].forEach(function (f) { if (ci[f] && typeof ci[f] === 'object') Object.keys(ci[f]).forEach(function (loc) { if (loc !== src) { if (!ii[f] || typeof ii[f] !== 'object') ii[f] = {}; ii[f][loc] = ci[f][loc]; } }); });
      if (!ci || !ci.locs) return;
      if (!ii.locs) ii.locs = {};
      Object.keys(ci.locs).forEach(function (loc) { if (loc !== src) ii.locs[loc] = ci.locs[loc]; }); /* ບ່ອນອື່ນ = ຂອງ server */
    });
    /* ບ່ອນດຽວກັນ 2 ເຄື່ອງ (ແຄດເຊຍ+ແທັບເລັດ) ຂາຍພ້ອມກັນ: ເອົາຄ່າຂອງ server + ການເຄື່ອນໄຫວໃໝ່ຂອງເຄື່ອງນີ້ (ຈາກ stockLog) ແທນການຂຽນທັບ */
    if (Array.isArray(cur.stockLog) && cur.stockLog.length && Array.isArray(inc.stockLog)) {
      var lk = function (l) { return l.ts + '|' + l.code + '|' + l.delta + '|' + (l.loc || '') + '|' + (l.reason || ''); };
      var have0 = {}, minTs = Infinity; cur.stockLog.forEach(function (l) { have0[lk(l)] = 1; if ((l.ts || 0) < minTs) minTs = l.ts || 0; });
      var dsum = {}, dsx = {}; inc.stockLog.forEach(function (l) { if (!l || have0[lk(l)] || (l.ts || 0) < minTs) return; var lc = l.loc || src; if (lc !== src) { if (!dsx[l.code]) dsx[l.code] = {}; dsx[l.code][lc] = (dsx[l.code][lc] || 0) + (+l.delta || 0); return; } dsum[l.code] = (dsum[l.code] || 0) + (+l.delta || 0); });
      Object.keys(incIng).forEach(function (code) {
        var ci = curIng[code], ii = incIng[code]; if (!ci || !ci.locs || ci.locs[src] === undefined || !ii) return;
        if (!ii.locs) ii.locs = {};
        ii.locs[src] = Math.round(((+ci.locs[src] || 0) + (dsum[code] || 0)) * 1000) / 1000;
      });
      /* ການເຄື່ອນໄຫວຂອງບ່ອນເກັບອື່ນ ທີ່ເຮັດຈາກເຄື່ອງນີ້ (ເບີກມີປາຍທາງ · ຮັບໂອນ · ນັບສາງບ່ອນອື່ນ · ຮັບ PO ຫຼັງສະຫຼັບບ່ອນ · ປ່ຽນຫົວໜ່ວຍ): ຄ່າ server + ການເຄື່ອນໄຫວໃໝ່ຈາກ ledger */
      Object.keys(dsx).forEach(function (code) { var ci = curIng[code], ii = incIng[code]; if (!ci || !ci.locs || !ii) return; if (!ii.locs) ii.locs = {}; Object.keys(dsx[code]).forEach(function (lc) { ii.locs[lc] = Math.round(((+ci.locs[lc] || 0) + dsx[code][lc]) * 1000) / 1000; }); });
      inc.__stkDelta = 1;
    }
    if (Array.isArray(cur.stockLog)) {                   /* ລວມ ledger ຂ້າມບ່ອນ (ກັນເສຍ log) */
      if (!Array.isArray(inc.stockLog)) inc.stockLog = [];
      var seen = {}; inc.stockLog.forEach(function (l) { seen[l.ts + '|' + l.code + '|' + l.delta + '|' + (l.loc || '') + '|' + (l.reason || '')] = 1; });
      cur.stockLog.forEach(function (l) { var k = l.ts + '|' + l.code + '|' + l.delta + '|' + (l.loc || '') + '|' + (l.reason || ''); if (!seen[k]) { inc.stockLog.push(l); seen[k] = 1; } });
      inc.stockLog.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      if (inc.stockLog.length > 4000) inc.stockLog = inc.stockLog.slice(-4000);
    }
    if (Array.isArray(cur.transfers)) {                  /* ລວມໃບໂອນ: ຄົງໃບຂອງເຄື່ອງອື່ນ + ໃຫ້ສະຖານະທີ່ຄືບໜ້າກວ່າຊະນະ */
      if (!Array.isArray(inc.transfers)) inc.transfers = [];
      /* ລຳດັບຄວາມຄືບໜ້າ: ລໍອະນຸມັດ < ອະນຸມັດແລ້ວ < ສົ່ງອອກ < ຍົກເລີກ < ຮັບແລ້ວ < ຮັບແລ້ວ+ຈັດການ; ເທົ່າກັນ → ອັບເດດລ່າສຸດ (upd) ຊະນະ */
      var rank = function (t) { var s = t.status; return s === 'received' ? (t.resolution ? 4 : 3) : (s === 'void' ? 2 : (s === 'sent' ? 1 : (s === 'approved' ? 0.5 : 0))); };
      var byId = {}; inc.transfers.forEach(function (t) { byId[t.id] = t; });
      cur.transfers.forEach(function (t) {
        var e = byId[t.id];
        if (!e) { inc.transfers.push(t); byId[t.id] = t; }
        else if (rank(t) > rank(e) || (rank(t) === rank(e) && (+t.upd || 0) > (+e.upd || 0))) { inc.transfers[inc.transfers.indexOf(e)] = t; byId[t.id] = t; }
      });
      inc.transfers.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    }
    return inc;
  } catch (e) { return inc; }
}
/* ລວມເອກະສານຈັດຊື້ (PR/PO/GRN/ຜູ້ຂາຍ) ຂ້າມເຄື່ອງ: ຄົງເອກະສານຂອງເຄື່ອງອື່ນ + ສະບັບທີ່ອັບເດດຫຼ້າສຸດ (upd) ຊະນະ */
/* ນັບສາງ: ຫຼາຍເຄື່ອງນັບຮອບດຽວກັນ — ລວມລາຍການທີ່ນັບ ໂດຍເອົາອັນທີ່ໃສ່ຫຼ້າສຸດ (line.ts) */
function mergeCountLines_(a, b) {
  var m = {}; (b.lines || []).forEach(function (l) { m[l.code] = l; });
  (a.lines || []).forEach(function (l, i) { var o = m[l.code]; if (o && (o.ts || 0) > (l.ts || 0)) a.lines[i] = o; });
  a.upd = Math.max(a.upd || 0, b.upd || 0);
}
function mergeDocs_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object') return inc;
    var cur = JSON.parse(curStr); if (!cur) return inc;
    ['prs', 'pos', 'grns', 'vendors', 'procWorkflows', 'reqs', 'stockCounts', 'chkSubs', 'resv', 'rx', 'stockAdj', 'wastes', 'dlSettles', 'costAlerts', 'kpacks', 'prods', 'apl', 'vrets', 'giftCards', 'gcTx', 'consents','htTypes', 'htRooms', 'htRates', 'htPlans', 'htBookings', 'htGuests', 'htPromos', 'htChg', 'htPay', 'htAcc', 'htImg', 'htTask', 'htMt', 'htLf', 'htSvc', 'htSvcOrd'].forEach(function (k) {
      if (!Array.isArray(cur[k])) return;
      if (!Array.isArray(inc[k])) inc[k] = [];
      var byId = {}; inc[k].forEach(function (d, i) { byId[d.id] = i; });
      cur[k].forEach(function (d) {
        var i = byId[d.id];
        if (i === undefined) { inc[k].push(d); byId[d.id] = inc[k].length - 1; }
        else if (k === 'stockCounts' && d.status === 'COUNTING' && inc[k][i].status === 'COUNTING') { mergeCountLines_(inc[k][i], d); }
        else if ((d.upd || d.ts || 0) > (inc[k][i].upd || inc[k][i].ts || 0)) inc[k][i] = d;
      });
      inc[k].sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    });
    /* ເຊັກລິດ: ຂໍ້ຄວາມລາຍການຕາມເວີຊັນ — ລວມກະແຈທີ່ຂາດ */
    if (cur.chkSets && typeof cur.chkSets === 'object') { if (!inc.chkSets || typeof inc.chkSets !== 'object') inc.chkSets = {}; Object.keys(cur.chkSets).forEach(function (k) { if (!inc.chkSets[k]) inc.chkSets[k] = cur.chkSets[k]; }); }
    /* log ແບບຕໍ່ທ້າຍ (ບໍ່ມີການລຶບ): ລວມທັງສອງຝັ່ງ ກັນ log ຂອງເຄື່ອງອື່ນຫາຍເມື່ອບັນທຶກພ້ອມກັນ */
    var LOGS = { cancelLog: function (l) { return l.ts + '|' + (l.type || '') + '|' + (l.name || '') + '|' + (l.table || '') + '|' + (l.qty || ''); },
      orderLog: function (l) { return l.ts + '|' + (l.action || '') + '|' + (l.detail || '') + '|' + (l.table || ''); },
      menuLog: function (l) { return l.ts + '|' + (l.code || '') + '|' + (l.reason || ''); },
      kdsLog: function (l) { return (l.id || '') + '|' + (l.end || l.ts || ''); },
      shiftLog: function (l) { return (l.id || '') + '|' + (l.openTs || l.ts || '') + '|' + (l.name || ''); } };
    Object.keys(LOGS).forEach(function (k) {
      if (!Array.isArray(cur[k]) || !cur[k].length) return;
      if (!Array.isArray(inc[k])) inc[k] = [];
      var key = LOGS[k], seen = {};
      inc[k].forEach(function (l) { if (l) seen[key(l)] = 1; });
      var added = 0; cur[k].forEach(function (l) { if (!l) return; var kk = key(l); if (!seen[kk]) { inc[k].push(l); seen[kk] = 1; added++; } });
      if (added) inc[k].sort(function (a, b) { return (a.ts || a.openTs || 0) - (b.ts || b.openTs || 0); });
      var cap = { cancelLog: 3000, orderLog: 2000, menuLog: 2000, shiftLog: 1000, kdsLog: 3000 }[k]; if (inc[k].length > cap) inc[k] = inc[k].slice(-cap);
    });
    return inc;
  } catch (e) { return inc; }
}
/* ຫຼາຍເຄື່ອງພ້ອມກັນ: ລວມລາຍໂຕະ / ລາຍອໍເດີ / ລາຍສະມາຊິກ ຕາມເວລາແກ້ໄຂ (upd) — ອັນໃໝ່ກວ່າຊະນະ.
   ເດີມຂຽນທັບທັງກ້ອນ → ອໍເດີຂອງແທັບເລັດຫາຍ ເມື່ອແຄດເຊຍບັນທຶກພ້ອມກັນ */
function mergeTables_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object' || !inc.tables) return inc;
    var cur = JSON.parse(curStr); if (!cur || !cur.tables) return inc;
    var U = function (x) { return +(x && x.upd) || 0; };
    var curOrd = {}; (cur.orders || []).forEach(function (o) { curOrd[String(o.id)] = o; });
    if (!Array.isArray(inc.orders)) inc.orders = [];
    var incOrd = {}; inc.orders.forEach(function (o) { incOrd[String(o.id)] = o; });
    var paid = {}; (inc.bills || []).forEach(function (b) { if (b && !b.voided) (b.items || []).forEach(function (i) { paid[String(i.id)] = 1; }); });
    var fromCur = {}, itemLvl = false;
    Object.keys(cur.tables).forEach(function (k) {
      var ct = cur.tables[k], it = inc.tables[k];
      if (!it) { if (ct && ct.dl && !ct.dl.closed) { inc.tables[k] = ct; fromCur[k] = 1; } return; } /* ອໍເດີ Delivery ທີ່ເຄື່ອງອື່ນຫາກໍເປີດ — ບໍ່ໃຫ້ຫາຍ */
      var win = U(ct) > U(it) ? ct : it, lose = win === ct ? it : ct;
      if (win === ct) { inc.tables[k] = ct; fromCur[k] = 1; }
      /* ທັງສອງເຄື່ອງເປັນເວີຊັນໃໝ່ (dv) → ລວມລາຍການ: ຂອງຝັ່ງທີ່ໃໝ່ກວ່າ + ລາຍການຂອງອີກຝັ່ງທີ່ບໍ່ໄດ້ຖືກລຶບ/ຈ່າຍ/ຍ້າຍ */
      if (ct.dv && it.dv && U(ct) !== U(it)) {
        var del = {}; (ct.del || []).concat(it.del || []).forEach(function (x) { del[String(x)] = 1; });
        var have = {}, items = [];
        (win.items || []).forEach(function (i) { var id = String(i.id); if (del[id] || have[id]) return; have[id] = 1; items.push(i); });
        (lose.items || []).forEach(function (i) { var id = String(i.id); if (del[id] || have[id] || paid[id]) return; have[id] = 1; items.push(i); itemLvl = true; });
        var t = inc.tables[k] = JSON.parse(JSON.stringify(win)); t.items = items; t.del = Object.keys(del).slice(-150);
        if (items.length && t.status === 'free') t.status = 'busy';
      }
    });
    /* ອໍເດີຄົວ: ລວມທັງສອງຝັ່ງຕາມ id (upd ໃໝ່ກວ່າຊະນະ = ສະຖານະຄົວລ່າສຸດ) ແລ້ວເກັບສະເພາະອັນທີ່ຍັງມີລາຍການຢູ່ໂຕະ */
    var live = {}; Object.keys(inc.tables).forEach(function (k) { (inc.tables[k].items || []).forEach(function (i) { if (!paid[String(i.id)]) live[String(i.id)] = k; }); });
    var out = [], seenO = {};
    inc.orders.concat(cur.orders || []).forEach(function (o) { var id = String(o.id); if (seenO[id]) return; seenO[id] = 1;
      var a = incOrd[id], c = curOrd[id], o2 = (a && c) ? (U(c) > U(a) ? c : a) : (a || c);
      if (!live[id]) return;
      if (live[id] && o2.table !== live[id]) { o2 = JSON.parse(JSON.stringify(o2)); o2.table = live[id]; }
      out.push(o2); });
    /* ລາຍການທີ່ຈ່າຍແລ້ວ (ມີໃນບິນ) ບໍ່ໃຫ້ກັບມາຄ້າງໂຕະ/ຈໍຄົວອີກ */
    Object.keys(inc.tables).forEach(function (k) { var t = inc.tables[k]; if (!t || !Array.isArray(t.items)) return;
      var n0 = t.items.length; t.items = t.items.filter(function (i) { return !paid[String(i.id)]; });
      if (n0 && !t.items.length && t.status !== 'merged') { t.status = 'free'; t.billTs = null; } });
    inc.orders = out.filter(function (o) { return !paid[String(o.id)]; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    /* ສະມາຊິກ: ເງິນກະເປົາ/ແຕ້ມ/ໜີ້ ບໍ່ຫາຍເມື່ອ 2 ເຄື່ອງແກ້ຄົນລະຄົນ */
    if (Array.isArray(cur.customers)) {
      if (!Array.isArray(inc.customers)) inc.customers = [];
      var ci = {}; inc.customers.forEach(function (c, i) { ci[String(c.id)] = i; });
      var del = {}; (inc._custDel || []).concat(cur._custDel || []).forEach(function (x) { del[String(x)] = 1; });
      cur.customers.forEach(function (c) { var i = ci[String(c.id)];
        if (i === undefined) { if (!del[String(c.id)]) inc.customers.push(c); }
        else if (U(c) > U(inc.customers[i])) inc.customers[i] = c; });
      inc.customers = inc.customers.filter(function (c) { return !del[String(c.id)]; });
      inc._custDel = Object.keys(del).slice(-300);
    }
    return inc;
  } catch (e) { return inc; }
}
/* ອໍເດີ QR ທີ່ລູກຄ້າສັ່ງ ແຕ່ເຄື່ອງພະນັກງານຍັງບໍ່ໄດ້ sync — ຢ່າໃຫ້ການບັນທຶກຂອງເຄື່ອງພະນັກງານຂຽນທັບຫາຍ.
   ລາຍການ QR (qr:true) ທີ່ມີໃນ server ແຕ່ບໍ່ພົບໃນຂໍ້ມູນທີ່ສົ່ງມາ (ບໍ່ຢູ່ໂຕະໃດ, ບໍ່ຢູ່ໃນບິນ, ບໍ່ຢູ່ໃນ log ລຶບ) = ເຄື່ອງນັ້ນຍັງບໍ່ເຫັນ → ໃສ່ຄືນ */
function mergeQr_(curStr, inc) {
  try {
    if (!curStr || !inc || typeof inc !== 'object' || !inc.tables) return inc;
    var cur = JSON.parse(curStr); if (!cur || !cur.tables) return inc;
    var now = Date.now(), seen = {}, added = 0;
    Object.keys(inc.tables).forEach(function (k) { (inc.tables[k].items || []).forEach(function (i) { seen[String(i.id)] = 1; }); });
    (inc.bills || []).forEach(function (b) { (b.items || []).forEach(function (i) { seen[String(i.id)] = 1; }); });
    (inc.cancelLog || []).forEach(function (l) { if (l.id != null) seen[String(l.id)] = 1; });
    var map = {}; var cat = inc.catalog || cur.catalog || {};
    for (var c in cat) for (var s in cat[c]) (cat[c][s] || []).forEach(function (p) { map[p.c] = p; });
    Object.keys(cur.tables).forEach(function (k) {
      var ct = cur.tables[k], it = inc.tables[k]; if (!it) return;
      (ct.items || []).forEach(function (line) {
        if (!line.qr || seen[String(line.id)] || now - (line.ts || 0) > 6 * 3600000) return;
        if (!Array.isArray(it.items)) it.items = [];
        it.items.push(line); seen[String(line.id)] = 1; added++;
        if (it.status === 'free') it.status = 'busy';
        if (!Array.isArray(inc.orders)) inc.orders = [];
        if (!inc.orders.some(function (o) { return String(o.id) === String(line.id); })) {
          var co = (cur.orders || []).filter(function (o) { return String(o.id) === String(line.id); })[0];
          inc.orders.push(co || { id: line.id, table: k, code: line.code, name: line.name, qty: line.qty, k: line.k, mods: line.mods, note: line.note, status: 'wait', ts: line.ts, qr: true });
        }
        var def = map[line.code], loc = line.qrLoc || 'main';
        if (def && !inc.__stkDelta && inc._srcLoc === loc && inc.ingredients) lineBom_(def, line, inc).forEach(function (b) {
          var ing = inc.ingredients[b[0]]; if (!ing) return; if (!ing.locs) ing.locs = {};
          ing.locs[loc] = Math.round(((+ing.locs[loc] || 0) - b[1] * line.qty) * 1000) / 1000;
        });
      });
      if (ct.callTs && ct.callTs > (it.callTs || 0) && (it.items || []).length && it.status !== 'bill') { it.status = 'callbill'; it.callTs = ct.callTs; if (ct.callPay) it.callPay = ct.callPay; added++; }
      if (ct.xferNotice && ct.xferNotice > (it.xferNotice || 0)) { it.xferNotice = ct.xferNotice; added++; }
    });
    /* ມີການໃສ່ຄືນ → ເລກເວີຊັນໃໝ່ກວ່າເຄື່ອງທີ່ສົ່ງມາ ເພື່ອໃຫ້ທຸກເຄື່ອງດຶງໄປສະແດງ */
    if (added) inc._v = Math.max(+inc._v || 0, now) + 1;
    return inc;
  } catch (e) { return inc; }
}
function saveStateRaw_(json, skipMerge, quiet) {
  json = String(json == null ? '' : json);
  if (!skipMerge) { try { var inc = JSON.parse(json); if (inc && typeof inc === 'object' && !inc.cust) { var cur = getState_(); var curRst = cur ? +((/"_reset":(\d+)/.exec(cur) || [0, 0])[1]) : 0; if (inc._reset && +inc._reset > curRst) { cur = null; } /* ລ້າງຂໍ້ມູນ: ບໍ່ລວມຂອງເກົ່າຄືນ */ var j0 = json; inc = mergeBills_(cur, inc); inc = mergeStock_(cur, inc); inc = mergeDocs_(cur, inc); inc = mergeTables_(cur, inc); inc = mergeQr_(cur, inc); delete inc.__stkDelta; json = JSON.stringify(inc);
    /* ລວມຂອງເຄື່ອງອື່ນເຂົ້າມາ → ເລກເວີຊັນໃໝ່ ໃຫ້ເຄື່ອງທີ່ບັນທຶກ (ແລະທຸກເຄື່ອງ) ດຶງໄປສະແດງ */
    if (json !== j0 && cur) { var cv = +((/"_v":(\d+)/.exec(cur) || [0, 0])[1]); inc._v = Math.max(+inc._v || 0, cv, Date.now()) + 1; json = JSON.stringify(inc); } } } catch (e) {} }
  var ss = getSS_();
  if (!ss) { PROP.setProperty('ST_BLOB', json.substring(0, 9000)); return true; }
  var sh = tab_(ss, 'STATE'); sh.clearContents();
  var rows = []; for (var i = 0; i < json.length; i += CELL) rows.push([json.substr(i, CELL)]);
  if (rows.length) sh.getRange(1, 1, rows.length, 1).setValues(rows);
  /* ເລກເວີຊັນ ໄວ້ໃຫ້ແອັບກວດໄວໆ (ບໍ່ຕ້ອງດຶງ state ເຕັມ) */
  var mv = /"_v":(\d+)/.exec(json); PROP.setProperty('STATE_V', String(mv ? mv[1] : Date.now()));
  sdNotify_(json);
  stockNotify_(json);
  /* ແທັບສຳເນົາໃຫ້ຄົນອ່ານ (Tables/Stock/Bills…) ຂຽນຊ້າ — ສູງສຸດທຸກ 2 ນາທີ (ເດີມຂຽນທຸກການບັນທຶກ ເຮັດໃຫ້ຊ້າ) */
  var lastM = +(PROP.getProperty('MIRROR_TS') || 0);
  if ((skipMerge && !quiet) || Date.now() - lastM > 120000) { try { writeMirrors_(ss, JSON.parse(json)); PROP.setProperty('MIRROR_TS', String(Date.now())); } catch (e) {} }
  SpreadsheetApp.flush();
  return true;
}
function saveState(json, tok) {
  if (!tokenOk_(tok)) return false;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); return saveStateRaw_(json); }
  catch (e) { return false; } finally { try { lock.releaseLock(); } catch (e2) {} }
}

/* ບ່ອນເກັບທີ່ QR ຕັດສະຕ໋ອກ (ສາຂາທຳອິດ ຫຼື ບ່ອນທຳອິດ) */
function qrLoc_(st) { var L = st.locations || []; if (!L.length) return 'main'; var b = L.filter(function (l) { return l.type === 'branch'; })[0] || L[0]; return b.id; }
function stockHave_(st, code, loc) { var it = st.ingredients && st.ingredients[code]; if (!it) return Infinity; if (it.locs && it.locs[loc] !== undefined) return +it.locs[loc] || 0; return loc === 'main' && typeof it.stock === 'number' ? it.stock : 0; }
/* ເມນູທີ່ໝົດ + (ຖ້າເປີດ "ກັນຂາຍເມື່ອສະຕ໋ອກບໍ່ພໍ") ເມນູທີ່ວັດຖຸດິບບໍ່ພໍເຮັດ 1 ຈານ */
function qrSoldOut_(st) {
  var out = {}; var so = st.soldOut || {}; for (var k in so) out[k] = so[k];
  if (st.stockBlock === false || (st.modules && st.modules.stock === false)) return out;
  var loc = qrLoc_(st), cat = st.catalog || {};
  for (var c in cat) for (var sub in cat[c]) (cat[c][sub] || []).forEach(function (m) {
    if ((m.bom || []).some(function (b) { return stockHave_(st, b[0], loc) < (+b[1] || 0) - 1e-9; })) out[m.c] = true; });
  return out;
}
/* ---- ລູກຄ້າ QR: ຂໍ້ມູນສະເພາະໂຕະຕົນເອງ (ບໍ່ມີ ບິນ/ລາຍຈ່າຍ/ຜູ້ໃຊ້/ສະຕ໋ອກ/ກະ) ---- */
/* ຂະໜາດ & Topping: ລາຄາ/ສູດ ຈາກກຸ່ມທີ່ໃຊ້ກັບເມນູນີ້ເທົ່ານັ້ນ (ກັນຊື່ຊ້ຳຂ້າມກຸ່ມ) */
function mgApplies_(g, def) { if (g.scope === 'items') return (g.codes || []).indexOf(def.c) >= 0; return !g.scope || g.scope === 'all' || g.scope === def.k; }
function modInfo_(st, def, mods) {
  var mo = st.modules || {}; if (mo.opts === false) { var st2 = {}; for (var kk in st) st2[kk] = st[kk]; st2.modGroups = []; st = st2; }
  var pick = {}; mods.forEach(function (m) { pick[m] = 1; }); var price = 0, bm = 1, xb = [];
  (st.modGroups || []).forEach(function (g) { if (!mgApplies_(g, def)) return; var t = g.type || (g.multi ? 'topping' : 'choice');
    (g.opts || []).forEach(function (o) { if (!o || o.n == null || !pick[String(o.n)]) return; var own = def.op && def.op[g.id]; price += (own && own[o.n] != null && own[o.n] !== '') ? +own[o.n] : (+o.p || 0); if (t === 'size' && +o.bm > 0) bm *= +o.bm; if (o.ing && +o.iq > 0) xb.push([o.ing, +o.iq]); }); });
  var pk = [];
  if (mods.indexOf('ກັບບ້ານ') >= 0 && mo.pkg !== false) { /* ບັນຈຸພັນກັບບ້ານ: ເມນູກຳນົດເອງ > ຕາມປະເພດ · ຂະໜາດປ່ຽນພາຊະນະຫຼັກໄດ້ */
    var cfg = st.pkg || {}; pk = (Array.isArray(def.pk) ? def.pk : (cfg[def.k === 'drink' ? 'drink' : 'food'] || [])).filter(function (x) { return x && x[0] && +x[1] > 0; }).map(function (x) { return [x[0], +x[1]]; });
    var gs = (st.modGroups || []).filter(function (g) { return mgApplies_(g, def); }), typ = function (g) { return g.type || (g.multi ? 'topping' : 'choice'); };
    gs.forEach(function (g) { if (typ(g) === 'size') return; (g.opts || []).forEach(function (o) { if (o && pick[String(o.n)] && Array.isArray(o.pks) && o.pks.length) pk = o.pks.map(function (x) { return [x[0], +x[1] > 0 ? +x[1] : 1]; }); }); });
    gs.forEach(function (g) { if (typ(g) !== 'size') return; (g.opts || []).forEach(function (o) { if (!o || !pick[String(o.n)]) return; var code = o.pc; if (o.pcm) Object.keys(o.pcm).forEach(function (k) { if (o.pcm[k] && pick[k]) code = o.pcm[k]; }); if (code) { var cq = +o.pcq > 0 ? +o.pcq : 1; if (pk.length) pk[0] = [code, cq]; else pk.push([code, cq]); } }); });
    pk = pk.filter(function (x) { return st.ingredients && st.ingredients[x[0]]; });
  }
  return { price: price, bm: Math.round(bm * 1000) / 1000, xb: xb, pk: pk };
}
/* st (ບໍ່ບັງຄັບ): ຖ້າເປີດ yieldCut (ປິດເປັນຄ່າເລີ່ມຕົ້ນ — ສູດ Excel ມາດຕະຖານລວມ Yield ແລ້ວ) ຕັດສະຕ໋ອກ = ສູດ ÷ Yield (ເຊັ່ນ 200 g ທີ່ Yield 90% → 222.22 g) — ຕ້ອງຄືກັບ lineBomOf0 ໃນແອັບ */
function lineBom_(def, line, st) { var m = +line.bm > 0 ? +line.bm : 1, out = [], ing = st && st.ingredients, yc = !!st && st.yieldCut === true;
  var f = function (c) { var i = ing && ing[c], y = i ? +i.yield : 0; return yc && y > 0 && y < 100 ? 100 / y : 1; };
  var put = function (c, q) { out.push([c, Math.round(q * f(c) * 1e6) / 1e6]); };
  (def.bom || []).forEach(function (b) { put(b[0], (+b[1] || 0) * m); }); (line.xb || []).forEach(function (x) { if (x && x[0] && +x[1] > 0) put(x[0], +x[1]); }); (line.pk || []).forEach(function (x) { if (x && x[0] && +x[1] > 0) out.push([x[0], +x[1]]); }); return out; }
/* ລະຫັດ PIN/ໝົດອາຍຸ ຂອງ QR ໂຕະ — ໃຊ້ທັງອ່ານ ແລະ ສັ່ງ (PIN ບໍ່ຖືກສົ່ງຄືນໄປຫາລູກຄ້າ) */
function custPinOk_(st, table, pin, prevOk) {
  if (st.qrGlobal === false) return false;
  var q = (st.qr || {})[table];
  if (q && q.enabled === false) return false;
  if (st.qrPinRequired === false) return true;
  if (!q) return false;
  if (st.qrExpires !== false && q.expiry < Date.now()) return false;
  if (String(pin || '') === String(q.pin)) return true;
  /* ຫຼັງແຄັສເຊຍເຊັກບິນ ລະບົບປ່ຽນ PIN ໃໝ່ (QR ເກົ່າໃຊ້ສັ່ງບໍ່ໄດ້) — ໂທລະສັບຂອງລູກຄ້າທີ່ນັ່ງຢູ່ ຍັງໃຊ້ PIN ເກົ່າ ອ່ານ/ເບິ່ງ QR ໂອນ/ແຈ້ງໂອນໄດ້ ແລ້ວຮັບ PIN ໃໝ່ */
  return !!(prevOk && q.prevPin && String(pin || '') === String(q.prevPin));
}
/* ລາຍເຊັນຂອງບິນ — ຖ້າລາຍການ/ລາຄາ/ສ່ວນລົດປ່ຽນຫຼັງພະນັກງານເຊັກບິນ QR ໂອນເກົ່າຈະບໍ່ຖືກສະແດງ (ກັນລູກຄ້າໂອນຜິດຍອດ) */
function tblSig_(st, t) {
  return (t.items || []).map(function (i) { return [i.id, i.qty, i.price || 0, i.modPrice || 0, i.disc || 0, i.promoAmt || 0].join(':'); }).join(',') +
    '|' + (st.billDiscPct || 0) + '|' + (st.serviceChargePct || 0) + '|' + (st.vatPct || 0);
}
function custFilter_(st, table, pin, prevOk) {
  var ok = custPinOk_(st, table, pin, prevOk);
  var out = { cust: true, shopName: st.shopName || '', pinOk: ok };
  if (!ok) return out;
  var q0 = (st.qr || {})[table];
  if (q0 && q0.prevPin && String(pin || '') === String(q0.prevPin)) out.np = String(q0.pin);
  out.catalog = st.catalog || {}; out.menuImg = st.menuImg || {};
  out.soldOut = qrSoldOut_(st); out.modGroups = (st.modules && st.modules.opts === false) ? [] : (st.modGroups || []);
  out.serviceChargePct = st.serviceChargePct || 0; out.vatPct = st.vatPct || 0; out.billDiscPct = st.billDiscPct || 0;
  out.qrGlobal = st.qrGlobal; out.qrPinRequired = st.qrPinRequired; out.qrExpires = st.qrExpires;
  out.chatOn = !(st.modules && st.modules.chat === false); out.xferOn = !!st.bankQR;
  out.activeTable = table; out.orderNo = st.orderNo || 1; out.tables = {}; out.qr = {}; out.orders = []; out._v = st._v || 0;
  var t = (st.tables || {})[table];
  if (t) out.tables[table] = { name: t.name, floor: t.floor, status: t.status, items: t.items || [], customer: t.customer || null, callPay: t.callPay || '', xferNotice: t.xferNotice || 0 };
  var q = (st.qr || {})[table];
  if (q) out.qr[table] = { enabled: q.enabled, expiry: q.expiry };
  out.orders = (st.orders || []).filter(function (o) { return o.table === table; });
  return out;
}
function getStateCust(table, pin) {
  try { var s = getState_(); if (!s) return ''; return JSON.stringify(custFilter_(JSON.parse(s), String(table), pin, true)); }
  catch (e) { return ''; }
}

/* ---- ຄົນເຈັບຈອງນັດເອງອອນລາຍ (ຄລີນິກ) ----
   ປິດເປັນຄ່າເລີ່ມຕົ້ນ (state.bookOn). ຄົນເຈັບບໍ່ມີ token: ເຫັນສະເພາະ ຊື່ຄລີນິກ, ປະເພດນັດ, ເວລາວ່າງ (ບໍ່ເຫັນຊື່/ເບີຂອງຄົນອື່ນ).
   server ກວດທຸກຢ່າງເອງ (ມື້ປິດ, ມື້ເປີດ, ເວລາ, ຫ້ອງຊ້ອນ, ຈຳນວນຄຳຂໍ). ຄຳຂໍເຂົ້າສະຖານະ 'request' ໃຫ້ພະນັກງານຢືນຢັນ (ເປີດ bookAuto = ເຂົ້າ 'booked' ເລີຍ). */
function bkMin_(hm) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function bkFmt_(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
function bkToday_() { return Utilities.formatDate(new Date(), 'Asia/Vientiane', 'yyyy-MM-dd'); }
function bkNowMin_() { return bkMin_(Utilities.formatDate(new Date(), 'Asia/Vientiane', 'HH:mm')); }
function bkCfg_(st) {
  var c = st.bookCfg || {};
  return { from: bkMin_(c.from) != null ? bkFmt_(bkMin_(c.from)) : '08:00', to: bkMin_(c.to) != null ? bkFmt_(bkMin_(c.to)) : '17:00',
    step: [10, 15, 20, 30, 60].indexOf(+c.step) >= 0 ? +c.step : 30, lead: (+c.lead >= 0 && +c.lead <= 72 && c.lead !== '' && c.lead != null) ? +c.lead : 1,
    days: (+c.days >= 1 && +c.days <= 120) ? +c.days : 30, dur: (+c.dur >= 5 && +c.dur <= 480) ? +c.dur : 30,
    dow: Array.isArray(c.dow) ? c.dow.map(Number).filter(function (d) { return d >= 0 && d <= 6; }) : [1, 2, 3, 4, 5, 6], note: String(c.note || '').slice(0, 200), auto: !!st.bookAuto };
}
function bkRooms_(st) {
  var names = Object.keys(st.tables || {}).filter(function (n) { var t = st.tables[n]; return t && !t.dl && t.status !== 'merged' && n !== 'ແຄັດເຊຍ'; });
  var sel = (st.bookRooms || []).filter(function (n) { return names.indexOf(n) >= 0; });
  if (sel.length) return sel;
  var doc = names.filter(function (n) { return st.tables[n].floor === 'ແພດ'; });
  return doc.length ? doc : names;
}
function bkTypes_(st) { return (st.apptTypes || []).filter(function (t) { return t && t.id && t.name && +t.dur >= 5; }).map(function (t) { return { id: t.id, name: String(t.name).slice(0, 60), dur: +t.dur }; }); }
function bkDiff_(date) { return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(bkToday_() + 'T00:00:00Z')) / 86400000); }
function bkSlots_(st, cfg, date, dur) {
  var out = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return out;
  var diff = bkDiff_(date); if (isNaN(diff) || diff < 0 || diff > cfg.days) return out;
  if ((st.rvClosed || []).indexOf(date) >= 0) return out;
  if (cfg.dow.indexOf(new Date(date + 'T00:00:00Z').getUTCDay()) < 0) return out;
  var rooms = bkRooms_(st), nowM = bkNowMin_(), from = bkMin_(cfg.from), to = bkMin_(cfg.to);
  var busy = (st.resv || []).filter(function (x) { return x.date === date && (x.status === 'booked' || x.status === 'seated' || x.status === 'request'); });
  for (var m = from; m + dur <= to; m += cfg.step) {
    if (diff * 1440 + m - nowM < cfg.lead * 60) continue;
    var free = rooms.filter(function (r) { return !busy.some(function (x) { if (x.table !== r) return false; var s = bkMin_(x.time); if (s == null) return true; var d2 = +x.dur || 120; return m < s + d2 && s < m + dur; }); });
    if (free.length) out.push({ t: bkFmt_(m), rooms: free });
  }
  return out;
}
function bookAction_(payload) {
  payload = payload || {};
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var s = getState_(); if (!s) return { ok: false, err: 'off' };
    var st = JSON.parse(s);
    if (!st.bookOn) return { ok: false, err: 'off' };
    var cfg = bkCfg_(st), types = bkTypes_(st), act = String(payload.a || '');
    var dur = function (typeId) { var t = types.filter(function (x) { return x.id === typeId; })[0]; return t ? t.dur : cfg.dur; };
    if (act === 'info') return { ok: true, shop: String(st.shopName || '').slice(0, 80), note: cfg.note, types: types, rooms: bkRooms_(st), days: cfg.days, dow: cfg.dow, auto: cfg.auto, from: cfg.from, to: cfg.to, closed: (st.rvClosed || []).filter(function (d) { return d >= bkToday_(); }).slice(0, 200) };
    if (act === 'slots') return { ok: true, slots: bkSlots_(st, cfg, String(payload.date || ''), dur(String(payload.type || ''))) };
    if (act !== 'req') return { ok: false, err: 'action' };
    if (String(payload.hp || '') !== '') return { ok: true, no: '' };   /* ຊ່ອງດັກບອດ */
    var clean = function (v, n) { return String(v == null ? '' : v).replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); };
    var name = clean(payload.name, 60), phone = String(payload.phone || '').replace(/[^\d]/g, ''), date = String(payload.date || ''), time = String(payload.time || '');
    if (name.length < 2) return { ok: false, err: 'ໃສ່ຊື່' };
    if (phone.length < 8 || phone.length > 15) return { ok: false, err: 'ເບີໂທບໍ່ຖືກຕ້ອງ' };
    var typeId = String(payload.type || ''), typeObj = types.filter(function (x) { return x.id === typeId; })[0] || null;
    if (types.length && !typeObj) return { ok: false, err: 'ເລືອກປະເພດນັດ' };
    var d = typeObj ? typeObj.dur : cfg.dur, slots = bkSlots_(st, cfg, date, d), slot = slots.filter(function (x) { return x.t === time; })[0];
    if (!slot) return { ok: false, err: 'ເວລານີ້ບໍ່ວ່າງແລ້ວ — ເລືອກເວລາອື່ນ' };
    var room = clean(payload.room, 80);
    if (room) { if (slot.rooms.indexOf(room) < 0) return { ok: false, err: 'ແພດ/ຫ້ອງນີ້ບໍ່ວ່າງເວລານີ້' }; }
    else {   /* ບໍ່ເລືອກ → ຫ້ອງທີ່ມີນັດໜ້ອຍສຸດໃນມື້ນັ້ນ */
      var cnt = function (r) { return (st.resv || []).filter(function (x) { return x.date === date && x.table === r && x.status !== 'cancelled' && x.status !== 'noshow'; }).length; };
      room = slot.rooms.slice().sort(function (a, b) { return cnt(a) - cnt(b); })[0];
    }
    if (!st.resv) st.resv = [];
    var p8 = phone.slice(-8), live = st.resv.filter(function (x) { return (x.status === 'request' || x.status === 'booked') && String(x.phone || '').replace(/[^\d]/g, '').slice(-8) === p8; });
    var dup = live.filter(function (x) { return x.date === date && x.time === time; })[0];
    if (dup) return { ok: true, dup: true, no: dup.no, status: dup.status };
    if (live.filter(function (x) { return x.status === 'request'; }).length >= 3) return { ok: false, err: 'ມີຄຳຂໍທີ່ລໍຢືນຢັນຫຼາຍເກີນໄປ — ກະລຸນາລໍຮ້ານຢືນຢັນ ຫຼື ໂທຫາຮ້ານ' };
    if (st.resv.filter(function (x) { return x.status === 'request'; }).length >= 200) return { ok: false, err: 'ຂະນະນີ້ຮັບຄຳຂໍບໍ່ໄດ້ — ກະລຸນາໂທຫາຮ້ານ' };
    var now = Date.now(), td = bkToday_().replace(/-/g, '').slice(2), seq = st.resv.filter(function (x) { return x.online && String(x.no || '').indexOf('OL-' + td) === 0; }).length + 1;
    var mem = (st.customers || []).filter(function (c) { return String(c.phone || '').replace(/[^\d]/g, '').slice(-8) === p8; })[0];
    var r = { id: 'rv' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36), no: 'OL-' + td + '-' + ('000' + seq).slice(-3), date: date, time: time, dur: d, table: room, guests: 1, name: name, phone: phone, memberId: mem ? mem.id : null,
      note: 'ນັດອອນລາຍ', reason: clean(payload.reason, 200), allergy: clean(payload.allergy, 100), status: cfg.auto ? 'booked' : 'request', online: true, ts: now, upd: now, byName: 'ຄົນເຈັບ (ອອນລາຍ)',
      hist: [{ ts: now, by: 'ຄົນເຈັບ (ອອນລາຍ)', act: cfg.auto ? 'ຈອງອອນລາຍ' : 'ຂໍນັດອອນລາຍ', note: date + ' ' + time }] };
    if (payload.first === true || payload.first === false) r.first = payload.first;
    if (typeObj) { r.type = typeObj.id; r.typeName = typeObj.name; }
    if (!r.reason) delete r.reason; if (!r.allergy) delete r.allergy;
    st.resv.push(r);
    if (!st.orderLog) st.orderLog = [];
    st.orderLog.push({ ts: now, table: room, action: cfg.auto ? 'ຈອງນັດອອນລາຍ' : 'ຂໍນັດອອນລາຍ', detail: r.no + ' · ' + name + ' · ' + date + ' ' + time, by: 'ຄົນເຈັບ (ອອນລາຍ)' });
    st._v = Math.max(Date.now(), (+st._v || 0) + 1); saveStateRaw_(JSON.stringify(st), true, true);
    return { ok: true, no: r.no, status: r.status, date: date, time: time, room: room, shop: String(st.shopName || '') };
  } catch (err) { return { ok: false, err: 'server' }; }
  finally { try { lock.releaseLock(); } catch (e) {} }
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
      var prevOk = payload.action === 'payinfo' || payload.action === 'paidnotice';
      if (String(payload.pin || '') !== String(q.pin) && !(prevOk && q.prevPin && String(payload.pin || '') === String(q.prevPin))) return { ok: false, err: 'ລະຫັດ PIN ບໍ່ຖືກຕ້ອງ' };
    }
    var now = Date.now();
    if (payload.action === 'callbill') {
      if (!(t.items && t.items.length)) return { ok: false, err: 'ຍັງບໍ່ມີອໍເດີ' };
      if (t.status !== 'bill') t.status = 'callbill';
      t.callTs = now;
      var pay = String(payload.pay || '');
      if (pay !== 'cash' && pay !== 'transfer') pay = '';
      t.callPay = pay;
      if (!st.orderLog) st.orderLog = [];
      st.orderLog.push({ ts: now, table: table, action: 'ຂໍເຊັກບິນ (QR)', detail: pay === 'transfer' ? 'ຈ່າຍ: ເງິນໂອນ' : pay === 'cash' ? 'ຈ່າຍ: ເງິນສົດ' : '', by: 'ລູກຄ້າ QR ໂຕະ ' + table });
      t.upd = now; st._v = Math.max(Date.now(), (+st._v || 0) + 1); saveStateRaw_(JSON.stringify(st), true, true);
      return { ok: true, state: custFilter_(st, table, payload.pin) };
    }
    /* QR ໂອນເງິນ: ສະແດງໃຫ້ລູກຄ້າສະເພາະເມື່ອ (1) PIN ຖືກ (2) ພະນັກງານເຊັກບິນແລ້ວ (3) ລູກຄ້າເລືອກໂອນ (4) ບິນບໍ່ປ່ຽນ (5) ຍັງບໍ່ໝົດເວລາ.
       ຍອດ + QR ມາຈາກເຄື່ອງພະນັກງານ — ລູກຄ້າແກ້ບໍ່ໄດ້ ແລະ ລູກຄ້າບໍ່ສາມາດບັນທຶກວ່າຈ່າຍແລ້ວ (ມີແຕ່ແຄັສເຊຍເທົ່ານັ້ນ) */
    if (payload.action === 'payinfo') {
      var xf = t.xfer, live = !!(t.status === 'bill' && t.callPay === 'transfer' && xf && xf.qr && (t.items || []).length);
      var good = live && xf.sig === tblSig_(st, t) && (+xf.exp || 0) > now;
      return { ok: true, status: t.status, callPay: t.callPay || '', notice: t.xferNotice || 0, np: (q && q.prevPin && String(payload.pin || '') === String(q.prevPin)) ? String(q.pin) : '',
        xfer: good ? { amt: xf.amt, qr: xf.qr, no: xf.no || '', exp: xf.exp, shop: st.shopName || '' } : null, stale: live && !good };
    }
    if (payload.action === 'paidnotice') {
      if (!(t.status === 'bill' && t.callPay === 'transfer' && t.xfer)) return { ok: false, err: 'ຍັງບໍ່ມີບິນໂອນ' };
      if (t.xferNotice && now - t.xferNotice < 10000) return { ok: true, dup: true };
      t.xferNotice = now;
      if (!st.orderLog) st.orderLog = [];
      st.orderLog.push({ ts: now, table: table, action: 'ລູກຄ້າແຈ້ງໂອນແລ້ວ (QR)', detail: 'ແຄັສເຊຍກວດຍອດເຂົ້າທະນາຄານກ່ອນປິດບິນ', by: 'ລູກຄ້າ QR ໂຕະ ' + table });
      t.upd = now; st._v = Math.max(Date.now(), (+st._v || 0) + 1); saveStateRaw_(JSON.stringify(st), true, true);
      return { ok: true };
    }
    /* action === 'order' — ຫຼັງເຊັກບິນແລ້ວ ສັ່ງເພີ່ມບໍ່ໄດ້ (ກັນຄົນກົດກວນ ຫຼື ສັ່ງຈາກບ່ອນອື່ນ) ຈົນກວ່າຈະຈ່າຍ/ເປີດບິນໃໝ່ */
    if (t.status === 'bill' || t.status === 'callbill') return { ok: false, err: 'ບິນນີ້ເຊັກແລ້ວ — ສັ່ງເພີ່ມບໍ່ໄດ້ ກະລຸນາບອກພະນັກງານ' };
    /* ກັນສັ່ງຊ້ຳ: GET ອາດຖືກສົ່ງຊ້ຳ (ເນັດຊ້າ/retry) → ໃຊ້ rid ຈາກເຄື່ອງລູກຄ້າ */
    var rid = String(payload.rid || '').slice(0, 64), ridKey = rid ? 'qrrid_' + rid : '';
    if (rid) {
      var ck0 = CacheService.getScriptCache();
      if (ck0.get(ridKey) || (t.items || []).some(function (x) { return x.qrRid === rid; })) return { ok: true, n: 0, dup: true, state: custFilter_(st, table, payload.pin) };
    }
    var items = payload.items || [];
    if (!items.length) return { ok: false, err: 'ບໍ່ມີລາຍການ' };
    if (items.length > 60) return { ok: false, err: 'ລາຍການຫຼາຍເກີນໄປ' };
    var cat = st.catalog || {}; var map = {};
    for (var c in cat) for (var sub in cat[c]) (cat[c][sub] || []).forEach(function (pp) { map[pp.c] = pp; });
    var promo = activePromo_(st);
    var cnt = 0, skipped = 0;
    var clean = function (x, n) { return String(x == null ? '' : x).replace(/[<>]/g, '').slice(0, n); };
    items.forEach(function (it) {
      var def = map[String(it.code || '')];
      if (!def) { skipped++; return; }
      if (st.soldOut && st.soldOut[def.c]) { skipped++; return; }
      var qn = Math.max(1, Math.min(99, Math.round(+it.qty || 1)));
      var mods = (it.mods || []).slice(0, 12).map(function (m) { return clean(m, 60); });
      var mi = modInfo_(st, def, mods), mp = mi.price;
      if (st.stockBlock !== false && !(st.modules && st.modules.stock === false) && lineBom_(def, mi, st).some(function (b) { return stockHave_(st, b[0], qrLoc) < (+b[1] || 0) * qn - 1e-9; })) { skipped++; return; }
      var line = { id: now + Math.random(), code: def.c, name: def.n, price: def.p, qty: qn,
        mods: mods,
        modPrice: mp, disc: 0, k: def.k, note: clean(it.note, 120), ts: now, qr: true, qrLoc: qrLoc };
      if (mi.bm !== 1) line.bm = mi.bm; if (mi.xb.length) line.xb = mi.xb; if (mi.pk && mi.pk.length) line.pk = mi.pk;
      if (rid) line.qrRid = rid;
      t.items.push(line); cnt += qn;
      if (!st.orders) st.orders = [];
      st.orders.push({ id: line.id, table: table, code: def.c, name: def.n, qty: qn, k: def.k, mods: line.mods, note: line.note, status: 'wait', ts: now, qr: true, upd: now });
      lineBom_(def, line, st).forEach(function (b) {
        var ing = st.ingredients && st.ingredients[b[0]];
        if (ing) {
          if (!ing.locs) { ing.locs = {}; if (typeof ing.stock === 'number') ing.locs['main'] = ing.stock; }
          ing.locs[qrLoc] = Math.round(((+ing.locs[qrLoc] || 0) - b[1] * qn) * 1000) / 1000;
          if (!st.stockLog) st.stockLog = [];
          st.stockLog.push({ ts: now, code: b[0], name: ing.name, unit: ing.unit, delta: -(b[1] * qn),
            after: ing.locs[qrLoc], reason: 'ຂາຍ', m: def.c, ref: qn + '× ' + def.n + ' (QR ໂຕະ ' + table + ')', by: 'ລູກຄ້າ QR', loc: qrLoc, locName: qrLocName });
          if (st.stockLog.length > 4000) st.stockLog = st.stockLog.slice(-4000);
        }
      });
    });
    if (!cnt) return { ok: false, err: 'ລາຍການບໍ່ຖືກຕ້ອງ ຫຼື ໝົດ' };
    if (t.status === 'free') t.status = 'busy';
    st.orderNo = (st.orderNo || 1) + 1;
    if (!st.orderLog) st.orderLog = [];
    st.orderLog.push({ ts: now, table: table, action: 'ສັ່ງຜ່ານ QR', detail: cnt + ' ລາຍການ' + (skipped ? ' (ຂ້າມ ' + skipped + ')' : ''), by: 'ລູກຄ້າ QR ໂຕະ ' + table });
    t.upd = now; st._v = Math.max(Date.now(), (+st._v || 0) + 1); saveStateRaw_(JSON.stringify(st), true, true);
    if (rid) { try { CacheService.getScriptCache().put(ridKey, '1', 21600); } catch (e) {} }
    return { ok: true, n: cnt, skipped: skipped, state: custFilter_(st, table, payload.pin) };
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
/* =====================================================================
 * ລາຍງານປະຈຳວັນ → WhatsApp ຂອງເຈົ້າຂອງຮ້ານ (ອັດຕະໂນມັດທຸກມື້)
 * ຕັ້ງຄ່າໃນ Apps Script → Project Settings (⚙) → Script Properties (ບໍ່ຝັງໃນໂຄດ):
 *   WA_CALLMEBOT = 8562012345678:1234567            (ເບີ:apikey — ຫຼາຍຄົນຂັ້ນດ້ວຍ , )
 *   REPORT_HOUR  = 22                                (ຊົ່ວໂມງທີ່ສົ່ງ, ຄ່າເລີ່ມຕົ້ນ 22:00)
 *   (ທາງເລືອກ) TG_BOT = <bot token>  TG_CHAT = <chat id>   → ສົ່ງ Telegram ນຳ
 * ແລ້ວ Run: installDailyReport  (ຕັ້ງເວລາສົ່ງທຸກມື້)  ·  testDailyReport (ລອງສົ່ງດຽວນີ້)
 * ===================================================================== */
function installDailyReport() { var r = installDailyReport_(); Logger.log(r); return r; }
function installDailyReport_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyReport') ScriptApp.deleteTrigger(t); });
  var h = parseInt(PROP.getProperty('REPORT_HOUR') || '22', 10); if (!(h >= 0 && h <= 23)) h = 22;
  ScriptApp.newTrigger('dailyReport').timeBased().everyDays(1).atHour(h).inTimezone('Asia/Vientiane').create();
  return 'OK - ສົ່ງລາຍງານທຸກມື້ ປະມານ ' + h + ':00 (ເວລາລາວ) · ຜູ້ຮັບ: ' + waTargets_().length + ' ເບີ' + (PROP.getProperty('TG_BOT') ? ' + Telegram' : '');
}
/* Telegram: ໃສ່ TG_BOT (token ຈາກ @BotFather) ໃນ Script Properties → ກົດ Start/ສົ່ງຂໍ້ຄວາມຫາ bot 1 ເທື່ອ → Run setupTelegram
   ຟັງຊັນນີ້ຊອກ chat id ຈາກຂໍ້ຄວາມລ່າສຸດ ແລ້ວບັນທຶກເປັນ TG_CHAT ໃຫ້ເອງ + ສົ່ງຂໍ້ຄວາມຢືນຢັນ */
function setupTelegram() { var r = setupTelegram_(); Logger.log(r); return r; }
function setupTelegram_() {
  var bot = (PROP.getProperty('TG_BOT') || '').trim();
  if (!bot) return 'ERR - ຍັງບໍ່ໄດ້ໃສ່ TG_BOT ໃນ Script Properties';
  var r = UrlFetchApp.fetch('https://api.telegram.org/bot' + bot + '/getUpdates', { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return 'ERR - token ບໍ່ຖືກ (HTTP ' + r.getResponseCode() + ')';
  var ups = (JSON.parse(r.getContentText()).result || []).slice().reverse(), chat = null;
  for (var i = 0; i < ups.length && !chat; i++) { var m = ups[i].message || ups[i].my_chat_member || ups[i].channel_post; if (m && m.chat) chat = m.chat; }
  if (!chat) return 'ERR - ບໍ່ພົບຂໍ້ຄວາມ: ເປີດ bot ໃນ Telegram → ກົດ Start ຫຼື ພິມຫຍັງກໍໄດ້ 1 ຂໍ້ຄວາມ ແລ້ວ Run ໃໝ່';
  PROP.setProperty('TG_CHAT', String(chat.id));
  UrlFetchApp.fetch('https://api.telegram.org/bot' + bot + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chat.id, text: '✅ ST POS ເຊື່ອມກັບ Telegram ແລ້ວ — ລາຍງານປະຈຳວັນຈະສົ່ງມາທີ່ນີ້' }), muteHttpExceptions: true });
  return 'OK - TG_CHAT = ' + chat.id + ' (' + (chat.title || chat.first_name || chat.username || '') + ')';
}
function removeDailyReport() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyReport') ScriptApp.deleteTrigger(t); });
  return 'OK - ຍົກເລີກການສົ່ງອັດຕະໂນມັດແລ້ວ';
}
function dailyReport() { try { var ss = getSS_(); if (ss) { writeMirrors_(ss, JSON.parse(getState_())); PROP.setProperty('MIRROR_TS', String(Date.now())); } } catch (e) {} return sendReport_(buildDailyReport_(new Date())); }
function testDailyReport() { var t = buildDailyReport_(new Date()); var r = sendReport_('🧪 ທົດສອບ\n' + t); Logger.log(t); Logger.log(JSON.stringify(r)); return r; }
function reportPreview(tok) { return tokenOk_(tok) ? buildDailyReport_(new Date()) : 'DENIED'; }

function waTargets_() {
  return String(PROP.getProperty('WA_CALLMEBOT') || '').split(',').map(function (x) { var a = x.trim().split(':'); return { phone: (a[0] || '').replace(/[^\d]/g, ''), key: (a[1] || '').trim() }; })
    .filter(function (x) { return x.phone && x.key; });
}
function fmtK_(n) { return Utilities.formatString('%s', Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }


/* ແຜນຈັດຊື້ (ຄືກັບໜ້າ ສະຕ໋ອກ → ແຜນຈັດຊື້ ໃນແອັບ): ການໃຊ້/ມື້ ຈາກບິນ 14 ມື້ × ສູດ, ພໍໃຊ້ ≤ ເວລາສົ່ງ = ດ່ວນ, ≤ ເວລາສົ່ງ+3 = 1–3 ມື້ */
function purchasePlan_(st, loc, planDays) {
  planDays = planDays || 7; var D = 86400000, W = 14, now = Date.now();
  var t0 = new Date(Utilities.formatDate(new Date(now), 'GMT+7', 'yyyy-MM-dd') + 'T00:00:00+07:00').getTime(), start = t0 - (W - 1) * D;
  var mainId = ((st.locations || [])[0] || {}).id || 'main';
  var bom = {}; var cat = st.catalog || {}; for (var c in cat) for (var sb in cat[c]) (cat[c][sb] || []).forEach(function (m) { if (m.bom && m.bom.length) bom[m.c] = m.bom; });
  var use = {}, sum7 = {}, firstTs = Infinity;
  (st.bills || []).forEach(function (b) {
    if (b.voided || b.ts < start || (b.loc || mainId) !== loc) return; if (b.ts < firstTs) firstTs = b.ts;
    var recent = b.ts >= t0 - 6 * D;
    (b.items || []).forEach(function (it) {
      var bm = bom[it.code]; if (!bm) return; var rq = 0;
      (b.refunds || []).forEach(function (r) { (r.items || []).forEach(function (x) { if (String(x.id) === String(it.id)) rq += +x.qty || 0; }); });
      var q = (+it.qty || 0) - rq; if (q <= 0) return;
      bm.forEach(function (x) { var v = (+x[1] || 0) * q; use[x[0]] = (use[x[0]] || 0) + v; if (recent) sum7[x[0]] = (sum7[x[0]] || 0) + v; });
    });
  });
  var span = firstTs === Infinity ? 0 : Math.max(1, Math.min(W, Math.ceil((now - firstTs) / D)));
  var out = { urgent: [], soon: [], span: span };
  var ing = st.ingredients || {};
  Object.keys(ing).forEach(function (code) {
    var it = ing[code]; if (!it) return;
    var y = +it.shelf > 0 ? +it.shelf : 0, lead = (it.lead === undefined || it.lead === null || it.lead === '') ? 1 : Math.max(0, +it.lead || 0);
    var stock = (it.locs && it.locs[loc] !== undefined) ? +it.locs[loc] || 0 : (loc === mainId ? +it.stock || 0 : 0);
    var a14 = span ? (use[code] || 0) / span : 0, a7 = span ? (sum7[code] || 0) / Math.min(7, span) : 0, avg = span >= 7 ? 0.6 * a7 + 0.4 * a14 : a14;
    var target = Math.min(planDays, y || planDays), cover = avg > 0 ? Math.max(0, stock) / avg : Infinity, catg = '';
    if (avg > 0) { if (stock <= 0 || cover <= lead) catg = 'urgent'; else if (cover <= lead + 3) catg = 'soon'; }
    else if ((+it.reorder || 0) > 0 && stock <= it.reorder) catg = 'soon';
    if (!catg) return;
    var qty = avg > 0 ? avg * (target + lead) - Math.max(0, stock) : it.reorder * 2 - Math.max(0, stock);
    if (qty > 0) { if (/^(g|ml)$/i.test(it.unit || '') && qty >= 200) qty = Math.ceil(qty / 100) * 100; else if (qty >= 20) qty = Math.ceil(qty / 5) * 5; else qty = Math.ceil(qty * 10) / 10; } else qty = 0;
    out[catg].push({ code: code, name: it.name || code, unit: it.unit || '', stock: stock, avg: avg, cover: cover, qty: qty, value: qty * (+it.cost || 0) });
  });
  out.urgent.sort(function (a, b) { return a.cover - b.cover; }); out.soon.sort(function (a, b) { return a.cover - b.cover; });
  return out;
}
function fmtQ_(q, u) { return fmtK_(Math.round(q * 10) / 10) + (u ? ' ' + u : ''); }
function buildDailyReport_(when) {
  var s = getState_(); if (!s) return 'ST POS: ບໍ່ມີຂໍ້ມູນ';
  var st; try { st = JSON.parse(s); } catch (e) { return 'ST POS: ອ່ານຂໍ້ມູນບໍ່ໄດ້'; }
  var tz = 'GMT+7', day = Utilities.formatDate(when, tz, 'yyyy-MM-dd');
  var yday = Utilities.formatDate(new Date(when.getTime() - 86400000), tz, 'yyyy-MM-dd'), month = day.substring(0, 7);
  var dOf = function (ts) { return Utilities.formatDate(new Date(ts), tz, 'yyyy-MM-dd'); };
  var net = function (b) { return b.voided ? 0 : (b.total || 0) - (b.refundAmt || 0); };
  var T = { sales: 0, bills: 0, cogs: 0, voidN: 0, voidAmt: 0, refund: 0, byPay: {}, items: {} }, Y = 0, M = 0;
  (st.bills || []).forEach(function (b) {
    var d = dOf(b.ts);
    if (d === yday) Y += net(b);
    if (d.substring(0, 7) === month) M += net(b);
    if (d !== day) return;
    if (b.voided) { T.voidN++; T.voidAmt += b.total || 0; return; }
    T.sales += net(b); T.bills++; T.cogs += b.cogs || 0; T.refund += b.refundAmt || 0;
    T.byPay[b.pay || '-'] = (T.byPay[b.pay || '-'] || 0) + net(b);
    (b.items || []).forEach(function (i) { var k = i.name || i.code; if (!T.items[k]) T.items[k] = { q: 0, v: 0 }; T.items[k].q += i.qty || 0; T.items[k].v += lineTot_(i); });
  });
  var can = (st.cancelLog || []).filter(function (l) { return dOf(l.ts) === day && (l.type === 'ລຶບລາຍການ' || l.type === 'ຍົກເລີກໂຕະ'); });
  var canAmt = can.reduce(function (a, l) { return a + (l.amount || 0); }, 0);
  var exp = (st.expenses || []).filter(function (e) { return dOf(e.ts) === day; }).reduce(function (a, e) { return a + (e.amount || 0); }, 0);
  var ing = st.ingredients || {}, low = [];
  Object.keys(ing).forEach(function (k) { var x = ing[k]; var tot = x.locs ? Object.keys(x.locs).reduce(function (a, l) { return a + (+x.locs[l] || 0); }, 0) : (+x.stock || 0); if ((+x.reorder || 0) > 0 && tot <= x.reorder) low.push(x.name || k); });
  var prW = (st.prs || []).filter(function (p) { return p.status === 'PENDING_APPROVAL'; }).length, poW = (st.pos || []).filter(function (p) { return p.status === 'PENDING_APPROVAL'; }).length;
  var z = (st.shiftLog || []).filter(function (x) { return dOf(x.closeTs || x.ts || 0) === day; });
  var cashDiff = z.reduce(function (a, x) { return a + ((x.countedCash || 0) - (x.expectedCash || 0)); }, 0);
  var busy = Object.keys(st.tables || {}).filter(function (k) { var t = st.tables[k]; return t.status !== 'free' && t.status !== 'merged'; }).length;
  var top = Object.keys(T.items).map(function (k) { return [k, T.items[k]]; }).sort(function (a, b) { return b[1].v - a[1].v; }).slice(0, 5);
  var gp = T.sales - T.cogs, pct = T.sales ? Math.round(gp / T.sales * 100) : 0;
  var chg = Y ? Math.round((T.sales - Y) / Y * 100) : null;
  var L = [];
  L.push('📊 *ລາຍງານປະຈຳວັນ — ' + (st.shopName || 'ST POS') + '*');
  L.push('📅 ' + Utilities.formatDate(when, tz, 'dd/MM/yyyy HH:mm'));
  L.push('');
  L.push('💰 *ຍອດຂາຍສຸດທິ: ' + fmtK_(T.sales) + ' ກີບ*');
  L.push('🧾 ' + T.bills + ' ບິນ · ສະເລ່ຍ ' + fmtK_(T.bills ? T.sales / T.bills : 0) + ' ກີບ/ບິນ');
  if (chg !== null) L.push((chg >= 0 ? '📈' : '📉') + ' ທຽບມື້ວານ ' + (chg >= 0 ? '+' : '') + chg + '% (' + fmtK_(Y) + ')');
  L.push('🗓 ເດືອນນີ້: ' + fmtK_(M) + ' ກີບ');
  var pays = Object.keys(T.byPay); if (pays.length) { L.push(''); L.push('💳 *ປະເພດຈ່າຍ*'); pays.sort(function (a, b) { return T.byPay[b] - T.byPay[a]; }).forEach(function (k) { L.push('• ' + k + ': ' + fmtK_(T.byPay[k])); }); }
  L.push(''); L.push('📦 ຕົ້ນທຶນ ' + fmtK_(T.cogs) + ' · ກຳໄລຂັ້ນຕົ້ນ ' + fmtK_(gp) + ' (' + pct + '%)');
  L.push('💸 ລາຍຈ່າຍມື້ນີ້: ' + fmtK_(exp) + ' ກີບ');
  if (top.length) { L.push(''); L.push('🏆 *ຂາຍດີ*'); top.forEach(function (t, i) { L.push((i + 1) + '. ' + t[0] + ' ×' + t[1].q + ' (' + fmtK_(t[1].v) + ')'); }); }
  L.push('');
  L.push('❌ ລຶບເມນູ/ຍົກເລີກ: ' + can.length + ' ລາຍການ (' + fmtK_(canAmt) + ')');
  L.push('↩️ Void ' + T.voidN + ' ບິນ (' + fmtK_(T.voidAmt) + ') · ຄືນເງິນ ' + fmtK_(T.refund));
  if (z.length) L.push('💵 ປິດກະ ' + z.length + ' ກະ · ເງິນສົດ ' + (cashDiff === 0 ? 'ຕົງ ✅' : (cashDiff > 0 ? 'ເກີນ +' : 'ຂາດ ') + fmtK_(Math.abs(cashDiff)) + ' ⚠️'));
  else L.push('💵 ຍັງບໍ່ໄດ້ປິດກະ' + (st.curShift ? ' (ກະ "' + st.curShift.name + '" ເປີດຢູ່)' : ''));
  if (busy) L.push('🍽 ໂຕະຍັງບໍ່ປິດບິນ: ' + busy);
  var locs = (st.locations && st.locations.length) ? st.locations : [{ id: 'main', name: '' }], anyPlan = false;
  locs.forEach(function (lc) {
    var pl; try { pl = purchasePlan_(st, lc.id, 7); } catch (e) { return; }
    if (!pl.urgent.length && !pl.soon.length) return; anyPlan = true;
    var nm = locs.length > 1 ? ' — ' + (lc.name || lc.id) : '';
    L.push('');
    if (pl.urgent.length) {
      var uv = pl.urgent.reduce(function (a, r) { return a + r.value; }, 0);
      L.push('🛒 *ຈັດຊື້ດ່ວນ' + nm + ' (' + pl.urgent.length + ')*' + (uv ? ' ≈ ' + fmtK_(uv) + ' ກີບ' : ''));
      pl.urgent.slice(0, 10).forEach(function (r) {
        var left = r.stock <= 0 ? 'ໝົດແລ້ວ' : (r.cover < 1 ? 'ພໍ ' + Math.max(1, Math.round(r.cover * 24)) + ' ຊມ' : 'ພໍ ' + (Math.round(r.cover * 10) / 10) + ' ມື້');
        L.push('• ' + r.name + ' — ເຫຼືອ ' + fmtQ_(Math.max(0, r.stock), r.unit) + ' (' + left + ') → ຊື້ ' + fmtQ_(r.qty, r.unit));
      });
      if (pl.urgent.length > 10) L.push('  … ອີກ ' + (pl.urgent.length - 10) + ' ລາຍການ (ເບິ່ງໃນແອັບ: ສະຕ໋ອກ → ແຜນຈັດຊື້)');
    }
    if (pl.soon.length) L.push('🟠 ຈັດຊື້ພາຍໃນ 1–3 ມື້' + nm + ' (' + pl.soon.length + '): ' + pl.soon.slice(0, 6).map(function (r) { return r.name; }).join(', ') + (pl.soon.length > 6 ? ' …' : ''));
  });
  if (!anyPlan && low.length) L.push('⚠️ ສະຕ໋ອກໃກ້ໝົດ ' + low.length + ': ' + low.slice(0, 5).join(', ') + (low.length > 5 ? ' …' : ''));
  if (prW || poW) L.push('📋 ລໍອະນຸມັດ: PR ' + prW + ' · PO ' + poW);
  return L.join('\n');
}

/* ສົ່ງ: CallMeBot (WhatsApp) ຮັບຜ່ານ URL (GET) → ແບ່ງເປັນຫຼາຍຂໍ້ຄວາມ ຖ້າຍາວ; Telegram (ຖ້າຕັ້ງ) ສົ່ງທັງກ້ອນ */
/* ສ່ວນລົດພະນັກງານ: ແຈ້ງ Telegram ທຸກບິນທີ່ມີ bill.sd ໃໝ່ (ພ້ອມຮູບຢືນຢັນ) — ຈື່ເວລາບິນລ່າສຸດທີ່ແຈ້ງແລ້ວໃນ SD_TG_TS */
function sdNotify_(json) {
  try {
    if (String(json).indexOf('"sd":{') < 0) return;
    var bot = PROP.getProperty('TG_BOT'), chat = PROP.getProperty('TG_CHAT'); if (!bot || !chat) return;
    var last = +(PROP.getProperty('SD_TG_TS') || 0);
    if (!last) { PROP.setProperty('SD_TG_TS', String(Date.now())); return; } /* ຄັ້ງທຳອິດ: ບໍ່ສົ່ງຂອງເກົ່າ */
    var st = JSON.parse(json), mx = last, sent = 0, nl = String.fromCharCode(10);
    var fmt = function (n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    var mon = function (ts) { return Utilities.formatDate(new Date(ts), 'Asia/Vientiane', 'yyyy-MM'); };
    (st.bills || []).forEach(function (b) {
      var s = b && b.sd; if (!s || !(b.ts > last) || sent >= 10) return;
      var m = mon(b.ts), n = {}, amt = 0;
      (st.bills || []).forEach(function (x) { if (x && x.sd && !x.voided && x.sd.uid === s.uid && mon(x.ts) === m) { n[x.sd.id] = 1; amt += (+x.sd.amt || 0); } });
      var cap = ['👤 ສ່ວນລົດພະນັກງານ — ' + (st.shopName || 'ST POS'),
        'ພະນັກງານ: ' + (s.name || '-') + (s.org ? ' (' + s.org + ')' : (s.kind === 'g' ? ' (ໃນເຄືອ)' : '')),
        'ສ່ວນລົດ ' + (s.pct || 0) + '% = −' + fmt(s.amt) + ' ກີບ',
        'ໂຕະ ' + (b.table || '-') + ' · ບິນ ' + (b.receipt || '') + ' · ' + Utilities.formatDate(new Date(b.ts), 'Asia/Vientiane', 'dd/MM HH:mm'),
        'ລາຍການ: ' + (s.items || '-'),
        'ຢືນຢັນ: ' + (s.appr || '-') + ' · ເກັບເງິນ: ' + (s.cashier || b.by || '-'),
        'ເດືອນນີ້: ' + Object.keys(n).length + ' ຄັ້ງ / −' + fmt(amt) + ' ກີບ' + (s.src === 'file' ? nl + '⚠️ ຮູບແນບຈາກໄຟລ໌ (ບໍ່ແມ່ນກ້ອງ)' : '') + (s.photo ? '' : nl + '⚠️ ບໍ່ມີຮູບ')].join(nl).slice(0, 1000);
      var api = 'https://api.telegram.org/bot' + bot;
      try {
        var mm = /^data:image\/\w+;base64,(.+)$/.exec(s.photo || '');
        if (mm) UrlFetchApp.fetch(api + '/sendPhoto', { method: 'post', payload: { chat_id: chat, caption: cap, photo: Utilities.newBlob(Utilities.base64Decode(mm[1]), 'image/jpeg', 'staff.jpg') }, muteHttpExceptions: true });
        else UrlFetchApp.fetch(api + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chat, text: cap }), muteHttpExceptions: true });
      } catch (e2) {}
      sent++; if (b.ts > mx) mx = b.ts;
    });
    if (mx > last) PROP.setProperty('SD_TG_TS', String(mx));
  } catch (e) {}
}
/* ===== ແຈ້ງສະຕ໋ອກໃກ້ໝົດ / ໝົດ ເຂົ້າ Telegram ທັນທີ (ເປີດ/ປິດ ທີ່ ຕັ້ງຄ່າ › ການເຊື່ອມຕໍ່ & ລາຍງານ → state.tgStock.on) =====
   ໃຊ້ TG_BOT / TG_CHAT ຄືລາຍງານປະຈຳວັນ · ແຈ້ງສະເພາະວັດຖຸດິບທີ່ຕັ້ງ Min > 0 · ແຈ້ງຕອນລົງຮອດ Min ຄັ້ງທຳອິດ ແລະ ຕອນໝົດ (ບໍ່ສົ່ງຊ້ຳ ຈົນກວ່າຈະເຕີມພໍແລ້ວຕ່ຳລົງອີກ) · ກວດຫ່າງກັນຢ່າງໜ້ອຍ 2 ນາທີ */
function stockLowList_(st) {
  var out = [], ing = (st && st.ingredients) || {}, nm = {};
  ((st && st.locations) || []).forEach(function (l) { nm[l.id] = l.name; });
  Object.keys(ing).forEach(function (c) {
    var it = ing[c]; if (!it) return; var mn = +it.reorder || 0; if (!(mn > 0)) return;
    var L = it.locs || {}; Object.keys(L).forEach(function (l) {
      var have = +L[l] || 0;
      if (have <= mn) out.push({ code: c, name: it.name || c, unit: it.unit || '', loc: l, locName: nm[l] || l, have: have, min: mn, lvl: have <= 0 ? 2 : 1 });
    });
  });
  out.sort(function (a, b) { return (b.lvl - a.lvl) || (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0) || (a.name < b.name ? -1 : 1); });
  return out;
}
function stockMsg_(st, list, title) {
  if (!list || !list.length) return '';
  var nl = String.fromCharCode(10), fmt = function (n) { return String(Math.round((+n || 0) * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var lines = [title + ' — ' + ((st && st.shopName) || 'ST POS')], cur = null, shown = 0;
  list.forEach(function (x) {
    if (shown >= 40) return;
    if (x.loc !== cur) { cur = x.loc; lines.push('📍 ' + x.locName); }
    lines.push((x.lvl === 2 ? '🔴 ໝົດ  ' : '🟠 ໃກ້ໝົດ  ') + x.name + ' — ເຫຼືອ ' + fmt(x.have) + ' ' + x.unit + ' (Min ' + fmt(x.min) + ')');
    shown++;
  });
  if (list.length > shown) lines.push('… ແລະ ອີກ ' + (list.length - shown) + ' ລາຍການ');
  return lines.join(nl);
}
/* ແຈ້ງເຕືອນທັນທີ: ສົ່ງ Telegram (ຖ້າຕັ້ງ TG_BOT/TG_CHAT) ແລະ WhatsApp (ຖ້າຕັ້ງ WA_CALLMEBOT) — ຄືນ 200 ຖ້າທຸກຊ່ອງທາງສຳເລັດ */
function tgSend_(text) {
  var bot = PROP.getProperty('TG_BOT'), chat = PROP.getProperty('TG_CHAT'), res = [];
  if (bot && chat) {
    try { res.push(UrlFetchApp.fetch('https://api.telegram.org/bot' + bot + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 3900) }), muteHttpExceptions: true }).getResponseCode()); }
    catch (e) { res.push('ERR ' + e.message); }
  }
  waTargets_().forEach(function (t) {
    try { res.push('WA ' + UrlFetchApp.fetch('https://api.callmebot.com/whatsapp.php?phone=' + t.phone + '&apikey=' + encodeURIComponent(t.key) + '&text=' + encodeURIComponent(chunks_(String(text).replace(/\*/g, ''), 1800)[0]), { muteHttpExceptions: true }).getResponseCode()); }
    catch (e) { res.push('WA ERR ' + e.message); }
  });
  if (!res.length) return 'ບໍ່ໄດ້ຕັ້ງ TG_BOT/TG_CHAT ຫຼື WA_CALLMEBOT';
  return res.every(function (x) { return x === 200 || x === 'WA 200'; }) ? 200 : res.join(' · ');
}
function stockNotify_(json) {
  try {
    if (!/"tgStock":\{[^}]*"on":true/.test(json)) return;
    if (!(PROP.getProperty('TG_BOT') && PROP.getProperty('TG_CHAT')) && !waTargets_().length) return;
    var now = Date.now(); if (now - (+(PROP.getProperty('STK_TG_TS') || 0)) < 120000) return;
    PROP.setProperty('STK_TG_TS', String(now));
    var st = JSON.parse(json), list = stockLowList_(st), prevS = PROP.getProperty('STK_TG'), prev = null;
    try { prev = prevS ? JSON.parse(prevS) : null; } catch (e) { prev = null; }
    var cur = {}; list.forEach(function (x) { cur[x.code + '@' + x.loc] = x.lvl; });
    var pack = JSON.stringify(cur); if (pack.length > 8500) { cur = {}; list.forEach(function (x) { if (x.lvl === 2) cur[x.code + '@' + x.loc] = 2; }); pack = JSON.stringify(cur).slice(0, 8500); if (pack.charAt(pack.length - 1) !== '}') pack = '{}'; }
    PROP.setProperty('STK_TG', pack);
    if (!prev || typeof prev !== 'object') return;                      /* ຄັ້ງທຳອິດ: ຈື່ສະພາບປັດຈຸບັນ ບໍ່ສົ່ງຂອງເກົ່າ (ກົດ "ສົ່ງທົດສອບ" ເພື່ອເບິ່ງລາຍການທັງໝົດ) */
    var fresh = list.filter(function (x) { return x.lvl > (+prev[x.code + '@' + x.loc] || 0); });
    if (!fresh.length) return;
    tgSend_(stockMsg_(st, fresh, '⚠️ ສະຕ໋ອກຕ່ຳ'));
  } catch (e) { }
}
function sendReport_(text) {
  var out = { whatsapp: [], telegram: null };
  waTargets_().forEach(function (t) {
    chunks_(text, 1800).forEach(function (part, i, all) {
      var msg = (all.length > 1 ? '(' + (i + 1) + '/' + all.length + ')\n' : '') + part;
      var url = 'https://api.callmebot.com/whatsapp.php?phone=' + t.phone + '&apikey=' + encodeURIComponent(t.key) + '&text=' + encodeURIComponent(msg);
      try { var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true }); out.whatsapp.push(t.phone.slice(-4) + ':' + r.getResponseCode()); }
      catch (e) { out.whatsapp.push(t.phone.slice(-4) + ':ERR ' + e.message); }
      if (i < all.length - 1) Utilities.sleep(3000);
    });
  });
  var bot = PROP.getProperty('TG_BOT'), chat = PROP.getProperty('TG_CHAT');
  if (bot && chat) {
    try { var r2 = UrlFetchApp.fetch('https://api.telegram.org/bot' + bot + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chat, text: text.replace(/\*/g, '') }), muteHttpExceptions: true }); out.telegram = r2.getResponseCode(); }
    catch (e) { out.telegram = 'ERR ' + e.message; }
  }
  if (!out.whatsapp.length && out.telegram === null) out.err = 'ຍັງບໍ່ໄດ້ຕັ້ງ WA_CALLMEBOT ຫຼື TG_BOT/TG_CHAT ໃນ Script Properties';
  return out;
}
/* ແບ່ງຂໍ້ຄວາມຕາມແຖວ ໃຫ້ຄວາມຍາວຫຼັງ encode ບໍ່ເກີນ max (ອັກສອນລາວ 1 ຕົວ ≈ 9 ຕົວອັກສອນໃນ URL) */
function chunks_(text, max) {
  var out = [], cur = '';
  text.split('\n').forEach(function (line) {
    var next = cur ? cur + '\n' + line : line;
    if (encodeURIComponent(next).length > max && cur) { out.push(cur); cur = line; } else cur = next;
  });
  if (cur) out.push(cur);
  return out;
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
    shopName: 'ST POS Demo', serviceChargePct: 0, vatPct: 0, billDiscPct: 0, qrGlobal: true, soundOn: true,
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

/* ===================== ແຊັດ ລູກຄ້າ ↔ ພະນັກງານ =====================
 * ເກັບແຍກຈາກ STATE (ບໍ່ຊົນກັບການ save ທັງ state): CacheService = ຂໍ້ຄວາມສົດ (ໄວ), ຊີດ CHAT = ປະຫວັດ + ກູ້ຄືນເມື່ອ cache ຫາຍ
 * ລູກຄ້າ: join (ກວດ QR/PIN ເທື່ອດຽວ) → token HMAC → poll/send ດ້ວຍ token (ບໍ່ຕ້ອງອ່ານ state ໃຫຍ່)
 * ພະນັກງານ: ກວດ API token ຄືການອ່ານ state
 * ຍ້າຍຂຶ້ນ cloud: ຮູບແບບຂໍ້ຄວາມ ແລະ action ດຽວກັນ (join/cpoll/csend/spoll/ssend/sst/seen/close)
 */
var CHAT_MAX = 400, CHAT_TTL = 21600, CHAT_AGE = 24 * 3600 * 1000;
function chatSecret_() { var s = PROP.getProperty('CHAT_SECRET'); if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); PROP.setProperty('CHAT_SECRET', s); } return s; }
function chatSign_(v) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(v, chatSecret_())).replace(/=+$/, ''); }
function chatTok_(o) { var v = Utilities.base64EncodeWebSafe(JSON.stringify(o), Utilities.Charset.UTF_8).replace(/=+$/, ''); return v + '.' + chatSign_(v); }
function chatUntok_(tk) {
  tk = String(tk || ''); var i = tk.lastIndexOf('.'); if (i < 1) return null;
  var v = tk.slice(0, i); if (chatSign_(v) !== tk.slice(i + 1)) return null;
  try { var pad = v + '===='.slice(0, (4 - v.length % 4) % 4); var o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(pad)).getDataAsString('UTF-8')); return (o && o.exp > Date.now()) ? o : null; } catch (e) { return null; }
}
function chatJson_(k) { try { return JSON.parse(PROP.getProperty(k) || '{}') || {}; } catch (e) { return {}; } }
function chatSheet_() {
  var ss = getSS_(); if (!ss) return null; var sh = ss.getSheetByName('CHAT');
  if (!sh) { sh = ss.insertSheet('CHAT'); sh.appendRow(['ts', 'id', 'table', 'ep', 'sess', 'from', 'name', 'kind', 'req', 'text', 'st', 'ref']); sh.setFrozenRows(1); }
  return sh;
}
function chatCell_(x) { x = String(x == null ? '' : x); return /^[=+\-@]/.test(x) ? "'" + x : x; }
function chatRow_(m, st, ref) { try { var sh = chatSheet_(); if (sh) sh.appendRow([m.upd || m.ts, m.id, chatCell_(m.table), m.ep, m.sess, m.from, chatCell_(st ? (m.stBy || '') : m.name), st ? 'st' : m.kind, m.req || '', st ? '' : chatCell_(m.text), st || m.st || '', ref || '']); } catch (e) {} }
function chatLoad_() {
  var c = CacheService.getScriptCache(), j = c.get('CHAT_LIVE');
  if (j) { try { return JSON.parse(j); } catch (e) {} }
  var out = [], byId = {}, sh = chatSheet_();
  if (sh) {
    var n = sh.getLastRow();
    if (n > 1) {
      var start = Math.max(2, n - 1500), rows = sh.getRange(start, 1, n - start + 1, 12).getValues(), lim = Date.now() - CHAT_AGE;
      rows.forEach(function (r) {
        var ts = +r[0] || 0; if (ts < lim) return;
        if (r[7] === 'st') { var x = byId[String(r[11])]; if (x) { x.st = String(r[10]); x.upd = ts; x.stBy = String(r[6] || ''); } return; }
        if (r[7] === 'clr') { var ct = String(r[2]); out = out.filter(function (m) { if (m.table === ct) { delete byId[m.id]; return false; } return true; }); return; }
        var m = { id: String(r[1]), ts: ts, upd: ts, table: String(r[2]), ep: +r[3] || 0, sess: String(r[4]), from: String(r[5]), name: String(r[6]), kind: String(r[7]), req: String(r[8] || ''), text: String(r[9] || ''), st: String(r[10] || '') };
        byId[m.id] = m; out.push(m);
      });
    }
  }
  return chatPut_(out);
}
function chatPut_(arr) {
  var lim = Date.now() - CHAT_AGE; arr = arr.filter(function (m) { return (m.upd || m.ts) >= lim; }).slice(-CHAT_MAX);
  var j = JSON.stringify(arr); while (j.length > 95000 && arr.length > 40) { arr = arr.slice(Math.floor(arr.length / 4)); j = JSON.stringify(arr); }
  try { CacheService.getScriptCache().put('CHAT_LIVE', j, CHAT_TTL); } catch (e) {}
  return arr;
}
function chatBump_() { PROP.setProperty('CHAT_V', String(Date.now())); }
function chatAdd_(m) {
  var lk = LockService.getUserLock();
  try { lk.waitLock(10000); var arr = chatLoad_(); arr.push(m); chatPut_(arr); chatBump_(); } catch (e) { return false; } finally { try { lk.releaseLock(); } catch (e2) {} }
  chatRow_(m); return true;
}
function chatUpd_(id, st, by) {
  var lk = LockService.getUserLock(), hit = null;
  try { lk.waitLock(10000); var arr = chatLoad_(); hit = arr.filter(function (m) { return m.id === id; })[0]; if (hit) { hit.st = st; hit.stBy = by || ''; hit.upd = Date.now(); chatPut_(arr); chatBump_(); } } catch (e) { return false; } finally { try { lk.releaseLock(); } catch (e2) {} }
  if (hit) chatRow_(hit, st, id); return !!hit;
}
function chatApi_(p) {
  p = p || {}; var a = String(p.a || ''), now = Date.now();
  var clean = function (x, n) { return String(x == null ? '' : x).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); };
  var nid = function (f) { return f + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36); };
  if (a === 'join') {                                     /* ລູກຄ້າ: ກວດ QR ຄືການສັ່ງອາຫານ ແລ້ວອອກ token */
    var s = getState_(); if (!s) return { ok: false, err: 'ບໍ່ມີຂໍ້ມູນຮ້ານ' };
    var st = JSON.parse(s), table = String(p.table || ''), t = st.tables && st.tables[table];
    if (!t) return { ok: false, err: 'ບໍ່ພົບໂຕະ ' + table };
    if (st.modules && st.modules.chat === false) return { ok: false, err: 'ຮ້ານປິດການແຊັດ' };
    var q = st.qr && st.qr[table];
    if (st.qrGlobal === false || (q && q.enabled === false)) return { ok: false, err: 'QR ຖືກປິດ' };
    if (st.qrPinRequired !== false) {
      if (!q || (st.qrExpires !== false && q.expiry < now)) return { ok: false, err: 'QR ໝົດອາຍຸ — ຂໍ QR ໃໝ່ຈາກພະນັກງານ' };
      if (String(p.pin || '') !== String(q.pin)) return { ok: false, err: 'ລະຫັດ PIN ບໍ່ຖືກຕ້ອງ' };
    }
    var ep = +chatJson_('CHAT_EP')[table] || 0;
    return { ok: true, tk: chatTok_({ t: table, e: ep, s: (q ? String(q.pin) : 'o') + '-' + ep, exp: now + 12 * 3600 * 1000 }), now: now };
  }
  if (a === 'cpoll' || a === 'csend') {
    var o = chatUntok_(p.tk); if (!o) return { ok: false, err: 'tk' };
    if ((+chatJson_('CHAT_EP')[o.t] || 0) !== o.e) return { ok: true, closed: true, now: now };
    if (a === 'csend') {
      var text = clean(p.text, 300), kind = p.kind === 'req' ? 'req' : 'msg'; if (!text) return { ok: false, err: 'empty' };
      var ck = CacheService.getScriptCache(), rid = clean(p.rid, 60);
      if (rid && ck.get('CHATRID_' + rid)) { /* ສົ່ງຊ້ຳ (retry) */ } else {
        var rk = 'CHATRL_' + o.t, n = +(ck.get(rk) || 0); if (n >= 20) return { ok: false, err: 'ສົ່ງຖີ່ເກີນໄປ — ລໍຖ້າ 1 ນາທີ' }; ck.put(rk, String(n + 1), 60);
        var m = { id: nid('c'), ts: now, upd: now, table: o.t, ep: o.e, sess: o.s, from: 'c', name: 'ໂຕະ ' + o.t, kind: kind, req: kind === 'req' ? clean(p.req, 20) : '', text: text, st: kind === 'req' ? 'new' : '' };
        if (!chatAdd_(m)) return { ok: false, err: 'ລະບົບບໍ່ຫວ່າງ — ລອງໃໝ່' };
        if (rid) ck.put('CHATRID_' + rid, '1', 600);
      }
    }
    var since = +p.since || 0;
    return { ok: true, msgs: chatLoad_().filter(function (m) { return m.table === o.t && m.ep === o.e && (m.sess === o.s || m.sess === '*') && (m.upd || m.ts) > since; }), seen: +chatJson_('CHAT_SEEN')[o.t] || 0, now: now };
  }
  if (!tokenOk_(p.token)) return { ok: false, err: 'token' };
  if (a === 'spoll') {
    var sn = +p.since || 0;
    if (sn && sn >= +(PROP.getProperty('CHAT_V') || 0)) return { ok: true, msgs: [], now: now };
    return { ok: true, msgs: chatLoad_().filter(function (m) { return (m.upd || m.ts) > sn; }), ep: chatJson_('CHAT_EP'), seen: chatJson_('CHAT_SEEN'), now: now };
  }
  if (a === 'ssend') {
    var tb = clean(p.table, 40), tx = clean(p.text, 500); if (!tb || !tx) return { ok: false, err: 'empty' };
    var m2 = { id: nid('s'), ts: now, upd: now, table: tb, ep: +chatJson_('CHAT_EP')[tb] || 0, sess: '*', from: 's', name: clean(p.name, 40) || 'ພະນັກງານ', kind: 'msg', req: '', text: tx, st: '' };
    if (!chatAdd_(m2)) return { ok: false, err: 'busy' };
    var sm = chatJson_('CHAT_SEEN'); sm[tb] = now; PROP.setProperty('CHAT_SEEN', JSON.stringify(sm));
    return { ok: true, msg: m2, now: now };
  }
  if (a === 'sst') return { ok: chatUpd_(String(p.id || ''), p.st === 'done' ? 'done' : 'ack', clean(p.name, 40)), now: now };
  if (a === 'seen' || a === 'close') {
    var tb2 = clean(p.table, 40); if (!tb2) return { ok: false, err: 'table' };
    var lk = LockService.getUserLock(), res = { ok: true };
    try {
      lk.waitLock(10000);
      if (a === 'seen') { var sm2 = chatJson_('CHAT_SEEN'); sm2[tb2] = Math.max(+sm2[tb2] || 0, +p.ts || now); PROP.setProperty('CHAT_SEEN', JSON.stringify(sm2)); }
      else {
        var epm = chatJson_('CHAT_EP'); epm[tb2] = (+epm[tb2] || 0) + 1; PROP.setProperty('CHAT_EP', JSON.stringify(epm)); res.ep = epm[tb2];
        /* ເຊັກບິນ / ຍ້າຍໂຕະ → ລຶບຂໍ້ຄວາມຂອງໂຕະນີ້ອອກຈາກລະບົບທັນທີ */
        var arr = chatLoad_(), n0 = arr.length; arr = arr.filter(function (m) { return m.table !== tb2; }); if (arr.length !== n0) chatPut_(arr); res.removed = n0 - arr.length;
        var sm3 = chatJson_('CHAT_SEEN'); if (sm3[tb2]) { delete sm3[tb2]; PROP.setProperty('CHAT_SEEN', JSON.stringify(sm3)); }
        try { var sh = chatSheet_(); if (sh) sh.appendRow([now, 'clr' + now.toString(36), chatCell_(tb2), epm[tb2], '', 's', '', 'clr', '', '', '', '']); } catch (e3) {}
      }
      chatBump_();
    } catch (e) { return { ok: false, err: 'busy' }; } finally { try { lk.releaseLock(); } catch (e2) {} }
    return res;
  }
  return { ok: false, err: 'action' };
}
/* google.script.run (ເປີດແອັບຜ່ານ GAS ໂດຍກົງ) */
function chatRpc(json) { try { return JSON.stringify(chatApi_(JSON.parse(json))); } catch (e) { return JSON.stringify({ ok: false, err: 'payload' }); } }
