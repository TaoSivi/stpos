/* ສູດລິດຕາມ cm — ໃຊ້ຮ່ວມກັນທັງ server (core.js) ແລະ ມືຖື (ຄິດໄລ່ຕອນບໍ່ມີເນັດ) ເພື່ອໃຫ້ຜົນຕົງກັນສະເໝີ
 * lpc = ລິດຕໍ່ເຊັນ (k) · box = ຖັງສີ່ຫຼ່ຽມ ຍາວ l × ກວ້າງ w (cm) · hcyl = ຖັງກົມນອນ ເສັ້ນຜ່າກາງ d × ຍາວ len (cm) */
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.Tank = f(); })(this, function () {
  function liters(tank, cm) {
    if (cm == null || !tank) return null;
    let v;
    if (tank.t === 'box') v = tank.l * tank.w * cm / 1000;
    else if (tank.t === 'hcyl') { const r = tank.d / 2, h = Math.min(cm, tank.d); v = (r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(2 * r * h - h * h)) * tank.len / 1000; }
    else v = cm * tank.k;
    return isFinite(v) ? Math.round(v) : null;
  }
  return { liters: liters };
});
