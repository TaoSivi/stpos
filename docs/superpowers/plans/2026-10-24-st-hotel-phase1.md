# ST Hotel ໄລຍະ 1 (ຫ້ອງ + ລາຄາ) — ແຜນການສ້າງ

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (ເຈົ້າຂອງສັ່ງ "ເລີ່ມເລີຍ" → ເຮັດແບບ Native ໃນ session ນີ້). Steps ໃຊ້ checkbox.

**Goal:** ແອັບ `ST Hotel` ເປີດໄດ້ ມີປະເພດທຸລະກິດ `hotel`, ໜ້າ "ຫ້ອງ & ລາຄາ" (ປະເພດຫ້ອງ, ຫ້ອງ, ກົດລາຄາ, ແຜນ, ພາສີ/ຕັ້ງຄ່າ), ເຄື່ອງຄິດລາຄາຕໍ່ຄືນ/ຕໍ່ການພັກ ທີ່ທົດສອບແລ້ວ, ສະແດງ ฿/$, ຂໍ້ມູນຕົວຢ່າງ `?demo=hotel`, ແລະ build ແອັບແຍກ.

**Architecture:** ເພີ່ມ `BIZ.hotel` ໃນ `ST POS/index.html` ແບບດຽວກັບ `BIZ.mart`; ໜ້າໃໝ່ເປັນ view `htRooms`; ຂໍ້ມູນເປັນອາເຣໃນ `state` ທີ່ມີ `id`+`upd` ແລະ merge ຜ່ານ server; ເຄື່ອງຄິດລາຄາເປັນຟັງຊັນບໍລິສຸດ (ບໍ່ແຕະ DOM) ເພື່ອທົດສອບງ່າຍ. `ST Mart/build.py` ຮັບ `--app mart|hotel`.

**Tech Stack:** vanilla JS ໄຟລ໌ດຽວ, Python (build + patch), puppeteer-core (ເທສ), Node server ເດີມ.

**Spec:** `docs/superpowers/specs/2026-10-24-st-hotel-design.md` (ຂອບເຂດ ໄລຍະ 1 = ຂໍ້ 7.1; ຂໍ້ A1–A8 ຂອງລາຍການ). A9 (ໂຄ້ດສ່ວນຫຼຸດ) ຍ້າຍໄປໄລຍະ 2 ເພາະຜູກກັບການຈອງ.

## Global Constraints
- ຊື່ຟັງຊັນໃໝ່ ຂຶ້ນຕົ້ນ `ht`; ຊື່ state: `htTypes htRooms htRates htPlans htCfg` (ໄລຍະນີ້). ອາເຣທຸກແຖວມີ `id` ແລະ `upd`.
- ຫ້າມລຶບແຖວຖາວອນ ຖ້າມີຂໍ້ມູນອ້າງອີງ → ໃຊ້ `active:false`.
- ວັນທີທັງໝົດ = ສະຕຣິງ `YYYY-MM-DD`; ຄິດວັນດ້ວຍ UTC (ບໍ່ໃຫ້ເວລາທ້ອງຖິ່ນ/DST ມີຜົນ).
- ເງິນຖານ = ກີບ ເປັນຈຳນວນເຕັມ (`Math.round`); ฿/$ ສະແດງໂດຍໃຊ້ `state.rateTHB`/`state.rateUSD` ເດີມ.
- ຄ່າເລີ່ມຕົ້ນ: check-in 14:00, check-out 12:00, night audit 02:00, ພາສີ/ຄ່າບໍລິການ 0%, ມື້ທ້າຍອາທິດ = ຄືນວັນສຸກ+ວັນເສົາ (`days:[5,6]`, JS Sun=0).
- ຕ້ອງບໍ່ເຮັດໃຫ້ ST POS ຮ້ານອາຫານ / ST Mart ພັງ: ເທສ browser ເກົ່າ 17 ຊຸດ + `mart1-11` + `cd server && npm test` ຕ້ອງຜ່ານໝົດ.
- ຄຳສັບຕ້ອງເປັນພາສາລາວຂອງທີ່ພັກ (ຫ້ອງ, ຄືນ, ແຂກ) ບໍ່ແມ່ນຄຳຮ້ານອາຫານ (ໂຕະ, ເມນູ) ໃນໜ້າໃໝ່.
- ພາຍຫຼັງແຕ່ລະ Task: syntax-check 3 `<script>` ດ້ວຍ `new Function` ແລ້ວ commit ໃນເຄື່ອງ (ບໍ່ push).

## Review Focus
1. ກົດລາຄາຊ້ອນກັນ (ເຊັ່ນ ລະດູສູງ + ທ້າຍອາທິດ): ຕ້ອງໄດ້ກົດ prio ສູງສຸດ, ແລ້ວຊ່ວງແຄບກວ່າ, ແລ້ວປະເພດສະເພາະກວ່າ ແບບຄົງທີ່ (ບໍ່ສຸ່ມ).
2. ການພັກຂ້າມເດືອນ/ປີ (31/12→02/01) ແລະ ເດືອນກຸມພາ: ນັບຄືນຖືກ, ບໍ່ຂາດ/ເກີນ 1 ຄືນ.
3. ວັນມາ ≥ ວັນໄປ, ວັນທີເປົ່າ/ຜິດຮູບແບບ: `htQuote` ຕ້ອງສົ່ງ `null` ບໍ່ crash ບໍ່ຄິດ 0 ກີບ.
4. ປະເພດຫ້ອງບໍ່ມີລາຄາຖານ ແລະ ບໍ່ມີກົດ: ຕ້ອງແຈ້ງ "ຍັງບໍ່ຕັ້ງລາຄາ" ບໍ່ຄິດ 0 ແລ້ວປ່ອຍຜ່ານ.
5. ລຶບປະເພດຫ້ອງທີ່ມີຫ້ອງ / ຫ້ອງເລກຊ້ຳ / ປິດໃຊ້ງານ: ຕ້ອງຖືກກັນ ຫຼື ຖາມ ບໍ່ໃຫ້ມີຫ້ອງລອຍ.

---

## ແຜນຜັງໄຟລ໌
- Modify `ST POS/index.html`: `BIZ.hotel`, ໂມດູນ, view `htRooms`, ໂຄ້ດຄິດລາຄາ, ຕົວຢ່າງ, CSS, ຄຳແປ EN.
- Modify `ST POS/Code.gs` (`mergeDocs_`) + `ST POS/server/app.js` (`BR_RESET`): ເພີ່ມ 4 ອາເຣ.
- Modify `ST Mart/build.py`: `--app hotel` → ຜົນໃນ `ST Hotel/`.
- Create tests: `_ສົ່ງຕໍ່ໂປຣເຈັກ/tests/hotel1.js` (ລາຄາ, ບໍລິສຸດ), `hotel2.js` (UI + demo + build), `ST POS/server/test/hotel.js` (merge).

---

### Task 1: ເຄື່ອງຄິດລາຄາ (ບໍລິສຸດ) + ຮູບແບບຂໍ້ມູນ

**Files:** Modify `ST POS/index.html` (ແທນກ່ອນ `/* ===== ໂໝດທົດລອງ (Demo)`); Test `tests/hotel1.js`.

**Interfaces — Produces:**
- `htInit(): void` — ສ້າງ `state.htTypes/htRooms/htRates/htPlans=[]` ແລະ `state.htCfg={ci:'14:00',co:'12:00',audit:'02:00',weekend:[5,6],taxes:[],los:[],policyDays:3}` ຖ້າຍັງບໍ່ມີ.
- `htDays(from:string,to:string): string[]|null` — ລາຍການຄືນ `[from … to-1]`; `null` ຖ້າຮູບແບບຜິດ ຫຼື `to<=from`.
- `htRuleFor(typeId:string,date:string): object|null` — ກົດທີ່ຊະນະ (ຕາມ Review Focus 1: prio ↓, ຊ່ວງແຄບ ↑, ປະເພດສະເພາະ>`'*'`, id ຫຼ້າສຸດ).
- `htNightBase(typeId,date): number|null` — ລາຄາຫ້ອງຄືນນັ້ນ (ກົດ.price ຖ້າມີ, ບໍ່ດັ່ງນັ້ນ `type.baseRate`; `null` ຖ້າບໍ່ມີທັງສອງ ຫຼື ≤0).
- `htQuote(o:{type,from,to,adults,kids,plan,extraBeds}): null | {nights:[{d,room,extra,total}],roomSub,extraSub,losPct,sub,taxes:[{id,name,amt}],total,thb,usd,missing:string[]}` — `missing` = ວັນທີທີ່ບໍ່ມີລາຄາ (ແລ້ວ `total` ບໍ່ຄວນໃຊ້).

**ກົດຄິດ (ຕັດສິນແລ້ວ):** ຄົນເກີນ `cap` = `over=max(0,adults+kids-cap)`; ເດັກຖືກນັບເກີນກ່ອນ: `overKids=min(kids,over)`, `overAdults=over-overKids`; ຄ່າເພີ່ມຕໍ່ຄືນ = `overAdults*extraAdult + overKids*extraChild + extraBeds*extraBed`. ແຜນ: `room=round(base*(1+plan.adj/100))`. `losPct` = `pct` ສູງສຸດຂອງ `htCfg.los` ທີ່ `min<=nights` (ໃຊ້ກັບສ່ວນຫ້ອງ+ແຜນ ເທົ່ານັ້ນ). ພາສີ: `kind:'pct'` ຄິດ % ຂອງ `sub`; `'perNight'` = `amt*nights`; `'perPersonNight'` = `amt*(adults+kids)*nights`; ທຸກແບບ exclusive.

- [ ] **Step 1: ຂຽນເທສລົ້ມ** `tests/hotel1.js` (ໂຫຼດ `index.html?demo=hotel` ຫຼືຫນ້າ mart ກໍໄດ້ — ໃຊ້ `?demo=mart` ແລ້ວ `htInit()` ເອງ ຈົນກວ່າ Task 5). ຂໍ້ຢືນຢັນ (ຕົວເລກກີບ):
  - ປະເພດ `T1 {baseRate:500000,cap:2,extraAdult:100000,extraChild:50000,extraBed:80000}`; ກົດ `R1 {days:[5,6],price:650000,prio:0}`; ກົດ `R2 {from:'2026-12-20',to:'2027-01-05',price:900000,prio:5}`.
  - `htNightBase('T1','2026-10-26')===500000` (ຈັນ), `'2026-10-30'===650000` (ສຸກ), `'2026-12-25'===900000`, `'2026-12-26'===900000` (ເສົາ: prio 5 ຊະນະ weekend).
  - `htDays('2026-12-30','2027-01-02')` = `['2026-12-30','2026-12-31','2027-01-01']`; `htDays('2028-02-28','2028-03-01')` ມີ 2 ຄືນ (ປີອະທິກະສຸຣະທິນ); `htDays('2026-10-05','2026-10-05')===null`; `htDays('x','2026-10-05')===null`; `htDays('2026-10-06','2026-10-05')===null`.
  - `htQuote({type:'T1',from:'2026-10-26',to:'2026-10-28',adults:2,kids:0}).total===1000000`.
  - ຄົນເກີນ: `adults:3,kids:1` (cap 2, over 2 → ເດັກ 1 ເກີນ + ຜູ້ໃຫຍ່ 1 ເກີນ) ຕໍ່ 1 ຄືນຈັນ = `500000+100000+50000`.
  - ຕຽງເສີມ 1 ຄືນ ເພີ່ມ `80000`; ແຜນ `adj:+10` ໃຫ້ `room=550000`; `los:[{min:7,pct:10}]` 7 ຄືນຈັນ–ຈັນ ຫຼຸດ 10% ສະເພາະສ່ວນຫ້ອງ; ພາສີ `pct:10` + `perPersonNight:20000`.
  - ບໍ່ມີລາຄາ: ປະເພດ `T0` ບໍ່ມີ baseRate/ກົດ → `htQuote(...).missing.length===nights`; `htQuote` ວັນຜິດ → `null`.
- [ ] **Step 2: ຣັນເທສ** `node tests/hotel1.js` → ລົ້ມ (`htInit is not defined`).
- [ ] **Step 3: ຂຽນ 5 ຟັງຊັນ** ຕາມ Interfaces ຂ້າງເທິງ ໃນ `index.html`. ວັນທີ: ແປງ `YYYY-MM-DD`→`Date.UTC` ແລ້ວບວກ 86400000; ກວດຮູບແບບດ້ວຍ regex + ວັນມີຈິງ (ປະຕິເສດ `2026-02-30`).
- [ ] **Step 4: ຣັນເທສ** → ຜ່ານທັງໝົດ.
- [ ] **Step 5: Commit** `git add index.html` + ເທສ (ໃນ repo tests ຢູ່ນອກ — ບໍ່ commit) → `git commit -m "ST Hotel P1: pricing engine"`.

---

### Task 2: `BIZ.hotel`, ໂມດູນ, view ແລະ ສິດ

**Files:** Modify `ST POS/index.html` (BIZ, `MODULES`, `PERM_VIEWS/PERM_VG/PERM_ACTS`, `canView`, ເມນູຊ້າຍ, dispatch `render`, `hideViewsBiz`, CSS ເຊື່ອງ nav).

**Interfaces:**
- Consumes: `BIZ`, `bizApply`, `MODULES/modOn`, `canView`, ແບບ `mprod` ຂອງ Mart.
- Produces: `BIZ.hotel` (ຊື່ `ST Hotel (ບ້ານພັກ / ໂຮງແຮມ / ລີສອດ)`, ປ້າຍບົດບາດ: cashier=`ຕ້ອນຮັບ`, waiter=`ພະນັກງານຮ້ານອາຫານ`, kitchen=`ຄົວ`, bar=`ບາ`, storekeeper=`ນາຍສາງ`, purchasing=`ຈັດຊື້`); view `htRooms` (ຊື່ເມນູ `ຫ້ອງ & ລາຄາ`) ເຫັນສະເພາະ `bizType==='hotel'`; act ໃໝ່ `htRate` (ແກ້ລາຄາ/ຫ້ອງ) ໃນກຸ່ມ PERM_ACTS `ທີ່ພັກ` (ເຊື່ອງໃນ biz ອື່ນຄືກັບ `ໜີ້ຜູ້ສະໜອງ`); ໂມດູນ `htCore` (ເປີດຕະຫຼອດ ປິດບໍ່ໄດ້), `htHk`, `htSvc`, `htSpa`, `htPool`, `htEvent`, `htFnb`, `htIcal`, `htOnline`, `htAcc`, `htRetail` ລົງທະບຽນໃນ `MODULES` ແຕ່ເຊື່ອງໃນ biz ອື່ນ.

- [ ] **Step 1: ເທສລົ້ມ** ໃນ `tests/hotel2.js`: `bizApply('hotel',true)` → `canView('htRooms')===true` ສຳລັບ manager; `bizApply('fnb')`/`'mart'` → `false`; `modOn('htCore')===true` ແລະ ປິດໂມດູນ `htHk` ແລ້ວ `modOn('htHk')===false`; ປຸ່ມເມນູຊ້າຍ `data-v="htRooms"` ສະແດງເມື່ອ hotel ເທົ່ານັ້ນ; ຮ້ານອາຫານ (`kitchen`, `tables`) ຍັງເຫັນໃນ hotel ເມື່ອ `kds` ເປີດ.
- [ ] **Step 2: ຣັນ → ລົ້ມ.**
- [ ] **Step 3: ເພີ່ມ `BIZ.hotel`** (ໂມດູນຮ້ານອາຫານ `kds` ເປີດ; `opts/pkg/delivery` ປິດຕາມຄ່າເລີ່ມຕົ້ນຂອງ mart); ປຸ່ມ `<button class="navitem" data-v="htRooms">` ໃນກຸ່ມ `ຂາຍໜ້າຮ້ານ`; ຄືກັບ `mprod`: `canView`, `renderView` dispatch (`renderHtRooms(R)` ຈະຂຽນໃນ Task 3 — ຊົ່ວຄາວ stub ທີ່ສະແດງຫົວຂໍ້), `NAV_IC.htRooms=NAV_IC.stock`, `permActs()` ເຊື່ອງກຸ່ມ `ທີ່ພັກ` ນອກ hotel, ແທນ `bizCur()==='mart'` ຢູ່ຈຸດທີ່ກ່ຽວກັບ **ຄຳສັບ** ດ້ວຍ helper `bizWords()` ຖ້າຈຳເປັນ (ໃຊ້ `MART_WORDS` ບໍ່ໄດ້ ເພາະແປ "ໂຕະ"→"ເຄົາເຕີ" — hotel ຕ້ອງການຄົງ "ໂຕະ" ຂອງຮ້ານອາຫານ).
- [ ] **Step 4: ຣັນເທສ → ຜ່ານ.** + `mart1.js` ຍັງຜ່ານ.
- [ ] **Step 5: Commit.**

---

### Task 3: ໜ້າ "ຫ້ອງ & ລາຄາ" (CRUD ທັງ 5 ແທັບ)

**Files:** Modify `ST POS/index.html` (`renderHtRooms` + modals + CSS ໃຊ້ຄລາສ `.mp-*`/`.py-*` ທີ່ມີ).

**Interfaces — Produces:** `renderHtRooms(R)`; ແທັບ `htTab ∈ {'type','room','rate','plan','cfg'}`; `htTypeEdit(id?)/htTypeSave`, `htRoomEdit(id?)/htRoomSave`, `htRateEdit(id?)/htRateSave`, `htPlanEdit(id?)/htPlanSave`, `htCfgSave()`; `htFx(ccy:number): string` (ສະແດງ `฿x / $y` ຈາກ `state.rateTHB/rateUSD`).

**ກົດຢືນຢັນ:** ຊື່ປະເພດບໍ່ຊ້ຳ; `cap≥1`; ເລກຫ້ອງບໍ່ຊ້ຳ ແລະ ຕ້ອງເລືອກປະເພດ; ຫ້ອງ/ປະເພດ **ປິດໃຊ້ງານ** (`active:false`) ແທນລຶບ ເມື່ອມີອ້າງອີງ; ປະເພດທີ່ມີຫ້ອງເປີດຢູ່ ປິດບໍ່ໄດ້ (ແຈ້ງຈຳນວນ); ກົດ: `from≤to`, `price>0`, `days` ຫວ່າງ = ທຸກມື້; ແຜນ `adj` -90..+300; ພາສີ `pct` 0..100; `los` `min≥2`. ສິດ: ສ້າງ/ແກ້ ຕ້ອງ `can('htRate')||isOwner()`. ແຕ່ລະປະເພດສະແດງ ລາຄາຖານ + ฿/$. ແທັບ "ທົດລອງຄິດລາຄາ" ໃນໜ້າ `rate`: ເລືອກປະເພດ+ວັນມາ/ໄປ+ຄົນ → ສະແດງຜົນ `htQuote` (ຕາຕະລາງຄືນ + ພາສີ + ລວມ + ฿/$) ເພື່ອໃຫ້ເຈົ້າຂອງກວດກົດ.

- [ ] **Step 1: ເທສລົ້ມ** (`hotel2.js`): ສ້າງປະເພດ (ຜ່ານຟອມຈິງ ໃສ່ຄ່າໃນ input ແລ້ວ `htTypeSave`) → `state.htTypes.length===1`; ຊື່ຊ້ຳບໍ່ໃຫ້; ສ້າງຫ້ອງ 3 ຫ້ອງ; ເລກຊ້ຳບໍ່ໃຫ້; ປິດປະເພດທີ່ມີຫ້ອງ → ຖືກກັນ; ເພີ່ມກົດ weekend ແລະ ກວດ "ທົດລອງຄິດລາຄາ" ສະແດງ `1,000,000` ສຳລັບຕົວເລກໃນ Task 1; ຜູ້ໃຊ້ບໍ່ມີສິດ `htRate` ເຫັນໜ້າແຕ່ປຸ່ມແກ້ຖືກເຊື່ອງ.
- [ ] **Step 2: ຣັນ → ລົ້ມ.**
- [ ] **Step 3: ຂຽນໜ້າ + modal** ຕາມ Interfaces; ໃຊ້ `bcScan`-ບໍ່ກ່ຽວ; ຮູບປະເພດຫ້ອງ: ໃຊ້ `ingImgLoad`-ແບບ resize ທີ່ມີແລ້ວ (≤ 400px) ເກັບໃນ `htTypes[].img`.
- [ ] **Step 4: ຣັນ → ຜ່ານ** + ກວດ screenshot ມືຖື/ຄອມ.
- [ ] **Step 5: Commit.**

---

### Task 4: ເຊື່ອມ server (merge) 

**Files:** Modify `ST POS/Code.gs` (`mergeDocs_` ລາຍຊື່), `ST POS/server/app.js` (`BR_RESET`: `htTypes:[],htRooms:[],htRates:[],htPlans:[]` ... ສາຂາໃໝ່ **ເກັບ** ປະເພດ/ຫ້ອງ/ລາຄາ/ແຜນຈາກສາຂາແມ່ບໍ່ໄດ້ — ຕັດສິນ: ສາຂາໃໝ່ເລີ່ມເປົ່າ ເພາະແຕ່ລະທີ່ພັກມີຫ້ອງຂອງຕົນ; ລາຄາກາງຈະເຮັດໃນໄລຍະ 6), `server/package.json` (ເພີ່ມ `node test/hotel.js`); Create `server/test/hotel.js`.

- [ ] **Step 1: ເທສລົ້ມ** `server/test/hotel.js` (ຮູບແບບ `test/mart.js`): ສອງເຄື່ອງ save ພ້ອມກັນ ເຄື່ອງ A ເພີ່ມຫ້ອງ `r1`, B ເພີ່ມຫ້ອງ `r2` + ແກ້ປະເພດ → ຫຼັງ merge ມີ `r1,r2` ທັງສອງ ແລະ ແຖວທີ່ມີ `upd` ໃໝ່ກວ່າຊະນະ; ສາຂາໃໝ່ (`hq=add`) ມີ `htRooms` ເປົ່າ.
- [ ] **Step 2: ຣັນ → ລົ້ມ.**
- [ ] **Step 3: ເພີ່ມຊື່ໃນ 2 ບ່ອນ.**
- [ ] **Step 4: `cd server && npm test` ຜ່ານໝົດ** (ຖ້າ port 3000 ຖືກຄ້າງ ໃຫ້ປິດ process ກ່ອນ).
- [ ] **Step 5: Commit.**

---

### Task 5: ແອັບ `ST Hotel` (build), ຂໍ້ມູນຕົວຢ່າງ, ຄຳແປ, ເທສລວມ

**Files:** Modify `ST Mart/build.py` (`--app`), `ST POS/index.html` (`htFirst()` ເມື່ອ `window.__APP_BIZ==='hotel'` ເລີ່ມຄັ້ງທຳອິດ = ທີ່ພັກເປົ່າ; `BIZ_SAMPLE.hotel` + `bizLoad`; `?demo=hotel`; ຄຳແປຂອງໜ້າໃໝ່ໃນ `MT_RAW` (dictionary ຢູ່ `scratchpad/en_dict.txt` → ສ້າງຄືນດ້ວຍ `mt11.py`); `mart_words.js`-ແບບກວດຄຳສັບຮ້ານອາຫານໃນໜ້າໃໝ່); Create `ST Hotel/` ຜົນ build.

**ຂໍ້ມູນຕົວຢ່າງ (ຂອງຜູ້ສ້າງ):** 4 ປະເພດ — ມາດຕະຖານ (cap 2, 400,000), ດີລັກ (cap 2, 600,000), ແຟມິລີ (cap 4, 900,000), ວິລລາ (cap 4, 1,500,000); 24 ຫ້ອງ (ຊັ້ນ 1–3 + ໂຊນວິລລາ 4 ຫ້ອງ); ກົດ: ທ້າຍອາທິດ (+ ~20%), ລະດູສູງ 15/12–10/01 (prio 5), ແຜນ: ຫ້ອງເປົ່າ / ມີອາຫານເຊົ້າ (+10%) / ຍົກເລີກບໍ່ໄດ້ (−10%); `los`: 7 ຄືນ −10%, 28 ຄືນ −25%.

- [ ] **Step 1: ເທສລົ້ມ** `hotel2.js`: `build.py --app hotel` ສ້າງ `ST Hotel/{index.html,sw.js,manifest.webmanifest,icon-*.png}` + syntax OK; ເປີດ `ST Hotel` (ເສີບ port 8779) ຄັ້ງທຳອິດ → `bizType==='hotel'`, `htTypes/htRooms` ເປົ່າ, ຊື່ແອັບ `ST Hotel`, localStorage ມີຄຳນຳໜ້າ `sthotel_`; `?demo=hotel` ມີ 4 ປະເພດ 24 ຫ້ອງ; `htQuote` ຂອງຕົວຢ່າງ ຜ່ານ; ສະຫຼັບ EN ແລ້ວ ໜ້າ ຫ້ອງ & ລາຄາ ແປຄົບ (ຂໍ້ຄວາມລາວຄົງເຫຼືອ ≤ ຊື່ຂໍ້ມູນ); ຄຳວ່າ "ເມນູ/ວັດຖຸດິບ" ບໍ່ປາກົດໃນໜ້າໃໝ່.
- [ ] **Step 2: ຣັນ → ລົ້ມ.**
- [ ] **Step 3: ຂະຫຍາຍ `build.py`** ເປັນຕາຕະລາງ `APPS={'mart':{...},'hotel':{name:'ST Hotel',biz:'hotel',dir:'../ST Hotel',prefix:'sthotel_',sub:'Hotel & Resort PMS'}}`; ຄ່າເລີ່ມຕົ້ນ (ບໍ່ໃສ່ arg) = `mart` ເໝືອນເກົ່າ ແລະ ເທສ `mart8` ຕ້ອງຍັງຜ່ານ. `martFirst()` → ທົ່ວໄປ `appFirst()` (ຮັກສາຊື່ເກົ່າເປັນ alias). ເພີ່ມ `BIZ_SAMPLE.hotel`/`bizLoad` ຮອງຮັບ hotel (ສ້າງ `htTypes/htRooms/htRates/htPlans/htCfg`).
- [ ] **Step 4: ເພີ່ມຄຳແປ EN** ສຳລັບແທັບ/ປຸ່ມ/ຫົວຕາຕະລາງຂອງໜ້າໃໝ່; ຣັນ `mart_lao.js`-ແບບວັດ.
- [ ] **Step 5: ຣັນທັງໝົດ:** `hotel1,hotel2`, `mart1..mart11`, `./regress.sh e2e sale stage alert inbox ctl cxtest daysim st_test fxsec fxtf fxcost fxchg fxsecui fxprod auditui biztest`, `cd server && npm test` → ຜ່ານໝົດ.
- [ ] **Step 6: ອັບເດດ memory + ໄຟລ໌ຄູ່ມືສັ້ນ** ແລະ **Commit** `ST Hotel phase 1`.

---

## Self-review
- **Spec coverage (7.1):** BIZ.hotel (T2), ປະເພດຫ້ອງ/ຫ້ອງ/ກົດລາຄາ/ແຜນ/ພາສີ (T3), ເຄື່ອງຄິດລາຄາ+เทส (T1), ฿/$ (T3 `htFx`), build+demo (T5). A6 ລາຍອາທິດ/ເດືອນ = `los` (T1). A9 ໂຄ້ດສ່ວນຫຼຸດ → ໄລຍະ 2 (ບັນທຶກໃນ header).
- **Type consistency:** `htQuote` ຜົນ ໃຊ້ໂດຍ T3 (ທົດລອງຄິດ) ຊື່ຟິວ `nights,roomSub,extraSub,losPct,sub,taxes,total,thb,usd,missing` ຄືກັນທຸກບ່ອນ.
- **ສັດສ່ວນ:** ແຜນສັ້ນກວ່າໂຄ້ດ; ບໍ່ມີ body ຂອງຟັງຊັນ ຍົກເວັ້ນກົດຄິດທີ່ກຳນົດໄວ້.
