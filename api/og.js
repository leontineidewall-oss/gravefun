// computed share image: the pixel graveyard card, upscaled x5 to 1200x630, encoded as PNG with node's zlib
const zlib = require("zlib");
const PX = require("./_pixel");

const CRC = (function () { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(g, scale) {
  const W = g.w * scale, H = g.h * scale, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1); raw[row] = 0;
    for (let x = 0; x < W; x++) {
      const c = g.px[Math.floor(y / scale) * g.w + Math.floor(x / scale)], o = row + 1 + x * 3;
      raw[o] = (c >> 16) & 255; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function ogGrid() {
  const g = new PX.Grid(240, 126);
  PX.card(g, [
    { segs: [["bury dead bags.", "ink"]], sc: 2 },
    { segs: [["get ", "ink"], ["sol", "c"], [" back.", "ink"]], sc: 2, gap: 12 },
    { segs: [["burn it. close it.", "lav"]], sc: 1, gap: 4 },
    { segs: [["take the rent.", "lav"]], sc: 1, gap: 10 },
    { segs: [["grave", "c"]], sc: 1 }
  ], { top: 16, hero: "", bob: 0 });
  return g;
}
let cached = null;
module.exports = function (req, res) {
  if (!cached) cached = png(ogGrid(), 5);
  res.statusCode = 200;
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.end(cached);
};
module.exports.png = png; module.exports.ogGrid = ogGrid;
