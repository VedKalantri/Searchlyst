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

  // Scanline filter byte (0) + width * 4 (RGBA)
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Default background: Charcoal #111113
      let r = 17, g = 17, b = 19, a = 255;

      const nx = x / width;
      const ny = y / height;

      // Outer border hairline for larger icons
      if (size >= 32 && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) {
        r = 38; g = 38; b = 43;
      }

      // Architectural "S" Monogram (Searchlyst)
      const inTopBar = nx >= 0.22 && nx <= 0.78 && ny >= 0.20 && ny <= 0.30;
      const inUpperLeft = nx >= 0.22 && nx <= 0.35 && ny >= 0.20 && ny <= 0.55;
      const inMidBar = nx >= 0.22 && nx <= 0.78 && ny >= 0.45 && ny <= 0.55;
      const inLowerRight = nx >= 0.65 && nx <= 0.78 && ny >= 0.45 && ny <= 0.80;
      const inBottomBar = nx >= 0.22 && nx <= 0.78 && ny >= 0.70 && ny <= 0.80;

      if (inTopBar || inUpperLeft || inMidBar || inLowerRight || inBottomBar) {
        r = 237; g = 237; b = 235; // Crisp Off-white
      }

      // Restrained Electric Vermilion Accent Focal Dot (#F05023)
      const dotDist = Math.hypot(nx - 0.76, ny - 0.25);
      const dotRadius = size <= 16 ? 0.12 : 0.07;
      if (dotDist <= dotRadius) {
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

const outDir = path.resolve('assets/icons');

[16, 32, 48, 128].forEach(size => {
  const png = generatePng(size);
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated Searchlyst icon: icon-${size}.png (${png.length} bytes)`);
});
