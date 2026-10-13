/**
 * ESC/POS for thermal printers: the slip is printed as a picture (raster), so Gujarati / Hindi text,
 * logos, QR codes and emojis print exactly as on screen, on any ESC/POS printer.
 */

const ESC = 0x1b;
const GS = 0x1d;

/** Printer dot widths: 80 mm paper = 576 dots (72 mm printable), 58 mm = 384 dots. */
export const PAPER_DOTS = { "80mm": 576, "58mm": 384 };

/** Canvas -> 1 bit per pixel rows (MSB first). Light pixels are white. */
export function canvasToBits(canvas, threshold = 165) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const px = ctx.getImageData(0, 0, width, height).data;
  const bytesPerRow = Math.ceil(width / 8);
  const bits = new Uint8Array(bytesPerRow * height);
  // Trim blank rows at the bottom so the printer does not feed empty paper.
  let lastInk = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = px[i + 3] / 255;
      // Transparent = white; luminance of the pixel over white.
      const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a + 255 * (1 - a);
      if (lum < threshold) {
        bits[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
        lastInk = y;
      }
    }
  }
  const rows = Math.min(height, lastInk + 1);
  return { bits: bits.subarray(0, rows * bytesPerRow), bytesPerRow, rows };
}

function concat(parts) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  parts.forEach((p) => {
    out.set(p, o);
    o += p.length;
  });
  return out;
}

/**
 * Full print job: init, image in bands (GS v 0, max 255 rows each so small printers keep up),
 * feed, optional cut and cash drawer kick.
 */
export function buildRasterJob({ bits, bytesPerRow, rows }, { cut = true, drawer = false, feed = 4 } = {}) {
  const parts = [Uint8Array.of(ESC, 0x40)]; // ESC @ initialise
  if (drawer) parts.push(Uint8Array.of(ESC, 0x70, 0x00, 0x19, 0xfa)); // ESC p 0: open cash drawer
  const band = 255;
  for (let y = 0; y < rows; y += band) {
    const h = Math.min(band, rows - y);
    parts.push(Uint8Array.of(GS, 0x76, 0x30, 0x00, bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff, h & 0xff, (h >> 8) & 0xff));
    parts.push(bits.subarray(y * bytesPerRow, (y + h) * bytesPerRow));
  }
  parts.push(Uint8Array.of(ESC, 0x64, feed)); // ESC d n: feed n lines
  if (cut) parts.push(Uint8Array.of(GS, 0x56, 0x42, 0x00)); // GS V B 0: feed and partial cut
  return concat(parts);
}

/** Small text-only test slip (works even before the picture path is checked). */
export function buildTestJob(text, { cut = true } = {}) {
  const enc = new TextEncoder().encode(`${text}\n\n`);
  return concat([Uint8Array.of(ESC, 0x40, ESC, 0x61, 0x01), enc, Uint8Array.of(ESC, 0x64, 3), cut ? Uint8Array.of(GS, 0x56, 0x42, 0x00) : new Uint8Array()]);
}
