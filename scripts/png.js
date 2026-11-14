// Minimal PNG dekoder (Node, kutubxonasiz): 8/4/2/1-bit palitra va kulrang, 8-bit RGB/RGBA, interlace'siz.
// GIBS xarita taylarini Node'da o'qish uchun (brauzerda createImageBitmap ishlatiladi).
import { inflateSync } from 'node:zlib';

export function decodePNG(buf) {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) throw new Error('not a PNG');
  let off = 8, width, height, depth, ctype, interlace, palette = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    off += 12 + len;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (interlace) throw new Error('interlaced PNG not supported');
  if (depth === 16) throw new Error('16-bit PNG not supported');
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!channels) throw new Error(`colour type ${ctype} not supported`);
  if (depth < 8 && !(ctype === 0 || ctype === 3)) throw new Error('sub-byte depth only for gray/palette');
  const bpp = Math.max(1, Math.ceil(channels * depth / 8));
  const stride = Math.ceil(width * channels * depth / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[p++];
    const row = raw.subarray(p, p + stride); p += stride;
    const out = px.subarray(y * stride, (y + 1) * stride);
    const prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev ? prev[i] : 0, c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[i] = v & 255;
    }
  }
  const rgba = new Uint8ClampedArray(width * height * 4);
  const sample = (row, x) => { // depth < 8: bitlardan namuna
    if (depth === 8) return px[row * stride + x];
    const bit = x * depth, byte = px[row * stride + (bit >> 3)], shift = 8 - depth - (bit & 7);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  for (let y = 0, j = 0; y < height; y++) {
    for (let x = 0; x < width; x++, j += 4) {
      if (ctype === 3) {
        const k = sample(y, x);
        rgba[j] = palette[k * 3]; rgba[j + 1] = palette[k * 3 + 1]; rgba[j + 2] = palette[k * 3 + 2];
        rgba[j + 3] = trns && k < trns.length ? trns[k] : 255;
      } else if (ctype === 0) {
        const v = sample(y, x) * (depth === 8 ? 1 : 255 / ((1 << depth) - 1));
        rgba[j] = rgba[j + 1] = rgba[j + 2] = v; rgba[j + 3] = 255;
      } else {
        const i = y * stride + x * channels;
        rgba[j] = px[i]; rgba[j + 1] = px[i + 1]; rgba[j + 2] = px[i + 2];
        rgba[j + 3] = channels === 4 ? px[i + 3] : 255;
        if (channels === 2) { rgba[j + 1] = rgba[j + 2] = px[i]; rgba[j + 3] = px[i + 1]; }
      }
    }
  }
  return { width, height, data: rgba, colorType: ctype, depth };
}
