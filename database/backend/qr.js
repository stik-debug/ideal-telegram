'use strict';
// Minimal dependency-free QR Code generator (byte mode, error-correction level M, versions 1-10).
// Algorithm follows the public QR Code specification (ISO/IEC 18004).
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const rawModules = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
const dataCodewords = (v) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v] * NUM_BLOCKS[v];
const gfMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
const rsDivisor = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 2); } return r; };
const rsRemainder = (data, div) => { const r = div.map(() => 0); for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gfMul(c, f); }); } return r; };

function encode(text) {
  const bytes = Buffer.from(String(text), 'utf8');
  let ver = 0;
  for (let v = 1; v <= 10; v++) { const ccBits = v < 10 ? 8 : 16; if (4 + ccBits + bytes.length * 8 <= dataCodewords(v) * 8) { ver = v; break; } }
  if (!ver) throw new Error('QR payload too long');
  const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  const cap = dataCodewords(ver) * 8; put(0, Math.min(4, cap - bits.length)); while (bits.length % 8) bits.push(0);
  for (let pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  // error correction + interleave
  const nb = NUM_BLOCKS[ver], eccLen = ECC_PER_BLOCK[ver], raw = Math.floor(rawModules(ver) / 8), shortCount = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) { const dat = data.slice(k, k + shortLen - eccLen + (i < shortCount ? 0 : 1)); k += dat.length; const ecc = rsRemainder(dat, div); if (i < shortCount) dat.push(0); blocks.push(dat.concat(ecc)); }
  const out = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= shortCount) out.push(b[i]); });
  return build(ver, out);
}

function build(ver, codewords) {
  const size = ver * 4 + 17, mod = Array.from({ length: size }, () => new Array(size).fill(false)), fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (x, y, d) => { mod[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy; if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = []; if (ver > 1) { const n = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2; align.push(6); for (let p = size - 7; align.length < n; p -= step) align.splice(1, 0, p); }
  for (let i = 0; i < align.length; i++) for (let j = 0; j < align.length; j++) { if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
  const drawFormat = (mask) => {
    const d = (0 << 3) | mask; // ECC level M = format bits 00
    let rem = d; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); const bitsF = ((d << 10) | rem) ^ 0x5412, g = (i) => ((bitsF >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setF(8, i, g(i)); setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8)); for (let i = 9; i < 15; i++) setF(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) setF(8, size - 15 + i, g(i)); setF(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) { let rem = ver; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25); const bitsV = (ver << 12) | rem; for (let i = 0; i < 18; i++) { const bit = ((bitsV >>> i) & 1) !== 0, a = size - 11 + i % 3, b = Math.floor(i / 3); setF(a, b, bit); setF(b, a, bit); } }
  // place codewords in zigzag
  let i = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vert : vert; if (!fn[y][x] && i < codewords.length * 8) { mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; } } }
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { let inv; switch (m) { case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break; case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break; case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0; } if (!fn[y][x] && inv) mod[y][x] = !mod[y][x]; } };
  const penalty = () => {
    let r = 0; const runs = (line) => { let p = 0, run = 1; for (let k = 1; k < line.length; k++) { if (line[k] === line[k - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } return p; };
    for (let y = 0; y < size; y++) r += runs(mod[y]); for (let x = 0; x < size; x++) r += runs(mod.map(row => row[x]));
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) r += 3; }
    const pat = (line) => { let p = 0; for (let k = 0; k + 11 <= line.length; k++) { const s = line.slice(k, k + 11).map(v => v ? 1 : 0).join(''); if (s === '10111010000' || s === '00001011101') p += 40; } return p; };
    for (let y = 0; y < size; y++) r += pat(mod[y]); for (let x = 0; x < size; x++) r += pat(mod.map(row => row[x]));
    let dark = 0; mod.forEach(row => row.forEach(v => { if (v) dark++; })); r += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10 - 0; return r;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const p = penalty(); if (p < bestP) { bestP = p; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  return mod;
}
// PDF drawing operators: filled squares for each dark module with a 4-module quiet zone background.
function pdfOps(text, x, y, sizePt) {
  const m = encode(text), n = m.length, s = sizePt / (n + 8), ops = ['q', '1 1 1 rg', `${x} ${y} ${sizePt} ${sizePt} re f`, '0 0 0 rg'];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ops.push(`${(x + (c + 4) * s).toFixed(2)} ${(y + sizePt - (r + 5) * s).toFixed(2)} ${s.toFixed(2)} ${s.toFixed(2)} re f`);
  ops.push('Q'); return ops;
}
module.exports = { encode, pdfOps };
