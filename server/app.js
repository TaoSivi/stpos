/* ST POS server ສຳລັບໂຮສຂອງຮ້ານ (cPanel → Setup Node.js App)
 * ແລ່ນ Code.gs ເດີມ (ຄືກັບໃນ Google Apps Script) — ແອັບຮັບ-ສົ່ງຂໍ້ມູນແບບດຽວກັນທຸກຢ່າງ
 * ຄ່າໃນ env (Setup Node.js App → Environment variables):
 *   DATA_DIR   ໂຟນເດີເກັບຂໍ້ມູນ (ຄ່າເລີ່ມຕົ້ນ ~/stpos-data — ຢູ່ນອກ public_html)
 *   API_TOKEN  ລະຫັດທີ່ແອັບຕ້ອງສົ່ງມາ (ຄວນຕັ້ງ!) — ເຄື່ອງທຸກເຄື່ອງໃສ່ token ດຽວກັນ
 *   ADMIN_KEY  ລະຫັດສຳລັບຄຳສັ່ງຜູ້ດູແລ (?admin=...) — ບໍ່ຕັ້ງ = ປິດ
 *   CRON_KEY   ລະຫັດສຳລັບ cron ທຸກຊົ່ວໂມງ (?cron=...) — ສຳຮອງ 03:00 + ລາຍງານປະຈຳວັນ
 *   WA_CALLMEBOT, REPORT_HOUR, TG_BOT, TG_CHAT  (ຄືກັບ Script Properties ເດີມ) */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

/* secrets.json ຂ້າງ app.js (ສ້າງໃນຄອມ, ບໍ່ຂຶ້ນ GitHub) ມີສິດກ່ອນ env — ບໍ່ຕ້ອງພິມລະຫັດໃນ cPanel */
if (!process.env.STPOS_NO_SECRETS) try { const sec = JSON.parse(fs.readFileSync(path.join(__dirname, 'secrets.json'), 'utf8')); ['API_TOKEN', 'ADMIN_KEY', 'CRON_KEY'].forEach(function (k) { if (typeof sec[k] === 'string' && sec[k].length >= 16) process.env[k] = sec[k]; }); } catch (e) {}
const DATA_DIR = process.env.DATA_DIR || path.join(os.homedir(), 'stpos-data');
const shim = require('./gas-shim').create(DATA_DIR);
Object.assign(global, shim.globals);
const codePath = [path.join(__dirname, 'Code.gs'), path.join(__dirname, '..', 'Code.gs')].filter(fs.existsSync)[0];
if (!codePath) throw new Error('Code.gs not found next to app.js');
vm.runInThisContext(fs.readFileSync(codePath, 'utf8'), { filename: 'Code.gs' });
const G = global;

/* ເທື່ອທຳອິດ: ຕັ້ງສຳຮອງອັດຕະໂນມັດທຸກມື້ 03:00 (ເກັບ 14 ມື້) */
shim.beginRequest();
try { if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'backupDaily'; })) G.setupBackup(); }
finally { shim.endRequest(); }

const ADMIN_FN = ['installDailyReport', 'removeDailyReport', 'testDailyReport', 'setupTelegram', 'setupBackup', 'backupDaily', 'rebuild', 'dailyReport'];
const MAX_BODY = 60 * 1024 * 1024;
function keyOk(given, name) { const k = String(process.env[name] || shim.props.getProperty(name) || ''); if (k.length < 8) return false; const a = Buffer.from(String(given || '')), b = Buffer.from(k); return a.length === b.length && crypto.timingSafeEqual(a, b); }
function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': (type || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body); }
function out(res, o) { send(res, 200, o.getContent(), o.mime); }

/* ດຶງຂໍ້ມູນຮ້ານຈາກ Google Apps Script ເດີມ (ຍ້າຍຂໍ້ມູນເທື່ອດຽວ) */
function pullFromGas(url, token) {
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return { ok: false, err: 'url' };
  const r = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=cb&token=' + encodeURIComponent(token || ''), { muteHttpExceptions: true, followRedirects: true });
  const t = r.getContentText(), m = /^\s*cb\(([\s\S]*)\)\s*;?\s*$/.exec(t);
  if (!m) return { ok: false, err: 'HTTP ' + r.getResponseCode() + ' ' + t.slice(0, 120) };
  const p = JSON.parse(m[1]); if (!p.ok || !p.state) return { ok: false, err: p.err || 'empty' };
  const st = JSON.parse(p.state);
  return { ok: true, json: p.state, bills: (st.bills || []).length, tables: Object.keys(st.tables || {}).length, ingredients: Object.keys(st.ingredients || {}).length };
}

function handle(req, res, body) {
  const u = new URL(req.url, 'http://x'), q = {};
  u.searchParams.forEach(function (v, k) { q[k] = v; });
  if (q.cron !== undefined) {
    if (!keyOk(q.cron, 'CRON_KEY')) return send(res, 403, 'denied');
    const r = shim.runDue(G); shim.sweepCache();
    return send(res, 200, JSON.stringify({ ok: true, ran: r, at: new Date().toISOString() }), 'application/json');
  }
  if (q.admin !== undefined) {
    if (!keyOk(q.key, 'ADMIN_KEY')) return send(res, 403, 'denied');
    const a = String(q.admin);
    if (a === 'status') {
      const s = G.getState_(); let info = { bytes: s.length };
      try { const st = JSON.parse(s || '{}'); info.shop = st.shopName; info.bills = (st.bills || []).length; info.v = st._v; } catch (e) {}
      info.backups = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return n.indexOf('BAK_') === 0; });
      info.triggers = ScriptApp.getProjectTriggers().map(function (t) { return t._t; });
      info.token = !!(shim.props.getProperty('API_TOKEN') || '').trim(); info.node = process.version; info.dataDir = DATA_DIR;
      return send(res, 200, JSON.stringify(info, null, 1), 'application/json');
    }
    if (a === 'pullgas' || a === 'import') {
      let json;
      if (a === 'pullgas') { const r = pullFromGas(String(q.url || ''), String(q.gtoken || '')); if (!r.ok) return send(res, 200, JSON.stringify(r), 'application/json'); json = r.json; }
      else { json = body; if (json.indexOf('GZ:') === 0) json = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(json.substring(3)))).getDataAsString('UTF-8'); }
      let st; try { st = JSON.parse(json); } catch (e) { return send(res, 400, JSON.stringify({ ok: false, err: 'json' }), 'application/json'); }
      if (!st || typeof st !== 'object' || (!st.catalog && !st.bills)) return send(res, 400, JSON.stringify({ ok: false, err: 'not ST POS data' }), 'application/json');
      if (G.getState_() && q.force !== '1') return send(res, 409, JSON.stringify({ ok: false, err: 'server ມີຂໍ້ມູນແລ້ວ — ໃສ່ &force=1 ຖ້າຕ້ອງການຂຽນທັບ (ສຳຮອງໃຫ້ກ່ອນອັດຕະໂນມັດ)' }), 'application/json');
      if (G.getState_()) G.backupDaily();
      const lock = LockService.getScriptLock(); lock.waitLock(30000);
      try { G.saveStateRaw_(json, true); } finally { lock.releaseLock(); }
      return send(res, 200, JSON.stringify({ ok: true, bytes: json.length, bills: (st.bills || []).length, tables: Object.keys(st.tables || {}).length, ingredients: Object.keys(st.ingredients || {}).length }), 'application/json');
    }
    if (ADMIN_FN.indexOf(a) >= 0) { const r = G[a](); return send(res, 200, typeof r === 'string' ? r : JSON.stringify(r), 'text/plain'); }
    return send(res, 400, 'unknown admin');
  }
  if (req.method === 'POST') return out(res, G.doPost({ parameter: q, postData: { contents: body, length: body.length, type: req.headers['content-type'] || '' } }));
  if (q.callback) return out(res, G.doGet({ parameter: q }));
  return send(res, 200, 'ST POS server OK');
}

const server = http.createServer(function (req, res) {
  const chunks = []; let size = 0, dead = false;
  req.on('data', function (c) { size += c.length; if (size > MAX_BODY) { dead = true; send(res, 413, 'too large'); req.destroy(); return; } chunks.push(c); });
  req.on('end', function () {
    if (dead) return;
    shim.beginRequest();
    try { handle(req, res, Buffer.concat(chunks).toString('utf8')); }
    catch (e) { console.error(new Date().toISOString(), e && e.stack || e); if (!res.headersSent) send(res, 500, 'err'); }
    finally { try { shim.endRequest(); } catch (e2) { console.error('flush failed', e2); } }
  });
});
server.listen(process.env.PORT || 3000, function () { console.log('ST POS server on', process.env.PORT || 3000, '· data', DATA_DIR); });
module.exports = server;
