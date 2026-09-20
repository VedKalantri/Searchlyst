import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([lenBuf, body, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;

  // Each scanline has 1 filter byte (0) + width * 4 bytes (RGBA)
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  // Background: #111113 -> [17, 17, 19, 255]
  // Text/Shapes: #EDEDEB -> [237, 237, 235, 255]
  // Accent: #F05023 -> [240, 80, 35, 255]

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Default background color
      let r = 17, g = 17, b = 19, a = 255;

      // Normalized coordinates [0, 1]
      const nx = x / width;
      const ny = y / height;

      // Top bar of T/F
      if (nx >= 0.18 && nx <= 0.82 && ny >= 0.20 && ny <= 0.32) {
        r = 237; g = 237; b = 235;
      }
      // Vertical stem
      else if (nx >= 0.44 && nx <= 0.56 && ny >= 0.20 && ny <= 0.80) {
        r = 237; g = 237; b = 235;
      }
      // Crossbar branch for "F"
      else if (nx >= 0.54 && nx <= 0.78 && ny >= 0.45 && ny <= 0.55) {
        r = 237; g = 237; b = 235;
      }
      // Vermilion accent dot
      const dotCx = 0.76;
      const dotCy = 0.76;
      const dist = Math.hypot(nx - dotCx, ny - dotCy);
      if (dist <= 0.08) {
        r = 240; g = 80; b = 35;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('C:/Users/vedka/.gemini/antigravity/scratch/tabfuse/assets/icons');

[16, 32, 48, 128].forEach(size => {
  const png = generatePng(size);
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: icon-${size}.png (${png.length} bytes)`);
});
