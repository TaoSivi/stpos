/* ST POS delta sync — ສົ່ງ/ຮັບສະເພາະສ່ວນທີ່ປ່ຽນຂອງຂໍ້ມູນຮ້ານ (ແທນກ້ອນເຕັມ)
 * ໃຊ້ຮ່ວມກັນທັງ server (require) ແລະ ແອັບ (ຄັດລອກເຂົ້າ index.html ລະຫວ່າງ STPOS-DELTA BEGIN/END — test ກວດວ່າຄືກັນທຸກຕົວອັກສອນ)
 * patch = { s: {key: change}, d: [deleted keys] } · change = {$v: value} | {$s: [ສ່ວນຫົວ, ສ່ວນທ້າຍ ທີ່ຄືເກົ່າ], m: [ຊ່ວງກາງໃໝ່]} | {$k: [ລຳດັບ id], c: {id: ລາຍການທີ່ປ່ຽນ}} | {$o: {key: value}, x: [deleted]} ($a ເກົ່າ: ຍັງ apply ໄດ້)
 * ກວດຄວາມຖືກຕ້ອງດ້ວຍ hash ຂອງ canon() (ລຽງ key) — ຜິດ = ກັບໄປໃຊ້ແບບເຕັມ */
/* STPOS-DELTA BEGIN */
var STDelta = (function () {
  function canon(v) {
    if (v === null || typeof v !== 'object') return (v === undefined || typeof v === 'function') ? 'null' : JSON.stringify(v);
    if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length; i++) a.push(canon(v[i])); return '[' + a.join(',') + ']'; }
    var ks = Object.keys(v).filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).sort(), o = [];
    for (var j = 0; j < ks.length; j++) o.push(JSON.stringify(ks[j]) + ':' + canon(v[ks[j]]));
    return '{' + o.join(',') + '}';
  }
  function same(x, y) { return x === y || JSON.stringify(x) === JSON.stringify(y); }
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function idMap(a) {
    var m = {};
    for (var i = 0; i < a.length; i++) {
      var e = a[i]; if (!isObj(e) || e.id == null || (typeof e.id !== 'string' && typeof e.id !== 'number')) return null;
      var k = String(e.id); if (Object.prototype.hasOwnProperty.call(m, k)) return null; m[k] = e;
    }
    return m;
  }
  function sub(x, y) {
    if (Array.isArray(x) && Array.isArray(y) && y.length > 16) {
      /* ສ່ວນຫົວ + ສ່ວນທ້າຍທີ່ຄືເກົ່າ → ສົ່ງແຕ່ຊ່ວງກາງ (ຮອງຮັບ ເພີ່ມທ້າຍ, ລຶບ/ແຊກກາງ, log ເຕັມເພດານລຶບອັນເກົ່າສຸດ) */
      var p = 0, q = 0, lim = Math.min(x.length, y.length);
      while (p < lim && same(x[p], y[p])) p++;
      while (q < lim - p && same(x[x.length - 1 - q], y[y.length - 1 - q])) q++;
      var best = (y.length - p - q < y.length / 2) ? { $s: [p, q], m: y.slice(p, y.length - q) } : null;
      /* ລາຍການມີ id ບໍ່ຊ້ຳ (ອໍເດີຄົວ, ເອກະສານ): ລຳດັບ id + ສະເພາະລາຍການທີ່ປ່ຽນ */
      var kx = idMap(x), ky = kx && idMap(y);
      if (ky) {
        var ids = [], ch = {}, nch = 0;
        for (var r = 0; r < y.length; r++) { var id = String(y[r].id); ids.push(y[r].id); if (!kx[id] || !same(kx[id], y[r])) { ch[id] = y[r]; nch++; } }
        if (nch < y.length / 2) { var kd = { $k: ids, c: ch }; if (!best || JSON.stringify(kd).length < JSON.stringify(best).length) best = kd; }
      }
      if (best) return best;
    }
    if (isObj(x) && isObj(y)) {
      var ky = Object.keys(y);
      if (ky.length > 16) {
        var ch = {}, dl = [], m = 0;
        Object.keys(x).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(y, k)) dl.push(k); });
        ky.forEach(function (k) { if (!same(x[k], y[k])) { ch[k] = y[k]; m++; } });
        if (m < ky.length / 2) return { $o: ch, x: dl };
      }
    }
    return { $v: y };
  }
  function diff(a, b) {
    var p = { s: {}, d: [] };
    Object.keys(a).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(b, k)) p.d.push(k); });
    Object.keys(b).forEach(function (k) { if (!same(a[k], b[k])) p.s[k] = sub(a[k], b[k]); });
    return p;
  }
  function apply(a, p) {
    var o = {}, k;
    Object.keys(a).forEach(function (k0) { if (p.d.indexOf(k0) < 0) o[k0] = a[k0]; });
    for (k in p.s) {
      var e = p.s[k], x = a[k];
      if (Object.prototype.hasOwnProperty.call(e, '$v')) o[k] = e.$v;
      else if (Object.prototype.hasOwnProperty.call(e, '$k')) { var xm = (Array.isArray(x) && idMap(x)) || {}; o[k] = e.$k.map(function (id) { var s0 = String(id); return Object.prototype.hasOwnProperty.call(e.c, s0) ? e.c[s0] : xm[s0]; }); }
      else if (Object.prototype.hasOwnProperty.call(e, '$s')) { var xa = Array.isArray(x) ? x : []; o[k] = xa.slice(0, e.$s[0]).concat(e.m, xa.slice(xa.length - e.$s[1])); }
      else if (Object.prototype.hasOwnProperty.call(e, '$a')) {
        var arr = (Array.isArray(x) ? x : []).slice(0, e.$a);
        while (arr.length < e.$a) arr.push(null);
        for (var i in e.c) arr[+i] = e.c[i];
        o[k] = arr;
      } else {
        var ob = {}, src = isObj(x) ? x : {};
        Object.keys(src).forEach(function (kk) { if (e.x.indexOf(kk) < 0) ob[kk] = src[kk]; });
        for (var kk in e.$o) ob[kk] = e.$o[kk];
        o[k] = ob;
      }
    }
    return o;
  }
  return { canon: canon, diff: diff, apply: apply };
})();
/* STPOS-DELTA END */
if (typeof module !== 'undefined') module.exports = STDelta;
