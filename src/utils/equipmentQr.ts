import { EquipmentItem } from '../types';

export interface EquipmentQrCodeResult {
  code: string;
  /** Relative URL path linking directly to the equipment's detail & calibration certification status page */
  path: string;
  /** Full URL encoded in the QR code (origin + path) */
  url: string;
  /** QR Version (1..10) per ISO/IEC 18004 */
  version: number;
  /** Number of modules per side (21 + (version - 1) * 4) */
  moduleCount: number;
  /** 2D boolean matrix where true = dark module, false = light module */
  matrix: boolean[][];
  /** Standalone SVG markup string for printing or embedding */
  svgMarkup: string;
  /** Data URL (`data:image/svg+xml;utf8,...`) for `<img src=... />` or download */
  svgDataUrl: string;
}

const DEFAULT_BASE_ORIGIN = 'https://labtech-nexus-lims.vercel.app';

export function getAppBaseOrigin(explicitOrigin?: string): string {
  if (explicitOrigin && explicitOrigin.trim()) {
    return explicitOrigin.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return DEFAULT_BASE_ORIGIN;
}

/**
 * Builds the canonical URL path that links directly to an equipment item's
 * unique detail and calibration certification status page.
 * Example: `/equipment/LT-KM-04/cert`
 */
export function buildEquipmentCertStatusPath(equipmentCode: string): string {
  const normalized = (equipmentCode || '').trim().toUpperCase();
  return `/equipment/${encodeURIComponent(normalized)}/cert`;
}

/**
 * Builds the full URL encoded inside the equipment's QR code.
 * Example: `https://labtech-nexus-lims.vercel.app/equipment/LT-KM-04/cert`
 */
export function buildEquipmentQrUrl(equipmentCode: string, baseOrigin?: string): string {
  const origin = getAppBaseOrigin(baseOrigin);
  const path = buildEquipmentCertStatusPath(equipmentCode);
  return `${origin}${path}`;
}

/**
 * Extracts an equipment code from a direct URL, pathname, hash route, query string, or QR payload.
 * Supports:
 * - `/equipment/LT-KM-04/cert`
 * - `/equipment/LT-KM-04`
 * - `https://.../equipment/LT-KM-04/cert`
 * - `#/equipment/LT-KM-04/cert`
 * - `?eq=LT-KM-04` or `?equipment=LT-KM-04`
 * - `LABTECH:EQ:LT-KM-04`
 */
export function parseEquipmentCodeFromUrl(rawUrlOrPath: string): string | null {
  const raw = (rawUrlOrPath || '').trim();
  if (!raw) return null;

  // 1. Check path pattern `/equipment/:code/cert` or `/equipment/:code`
  const pathMatch = raw.match(/\/equipment\/([A-Za-z0-9%-]+?)(?:\/cert|\/status|\/)?(?:[?#].*)?$/i);
  if (pathMatch && pathMatch[1]) {
    try {
      return decodeURIComponent(pathMatch[1]).trim().toUpperCase();
    } catch {
      return pathMatch[1].trim().toUpperCase();
    }
  }

  // 2. Check query parameter `?eq=LT-KM-04` or `?equipment=LT-KM-04`
  const queryMatch = raw.match(/[?&](?:eq|equipment)=([A-Za-z0-9%-]+)/i);
  if (queryMatch && queryMatch[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim().toUpperCase();
    } catch {
      return queryMatch[1].trim().toUpperCase();
    }
  }

  // 3. Check legacy QR prefix `LABTECH:EQ:LT-KM-04`
  if (raw.toUpperCase().startsWith('LABTECH:EQ:')) {
    const token = raw.slice('LABTECH:EQ:'.length).split('|')[0].trim();
    if (token) return token.toUpperCase();
  }

  return null;
}

// ============================================================================
// ISO/IEC 18004 QR Code Encoder (Byte Mode, Error Correction Level L)
// Supports Versions 1 to 10 (up to 271 UTF-8 bytes — plenty for any URL)
// ============================================================================

interface VersionSpec {
  version: number;
  totalCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocksGroup1: number;
  dataCodewordsGroup1: number;
  numBlocksGroup2: number;
  dataCodewordsGroup2: number;
  alignmentCenters: number[];
}

// ISO/IEC 18004 Table 9 — Error Correction Level L (7% recovery) specifications for Versions 1..10
const VERSION_SPECS_L: VersionSpec[] = [
  { version: 1, totalCodewords: 26, ecCodewordsPerBlock: 7, numBlocksGroup1: 1, dataCodewordsGroup1: 19, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [] },
  { version: 2, totalCodewords: 44, ecCodewordsPerBlock: 10, numBlocksGroup1: 1, dataCodewordsGroup1: 34, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 18] },
  { version: 3, totalCodewords: 70, ecCodewordsPerBlock: 15, numBlocksGroup1: 1, dataCodewordsGroup1: 55, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22] },
  { version: 4, totalCodewords: 100, ecCodewordsPerBlock: 20, numBlocksGroup1: 1, dataCodewordsGroup1: 80, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26] },
  { version: 5, totalCodewords: 134, ecCodewordsPerBlock: 26, numBlocksGroup1: 1, dataCodewordsGroup1: 108, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 30] },
  { version: 6, totalCodewords: 172, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 34] },
  { version: 7, totalCodewords: 196, ecCodewordsPerBlock: 20, numBlocksGroup1: 2, dataCodewordsGroup1: 78, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 22, 38] },
  { version: 8, totalCodewords: 242, ecCodewordsPerBlock: 24, numBlocksGroup1: 2, dataCodewordsGroup1: 97, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 24, 42] },
  { version: 9, totalCodewords: 292, ecCodewordsPerBlock: 30, numBlocksGroup1: 2, dataCodewordsGroup1: 116, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCenters: [6, 26, 46] },
  { version: 10, totalCodewords: 346, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 2, dataCodewordsGroup2: 69, alignmentCenters: [6, 28, 50] },
];

// GF(256) log / exp tables with primitive polynomial 0x11d
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

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildReedSolomonDivisor(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly.slice(1);
}

function computeReedSolomonRemainder(data: Uint8Array, degree: number): Uint8Array {
  const divisor = buildReedSolomonDivisor(degree);
  const result = new Uint8Array(degree);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[degree - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < degree; j++) {
        result[j] ^= gfMul(divisor[j], factor);
      }
    }
  }
  return result;
}

function utf8Bytes(text: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text);
  }
  const arr: number[] = [];
  for (let i = 0; i < text.length; i++) {
    arr.push(text.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(arr);
}

function selectVersionSpec(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS_L) {
    const totalDataCap =
      spec.numBlocksGroup1 * spec.dataCodewordsGroup1 +
      spec.numBlocksGroup2 * spec.dataCodewordsGroup2;
    const countBits = spec.version <= 9 ? 8 : 16;
    const availableBytes = Math.floor((totalDataCap * 8 - 4 - countBits) / 8);
    if (byteLength <= availableBytes) return spec;
  }
  return VERSION_SPECS_L[VERSION_SPECS_L.length - 1];
}

function buildCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const totalDataCodewords =
    spec.numBlocksGroup1 * spec.dataCodewordsGroup1 +
    spec.numBlocksGroup2 * spec.dataCodewordsGroup2;

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator = 0100
  pushBits(0b0100, 4);
  const charCountBits = spec.version <= 9 ? 8 : 16;
  const clampedBytes = bytes.slice(0, totalDataCodewords - 3);
  pushBits(clampedBytes.length, charCountBits);
  for (let i = 0; i < clampedBytes.length; i++) {
    pushBits(clampedBytes[i], 8);
  }

  // Terminator up to 4 zero bits
  const maxDataBits = totalDataCodewords * 8;
  const termLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(totalDataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = b;
  }

  // Pad remaining codewords with alternating 0xEC, 0x11
  let padIdx = 0;
  for (let i = bits.length / 8; i < totalDataCodewords; i++) {
    dataBytes[i] = padIdx % 2 === 0 ? 0xec : 0x11;
    padIdx++;
  }

  // Split into blocks and compute Reed-Solomon EC blocks
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let b = 0; b < spec.numBlocksGroup1; b++) {
    const block = dataBytes.slice(offset, offset + spec.dataCodewordsGroup1);
    offset += spec.dataCodewordsGroup1;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }
  for (let b = 0; b < spec.numBlocksGroup2; b++) {
    const block = dataBytes.slice(offset, offset + spec.dataCodewordsGroup2);
    offset += spec.dataCodewordsGroup2;
    dataBlocks.push(block);
    ecBlocks.push(computeReedSolomonRemainder(block, spec.ecCodewordsPerBlock));
  }

  // Interleave data codewords, then EC codewords
  const interleaved: number[] = [];
  const maxDataBlockLen = Math.max(spec.dataCodewordsGroup1, spec.dataCodewordsGroup2);
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }

  return new Uint8Array(interleaved);
}

function computeFormatBits(ecLevelBits: number, mask: number): number {
  const data = (ecLevelBits << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) {
    rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  }
  return (version << 12) | rem;
}

/**
 * Generates a real, ISO/IEC 18004 standards-compliant QR Code matrix for any URL or text.
 */
export function encodeIsoQrMatrix(text: string): {
  version: number;
  size: number;
  matrix: boolean[][];
} {
  const bytes = utf8Bytes(text || DEFAULT_BASE_ORIGIN);
  const spec = selectVersionSpec(bytes.length);
  const version = spec.version;
  const size = 21 + (version - 1) * 4;

  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    modules[r][c] = dark;
    isFunction[r][c] = true;
  };

  // 1. Finder patterns + 1-module white separators
  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuterBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const inRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, !inOuterBorder && (inRing || inCenter));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Timing patterns along row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // 3. Alignment patterns (Version >= 2)
  const centers = spec.alignmentCenters;
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      // Skip corners overlapping with the 3 finder patterns
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = centers[i];
      const cc = centers[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunctionModule(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // 4. Dark module & reserve format information areas
  setFunctionModule(4 * version + 9, 8, true);

  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  if (version >= 7) {
    const vBits = computeVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, bit);
      setFunctionModule(b, a, bit);
    }
  }

  // 5. Place data + EC codewords in upward/downward 2-column zigzag
  const codewords = buildCodewords(bytes, spec);
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // Skip vertical timing column
    const upward = ((right + 1) & 2) === 0;
    for (let v = 0; v < size; v++) {
      const r = upward ? size - 1 - v : v;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            dark = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
            bitIdx++;
          }
          modules[r][c] = dark;
        }
      }
    }
  }

  // 6. Apply Mask 0 ((r + c) % 2 === 0) and write corresponding Format Information bits
  // EC Level L indicator in Format Info is 01 (binary 1)
  const maskPattern = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  const formatBits = computeFormatBits(0b01, maskPattern);
  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, ((formatBits >>> i) & 1) !== 0);
  setFunctionModule(8, 7, ((formatBits >>> 6) & 1) !== 0);
  setFunctionModule(8, 8, ((formatBits >>> 7) & 1) !== 0);
  setFunctionModule(7, 8, ((formatBits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, ((formatBits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i++) setFunctionModule(size - 1 - i, 8, ((formatBits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunctionModule(8, size - 15 + i, ((formatBits >>> i) & 1) !== 0);

  return { version, size, matrix: modules };
}

/**
 * Renders a QR matrix into crisp, scalable SVG markup with a quiet zone.
 */
export function renderQrMatrixToSvg(
  matrix: boolean[][],
  options?: { sizePx?: number; marginModules?: number; darkColor?: string; lightColor?: string; title?: string }
): string {
  const n = matrix.length;
  const margin = options?.marginModules ?? 2;
  const sizePx = options?.sizePx ?? 180;
  const darkColor = options?.darkColor ?? '#0f172a';
  const lightColor = options?.lightColor ?? '#ffffff';
  const totalModules = n + margin * 2;

  const pathParts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        pathParts.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }

  const safeTitle = (options?.title || 'Equipment QR Code').replace(/[<>&"]/g, '');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="${safeTitle}">`,
    `<title>${safeTitle}</title>`,
    `<rect width="100%" height="100%" fill="${lightColor}"/>`,
    `<path d="${pathParts.join('')}" fill="${darkColor}"/>`,
    `</svg>`,
  ].join('');
}

/**
 * Primary utility to generate a QR code for a single piece of equipment.
 * Encodes the direct URL path (`/equipment/<CODE>/cert`) to that equipment's
 * unique detail and calibration certification status page.
 */
export function generateEquipmentQrCode(
  equipmentOrCode: EquipmentItem | string,
  options?: { baseOrigin?: string; sizePx?: number; marginModules?: number }
): EquipmentQrCodeResult {
  const rawCode = typeof equipmentOrCode === 'string' ? equipmentOrCode : equipmentOrCode.code;
  const code = (rawCode || '').trim().toUpperCase();
  const path = buildEquipmentCertStatusPath(code);
  const url = buildEquipmentQrUrl(code, options?.baseOrigin);
  const { version, size, matrix } = encodeIsoQrMatrix(url);
  const svgMarkup = renderQrMatrixToSvg(matrix, {
    sizePx: options?.sizePx ?? 180,
    marginModules: options?.marginModules ?? 2,
    title: `${code} Calibration Status QR (${path})`,
  });
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

  return {
    code,
    path,
    url,
    version,
    moduleCount: size,
    matrix,
    svgMarkup,
    svgDataUrl,
  };
}

/**
 * Batch utility to generate QR codes for all equipment in the inventory.
 */
export function generateAllEquipmentQrCodes(
  equipmentList: EquipmentItem[],
  options?: { baseOrigin?: string; includeInactive?: boolean }
): EquipmentQrCodeResult[] {
  const list = options?.includeInactive
    ? equipmentList
    : equipmentList.filter((e) => e.inUse !== 'N');
  return list.map((item) => generateEquipmentQrCode(item, { baseOrigin: options?.baseOrigin }));
}

export const EQUIPMENT_ROUTE_EVENT = 'labtech:eq-route-change';

/**
 * Navigates the browser URL bar to `/equipment/<CODE>/cert` and triggers the
 * dedicated Equipment Detail & Calibration Certification Status Page.
 */
export function navigateToEquipmentCertPage(equipmentCode: string): void {
  const path = buildEquipmentCertStatusPath(equipmentCode);
  if (typeof window !== 'undefined') {
    try {
      window.history.pushState({ equipmentCode }, '', path);
      window.dispatchEvent(
        new CustomEvent(EQUIPMENT_ROUTE_EVENT, { detail: { code: equipmentCode.trim().toUpperCase() } })
      );
    } catch {}
  }
}

/**
 * Clears the `/equipment/<CODE>/cert` route and returns the URL bar to `/`.
 */
export function clearEquipmentCertRoute(): void {
  if (typeof window !== 'undefined') {
    try {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new CustomEvent(EQUIPMENT_ROUTE_EVENT, { detail: { code: null } }));
    } catch {}
  }
}

