/* ສ້າງໄອຄອນແອັບ (PNG) ໂດຍບໍ່ໃຊ້ library: node tools/make-icons.js → public/icon-*.png, apple-touch-icon.png
 * ແຕ້ມຮູບຕູ້ນ້ຳມັນສີຂາວເທິງພື້ນ teal (ສີດຽວກັບ UI) ດ້ວຍ supersampling 3x3 */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const OUT = path.join(__dirname, '..', 'public');
const crcT = (function () { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = function (b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = function (type, data) { const l = Buffer.alloc(4), c = Buffer.alloc(4), t = Buffer.from(type); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const rr = function (x, y, x0, y0, x1, y1, r) { const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r); return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r && x >= x0 && x <= x1 && y >= y0 && y <= y1; };
const disc = function (x, y, cx, cy, r) { return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r; };
/* u,v ໃນ 0..1: ຄືນສີ [r,g,b,a] — corner = ມຸມມົນຂອງພື້ນ (0 = ເຕັມສີ່ຫຼ່ຽມ ສຳລັບ maskable / iOS), g = ຂະໜາດຮູບ */
function pix(u, v, corner, g) {
  if (corner && !rr(u, v, 0, 0, 1, 1, corner)) return [0, 0, 0, 0];
  const t = (u + v) / 2, bg = [10 + (10 - 10) * t, Math.round(186 + (126 - 186) * t), Math.round(181 + (122 - 181) * t)];
  const x = (u - .5) / g + .5, y = (v - .5) / g + .5, W = [255, 255, 255];
  if (rr(x, y, .27, .22, .59, .76, .035) && !rr(x, y, .33, .29, .53, .45, .02)) return W.concat(255); /* ຕົວຕູ້ + ໜ້າຕ່າງ */
  if (rr(x, y, .23, .76, .63, .83, .025)) return W.concat(255);                                       /* ຖານ */
  if (rr(x, y, .59, .34, .70, .40, .02) || rr(x, y, .66, .34, .72, .64, .02) || disc(x, y, .69, .68, .05)) return W.concat(255); /* ສາຍ + ຫົວຈ່າຍ */
  return bg.concat(255);
}
function render(size, corner, g) {
  const buf = Buffer.alloc(size * size * 4), S = 3;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, gg = 0, b = 0, a = 0;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const p = pix((x + (i + .5) / S) / size, (y + (j + .5) / S) / size, corner, g); r += p[0] * p[3]; gg += p[1] * p[3]; b += p[2] * p[3]; a += p[3]; }
    const o = (y * size + x) * 4; if (a) { buf[o] = r / a; buf[o + 1] = gg / a; buf[o + 2] = b / a; buf[o + 3] = a / (S * S); }
  }
  return png(size, size, buf);
}
[['icon-192.png', 192, .22, 1], ['icon-512.png', 512, .22, 1], ['icon-maskable-512.png', 512, 0, .78], ['apple-touch-icon.png', 180, 0, .9]].forEach(function (f) { fs.writeFileSync(path.join(OUT, f[0]), render(f[1], f[2], f[3])); console.log(f[0]); });
