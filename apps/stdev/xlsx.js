/* ຕົວຂຽນໄຟລ໌ .xlsx ແບບນ້ອຍ (ບໍ່ມີ dependency): ໃຊ້ zlib ຂອງ Node ເທົ່ານັ້ນ.
 * ຮອງຮັບ: ຫຼາຍ sheet, ຕົວເລກ/ຂໍ້ຄວາມ, ຮູບແບບ (ຟອນ, ສີພື້ນ, ຂອບ, ຈັດວາງ, numFmt), ລວມຊ່ອງ (merge), ຄວາມກວ້າງຖັນ, freeze panes, autofilter.
 * ໃຊ້: const wb = xlsx.workbook(); const st = wb.style({ bold: true, fill: 'FF0F766E', color: 'FFFFFFFF', h: 'center' });
 *      const ws = wb.sheet('ຊື່'); ws.set(1, 1, 'ຫົວຂໍ້', st); ws.merge('A1:C1'); ws.cols([10, 20]); ws.freeze(3, 5); const buf = wb.build();
 * shortcut: ຂໍ້ຄວາມເກັບແບບ inline (ບໍ່ມີ sharedStrings) — ໄຟລ໌ໃຫຍ່ກວ່າເລັກນ້ອຍ ແຕ່ Excel / LibreOffice ເປີດໄດ້ປົກກະຕິ. */
'use strict';
const zlib = require('zlib');

const CRC = (function () { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = function (b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const esc = function (s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

/* A1 helper: 1 → A, 27 → AA */
const colName = function (n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

function zip(files) { /* files = [{name, data:Buffer}] → Buffer (deflate) */
  const parts = [], central = []; let offset = 0;
  const d = new Date(), dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach(function (f) {
    const name = Buffer.from(f.name, 'utf8'), raw = Buffer.from(f.data), comp = zlib.deflateRawSync(raw), crc = crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(dosTime, 10); h.writeUInt16LE(dosDate, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, name, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(dosTime, 12); c.writeUInt16LE(dosDate, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, name); offset += 30 + name.length + comp.length;
  });
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat(parts.concat([cd, end]));
}

function workbook() {
  const styles = [{}], styleKey = ['{}'], sheets = [], numFmts = {}; let nextFmt = 164;
  /* style: {bold, italic, size, color, fill, h, v, wrap, fmt, border:'thin'} — ຄືນ index ສຳລັບ ws.set() */
  function style(o) {
    o = o || {}; const k = JSON.stringify(o), i = styleKey.indexOf(k); if (i >= 0) return i;
    if (o.fmt && !/^\d+$/.test(String(o.fmt)) && !(o.fmt in numFmts)) numFmts[o.fmt] = nextFmt++;
    styles.push(o); styleKey.push(k); return styles.length - 1;
  }
  function sheet(name) {
    const cells = {}, merges = [], widths = [], rowH = {}; let freeze = null, filter = null;
    const ws = {
      set: function (r, c, v, s) { (cells[r] = cells[r] || {})[c] = { v: v, s: s || 0 }; return ws; },
      merge: function (ref) { merges.push(ref); return ws; },
      cols: function (w) { w.forEach(function (x, i) { widths[i] = x; }); return ws; },
      height: function (r, h) { rowH[r] = h; return ws; },
      freeze: function (col, row) { freeze = { c: col, r: row }; return ws; }, /* ຕຶງຖັນ 1..col-1 ແລະແຖວ 1..row-1 */
      filter: function (ref) { filter = ref; return ws; },
      _xml: function () {
        const rows = Object.keys(cells).map(Number).sort(function (a, b) { return a - b; });
        let maxC = 1; rows.forEach(function (r) { Object.keys(cells[r]).forEach(function (c) { if (+c > maxC) maxC = +c; }); });
        let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
        x += '<dimension ref="A1:' + colName(maxC) + (rows.length ? rows[rows.length - 1] : 1) + '"/>';
        x += '<sheetViews><sheetView workbookViewId="0"' + (sheets[0] === ws ? ' tabSelected="1"' : '') + '>' + (freeze ? '<pane' + (freeze.c > 1 ? ' xSplit="' + (freeze.c - 1) + '"' : '') + (freeze.r > 1 ? ' ySplit="' + (freeze.r - 1) + '"' : '') + ' topLeftCell="' + colName(freeze.c) + freeze.r + '" activePane="' + (freeze.c > 1 && freeze.r > 1 ? 'bottomRight' : freeze.r > 1 ? 'bottomLeft' : 'topRight') + '" state="frozen"/>' : '') + '</sheetView></sheetViews>';
        x += '<sheetFormatPr defaultRowHeight="15"/>';
        if (widths.length) x += '<cols>' + widths.map(function (w, i) { return w ? '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>' : ''; }).join('') + '</cols>';
        x += '<sheetData>';
        rows.forEach(function (r) {
          x += '<row r="' + r + '"' + (rowH[r] ? ' ht="' + rowH[r] + '" customHeight="1"' : '') + '>';
          Object.keys(cells[r]).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
            const cell = cells[r][c], ref = colName(c) + r, s = cell.s ? ' s="' + cell.s + '"' : '', v = cell.v;
            if (v === null || v === undefined || v === '') x += '<c r="' + ref + '"' + s + '/>';
            else if (typeof v === 'number' && isFinite(v)) x += '<c r="' + ref + '"' + s + '><v>' + v + '</v></c>';
            else x += '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
          });
          x += '</row>';
        });
        x += '</sheetData>';
        if (filter) x += '<autoFilter ref="' + filter + '"/>';
        if (merges.length) x += '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>';
        x += '</worksheet>'; return x;
      }
    };
    sheets.push(ws); ws._name = name; return ws;
  }
  function stylesXml() {
    const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    const fi = function (list, xml) { const i = list.indexOf(xml); if (i >= 0) return i; list.push(xml); return list.length - 1; };
    fi(fonts, '<font><sz val="11"/><name val="Phetsarath OT"/></font>');
    const xfs = styles.map(function (o) {
      const f = fi(fonts, '<font>' + (o.bold ? '<b/>' : '') + (o.italic ? '<i/>' : '') + '<sz val="' + (o.size || 11) + '"/>' + (o.color ? '<color rgb="' + o.color + '"/>' : '') + '<name val="Phetsarath OT"/></font>');
      const fl = o.fill ? fi(fills, '<fill><patternFill patternType="solid"><fgColor rgb="' + o.fill + '"/><bgColor indexed="64"/></patternFill></fill>') : 0;
      const bd = o.border ? fi(borders, '<border><left style="thin"><color rgb="FFBFC9C9"/></left><right style="thin"><color rgb="FFBFC9C9"/></right><top style="thin"><color rgb="FFBFC9C9"/></top><bottom style="thin"><color rgb="FFBFC9C9"/></bottom><diagonal/></border>') : 0;
      const nf = o.fmt ? (/^\d+$/.test(String(o.fmt)) ? +o.fmt : numFmts[o.fmt]) : 0;
      return '<xf numFmtId="' + nf + '" fontId="' + f + '" fillId="' + fl + '" borderId="' + bd + '" xfId="0"' + (nf ? ' applyNumberFormat="1"' : '') + (f ? ' applyFont="1"' : '') + (fl ? ' applyFill="1"' : '') + (bd ? ' applyBorder="1"' : '') + (o.h || o.v || o.wrap ? ' applyAlignment="1"' : '') + '>' + (o.h || o.v || o.wrap ? '<alignment' + (o.h ? ' horizontal="' + o.h + '"' : '') + ' vertical="' + (o.v || 'center') + '"' + (o.wrap ? ' wrapText="1"' : '') + '/>' : '') + '</xf>';
    });
    const nfx = Object.keys(numFmts).map(function (k) { return '<numFmt numFmtId="' + numFmts[k] + '" formatCode="' + esc(k) + '"/>'; }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + (nfx ? '<numFmts count="' + Object.keys(numFmts).length + '">' + nfx + '</numFmts>' : '') +
      '<fonts count="' + fonts.length + '">' + fonts.join('') + '</fonts><fills count="' + fills.length + '">' + fills.join('') + '</fills><borders count="' + borders.length + '">' + borders.join('') + '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join('') + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }
  function build() {
    const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const files = [
      { name: '[Content_Types].xml', data: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
      { name: '_rels/.rels', data: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: H + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + esc(s._name).slice(0, 31) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', data: stylesXml() }
    ].concat(sheets.map(function (s, i) { return { name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: s._xml() }; }));
    return zip(files);
  }
  return { style: style, sheet: sheet, build: build };
}
module.exports = { workbook: workbook, zip: zip, crc32: crc32, colName: colName };
