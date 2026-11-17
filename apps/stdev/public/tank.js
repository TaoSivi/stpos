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
  /* ກວດ cm ຂອງລົດ 1 ຄັນ: ເກີນຄວາມສູງຖັງ → 'cmrange' · cm ຫຼັງເຕີມຕ່ຳກວ່າກ່ອນເຕີມ → 'cmorder' · ບໍ່ມີບັນຫາ → null
   * shortcut: ຖັງ lpc/box ບໍ່ມີຄວາມສູງ ໃຊ້ເພດານ 300 cm — ຖ້າມີຖັງສູງກວ່າ ໃຫ້ເກັບຄວາມສູງໃນຕັ້ງຄ່າ */
  function check(tank, r) {
    const max = tank && tank.t === 'hcyl' ? tank.d : 300;
    for (const k of ['cm0', 'cm1', 'cm2']) if (r[k] != null && r[k] > max) return 'cmrange';
    if (r.cm0 != null && r.cm1 != null && r.cm1 < r.cm0) return 'cmorder';
    return null;
  }
  /* ສ່ວນຕ່າງຂ້າມຄືນ (ລິດ): cm ກ່ອນເຕີມມື້ນີ້ ທຽບ cm ຫຼັງເລີກວຽກມື້ກ່ອນ — ເກີນ GAP ລິດ = ຄວນກວດ (ຮົ່ວ / ລັກ / ກອກຜິດ) */
  return { liters: liters, check: check, GAP: 10 };
});
