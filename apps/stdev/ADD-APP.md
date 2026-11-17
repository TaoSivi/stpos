# ເພີ່ມແອັບໃໝ່ເຂົ້າ stdev (ຕົວຢ່າງ: SOP)

stdev ເປັນແພລດຟອມ: **login ຄັ້ງດຽວ → ໜ້າຫຼັກ (`home.html`) → ກົດເຂົ້າແອັບ**. ແອັບແຕ່ລະອັນເປັນໂມດູນແຍກ, ບໍ່ເອີ້ນກັນເອງ.
ບັນຊີ, ສິດເຂົ້າແອັບ, ໜ້າຫຼັກ, ແລະ ປຸ່ມ "ໜ້າຫຼັກ" ມີໃຫ້ແລ້ວ — ແອັບໃໝ່ເຮັດ 4 ຢ່າງເທົ່ານັ້ນ.

## 1. ຂຽນໂມດູນຝັ່ງ server — `mod-sop.js`
ຮູບແບບດຽວກັບ `mod-fuel.js` (logic ລ້ວນ, ໄດ້ `user` ຈາກບັນຊີກາງ, ເກັບຂໍ້ມູນໃນ `DATA/<id>/`):

```js
function create(DATA, accounts) {
  function handle(action, o, user) {        // action = ສ່ວນຫຼັງ "sop."  ເຊັ່ນ 'list'
    if (action === 'list') return { ok: true, data: [] };
    return { ok: false, error: 'action' };
  }
  return { handle: handle };
}
module.exports = { create: create };
```
`user` = `{ id (ເບີໂທ), name, level, fuel, hr, approver, apps, sites }`. ສິດພາຍໃນແອັບ (ໃຜແກ້/ອະນຸມັດ) ແອັບຕັດສິນເອງ.

## 2. ລົງທະບຽນໃນ `server.js` (2 ແຖວ)
```js
// ໃນ APPS (ຖອດ comment ຕົວຢ່າງ SOP ໄດ້ເລີຍ)
{ id: 'sop', name: 'SOP', desc: function () { return 'ຂັ້ນຕອນການເຮັດວຽກ'; }, icon: 'sheet', href: function () { return 'sop.html'; }, generic: true, access: function (u) { return has(u, 'sop'); } }
// ແລະ
MODS.sop = require('./mod-sop').create(DATA, accounts);
```
- `generic: true` → ໃນໜ້າ **ພະນັກງານ & ສິດ** ຈະມີສະວິດ "ເຂົ້າ SOP ໄດ້" ອອກມາເອງ (ເກັບໃນ `user.apps`); Admin / Super admin ເຂົ້າໄດ້ທຸກແອັບ.
- ຕ້ອງການສິດລະອຽດກວ່ານັ້ນ (ເຊັ່ນ ໜ້າທີ່ໃນ SOP) → ຂຽນ `access` ເອງ ແລະ ເກັບໜ້າທີ່ໃນຂໍ້ມູນຂອງແອັບ.
- ໄອຄອນ: ຊື່ໃນ `ICONS` ຂອງ `public/app.js` (ເພີ່ມຮູບໃໝ່ຢູ່ນັ້ນໄດ້).

## 3. ໜ້າເວັບ — `public/sop.html` (+ `sop.js`)
ໃຊ້ໂຄງດຽວກັນກັບ `driver.html`: ໂຫຼດ `tank.js`(ບໍ່ຈຳເປັນ) `app.js` `offline.js` ແລ້ວເອີ້ນ `api('sop.list', {...})`.
ຫົວໜ້າໃຊ້ `header('SOP', user.name)` — ມີປຸ່ມ "ໜ້າຫຼັກ" ແລະ "ອອກຈາກລະບົບ" ໃຫ້ອັດຕະໂນມັດ. ຢ່າລືມໃສ່ໄຟລ໌ໃໝ່ໃນ `SHELL` ຂອງ `public/sw.js` ແລະ ເພີ່ມເລກ `VER`.
ຕ້ອງການໃຊ້ໄດ້ຕອນບໍ່ມີເນັດ → `api()` ໃນ `offline.js` ມີຄິວສຳລັບ action ຂຽນ (`WRITES`) ແລະ ອ່ານ (`READS`) — ເພີ່ມຊື່ action ຂອງ SOP ເຂົ້າສອງລາຍການນັ້ນ (ຕ້ອງຂຽນ `localApply` ຖ້າຕ້ອງການຄິດໄລ່ໃນເຄື່ອງ).

## 4. ທົດສອບ + ຂຶ້ນ server
- ເພີ່ມ `test/sop.test.js` (ຮູບແບບ `core.test.js`) ແລະ ໃສ່ໃນ `npm test`; ເພີ່ມແຖວທົດສອບສິດໃນ `test/server.test.js`.
- ຂຶ້ນ: ອັບ `server.js`, `mod-sop.js` ໄປ `stdev-release/app/apps/stdev/` ແລະ ໜ້າເວັບໄປ `public_html/` ແລ້ວ restart ແອັບ Node (cPanel → Setup Node.js App → Restart).


## ໝວດໃນໜ້າຫຼັກ
ແຕ່ລະແອັບໃນ `APPS` (server.js) ມີ `cat`: `work` (ວຽກປະຈຳວັນ) · `docs` (ເອກະສານ & ຂັ້ນຕອນ — ໃຊ້ກັບ SOP) · `admin` (ຈັດການ & ຕັ້ງຄ່າ). ໝວດຢູ່ໃນ `CATS`; ໜ້າຫຼັກຈັດຕາມໝວດເອງ (ໝວດທີ່ບໍ່ມີແອັບຈະບໍ່ສະແດງ; ມີ >6 ແອັບຈະມີຊ່ອງຄົ້ນຫາ).
