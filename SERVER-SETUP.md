# ຍ້າຍຖານຂໍ້ມູນ ST POS ຈາກ Google Sheet ມາໂຮສ stpos.store

## ຫຼັກການ

- `Code.gs` ເດີມ (ທີ່ລວມຂໍ້ມູນຫຼາຍເຄື່ອງ, QR, ແຊັດ, ສຳຮອງ, ລາຍງານ) **ແລ່ນຄືເກົ່າທຸກແຖວ** ເທິງ Node.js ຂອງໂຮສ.
  `server/gas-shim.js` ທົດແທນບໍລິການ Google (Sheet, Properties, Lock, Cache, UrlFetch, Trigger).
- ຂໍ້ມູນເກັບເປັນໄຟລ໌ຢູ່ `~/stpos-data` (**ນອກ** public_html — ເປີດຈາກເວັບບໍ່ໄດ້).
- ແອັບເອີ້ນ `https://stpos.store/api` ແທນ `script.google.com/…/exec` — ຮູບແບບການສົ່ງຂໍ້ມູນຄືເກົ່າ.
- ທົດສອບແລ້ວ: `node server/test/run.js` (16 ລາຍການ) + `node server/test/multiproc.js`.

## ໄຟລ໌

| ໄຟລ໌ | ອັບໂຫຼດໄປ |
|---|---|
| `stpos-server.zip` (app.js, gas-shim.js, package.json, Code.gs) | `~/stpos-api` (ໂຟນເດີໃໝ່ ນອກ public_html) |
| `deploy.zip` | `public_html` (ຄືເກົ່າ) |

ສ້າງທັງສອງດ້ວຍ `python deploy/build.py`

## ຕັ້ງຄ່າໃນ cPanel → Setup Node.js App → Create Application

| ຊ່ອງ | ຄ່າ |
|---|---|
| Node.js version | ສູງສຸດທີ່ມີ (≥ 18) |
| Application mode | Production |
| Application root | `stpos-api` |
| Application URL | `stpos.store` / `api` |
| Application startup file | `app.js` |

Environment variables (ກົດ **Add Variable**):

| ຊື່ | ຄ່າ | ໝາຍເຫດ |
|---|---|---|
| `API_TOKEN` | ລະຫັດຍາວ ສຸ່ມ | ທຸກເຄື່ອງຕ້ອງໃສ່ token ນີ້ — ກັນຄົນນອກອ່ານ/ຂຽນຂໍ້ມູນ |
| `ADMIN_KEY` | ລະຫັດຍາວ ສຸ່ມ (ຕ່າງຈາກ token) | ສຳລັບຍ້າຍຂໍ້ມູນ ແລະ ຄຳສັ່ງຜູ້ດູແລ |
| `CRON_KEY` | ລະຫັດຍາວ ສຸ່ມ | ສຳລັບ cron ທຸກຊົ່ວໂມງ |
| `WA_CALLMEBOT`, `REPORT_HOUR`, `TG_BOT`, `TG_CHAT` | ຄືໃນ Script Properties ເດີມ | ທາງເລືອກ (ລາຍງານ WhatsApp / Telegram) |

ລະຫັດທັງໝົດ **ຫ້າມ** ໃສ່ໃນໂຄດ, GitHub ຫຼື ແຊັດ.

## ຄຳສັ່ງຜູ້ດູແລ (ເປີດໃນ browser)

| URL | ໜ້າທີ່ |
|---|---|
| `https://stpos.store/api` | ຕ້ອງຂຶ້ນ `ST POS server OK` |
| `https://stpos.store/api?admin=status&key=ADMIN_KEY` | ສະຖານະ: ຂະໜາດຂໍ້ມູນ, ຈຳນວນບິນ, ສຳຮອງ, trigger |
| `https://stpos.store/api?admin=pullgas&key=ADMIN_KEY&url=<link GAS /exec>&gtoken=<token GAS ຖ້າມີ>` | **ຍ້າຍຂໍ້ມູນ** ຈາກ Google ມາ (ເທື່ອດຽວ; ມີຂໍ້ມູນແລ້ວຕ້ອງໃສ່ `&force=1` ແລະ ຈະສຳຮອງຂອງເກົ່າໃຫ້ກ່ອນ) |
| `…?admin=backupDaily&key=ADMIN_KEY` | ສຳຮອງດຽວນີ້ (ອັດຕະໂນມັດທຸກມື້ 03:00, ເກັບ 14 ມື້) |
| `…?admin=installDailyReport&key=ADMIN_KEY` | ເປີດລາຍງານ WhatsApp/Telegram ທຸກມື້ |
| `…?admin=testDailyReport&key=ADMIN_KEY` | ສົ່ງລາຍງານທົດສອບ |

## Cron (cPanel → Cron Jobs) — ທຸກຊົ່ວໂມງ

```
0 * * * * curl -s "https://stpos.store/api?cron=CRON_KEY" > /dev/null
```

ແລ່ນ: ສຳຮອງ 03:00 · ລາຍງານປະຈຳວັນ (ຖ້າເປີດ) · ລ້າງ cache ໝົດອາຍຸ.

## ປ່ຽນເຄື່ອງໄປໃຊ້ server ໃໝ່

1. ຍ້າຍຂໍ້ມູນ (`pullgas`) **ຕອນຮ້ານປິດ** — ບໍ່ໃຫ້ມີເຄື່ອງໃດບັນທຶກເຂົ້າ Google ຫຼັງຈາກນັ້ນ
2. ເປີດ `https://stpos.store/?api=https://stpos.store/api` → ໃສ່ API_TOKEN → ລັອກອິນ admin
3. ການຕັ້ງຄ່າ → ການເຊື່ອມຕໍ່ → **ລິ້ງ / QR ເຂົ້າລະບົບພະນັກງານ** → ທຸກເຄື່ອງເປີດ 1 ເທື່ອ (+ ໃສ່ token)
4. ພິມ QR ໂຕະໃໝ່
5. ເກັບ Google Sheet ໄວ້ (ບໍ່ລຶບ) 2 ອາທິດ ເປັນສຳຮອງ

## ເຂົ້າລະບົບເຄື່ອງດ້ວຍ PIN (ບໍ່ຕ້ອງໃຊ້ token ໃນລິ້ງ)

- ລິ້ງ / QR ພະນັກງານ ມີແຕ່ທີ່ຢູ່ server. ເຄື່ອງໃໝ່ເປີດແລ້ວ ເລືອກຜູ້ໃຊ້ + PIN → server ກວດ PIN → ໃຫ້ລະຫັດປະຈຳເຄື່ອງ (180 ມື້)
- ປ່ຽນ PIN ຜູ້ໃດ → ເຄື່ອງຂອງຜູ້ນັ້ນຕ້ອງເຂົ້າລະບົບໃໝ່ · ປ່ຽນ API_TOKEN → ທຸກເຄື່ອງເຂົ້າລະບົບໃໝ່
- PIN ຜິດ 10 ເທື່ອ/ຜູ້ໃຊ້ (ຫຼື 30 ເທື່ອ/IP) ໃນ 15 ນາທີ → ລັອກ 15 ນາທີ
- API_TOKEN ຫຼັກ ໃຊ້ສະເພາະເຄື່ອງ admin ແລະ ຄຳສັ່ງຜູ້ດູແລ

## Sync ສະເພາະສ່ວນທີ່ປ່ຽນ (delta)

- ແອັບ ແລະ server ສົ່ງສະເພາະສ່ວນທີ່ປ່ຽນ (ກວດດ້ວຍ hash) ແທນຂໍ້ມູນທັງກ້ອນ · ຜິດພາດ → ກັບໄປສົ່ງແບບເຕັມເອງ
- server ເກັບ 150 ສະບັບລ່າສຸດໃນ `~/stpos-data/hist` · ເປີດແອັບໃໝ່ໃຊ້ສະບັບທີ່ເກັບໃນເຄື່ອງ (IndexedDB) ແລ້ວດຶງແຕ່ສ່ວນຕ່າງ
- ໂຄດຄິດໄລ່ສ່ວນຕ່າງ: `server/delta.js` = ບລັອກ `STPOS-DELTA` ໃນ index.html (test ກວດວ່າຄືກັນ)

## ແຈ້ງເຕືອນ server ລົ້ມ

cPanel → Cron Jobs: ຕັ້ງ **Cron Email** ເປັນອີເມວເຈົ້າຂອງ, ແລະ ໃຊ້ຄຳສັ່ງ (ທຸກ 10 ນາທີ):

```
curl -fsS -m 90 "https://stpos.store/api?cron=CRON_KEY" > /dev/null || echo "ST POS server ບໍ່ຕອບ"
```

ປົກກະຕິບໍ່ມີອີເມວ; server ບໍ່ຕອບ ຫຼື error → ໄດ້ອີເມວ. (ຖ້າໂຮສລົ້ມທັງໝົດ cron ກໍຢຸດ — ໃຊ້ບໍລິການພາຍນອກເຊັ່ນ UptimeRobot ກວດ `https://stpos.store/api` ນຳ)

## ທົດສອບ

`cd server && npm test` (syntax ແອັບ · delta 3,000 ຮອບ · server 18 ຂໍ້ · 2 process) · `npm run soak` (5 ເຄື່ອງ + QR ພ້ອມກັນ, ກວດບິນບໍ່ຫາຍ)

## ສຳຮອງນອກໂຮສ

ຂໍ້ມູນທັງໝົດຢູ່ `~/stpos-data`. ທຸກອາທິດ: cPanel → File Manager → ຄລິກຂວາ `stpos-data` → Compress → Download ເກັບໄວ້ໃນຄອມ/Drive.
