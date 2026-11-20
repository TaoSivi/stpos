/* ຕິດເລກເວີຊັນໃສ່ <script src> / <link href> ທຸກໄຟລ໌ໃນ public/*.html ຕາມ VER ໃນ sw.js — ເຄື່ອງທີ່ຈຳໂຄ້ດເກົ່າໄວ້ຈະຖືກບັງຄັບໃຫ້ໂຫຼດໃໝ່ (URL ປ່ຽນ). ແລ່ນທຸກຄັ້ງກ່ອນ deploy: node tools/stamp.js */
const fs = require('fs'), path = require('path'), pub = path.join(__dirname, '..', 'public');
const ver = (/stdev-v(\d+)/.exec(fs.readFileSync(path.join(pub, 'sw.js'), 'utf8')) || [])[1]; if (!ver) { console.error('no VER in sw.js'); process.exit(1); }
fs.readdirSync(pub).filter(function (f) { return /\.html$/.test(f); }).forEach(function (f) {
  const p = path.join(pub, f), s = fs.readFileSync(p, 'utf8'), n = s.replace(/((?:src|href)=")([A-Za-z0-9_-]+\.(?:js|css))(\?v=\d+)?(")/g, '$1$2?v=' + ver + '$4');
  if (n !== s) { fs.writeFileSync(p, n); console.log('stamped', f); }
});
