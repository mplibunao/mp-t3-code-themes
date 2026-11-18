import { deflateSync } from "node:zlib";

/** A finished indexed-colour image: one palette index per pixel, row by row. */
export interface Raster {
  readonly width: number;
  readonly height: number;
  /** Colours as `#rrggbb`, in palette order. */
  readonly palette: readonly string[];
  readonly pixels: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/* oxlint-disable no-bitwise -- CRC-32 is bit arithmetic by definition, and a rewrite would risk the byte-identical PNG. */
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/* oxlint-enable no-bitwise */

function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function header(raster: Raster) {
  const data = new Uint8Array(13);
  const view = new DataView(data.buffer);
  view.setUint32(0, raster.width);
  view.setUint32(4, raster.height);
  data.set([8, 3, 0, 0, 0], 8); // 8-bit, indexed colour
  return data;
}

function plte(palette: readonly string[]) {
  const data = new Uint8Array(palette.length * 3);
  palette.forEach((hex, i) => {
    data[i * 3] = Number.parseInt(hex.slice(1, 3), 16);
    data[i * 3 + 1] = Number.parseInt(hex.slice(3, 5), 16);
    data[i * 3 + 2] = Number.parseInt(hex.slice(5, 7), 16);
  });
  return data;
}

// Each row starts with filter type 0 (none).
function scanlines({ width, height, pixels }: Raster) {
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  return raw;
}

/**
 * Encodes an indexed-colour PNG.
 *
 * @param raster - The finished image. It's only read.
 * @returns The PNG file's bytes.
 */
export function encodePng(raster: Raster): Uint8Array {
  const parts = [
    new Uint8Array(SIGNATURE),
    chunk("IHDR", header(raster)),
    chunk("PLTE", plte(raster.palette)),
    chunk("IDAT", deflateSync(scanlines(raster), { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}
