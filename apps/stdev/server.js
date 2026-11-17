/* stdev server — Server ດຽວ ແລ່ນ 2 ແອັບ: ຕິດຕາມນ້ຳມັນ (/) + ST HR (/hr/). ບໍ່ມີ dependency: Node >= 18
 * ໂຄງ: accounts.js (ບັນຊີກາງ/ສິດ) · mod-fuel.js + fuel-core.js (ນ້ຳມັນ) · mod-hr.js (HR ເດີມ) — ໂມດູນບໍ່ເອີ້ນກັນເອງ, ມີແຕ່ໄຟລ໌ນີ້ທີ່ຕໍ່ເຂົ້າກັນ
 *   ແລ່ນ:      PORT=3000 DATA_DIR=~/stdev-data node server.js
 *   ເພີ່ມຄົນ:  node server.js adduser <ເບີໂທ> "<ຊື່>" <PIN 4-8 ຫຼັກ> <superadmin|admin|user> [--fuel=driver|admin|head|office] [--hr] [--sites=s1,s2]
 *   ລາຍຊື່:    node server.js listusers
 *   ສ້າງ HR:   node server.js hr-setup "<ຊື່ບໍລິສັດ>" "<ຊື່ເຈົ້າຂອງ HR>" <PIN>      (ຄັ້ງດຽວ)
 * ຕົວປ່ຽນ: HR_COMPANY (ຕັ້ງຕົ້ນ main) · HR_LIB (ໂຟນເດີ server/ ທີ່ມີ hr.js) · HR_WEB (ໂຟນເດີໜ້າ HR) */
'use strict';
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
const DATA = process.env.DATA_DIR || path.join(os.homedir(), 'stdev-data'), PUB = path.join(__dirname, 'public');
const accounts = require('./accounts').create(DATA), fuel = require('./mod-fuel').create(DATA, accounts), hr = require('./mod-hr').create(DATA);

/* ===== ທະບຽນແອັບ (App registry) — ບ່ອນດຽວທີ່ໜ້າຫຼັກ (launcher) ອ່ານ. ເພີ່ມແອັບໃໝ່ (ເຊັ່ນ SOP) = ເພີ່ມ 1 ແຖວຢູ່ນີ້ + ໄຟລ໌ mod-<id>.js (ເບິ່ງ ADD-APP.md)
 *   access(u): ບັນຊີນີ້ໃຊ້ແອັບໄດ້ບໍ · href(u)/action: ກົດແລ້ວໄປໃສ · generic:true = ເຈົ້າຂອງຕິກເປີດໃຫ້ຕໍ່ຄົນໃນໜ້າ ພະນັກງານ & ສິດ (user.apps)
 *   api: ໂມດູນຮັບ action ທີ່ຂຶ້ນຕົ້ນດ້ວຍ "<id>." ເຊັ່ນ POST /api/sop.list → mods.sop.handle('list', body, user) */
const has = function (u, id) { return u.apps.indexOf('*') >= 0 || u.apps.indexOf(id) >= 0; };
const APPS = [
  { id: 'fuel', name: 'ຕິດຕາມນ້ຳມັນ', desc: function (u) { return u.fuel === 'driver' ? 'ຮັບຮູ້ການເຕີມນ້ຳມັນຂອງລົດຕົນ' : 'ໃບເບີກ · ລາຍງານ · ຍອດແທ່ງ'; }, icon: 'pump', href: function (u) { return u.fuel === 'driver' ? 'driver.html' : 'office.html'; }, access: function (u) { return !!u.fuel; } },
  { id: 'hr', name: 'ST HR', desc: function () { return 'ລົງເວລາ · ລາ · ເງິນເດືອນ'; }, icon: 'users', action: 'hr', access: function (u) { return u.hr && hr.ready(); } }
  /* ຕົວຢ່າງ SOP: { id: 'sop', name: 'SOP', desc: function () { return 'ຂັ້ນຕອນການເຮັດວຽກ'; }, icon: 'sheet', href: function () { return 'sop.html'; }, generic: true, access: function (u) { return has(u, 'sop'); } } */
];
const MODS = {}; /* ໂມດູນແອັບອື່ນ: MODS.sop = require('./mod-sop').create(DATA, accounts) */
function appsFor(u) { return APPS.filter(function (a) { return a.access(u); }).map(function (a) { return { id: a.id, name: a.name, desc: a.desc(u), icon: a.icon, href: a.href ? a.href(u) : '', action: a.action || '' }; }); }
const catalog = function () { return APPS.filter(function (a) { return a.generic; }).map(function (a) { return { id: a.id, name: a.name }; }); };

/* ===== API: ກວດສິດຊັ້ນບັນຊີກາງກ່ອນ ແລ້ວສົ່ງຕໍ່ໂມດູນ ===== */
function api(action, o, ip) {
  if (action === 'login') { const r = accounts.login(o, ip); if (r.ok) { r.hr = r.hr && hr.ready(); r.napps = appsFor(r).length; } return r; }
  const u = accounts.userOf(o.token); if (!u) return { ok: false, error: 'auth' };
  switch (action) {
    case 'me': return { ok: true, data: { id: u.id, name: u.name, level: u.level, fuel: u.fuel, hr: u.hr && hr.ready(), apps: appsFor(u), catalog: u.level === 'user' ? [] : catalog() } };
    case 'pin': return accounts.changePin(u.id, o.old, o.pin);
    case 'userList': return u.level === 'user' ? { ok: false, error: 'auth' } : { ok: true, data: accounts.list(u) };
    case 'userSave': { const r = accounts.save(o.user || {}, u); return r.ok ? { ok: true, data: 1 } : r; }
    case 'catalog': return u.level === 'user' ? { ok: false, error: 'auth' } : { ok: true, data: catalog() };
    case 'hrlogin': return hr.login(u);
  }
  const dot = action.indexOf('.'); /* <app>.<action> → ໂມດູນຂອງແອັບນັ້ນ (ຕ້ອງມີສິດໃນແອັບນັ້ນກ່ອນ) */
  if (dot > 0) { const id = action.slice(0, dot), app = APPS.filter(function (a) { return a.id === id; })[0]; if (!app || !MODS[id]) return { ok: false, error: 'noapp' }; if (!app.access(u)) return { ok: false, error: 'noapp' }; return MODS[id].handle(action.slice(dot + 1), o, u); }
  const r = fuel.handle(action, o, u);
  if (action === 'init' && r.ok) { r.data.me.role = u.fuel; r.data.me.phone = u.id; r.data.me.level = u.level; r.data.me.approver = u.approver; r.data.hr = u.hr && hr.ready(); }
  return r;
}

/* ===== HTTP ===== */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const HEAD = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'" };
const send = function (res, code, body, type) { res.writeHead(code, Object.assign({ 'Content-Type': (type || 'text/plain') + '; charset=utf-8', 'Cache-Control': 'no-store' }, HEAD)); res.end(body); };
function readBody(req, res, max, cb) { const ch = []; let size = 0, dead = false; req.on('data', function (c) { size += c.length; if (size > max) { dead = true; send(res, 413, 'too large'); req.destroy(); } else ch.push(c); }); req.on('end', function () { if (!dead) cb(Buffer.concat(ch).toString('utf8')); }); }
function handler(req, res) {
  const url = new URL(req.url, 'http://x'), ip = String(req.socket.remoteAddress || '');
  if (url.pathname === '/api/hr') { /* ໂປຣໂຕຄໍ Apps Script ຂອງ HR: POST {action,...} → {ok,data|error}. HR ກວດ session ຂອງຕົນເອງ */
    if (!hr.ready()) return send(res, 200, JSON.stringify({ ok: false, error: 'ຍັງບໍ່ໄດ້ສ້າງ HR ໃນ server ນີ້' }), 'application/json');
    if (req.method === 'GET') return send(res, 200, JSON.stringify({ ok: true, data: hr.ping() }), 'application/json');
    if (req.method !== 'POST') return send(res, 405, 'post');
    return readBody(req, res, 12e6, function (b) { let out; try { out = hr.post(b); } catch (e) { console.error(e); out = JSON.stringify({ ok: false, error: 'server' }); } send(res, 200, out, 'application/json'); });
  }
  if (url.pathname === '/hr') { res.writeHead(302, { Location: '/hr/' + url.search }); return res.end(); }
  if (url.pathname.indexOf('/hr/') === 0 && hr.avail()) { /* ໜ້າ HR (build ເດີມ): CSP ເຄັ່ງຂອງແອັບນ້ຳມັນບໍ່ໃຊ້ກັບບ່ອນນີ້ */
    const f = hr.file(url.pathname); if (!f || f.code !== 200) return send(res, f ? f.code : 404, 'not found');
    res.writeHead(200, { 'Content-Type': f.type, 'Cache-Control': f.cache, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' }); return res.end(req.method === 'HEAD' ? undefined : f.body);
  }
  if (url.pathname.indexOf('/api/') === 0) {
    if (req.method !== 'POST') return send(res, 405, 'post');
    return readBody(req, res, 1.5e6, function (b) {
      let o; try { o = JSON.parse(b || '{}'); } catch (e) { return send(res, 200, JSON.stringify({ ok: false, error: 'json' }), 'application/json'); }
      let r; try { r = api(url.pathname.slice(5), o && typeof o === 'object' ? o : {}, ip); } catch (e) { console.error(e); r = { ok: false, error: 'server' }; }
      send(res, 200, JSON.stringify(r), 'application/json');
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method');
  let f = decodeURIComponent(url.pathname); if (f === '/') f = '/index.html';
  f = path.join(PUB, path.normalize(f)); if (f.indexOf(PUB + path.sep) !== 0) return send(res, 403, 'denied');
  fs.readFile(f, function (e, d) { if (e) return send(res, 404, 'not found'); const ty = TYPES[path.extname(f)] || 'application/octet-stream'; res.writeHead(200, Object.assign({ 'Content-Type': /^(text|application\/(manifest))|svg|javascript/.test(ty) ? ty + '; charset=utf-8' : ty, 'Cache-Control': 'no-store' }, HEAD)); res.end(req.method === 'HEAD' ? undefined : d); });
}

/* ຕອນບໍ່ມີ Shell (cPanel ບາງແຜນ): ວາງ DATA_DIR/bootstrap.json = {"phone":"…","name":"…","pin":"…"} ແລ້ວ restart → ສ້າງ Super admin ຄົນທຳອິດ (ສະເພາະເມື່ອຍັງບໍ່ມີຜູ້ໃຊ້) ແລະ ລຶບໄຟລ໌ນັ້ນທັນທີ */
function bootstrap() {
  const f = path.join(DATA, 'bootstrap.json'); if (!fs.existsSync(f) || Object.keys(accounts.users()).length) return;
  try { const b = JSON.parse(fs.readFileSync(f, 'utf8')), r = accounts.save({ phone: b.phone, name: b.name, pin: b.pin, level: 'superadmin' }, null); console.log(r.ok ? 'bootstrap: superadmin ' + r.phone : 'bootstrap ERROR ' + r.error); if (r.ok) fs.unlinkSync(f); } catch (e) { console.log('bootstrap ERROR', e.message); }
}
/* ===== ຄຳສັ່ງ CLI ===== */
function cli(a) {
  const flag = function (n) { const m = a.filter(function (x) { return x.indexOf('--' + n) === 0; })[0]; return m === undefined ? null : (m.split('=')[1] || true); };
  if (a[2] === 'adduser') {
    const r = accounts.save({ phone: a[3], name: a[4], pin: a[5], level: a[6], fuel: flag('fuel') || '', hr: flag('hr') === true, approver: flag('approver') === true, sites: flag('sites') ? String(flag('sites')).split(',') : [] }, null);
    console.log(r.ok ? 'ok ' + r.phone : 'ERROR ' + r.error + ' (ເບີ 8-15 ຕົວເລກ · PIN 4-8 ຫຼັກ · level ' + accounts.LEVELS.join('|') + ' · user ຕ້ອງມີ --fuel=… ຫຼື --hr)'); return r.ok ? 0 : 1;
  }
  if (a[2] === 'listusers') { const all = accounts.users(); Object.keys(all).forEach(function (k) { const u = all[k]; console.log(k, u.level, u.fuel ? 'fuel=' + u.fuel : '', u.hr ? 'hr' : '', u.active ? '' : '(ປິດ)', u.name); }); return 0; }
  if (a[2] === 'hr-setup') {
    if (!hr.avail()) { console.log('ERROR ຫາໂຄ້ດ HR ບໍ່ເຫັນ (ຕັ້ງ HR_LIB / HR_WEB)'); return 1; }
    if (!a[3] || !a[4] || !accounts.pinOk(a[5])) { console.log('ໃຊ້: node server.js hr-setup "<ຊື່ບໍລິສັດ>" "<ຊື່ເຈົ້າຂອງ HR>" <PIN 4-8 ຫຼັກ>'); return 1; }
    const r = hr.setup(a[3], a[4], a[5]); console.log(r.ok ? 'ok HR: ' + r.company + ' (ເຈົ້າຂອງ ST-001)' : 'ERROR ' + r.err); return r.ok ? 0 : 1;
  }
  return -1;
}
{ /* ຕ້ອງເປີດ port ເອງເສມີ: cPanel (Passenger) ໂຫຼດໄຟລ໌ນີ້ດ້ວຍ require → require.main ບໍ່ແມ່ນໄຟລ໌ນີ້ */
  const c = cli(process.argv); if (c >= 0) process.exit(c);
  bootstrap();
  const port = +process.env.PORT || 3000, n = Object.keys(accounts.users()).length;
  http.createServer(handler).listen(port, function () { console.log('stdev on ' + port + ' · data ' + DATA + ' · HR ' + (hr.avail() ? (hr.ready() ? 'ready' : 'ຍັງບໍ່ໄດ້ສ້າງ (hr-setup)') : 'ບໍ່ພົບໂຄ້ດ') + (n ? '' : ' · ຍັງບໍ່ມີຜູ້ໃຊ້ — ເພີ່ມ superadmin: node server.js adduser ...')); });
}
module.exports = { handler: handler, api: api };
