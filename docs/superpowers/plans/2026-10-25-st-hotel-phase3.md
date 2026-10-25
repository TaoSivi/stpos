# ST Hotel ໄລຍະ 3 (ຕ້ອນຮັບ + ບິນຫ້ອງ) — ແຜນການສ້າງ

> ເຮັດແບບ Native ໃນ session ດຽວ (ເຈົ້າຂອງສັ່ງ "ເລີ່ມໄລຍະ 3 ຕໍ່"): ແຕ່ລະ Task = ເທສລົ້ມກ່ອນ → ໂຄ້ດ → ເທສຜ່ານ → commit. **ຍັງບໍ່ push / ບໍ່ deploy.**

**Goal:** check-in/out ພ້ອມທະບຽນແຂກ + ເລກບັດ, ບິນຫ້ອງ (folio) ເພີ່ມຄ່າ/ຮັບເງິນ/ຄືນເງິນ/ແຍກຜູ້ຈ່າຍ, ຕໍ່ວັນ/ຍ້າຍຫ້ອງ/ອອກກ່ອນ, night audit, ບັນຊີບໍລິສັດ (ຕິດໜີ້), ໃບແຈ້ງໜີ້ A4, ລາຍງານແຂກຕ່າງປະເທດ, ຮູບບັດ (ປິດເປັນຄ່າເລີ່ມຕົ້ນ).
**Spec:** `docs/superpowers/specs/2026-10-24-st-hotel-design.md` ຂໍ້ 5, 6, 7.3.

## ການຕັດສິນຂອງຜູ້ສ້າງ (ເຈົ້າຂອງຍັງບໍ່ໄດ້ຕອບ — ໃຊ້ຄ່າເລີ່ມຕົ້ນ, ປ່ຽນໄດ້ໃນຕັ້ງຄ່າ)
- ພາສີ/ຄ່າບໍລິການ: ໃຊ້ຕາຕະລາງ `htCfg.taxes` ທີ່ມີແລ້ວ (0% ຈົນກວ່າຈະຕັ້ງ). ໃບແຈ້ງໜີ້: ຫົວ = ຊື່ຮ້ານ/ທີ່ຢູ່/ເບີໂທ ທີ່ມີແລ້ວ + `htCfg.taxId`, `invTitle`, `invFoot` (ຕື່ມໄດ້). ເລກໃບ = `INV-` + ເລກຈອງ (ບໍ່ຊ້ຳຂ້າມເຄື່ອງ).
- ລາຍງານແຂກຕ່າງປະເທດ: ຄໍລຳ = ຊື່, ສັນຊາດ, ປະເພດ/ເລກບັດ, ວັນເກີດ, ເບີໂທ, ຫ້ອງ, ວັນເຂົ້າ, ວັນອອກ, ຄືນ → Excel. (ລໍຖ້າແບບຟອມຈິງຈາກເຈົ້າໜ້າທີ່)
- ຮູບບັດ/ພາສປອດ: **ບໍ່ເກັບ** ເປັນຄ່າເລີ່ມຕົ້ນ (`htCfg.idPhoto=false`); ຖ້າເປີດ ເກັບແຍກໃນ `htImg`, ເບິ່ງຕ້ອງສິດ `htGuestId` + ບັນທຶກ log.
- ເລກບັດຈຳເປັນຕອນ check-in (`htCfg.reqId=true`, ປິດໄດ້).
- ມັດຈຳ: ຕອນ check-in ກາຍເປັນແຖວຮັບເງິນ (method `deposit`) ໃນບິນຫ້ອງ. **ຍັງບໍ່ເຂົ້າເງິນສົດໃນກະ** (ລາຍງານເງິນໂຮງແຮມແຍກ ເຮັດໄລຍະ 6) — ບອກເຈົ້າຂອງຊັດໆ.

## Global Constraints
- ແຖວທຸກອັນມີ `id`+`upd`; **ບໍ່ລຶບ** (ໃຊ້ `void`). ບິນຫ້ອງ **ບໍ່ເກັບເປັນວັດຖຸດຽວ**: ແຖວຄ່າໃຊ້ຈ່າຍ `htChg`, ແຖວຮັບເງິນ `htPay` ແຍກເປັນອາເຣ (merge ຕາມ id) → ສອງເຄື່ອງເພີ່ມພ້ອມກັນບໍ່ເສຍແຖວ.
- ຄ່າຫ້ອງລາຍຄືນ ຈາກ night audit ໃຊ້ **id ຕາຍຕົວ** (booking+line+date+ປະເພດ) → ສອງເຄື່ອງ audit ພ້ອມກັນ/ຮັນຊ້ຳ ບໍ່ລົງຊ້ຳ; ແຖວທີ່ void ແລ້ວ ບໍ່ຖືກສ້າງໃໝ່.
- ຍອດລວມທຸກຄືນ (ຫ້ອງ − ຫຼຸດ + ພາສີ) = `line.q.total` ຕ້ອງເທົ່າກັນເປັນກີບ (ເສດ ໃສ່ຄືນສຸດທ້າຍ).
- ສິດ act ໃໝ່: `htCheckin`, `htPost`, `htVoid` (ຜູ້ຈັດການ), `htAudit`, `htGuestId`. ບັນທຶກທຸກການກະທຳດ້ວຍ `htLg`.
- ວັນທີ UTC string ຄືເກົ່າ; ຟັງຊັນຮັບ `today` ທາງເລືອກ (ເພື່ອເທສ).
- ເທສເກົ່າ (hotel1-8, mart1-11, regress 17, server) ຕ້ອງຜ່ານ.

## Review Focus
1. ຍອດບິນ = ຜົນລວມແຖວ (ບໍ່ void) − ຮັບເງິນ; ແຖວ void ບໍ່ນັບ; ຍອດຄືນເສດຖືກ.
2. Night audit ຮັນຊ້ຳ ບໍ່ເພີ່ມ; ຮັນ catch-up ຫຼາຍມື້ໄດ້; ແຖວທີ່ void ບໍ່ກັບມາ.
3. check-out ບໍ່ໄດ້ຖ້າຍອດຄ້າງ/ເກີນ; ອອກກ່ອນກຳນົດ ຄິດສະເພາະຄືນທີ່ພັກ; ຍ້າຍຫ້ອງ ຍອດລວມບໍ່ປ່ຽນ (ປະເພດດຽວກັນ).
4. ບໍ່ມີສິດ → ບັນທຶກບໍ່ໄດ້ (ທຸກ action). Void ຕ້ອງເຫດຜົນ + ສິດ htVoid.
5. ເລກບັດ/ຮູບ: ເບິ່ງຕ້ອງ htGuestId; ບໍ່ຮົ່ວໃນລາຍການທົ່ວໄປ.

## Task 1: ເຄື່ອງບິນຫ້ອງ (ບໍລິສຸດ) — `tests/hotel9.js`
`htNightSplit(line)`, `htFolio(bkId)` → `{rows,pays,charges,paid,balance,byPayer}`, `htPostNights(bk,endExcl)`, `htAuditRun(today)`, `htTruncLine(line,newTo)`. ເທສ: split ລວມ = q ຕາມສ່ວນ; folio ຍອດ; void ບໍ່ນັບ; postNights ຊ້ຳບໍ່ເພີ່ມ + void ບໍ່ກັບ; audit ເລື່ອນ bizDate + catch-up.

## Task 2: ການກະທຳ — `tests/hotel10.js`
`htCheckIn`, `htCheckOut`, `htPostCharge`, `htVoidChg`, `htPay`, `htVoidPay`, `htExtend`, `htMoveRoom`, `htAccSave`, `htAccBal`, `htAccPay`, `htGuestSave`, `htImgSave/htImgGet`.

## Task 3: ເອກະສານ + ລາຍງານ (ບໍລິສຸດ) — `tests/hotel11.js`
`htInvoiceHTML(bkId,payer)`, `htForeignRows(from,to)`, ລາຍຊື່ in-house/ມາ/ອອກ.

## Task 4: UI view `htDesk` — `tests/hotel12.js`
ແທັບ: ໃນພັກ · ມາວັນນີ້ · ອອກວັນນີ້ · ແຂກ · ບັນຊີບໍລິສັດ · ປິດມື້ · ລາຍງານແຂກຕ່າງປະເທດ. ໜ້າ check-in, ບິນຫ້ອງ (ເພີ່ມຄ່າ/ຮັບເງິນ/ແຍກຜູ້ຈ່າຍ/ພິມ), check-out, ຕັ້ງຄ່າໃບແຈ້ງໜີ້.

## Task 5: server + sample + EN + ລວມ
`Code.gs`/`app.js`/`hotel.js` (htChg htPay htAcc htImg), sample (ແຂກ in-house ມີບິນ), EN, regression ເຕັມ, build ສອງແອັບ, commit, memory.
