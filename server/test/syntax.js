/* ກວດ syntax JavaScript ທຸກ <script> ໃນ index.html (ກັນແອັບເປີດບໍ່ຂຶ້ນຫຼັງແກ້ໂຄດ) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, n = 0, bad = 0;
while ((m = re.exec(html))) {
  n++;
  try { new vm.Script(m[1], { filename: 'index.html#script' + n }); }
  catch (e) { bad++; console.error('✗ script ' + n + ' (html line ' + (html.slice(0, m.index).split('\n').length) + '): ' + e.message); }
}
if (bad) { process.exitCode = 1; } else console.log('  ✓ index.html: ' + n + ' inline scripts parse OK');
