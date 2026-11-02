/**
 * Lightweight Zero-Dependency Pure-TypeScript SVG QR Code Generator (QR Code Model 2)
 * Supports byte-mode encoding with Reed-Solomon error correction (EC Level L).
 * Dynamically selects versions (V1: 21x21, V2: 25x25, V3: 29x29, V4: 33x33, V6: 41x41).
 */

// Galois Field GF(256) with primitive polynomial 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsCalculateEc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const out = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.copyWithin(0, 1);
    out[ecCount - 1] = 0;
    for (let j = 0; j < ecCount; j++) {
      out[j] ^= gfMul(gen[j], factor);
    }
  }
  return out;
}

interface VersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignCoords: number[];
}

const QR_SPECS: VersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, alignCoords: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, alignCoords: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, alignCoords: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, alignCoords: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26, alignCoords: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, ecBytes: 36, alignCoords: [6, 34] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick smallest fitting version
  const spec =
    QR_SPECS.find((s) => s.dataBytes >= rawBytes.length + 3) || QR_SPECS[QR_SPECS.length - 1];
  const size = spec.size;

  // Encode byte data: Mode (4 bits: 0100) + Length (8 bits) + Raw Bytes + Terminator
  const bitBuf: number[] = [];
  const pushBits = (val: number, bits: number) => {
    for (let i = bits - 1; i >= 0; i--) {
      bitBuf.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode
  pushBits(Math.min(255, rawBytes.length), 8);
  for (const b of rawBytes) {
    pushBits(b, 8);
  }
  // Terminator
  for (let i = 0; i < 4 && bitBuf.length < spec.dataBytes * 8; i++) {
    bitBuf.push(0);
  }
  while (bitBuf.length % 8 !== 0) {
    bitBuf.push(0);
  }

  // Pack into bytes and add pad bytes (0xEC, 0x11)
  const data = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < bitBuf.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | (bitBuf[i + b] || 0);
    }
    data[i / 8] = byteVal;
  }
  let padToggle = 0;
  for (let i = bitBuf.length / 8; i < spec.dataBytes; i++) {
    data[i] = padToggle % 2 === 0 ? 0xec : 0x11;
    padToggle++;
  }

  // Calculate RS Error Correction
  const ec = rsCalculateEc(data, spec.ecBytes);
  const fullCodewords = new Uint8Array(spec.totalBytes);
  fullCodewords.set(data, 0);
  fullCodewords.set(ec, spec.dataBytes);

  // Initialize Matrix & Reserved Mask
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const markReserved = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isReserved[r][c] = true;
    }
  };

  // Place Finder Pattern
  const placeFinder = (startR: number, startC: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startR + r;
        const col = startC + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          markReserved(row, col, false); // Separator
        } else if (r === 0 || r === 6 || c === 0 || c === 6) {
          markReserved(row, col, true);
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          markReserved(row, col, true);
        } else {
          markReserved(row, col, false);
        }
      }
    }
  };

  placeFinder(0, 0); // Top-Left
  placeFinder(0, size - 7); // Top-Right
  placeFinder(size - 7, 0); // Bottom-Left

  // Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    markReserved(6, i, i % 2 === 0);
    markReserved(i, 6, i % 2 === 0);
  }

  // Alignment Pattern for V2+
  if (spec.alignCoords.length > 0) {
    for (const r of spec.alignCoords) {
      for (const c of spec.alignCoords) {
        if (isReserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            markReserved(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // Dark module
  markReserved(size - 8, 8, true);

  // Reserve format info areas around finders
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) markReserved(8, i, false);
    if (!isReserved[i][8]) markReserved(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isReserved[8][size - 1 - i]) markReserved(8, size - 1 - i, false);
    if (!isReserved[size - 1 - i][8]) markReserved(size - 1 - i, 8, false);
  }

  // Write Data bits into non-reserved matrix locations using Zigzag traversal
  let dataBitIdx = 0;
  const totalBits = spec.totalBytes * 8;
  const getBit = (idx: number) => {
    if (idx >= totalBits) return 0;
    const byte = fullCodewords[Math.floor(idx / 8)];
    const bitPos = 7 - (idx % 8);
    return (byte >> bitPos) & 1;
  };

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const col of [right, right - 1]) {
        if (!isReserved[r][col]) {
          const bit = getBit(dataBitIdx++);
          // Mask pattern 0: (row + col) % 2 === 0
          const mask = (r + col) % 2 === 0;
          matrix[r][col] = (bit === 1) !== mask;
        }
      }
    }
    upward = !upward;
  }

  // Format info: EC Level L (01) + Mask 0 (000) = 0b01000 -> with BCH + Mask 0x5412 = 0x77c4 (0b111011111000100)
  const formatBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    // Around Top-Left
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Around Top-Right and Bottom-Left
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

/**
 * Generates an SVG path string from a QR matrix
 */
export function generateQrSvgPath(matrix: boolean[][]): string {
  let path = '';
  const size = matrix.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }
  return path;
}
