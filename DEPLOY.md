# ຂຶ້ນ ST POS ທີ່ https://stpos.store (Namecheap cPanel)

ເວັບເປັນແບບ **A — ໜ້າເວັບລ້ວນ**: ອັບໂຫຼດໄຟລ໌ໄດ້ເລີຍ ບໍ່ມີ build, ບໍ່ມີຖານຂໍ້ມູນໃນໂຮສ.
ຂໍ້ມູນຮ້ານທັງໝົດຢູ່ **Google Sheet + Apps Script** ຄືເກົ່າ — ບໍ່ຕ້ອງຍ້າຍຫຍັງ.

## ໃນ deploy.zip ມີຫຍັງ

| ໄຟລ໌ | ໜ້າທີ່ |
|---|---|
| `index.html` | ແອັບທັງໝົດ |
| `demo-img/` | ຮູບເມນູ |
| `.htaccess` | ບັງຄັບ https, www → ບໍ່ມີ www, index.html ບໍ່ cache (ອັບເດດແລ້ວເຫັນທັນທີ), ບີບອັດໄຟລ໌, ກັນໄຟລ໌ .gs/.md/.xlsx |

**ບໍ່ມີ** Code.gs, ຄູ່ມື .md, Excel ຂໍ້ມູນຈິງ, ວິດີໂອ — ຫ້າມອັບໂຫຼດໄຟລ໌ເຫຼົ່ານີ້ຂຶ້ນໂຮສ.

## ສ້າງ deploy.zip (ໃນເຄື່ອງ)

```
python deploy/build.py
```

ໄດ້ `deploy.zip` ຢູ່ໂຟນເດີໂປຣເຈັກ (ບໍ່ຂຶ້ນ Git).

## ອັບໂຫຼດ (ເຮັດເອງ — ຢ່າໃຫ້ລະຫັດ cPanel ກັບໃຜ)

1. Namecheap → **Hosting List** → **Go to cPanel** → **File Manager** → ເປີດ `public_html`
2. ເປີດ **Settings → Show Hidden Files (dotfiles)** (ເພື່ອເຫັນ `.htaccess`)
3. ຖ້າມີ `index.html` / `default.html` ເກົ່າຂອງໂຮສ → ລຶບສະເພາະໄຟລ໌ນັ້ນ
   **ຫ້າມລຶບ** `.well-known` ແລະ `cgi-bin`
4. **Upload** → ເລືອກ `deploy.zip` → ກັບມາ File Manager → ຄລິກຂວາ `deploy.zip` → **Extract** → ໂຟນເດີ `/public_html`
5. ລຶບ `deploy.zip` ອອກຈາກ public_html
6. ກວດ: `public_html/index.html`, `public_html/.htaccess`, `public_html/demo-img/` ຢູ່ຊັ້ນເທິງສຸດ (ບໍ່ຊ້ອນໃນໂຟນເດີ)

## ກວດ https

- cPanel → **Namecheap SSL** → ສະຖານະ stpos.store ຕ້ອງເປັນ ✓ (ໂດເມນໃໝ່ອາດລໍ 30–60 ນາທີ)
- ຖ້າ SSL ຍັງບໍ່ອອກ ແຕ່ເປີດເວັບແລ້ວ error/ວົນ → ລຶບ `.htaccess` ຊົ່ວຄາວ, ລໍ SSL ອອກ, ແລ້ວອັບໂຫຼດຄືນ

## ຫຼັງຂຶ້ນເວັບ — ສຳຄັນ (ທີ່ຢູ່ໃໝ່ = ທຸກເຄື່ອງຕ້ອງຕັ້ງໃໝ່ 1 ເທື່ອ)

ເຄື່ອງຈື່ server ແລະ ການລັອກອິນ **ແຍກຕາມທີ່ຢູ່ເວັບ** — ເປີດ stpos.store ເທື່ອທຳອິດ ຈະຍັງບໍ່ຮູ້ຈັກ server ຂອງຮ້ານ.

1. ໃນເຄື່ອງທີ່ໃຊ້ຢູ່ (taosivi.github.io/stpos) ລັອກອິນ admin → **ການຕັ້ງຄ່າ → ການເຊື່ອມຕໍ່** → ກວດວ່າ "Link GAS" ຖືກ
2. ເປີດ **https://stpos.store/?api=<link GAS ຂອງຮ້ານ>** 1 ເທື່ອ (ຫຼື ຕັ້ງ server ທີ່ໜ້າທຳອິດ) → ລັອກອິນ admin
3. ໃນ stpos.store: **ການຕັ້ງຄ່າ → ການເຊື່ອມຕໍ່ → ລິ້ງເຂົ້າລະບົບພະນັກງານ / QR** → ສົ່ງລິ້ງ/QR ໃໝ່ໃຫ້ທຸກເຄື່ອງ (POS, ຈໍຄົວ, ບາ, ເສີບ) ເປີດ 1 ເທື່ອ
4. **QR ໂຕະ**: ພິມໃໝ່ຈາກ stpos.store (QR ເກົ່າຊີ້ໄປ taosivi.github.io — ຍັງໃຊ້ໄດ້ ຕາບໃດທີ່ GitHub Pages ຍັງເປີດ)
5. ຖ້າມີ API Token ໃນ Code.gs → ໃສ່ token ໃນແຕ່ລະເຄື່ອງຄືເກົ່າ

> ລິ້ງ `?api=` ມີທີ່ຢູ່ server ຂອງຮ້ານ — ສົ່ງສະເພາະພະນັກງານ. ແອັບລຶບ `api=` ອອກຈາກແຖບທີ່ຢູ່ເອງຫຼັງເປີດ.

## Checklist ທົດສອບ

- [ ] ເປີດ `http://stpos.store` → ໄປ `https://stpos.store` ເອງ, ມີກຸນແຈ 🔒
- [ ] `https://www.stpos.store` → ໄປ `https://stpos.store`
- [ ] ລັອກອິນ PIN ໄດ້, ຂໍ້ມູນ (ໂຕະ, ເມນູ, ບິນ) ຄືກັບໃນ GitHub Pages
- [ ] ຮູບເມນູຂຶ້ນ (ຮູບມາຈາກ stpos.store/demo-img)
- [ ] ສັ່ງອາຫານ 1 ລາຍການ → ຂຶ້ນຈໍຄົວ → ກົດຂັ້ນຕອນ → ຊຳລະ → ບິນເຂົ້າ Google Sheet
- [ ] ສະແກນ QR ໂຕະໃໝ່ຈາກໂທລະສັບ → ສັ່ງໄດ້
- [ ] Export Excel / PDF ໃນລາຍງານ 1 ອັນ
- [ ] ເປີດໃນມືຖື ແລະ ແທັບເລັດ
- [ ] F12 → Console ບໍ່ມີ error ສີແດງ
- [ ] `https://stpos.store/Code.gs` ແລະ `https://stpos.store/DEPLOY.md` ຕ້ອງເປີດບໍ່ໄດ້ (403/404)

## ອັບເດດຄັ້ງຕໍ່ໄປ

1. ແກ້ໃນ main ແລ້ວ push (GitHub = ຕົ້ນສະບັບ)
2. `git checkout deploy/namecheap && git merge main` → `python deploy/build.py`
3. cPanel → File Manager → ຄລິກຂວາ public_html → **Compress** → ດາວໂຫຼດສຳຮອງ
4. Upload + Extract `deploy.zip` ທັບ (ຕອບ overwrite) → ລຶບ zip
5. ບໍ່ຕ້ອງ Ctrl+Shift+R — `.htaccess` ບອກບໍ່ໃຫ້ cache index.html

ໂຮສບໍ່ມີໄຟລ໌ທີ່ຜູ້ໃຊ້ອັບໂຫຼດ ຫຼື ຂໍ້ມູນ — Extract ທັບໄດ້ປອດໄພ (ຂໍ້ມູນຢູ່ Google Sheet).

> ⚠ ຖ້າແກ້ `Code.gs` → ຍັງຕ້ອງ Deploy New version ໃນ Apps Script ຄືເກົ່າ (ບໍ່ກ່ຽວກັບ cPanel).
