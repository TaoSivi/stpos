# stdev.store — HANDOFF (ສົ່ງຕໍ່ໃຫ້ບັນຊີ Claude ໃໝ່)

> ບໍ່ມີລະຫັດຜ່ານ/PIN/token ໃນໄຟລ໌ນີ້. ຢ່າໃສ່ເຂົ້າມາ.

## 0. ກົດການເຮັດວຽກ (ສຳຄັນສຸດ)
- ເຈົ້າຂອງ (ບໍລິສັດວຽກສະໜາມ ລາວ, ກຸ່ມ Petmany) ເວົ້າ **ພາສາລາວ** → ຕອບເປັນລາວສະເໝີ, ສັ້ນ ແລະ ຊັດ.
- ຢ່າຂໍ/ພິມ/commit ລະຫັດຜ່ານ ຫຼື PIN. ເຈົ້າຂອງ login Namecheap/cPanel ເອງ.
- Commit ໃນເຄື່ອງໄດ້ເມື່ອເຈົ້າຂອງບອກ; **ຢ່າ push GitHub** ຈົນກວ່າຈະສັ່ງ. ຢ່າລົບ/ຂຽນທັບຂອງ live ໂດຍບໍ່ຢືນຢັນ.
- Server ນີ້ມີແຕ່ **ນ້ຳມັນສະໜາມ + HR**. ຢ່າເອົາ POS/ERP ກັບມາ. ເຊີເວີ stpos ເກົ່າ (ໝົດອາຍຸ 2026-11-04) ປະໄວ້ ບໍ່ແຕະ.
- ເປົ້າໝາຍຕໍ່ໄປ: ແອັບ **SOP** (ຍັງບໍ່ເລີ່ມ — ຖາມເຈົ້າຂອງກ່ອນວ່າ SOP ໃຊ້ເຮັດຫຍັງ: ອ່ານຂັ້ນຕອນ / ເຊັກລິດປະຈຳວັນ / ອະນຸມັດເອກະສານ). ວິທີເພີ່ມແອັບ: `ADD-APP.md`.

## 1. ລະບົບແມ່ນຫຍັງ
Node (>=18) ບໍ່ມີ dependency, ເຊີເວີດຽວ https://stdev.store:
- ແອັບນ້ຳມັນ (ເບີກ/ຮັບ/ວັດ cm→ລິດ ຕາມຮູບຖັງ, ຄົນຂັບຮັບຮູ້ໃນມືຖື, ອະນຸມັດ, ລາຍງານ PDF/Excel, ຮູບ, ledger ຕໍ່ຖັງ)
- ແອັບ HR ເດີມ (`server/hr.js` + `server/hr/Code.gs`)
- ບັນຊີກາງ: ເບີໂທ + PIN, ລະດັບ superadmin/admin/user, ສິດຕໍ່ແອັບ; ໜ້າຫຼັກ (launcher) ຫຼັງ login; PWA iOS/Android; ໃຊ້ offline ໄດ້ (queue + sync ເອງ)
- ສູນຈັດການ `admin.html`: ເພີ່ມຄົນ+ຕິກສິດ (ນ້ຳມັນ 7 ສິດ, HR 29 ສິດ) ຄັ້ງດຽວ, ຕັ້ງສະໜາມ/ຖັງ/ລົດ, ມອບລົດໃຫ້ຄົນຂັບ

## 2. ໂຄງໂຄດ (`ST POS/apps/stdev/`)
- `server.js` router + `APPS` registry + `MODS` (`<app>.<action>`), CLI (`adduser`, `listusers`, `hr-setup`), `bootstrap()` ອ່ານ `DATA_DIR/bootstrap.json` ສ້າງ superadmin ຄົນທຳອິດ
- `accounts.js` ບັນຊີກາງ (users.json, PIN scrypt, ລະດັບ, rights)
- `mod-fuel.js` + `fuel-core.js` ນ້ຳມັນ; `mod-hr.js` ຂົວໄປ HR (provision `employee.perm` ທຸກຄັ້ງ userSave)
- `public/` ໜ້າເວັບ: `index/login`, `home`, `driver`, `office*`, `admin*`, `perm.js`, `offline.js`, `tank.js`, `sw.js` (cache `stdev-v8`)
- HR UI: `apps/hr/index.html` + `apps/hr/back-to-home.js` (ປຸ່ມ "ໜ້າຫຼັກ" — ຕ້ອງຮັກສາຖ້າ build HR ໃໝ່)
- ໂມດູນບໍ່ເອີ້ນກັນເອງ; ສິດນ້ຳມັນ: view, issue, tank, assign, approve, ack, fixAck

## 3. ທົດສອບ
```bash
cd "ST POS/apps/stdev" && npm test
```
ຄວນຜ່ານ core matrix 66 checks + ທົດສອບຕ່າງຖັງ + server 46 tests (ມີການ provision HR ຈິງ). ຮັນກ່ອນທຸກຄັ້ງທີ່ແກ້.

## 4. Live (cPanel, home `/home/<cpanel-user>`)
- Node app root `stdev-release/app` (startup `apps/stdev/server.js`, Node 22, URI `stdev.store/api`); static ຢູ່ `public_html` (+ `hr/`)
- ຂໍ້ມູນ `stdev-data` (users.json, secret.key, fuel/, t/<HR_COMPANY>/hr) — **ຢ່າລົບ**
- Env: `DATA_DIR=/home/<cpanel-user>/stdev-data`, `HR_COMPANY=<HR_COMPANY>`, `HR_WEB=/home/<cpanel-user>/public_html/hr`, `HR_LIB=/home/<cpanel-user>/stdev-release/app/server`
- Backup: `backup-before-stdev-2026-11-17.zip` (public_html + stpos-data ກ່ອນປ່ຽນ). ຂອງເກົ່າຢູ່ cPanel trash (ກູ້ໄດ້).
- **Hosting ໝົດ 2026-12-15 → ຕ້ອງຕໍ່.**
- ບໍ່ມີ shell/Terminal ໃນ cPanel. Restart = ຂຽນໄຟລ໌ `<appRoot>/tmp/restart.txt`. ປ່ຽນ startup file ຂອງ registration ເກົ່າບໍ່ມີຜົນ → ຕ້ອງລົບ (ໄອຄອນຖັງຂີ້ເຫຍື້ອໃນລາຍການ + Agree) ແລ້ວສ້າງໃໝ່.

## 5. ວິທີ deploy (ທີ່ເຄີຍໃຊ້ໄດ້)
1. ຫຼັງ login cPanel ໃນ browser pane: ຮັນ file server ໃນເຄື່ອງທີ່ມີ CORS ແລ້ວເປີດຜ່ານ `http://localhost:8801` (ບໍ່ແມ່ນ 127.0.0.1)
2. ໃນແທັບ cPanel ໃຊ້ JS `fetch` → UAPI `Fileman/upload_files`; ແຕກ zip/ຄັດລອກ/ລົບ ຜ່ານ API2 `fileop`; ໄຟລ໌ນ້ອຍໃຊ້ `Fileman/save_file_content`
3. ສ້າງ zip ດ້ວຍ **Python `zipfile`** (PowerShell Compress-Archive ໃຊ້ backslash ແຕກແລ້ວພັງ)
4. restart ດ້ວຍ `tmp/restart.txt`, ແລ້ວກວດດ້ວຍ probe ທີ່ບໍ່ຕ້ອງ login
- ຂຽນສະຄຣິບດ້ວຍ Write tool ແລ້ວຄ່ອຍຮັນ (Bash heredoc ທີ່ມີລາວ/backslash ພັງ)

## 6. ສະຖານະປັດຈຸບັນ
- Commit ຫຼ້າສຸດໃນເຄື່ອງ `3309004` ("one Admin Hub …"); **ບໍ່ໄດ້ push**
- Live ຂຶ້ນແລ້ວ. ກວດແລ້ວແຕ່ບໍ່ login: ໜ້າຫຼັກ/static/probe. **ຍັງບໍ່ໄດ້ທົດສອບ login + Admin Hub ເທິງ live** (ເຈົ້າຂອງປ່ຽນ PIN ເອງແລ້ວ) → ໃຫ້ເຈົ້າຂອງລອງ ແລ້ວລາຍງານ.
- Superadmin: ເບີຂອງເຈົ້າຂອງ (ຖາມເຈົ້າຂອງ; ບໍ່ເກັບໃນ repo ສາທາລະນະ).

## 6b. ເພີ່ມລ່າສຸດ (ຍັງບໍ່ໄດ້ຂຶ້ນ live ຈົນກວ່າຈະ deploy)
- ໜ້າວຽກນ້ຳມັນເລືອກໄດ້ຫຼາຍ (ຄົນຂັບ + ຄົນເບີກ/ຫົວໜ້າ/ຫ້ອງການ): ເກັບເປັນ role ຫຼັກ + `fuelRights` ລວມ (ມີ `ack`)
- ຍອດແທ່ງ: `diff` = ແທກຈິງ − (ແທກຄັ້ງກ່ອນ + ຮັບ − ຈ່າຍ); ຄັ້ງທຳອິດເປັນຖານ; ເຕືອນເມື່ອ |diff| > 20 L
- `pending` (ຕົວເລກລໍຮັບຮູ້/ຖືກປະຕິເສດ) ສະແດງເທິງ tile ນ້ຳມັນໃນໜ້າຫຼັກ; ຍັງບໍ່ມີ push ຕອນປິດແອັບ (ຕ້ອງເຮັດ web-push ແຍກ)
- `backup.js`: ສຳເນົາ DATA_DIR → DATA_DIR/backups/ວັນທີ ທຸກມື້ (ຕອນ start + ທຸກ 6 ຊມ), ເກັບ 14 ມື້; ຢູ່ເຊີເວີດຽວກັນ ບໍ່ແມ່ນ offsite

- ແກ້ `server/hr/Code.gs` (ສຳເນົາ HR): ພະນັກງານບັນທຶກໃບໜ້າເອງຕິດ "ແກ້ຂໍ້ມູນນີ້ເອງບໍ່ໄດ້: baseSalary" (iPhone/iPad). `guardEmployee` ຮັກສາ pay ເດີມ + `selfPayNoop` ຍອມຮັບການສົ່ງ pay ເດີມຄືນ. ຕ້ອງອັບໂຫຼດ Code.gs ເຂົ້າ `stdev-release/app/server/hr/` + restart.

- ກວດຄວາມຖືກຕ້ອງ (audit): ຮູບຖ່າຍດ້ວຍກ້ອງສົດ `liveCam()` ໃນ app.js (ປະທັບວັນເວລາ+ຊື່+ປ້າຍ, ບໍ່ມີປຸ່ມຄັງ; ຖ້າກ້ອງເປີດບໍ່ໄດ້ ໃຊ້ input file ແລະຕິດປ້າຍ "ຈາກຄັງ"); server ເກັບ meta ຮູບ (`pm_<site>_<date>`: at/by/taken/how + _log) ຜ່ານ action `photometa`; `Tank.check` (cmrange/cmorder) ໃຊ້ທັງ server + offline; row ເກັບ `at` + ປະຫວັດແກ້ `h` (30 ລາຍການ); ຂອບເຂດວັນທີ: ລ່ວງໜ້າບໍ່ໄດ້, ຍ້ອນຫຼັງ 7 ມື້ (head/owner 60). ທົດສອບ core ໃຊ້ `store.now` ເປັນໂມງປອມ.

- ກູ້ PIN Super admin ທີ່ລືມ (ບໍ່ມີ shell): ສ້າງໄຟລ໌ `stdev-data/bootstrap.json` = `{"phone":"<ເບີ Super admin>","pin":"<PIN ໃໝ່ 4-8 ຫຼັກ>","reset":true}` ໃນ cPanel File Manager ແລ້ວ restart (ຂຽນ `stdev-release/app/tmp/restart.txt`). ໄຟລ໌ຖືກລຶບເອງ, session ເກົ່າຕາຍ, ເປີດບັນຊີຄືນຖ້າຖືກປິດ. ເທສ: `test/bootstrap.test.js`.

- **ແອັບ SOP ເຊັກລິດ** (ໝວດ "ເອກະສານ & ຂັ້ນຕອນ"): `mod-sop.js` + `sop-data.js` (9 ເຊັກລິດ ຖອດຈາກ PDF SOP-FLD-01/02/03 ດ້ວຍຕາ — ຕ້ອງໃຫ້ເຈົ້າຂອງກວດຂໍ້ຄວາມ, ແກ້ໄດ້ໃນແອັບແຖບ "ແກ້ລາຍການ") + `public/sop.html|js|css`. ຜູ້ດູແລມອບໝາຍ "ຕາມເຊັກລິດ" ຫຼື "ຕາມພະນັກງານ" (ລະບົບເປີດແອັບ sop ໃຫ້ຄົນນັ້ນເອງ); ພະນັກງານເຮັດ ✓/✕ (ບໍ່ຜ່ານຕ້ອງມີເຫດຜົນ) ແລ້ວສົ່ງ; ຜູ້ດູແລຮັບຮອງ/ເປີດແກ້ຄືນ + ກະດານຕິດຕາມ. daily/monthly = ໃບຕໍ່ມື້/ເດືອນ, event = ເລີ່ມໃໝ່ຕໍ່ໂຄງການ/ຕໍ່ການຮັບນ້ຳມັນ. ຂໍ້ມູນ `stdev-data/sop/`. ເທສ `test/sop.test.js`. ຍັງບໍ່ມີ: ຮູບໃນເຊັກລິດ, ໃຊ້ຕອນບໍ່ມີເນັດ.

- SOP ແຍກຕາມຄວາມຖີ່: 14 ໃບ (daily / weekly [ISO ຈັນ–ອາທິດ] / monthly / event). ໃບ "ຕໍ່ລົດ" (`per`: own = ລົດທີ່ຄົນນັ້ນຂັບ, all = ທຸກຄັນ) ອ່ານລາຍຊື່ລົດ+ຄົນຂັບຈາກແອັບນ້ຳມັນຜ່ານ `fuel.vehicles()` (ສົ່ງເຂົ້າ `mod-sop` ໃນ server.js — ໂມດູນບໍ່ເອີ້ນກັນເອງ); run key = ຮອບ@ລົດ. ປ່ຽນຄົນຂັບ/ລົດໃນແອັບນ້ຳມັນ → SOP ປ່ຽນຕາມເອງ.

- ສ່ວນຕ່າງຂ້າມຄືນ: ແຕ່ລະແຖວລົດມີ `prev` (cm2 ມື້ກ່ອນທີ່ເຄີຍບັນທຶກ, ≤14 ໄຟລ໌ຍ້ອນຫຼັງ) ແລະ `gap` = L(cm0 ມື້ນີ້) − L(cm2 ມື້ກ່ອນ); ເກີນ `Tank.GAP` (10 L) ເຕືອນໃນພາບລວມ. cm0 ຍັງຕ້ອງແທກ/ກອກເອງທຸກມື້ (ບໍ່ເຕີມໃຫ້ອັດຕະໂນມັດ — ເຈົ້າຂອງຕ້ອງການໃຫ້ເຫັນສ່ວນຕ່າງ).

## 7. ຂໍ້ຈຳກັດທີ່ບອກເຈົ້າຂອງແລ້ວ
- ປິດບັນຊີກາງ ບໍ່ຕັດ session HR ທີ່ອອກໄປແລ້ວ
- ພະນັກງານ HR ເດີມ (ST-001, ST-000) ບໍ່ໄດ້ຜູກກັບບັນຊີກາງ
- ລາຍລະອຽດ HR (ພະແນກ, ເງິນເດືອນ) ຕື່ມໃນ HR ເອງ

## 8. Prompt ທຳອິດໃນບັນຊີໃໝ່ (ກ໊ອບໄປວາງ)
```
ອ່ານ "ST POS/apps/stdev/HANDOFF.md" ແລະ "ST POS/apps/stdev/ADD-APP.md" ກ່ອນ. ຕອບເປັນພາສາລາວ.
ຮັນ npm test ໃນ apps/stdev ເພື່ອຢືນຢັນສະພາບ. ຫຼັງຈາກນັ້ນຖາມຂ້ອຍວ່າຕ້ອງການຫຍັງຕໍ່ (ແອັບ SOP ຫຼື ແກ້ບັນຫາທີ່ຂ້ອຍພົບເທິງ stdev.store).
ຢ່າ push GitHub ຫຼື ແກ້ຂອງ live ຖ້າຂ້ອຍບໍ່ສັ່ງ.
```
