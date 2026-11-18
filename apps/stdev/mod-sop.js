/* ໂມດູນ SOP ເຊັກລິດ — ຕໍ່ກັບ server ຜ່ານທະບຽນແອັບ (server.js): action ຂຶ້ນຕົ້ນດ້ວຍ "sop." ເຊັ່ນ POST /api/sop.me
 * ບໍ່ຮູ້ຈັກ ນ້ຳມັນ / HR; ໄດ້ຮັບ user (view ຈາກບັນຊີກາງ) ແລະ accounts ເພື່ອລາຍຊື່ຄົນ + ເປີດແອັບນີ້ໃຫ້ຄົນທີ່ຖືກມອບເຊັກລິດ
 * ຂໍ້ມູນ: DATA/sop/{templates.json (ຜູ້ດູແລແກ້), assign.json, runs-YYYY-MM.json}
 * ສິດ: ລະດັບ admin/superadmin = ມອບໝາຍ, ແກ້ລາຍການ, ເບິ່ງກະດານ, ຮັບຮອງ. ຜູ້ໃຊ້ທົ່ວໄປ = ເຮັດເຊັກລິດທີ່ຖືກມອບໃຫ້ຕົນເອງເທົ່ານັ້ນ */
'use strict';
const fs = require('fs'), path = require('path');
const SEED = require('./sop-data').TEMPLATES;
const FREQ = ['daily', 'weekly', 'monthly', 'event'];

function create(DATA, accounts, opts) {
  const dir = path.join(DATA, 'sop'); fs.mkdirSync(dir, { recursive: true });
  const nowMs = function () { return opts && opts.now ? opts.now() : Date.now(); };
  const laoDay = function (back) { return new Date(nowMs() + 7 * 36e5 - (back || 0) * 864e5).toISOString().slice(0, 10); }; /* ເວລາລາວ UTC+7 */
  const read = function (n, def) { try { return JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch (e) { return def; } };
  const write = function (n, v) { const f = path.join(dir, n), t = f + '.' + process.pid + '.tmp'; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, f); };
  const err = function (e) { return { ok: false, error: e }; }, ok = function (d) { return { ok: true, data: d }; };
  const str = function (x, n) { return String(x == null ? '' : x).replace(/[<>]/g, '').trim().slice(0, n); };
  const isAdmin = function (u) { return u.level !== 'user'; };

  /* ----- ແມ່ແບບ: ເລີ່ມຕົ້ນຈາກ sop-data.js + ສິ່ງທີ່ຜູ້ດູແລແກ້ (templates.json) ----- */
  const templates = function () {
    const ov = read('templates.json', {});
    return SEED.map(function (t) { const o = ov[t.id]; return Object.assign({}, t, o ? { title: o.title || t.title, items: o.items || t.items, edited: true } : { edited: false }); });
  };
  const tplOf = function (id) { return templates().filter(function (t) { return t.id === id; })[0] || null; };
  const brief = function (t) { return { id: t.id, sop: t.sop, code: t.code, title: t.title, freq: t.freq, per: t.per || '', n: t.items.length, warn: t.warn || '', edited: !!t.edited }; };

  /* ----- ການມອບໝາຍ: [{tpl, user}] ----- */
  const assigns = function () { return read('assign.json', []); };
  const people = function () { const all = accounts.users(); return Object.keys(all).filter(function (k) { return all[k].active; }).sort().map(function (k) { return { phone: k, name: all[k].name, level: all[k].level }; }); };

  /* ----- ການເຮັດ (run): ເກັບລາຍເດືອນ. id = ເດືອນ~tpl~ຄົນ~key ; key = ວັນທີ (daily) · ເດືອນ (monthly) · e<ເວລາ> (event) ----- */
  const monthOf = function (id) { return String(id).split('~')[0]; };
  const runsFile = function (m) { return 'runs-' + m + '.json'; };
  const getRun = function (id) { if (!/^\d{4}-\d{2}~/.test(id)) return null; return (read(runsFile(monthOf(id)), {}))[id] || null; };
  const putRun = function (r) { const f = runsFile(monthOf(r.id)), all = read(f, {}); all[r.id] = r; write(f, all); };
  /* ອາທິດ ISO (ຈັນ–ອາທິດ): key = YYYY-Www ; ເກັບໃນໄຟລ໌ຂອງເດືອນທີ່ວັນຈັນຂອງອາທິດນັ້ນຢູ່ */
  const isoWeek = function (d) { const t = new Date(d + 'T00:00:00Z'), mon = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 864e5), th = new Date(mon.getTime() + 3 * 864e5), y = th.getUTCFullYear(), wk = Math.floor((th - Date.UTC(y, 0, 1)) / 864e5 / 7) + 1; return y + '-W' + ('0' + wk).slice(-2); };
  const mondayOf = function (key) { const m = /^(\d{4})-W(\d{2})/.exec(key), j4 = new Date(Date.UTC(+m[1], 0, 4)), mon1 = new Date(j4.getTime() - ((j4.getUTCDay() + 6) % 7) * 864e5); return new Date(mon1.getTime() + (+m[2] - 1) * 7 * 864e5).toISOString().slice(0, 10); };
  const monthKey = function (key) { return key[0] === 'e' ? laoDay(0).slice(0, 7) : /^\d{4}-W\d{2}/.test(key) ? mondayOf(key).slice(0, 7) : key.slice(0, 7); };
  const mkId = function (tpl, user, key) { return monthKey(key) + '~' + tpl + '~' + user + '~' + key; };
  const answered = function (r) { return r.items.filter(function (i) { return r.a[i.id] && (r.a[i.id].v === 1 || r.a[i.id].v === 0); }).length; };
  const fails = function (r) { return r.items.filter(function (i) { return r.a[i.id] && r.a[i.id].v === 0; }).length; };
  const sum = function (r) { return { id: r.id, tpl: r.tpl, user: r.user, name: r.name, key: r.key, label: r.label || '', status: r.status, total: r.items.length, answered: answered(r), fails: fails(r), doneAt: r.doneAt || 0, created: r.created, appr: r.appr || null }; };
  const months = function (n) { const out = []; for (let i = 0; i < n; i++) { const d = new Date(nowMs() + 7 * 36e5); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - i); out.push(d.toISOString().slice(0, 7)); } return out; };
  const allRuns = function (n) { let l = []; months(n).forEach(function (m) { const f = read(runsFile(m), {}); Object.keys(f).forEach(function (k) { l.push(f[k]); }); }); return l.sort(function (a, b) { return b.created - a.created; }); };
  const periodKey = function (t) { return t.freq === 'daily' ? laoDay(0) : t.freq === 'weekly' ? isoWeek(laoDay(0)) : t.freq === 'monthly' ? laoDay(0).slice(0, 7) : null; };
  /* ໃບ "ຕໍ່ລົດ": ລົດມາຈາກແອັບນ້ຳມັນ (ຄົນຂັບ ↔ ລົດ). own = ລົດທີ່ຄົນນັ້ນຂັບ · all = ທຸກຄັນ */
  const fleet = function () { try { return opts && opts.vehicles ? opts.vehicles() : []; } catch (e) { return []; } };
  const vehiclesFor = function (t, ph) { return fleet().filter(function (v) { return t.per === 'all' || v.driver === ph; }); };
  const userName = function (ph) { const u = accounts.users()[ph]; return u ? u.name : ph; };
  const snap = function (t) { return t.items.map(function (i) { return { id: i.id, code: i.code, sec: i.sec || '', text: i.text, by: i.by, co: i.co, doc: i.doc, gate: !!i.gate }; }); };
  const newRun = function (t, user, key, label, veh) { return { id: mkId(t.id, user.id, key), veh: veh ? { id: veh.id, name: veh.name } : null, tpl: t.id, code: t.code, title: t.title, sop: t.sop, freq: t.freq, warn: t.warn || '', user: user.id, name: user.name, key: key, label: str(label, 60), items: snap(t), a: {}, created: nowMs(), status: 'open', doneAt: 0, appr: null }; };
  const assigned = function (tpl, ph) { return assigns().some(function (a) { return a.tpl === tpl && a.user === ph; }); };
  const canTouch = function (u, r) { return r && (r.user === u.id || isAdmin(u)); };

  function handle(action, o, user) {
    const admin = isAdmin(user);
    if (action === 'me') { /* ເຊັກລິດທີ່ຂ້ອຍຕ້ອງເຮັດ */
      const mine = assigns().filter(function (a) { return a.user === user.id; }), runs = allRuns(3).filter(function (r) { return r.user === user.id; });
      return ok({ admin: admin, id: user.id, name: user.name, mine: mine.map(function (a) { return tplOf(a.tpl); }).filter(Boolean).map(function (t) {
        const key = periodKey(t);
        if (t.per) return { tpl: brief(t), veh: vehiclesFor(t, user.id).map(function (v) { const k = key + '@' + v.id, cur = runs.filter(function (r) { return r.tpl === t.id && r.key === k; })[0]; return { id: v.id, name: v.name, site: v.site, key: k, run: cur ? sum(cur) : null }; }) };
        const cur = key ? runs.filter(function (r) { return r.tpl === t.id && r.key === key; })[0] : null;
        return { tpl: brief(t), key: key, run: cur ? sum(cur) : null, runs: key ? [] : runs.filter(function (r) { return r.tpl === t.id; }).slice(0, 8).map(sum) };
      }) });
    }
    if (action === 'open') { /* ເປີດໃບເຊັກ: daily/weekly/monthly ສ້າງເອງຖ້າຍັງບໍ່ມີ; ໃບຕໍ່ລົດຕ້ອງບອກລົດ (veh); event ຕ້ອງໃຊ້ id */
      if (o.id) { const r = getRun(String(o.id)); return canTouch(user, r) ? ok(r) : err(r ? 'auth' : 'run'); }
      const t = tplOf(String(o.tpl)); if (!t) return err('tpl'); let key = periodKey(t); if (!key) return err('run');
      if (!assigned(t.id, user.id) && !admin) return err('auth');
      let veh = null;
      if (t.per) { const list = vehiclesFor(t, user.id).concat(admin ? fleet() : []); veh = list.filter(function (v) { return v.id === o.veh; })[0]; if (!veh) return err('veh'); key += '@' + veh.id; }
      const id = mkId(t.id, user.id, key); let r = getRun(id); if (!r) { r = newRun(t, user, key, veh ? veh.name : '', veh); putRun(r); } return ok(r);
    }
    if (action === 'new') { /* ເລີ່ມເຊັກລິດແບບຄັ້ງ (ໂຄງການ / ການຮັບນ້ຳມັນ) */
      const t = tplOf(String(o.tpl)); if (!t || t.freq !== 'event') return err('tpl'); if (!assigned(t.id, user.id) && !admin) return err('auth');
      const label = str(o.label, 60); if (!label) return err('label');
      const r = newRun(t, user, 'e' + nowMs().toString(36), label); putRun(r); return ok(r);
    }
    if (action === 'mark') {
      const r = getRun(String(o.id)); if (!canTouch(user, r)) return err(r ? 'auth' : 'run'); if (r.status !== 'open') return err('locked');
      if (!r.items.some(function (i) { return i.id === o.item; })) return err('item');
      const v = o.v === 1 || o.v === 0 ? o.v : null, note = str(o.note, 200);
      if (v == null && !note) delete r.a[o.item]; else r.a[o.item] = { v: v, note: note, at: nowMs() };
      putRun(r); return ok(r);
    }
    if (action === 'markMany') { /* ໝາຍ ✓ ຜ່ານ ທີ່ຍັງບໍ່ໄດ້ຕອບ ຫຼາຍຂໍ້ເທື່ອດຽວ (ປຸ່ມ "ຜ່ານທັງໝົດໃນໝວດ") — ບໍ່ທັບຂໍ້ທີ່ຕອບແລ້ວ */
      const r = getRun(String(o.id)); if (!canTouch(user, r)) return err(r ? 'auth' : 'run'); if (r.status !== 'open') return err('locked');
      const ids = Array.isArray(o.items) ? o.items.map(String) : []; if (!ids.every(function (x) { return r.items.some(function (i) { return i.id === x; }); })) return err('item');
      ids.forEach(function (x) { const a = r.a[x]; if (!a || (a.v !== 1 && a.v !== 0)) r.a[x] = { v: 1, note: a ? a.note || '' : '', at: nowMs() }; });
      putRun(r); return ok(r);
    }
    if (action === 'submit') {
      const r = getRun(String(o.id)); if (!r || r.user !== user.id) return err(r ? 'auth' : 'run'); if (r.status !== 'open') return err('locked');
      if (answered(r) < r.items.length) return err('open');
      if (r.items.some(function (i) { return r.a[i.id].v === 0 && !r.a[i.id].note; })) return err('note'); /* ຂໍ້ທີ່ "ບໍ່ຜ່ານ" ຕ້ອງມີໝາຍເຫດ */
      r.status = 'done'; r.doneAt = nowMs(); putRun(r); return ok(r);
    }
    if (admin && action === 'reopen') { const r = getRun(String(o.id)); if (!r) return err('run'); r.status = 'open'; r.doneAt = 0; r.appr = null; putRun(r); return ok(r); }
    if (admin && action === 'approve') {
      const r = getRun(String(o.id)); if (!r) return err('run'); if (r.status !== 'done') return err('open');
      r.appr = o.yes === false ? null : { by: user.id, name: user.name, at: nowMs() }; putRun(r); return ok(r);
    }
    if (admin && action === 'board') { /* ກະດານຕິດຕາມ: ໃຜເຮັດຫຍັງແລ້ວ ໃນມື້/ເດືອນນີ້ + ປະຫວັດ 60 ລາຍການ */
      const runs = allRuns(2), rows = [];
      assigns().forEach(function (a) {
        const t = tplOf(a.tpl); if (!t) return; const key = periodKey(t), mine = runs.filter(function (r) { return r.tpl === t.id && r.user === a.user; });
        if (t.per) { const vs = vehiclesFor(t, a.user); if (!vs.length) rows.push({ tpl: brief(t), user: a.user, name: userName(a.user), veh: '', noveh: true, key: key, run: null }); vs.forEach(function (v) { const k = key + '@' + v.id, cur = mine.filter(function (r) { return r.key === k; })[0]; rows.push({ tpl: brief(t), user: a.user, name: userName(a.user), veh: v.name, key: k, run: cur ? sum(cur) : null }); }); return; }
        const cur = key ? mine.filter(function (r) { return r.key === key; })[0] : mine.filter(function (r) { return r.status === 'open'; })[0] || mine[0];
        rows.push({ tpl: brief(t), user: a.user, name: userName(a.user), key: key, run: cur ? sum(cur) : null });
      });
      return ok({ day: laoDay(0), rows: rows, recent: runs.slice(0, 60).map(sum) });
    }
    if (admin && action === 'tpls') return ok({ tpls: templates(), people: people(), assign: assigns() });
    if (admin && action === 'assignSet') { /* {tpl, users:[…]} (ຕາມເຊັກລິດ) ຫຼື {user, tpls:[…]} (ຕາມຄົນ) — ແທນທີ່ທັງຊຸດຂອງອັນນັ້ນ */
      const all = accounts.users(), ids = templates().map(function (t) { return t.id; });
      let list = assigns(), touched = [];
      if (o.tpl != null) {
        if (ids.indexOf(o.tpl) < 0) return err('tpl'); const us = (Array.isArray(o.users) ? o.users : []).map(String).filter(function (p, i, a) { return all[p] && all[p].active && a.indexOf(p) === i; });
        list = list.filter(function (a) { return a.tpl !== o.tpl; }).concat(us.map(function (p) { return { tpl: o.tpl, user: p }; })); touched = us;
      } else if (o.user != null) {
        const p = String(o.user); if (!all[p] || !all[p].active) return err('people'); const ts = (Array.isArray(o.tpls) ? o.tpls : []).map(String).filter(function (t, i, a) { return ids.indexOf(t) >= 0 && a.indexOf(t) === i; });
        list = list.filter(function (a) { return a.user !== p; }).concat(ts.map(function (t) { return { tpl: t, user: p }; })); touched = ts.length ? [p] : [];
      } else return err('tpl');
      /* ຄົນທີ່ຖືກມອບ ຕ້ອງເຂົ້າແອັບ SOP ໄດ້: ເປີດແອັບໃຫ້ອັດຕະໂນມັດ (ລະດັບ user ເທົ່ານັ້ນ — admin ເຂົ້າໄດ້ທຸກແອັບຢູ່ແລ້ວ) */
      for (let i = 0; i < touched.length; i++) {
        const u = all[touched[i]]; if (u.level !== 'user' || (u.apps || []).indexOf('sop') >= 0) continue;
        const r = accounts.save({ phone: touched[i], apps: (u.apps || []).concat('sop') }, user); if (!r.ok) return err(r.error === 'auth' ? 'auth' : 'people');
      }
      write('assign.json', list); return ok(list);
    }
    if (admin && action === 'tplSave') { /* ແກ້ຊື່ ແລະ ລາຍການຂອງເຊັກລິດ (ບໍ່ກະທົບໃບທີ່ເຮັດແລ້ວ — ເກັບສຳເນົາໄວ້ໃນໃບນັ້ນ) */
      const t = SEED.filter(function (x) { return x.id === o.id; })[0]; if (!t) return err('tpl');
      const items = (Array.isArray(o.items) ? o.items : []).slice(0, 80).map(function (i, n) {
        const text = str(i.text, 600); if (!text) return null; const id = /^[a-z0-9]{1,12}$/i.test(i.id || '') ? i.id : 'x' + nowMs().toString(36) + n;
        return { id: id, code: str(i.code, 12), sec: str(i.sec, 60), text: text, by: str(i.by, 80), co: str(i.co, 80), doc: str(i.doc, 100), gate: !!i.gate };
      }).filter(Boolean);
      if (!items.length) return err('noitems');
      const seen = {}; for (let i = 0; i < items.length; i++) { if (seen[items[i].id]) return err('item'); seen[items[i].id] = 1; }
      const ov = read('templates.json', {}); ov[t.id] = { title: str(o.title, 100) || t.title, items: items }; write('templates.json', ov); return ok(tplOf(t.id));
    }
    if (admin && action === 'tplReset') { const ov = read('templates.json', {}); delete ov[String(o.id)]; write('templates.json', ov); return ok(tplOf(String(o.id))); }
    return err(admin ? 'action' : 'auth');
  }
  return { handle: handle };
}
module.exports = { create: create, FREQ: FREQ };
