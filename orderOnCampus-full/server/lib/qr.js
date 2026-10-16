// Minimal QR Code encoder (byte mode, error-correction level M) and PNG writer.
//
// WHY THIS EXISTS INSTEAD OF A LIBRARY
// The student app has to show a scannable QR code. The usual route — react-native-qrcode-svg —
// drags in react-native-svg, and Expo SDK 49 expects 13.9.0 while the tree already carries a
// transitive 14.1.0, so that would mean pinning a native module and risking the whole app build.
// Generating the code on the server and sending a PNG data URI instead means the app renders it
// with a plain <Image> and gains no dependency at all. Node's built-in zlib writes the PNG, so
// the server gains none either.
//
// Correctness is not taken on trust: server/tests/qr.test.js round-trips the output of this
// encoder through the jsQR decoder the canteen portal uses, including every mask pattern.
//
// Covers versions 1-10 at level M, which is far more than the ~65-byte pickup payload needs.
// Spec reference: ISO/IEC 18004. Only byte mode is implemented.
const zlib = require('zlib');

// ---------------------------------------------------------------- tables (level M, versions 1-10)

// [ecCodewordsPerBlock, [ [blockCount, dataCodewordsPerBlock], ... ] ]
const EC_M = {
    1: [10, [[1, 16]]],
    2: [16, [[1, 28]]],
    3: [26, [[1, 44]]],
    4: [18, [[2, 32]]],
    5: [24, [[2, 43]]],
    6: [16, [[4, 27]]],
    7: [18, [[4, 31]]],
    8: [22, [[2, 38], [2, 39]]],
    9: [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]],
};

const ALIGNMENT = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

// Bits left over after the data region, per version.
const REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

const dataCapacity = (version) => {
    const [, groups] = EC_M[version];
    return groups.reduce((sum, [count, data]) => sum + count * data, 0);
};

// ---------------------------------------------------------------- GF(256) for Reed-Solomon

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d; // primitive polynomial
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

// Generator polynomial for `degree` error-correction codewords: (x-a^0)(x-a^1)...(x-a^(n-1)).
// Built constant-term-first, then reversed, because the division loop below indexes it
// leading-coefficient-first (gen[0] === 1).
function generatorPoly(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
        const next = new Array(poly.length + 1).fill(0);
        for (let j = 0; j < poly.length; j++) {
            next[j] ^= gfMul(poly[j], EXP[i]);
            next[j + 1] ^= poly[j];
        }
        poly = next;
    }
    return poly.reverse();
}

function ecCodewords(data, degree) {
    const gen = generatorPoly(degree);
    const result = new Array(degree).fill(0);
    for (const byte of data) {
        const factor = byte ^ result[0];
        result.shift();
        result.push(0);
        for (let i = 0; i < degree; i++) result[i] ^= gfMul(gen[i + 1], factor);
    }
    return result;
}

// ---------------------------------------------------------------- bit stream

class Bits {
    constructor() { this.bits = []; }
    push(value, length) {
        for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
    }
    get length() { return this.bits.length; }
    toBytes() {
        const bytes = [];
        for (let i = 0; i < this.bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] || 0);
            bytes.push(byte);
        }
        return bytes;
    }
}

function chooseVersion(byteLength) {
    for (let v = 1; v <= 10; v++) {
        const countBits = v < 10 ? 8 : 16;
        const needed = 4 + countBits + byteLength * 8;
        if (needed <= dataCapacity(v) * 8) return v;
    }
    throw new Error('QR payload too large for version 10 at EC level M');
}

function buildCodewords(bytes, version) {
    const capacity = dataCapacity(version);
    const stream = new Bits();
    stream.push(0b0100, 4);                       // byte mode
    stream.push(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) stream.push(b, 8);

    // Terminator, then pad to a byte boundary, then alternating pad bytes.
    const capacityBits = capacity * 8;
    const terminator = Math.min(4, capacityBits - stream.length);
    if (terminator > 0) stream.push(0, terminator);
    while (stream.length % 8 !== 0) stream.push(0, 1);
    const data = stream.toBytes();
    const PADS = [0xec, 0x11];
    let p = 0;
    while (data.length < capacity) data.push(PADS[p++ % 2]);

    // Split into blocks, compute EC for each, then interleave.
    const [ecPerBlock, groups] = EC_M[version];
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    for (const [blockCount, dataPerBlock] of groups) {
        for (let i = 0; i < blockCount; i++) {
            const block = data.slice(offset, offset + dataPerBlock);
            offset += dataPerBlock;
            dataBlocks.push(block);
            ecBlocks.push(ecCodewords(block, ecPerBlock));
        }
    }
    const result = [];
    const maxData = Math.max(...dataBlocks.map(b => b.length));
    for (let i = 0; i < maxData; i++) {
        for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecPerBlock; i++) {
        for (const block of ecBlocks) result.push(block[i]);
    }
    return result;
}

// ---------------------------------------------------------------- matrix

const FINDER = [
    [1, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 0, 1], [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1],
];

function emptyMatrix(size) {
    return {
        size,
        modules: Array.from({ length: size }, () => new Array(size).fill(0)),
        reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
    };
}

function placeFunctionPatterns(m, version) {
    const { size } = m;
    const setArea = (top, left, grid) => {
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const y = top + r;
                const x = left + c;
                if (y < 0 || x < 0 || y >= size || x >= size) continue;
                m.modules[y][x] = grid[r][c];
                m.reserved[y][x] = true;
            }
        }
    };
    // Finder patterns with their separators.
    for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]]) setArea(top, left, FINDER);
    const blank = (top, left, h, w) => {
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
            const y = top + r; const x = left + c;
            if (y >= 0 && x >= 0 && y < size && x < size && !m.reserved[y][x]) { m.modules[y][x] = 0; m.reserved[y][x] = true; }
        }
    };
    blank(7, 0, 1, 8); blank(0, 7, 8, 1);
    blank(7, size - 8, 1, 8); blank(0, size - 8, 8, 1);
    blank(size - 8, 0, 1, 8); blank(size - 8, 7, 8, 1);

    // Timing patterns.
    for (let i = 8; i < size - 8; i++) {
        if (!m.reserved[6][i]) { m.modules[6][i] = i % 2 === 0 ? 1 : 0; m.reserved[6][i] = true; }
        if (!m.reserved[i][6]) { m.modules[i][6] = i % 2 === 0 ? 1 : 0; m.reserved[i][6] = true; }
    }

    // Alignment patterns, skipping the three finder corners.
    const centers = ALIGNMENT[version];
    for (const cy of centers) {
        for (const cx of centers) {
            const nearFinder = (cy <= 8 && cx <= 8) || (cy <= 8 && cx >= size - 9) || (cy >= size - 9 && cx <= 8);
            if (nearFinder) continue;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const on = Math.max(Math.abs(dy), Math.abs(dx)) !== 1;
                    m.modules[cy + dy][cx + dx] = on ? 1 : 0;
                    m.reserved[cy + dy][cx + dx] = true;
                }
            }
        }
    }

    // Dark module.
    m.modules[size - 8][8] = 1;
    m.reserved[size - 8][8] = true;

    // Reserve the format-information areas.
    for (let i = 0; i < 9; i++) {
        if (!m.reserved[8][i]) { m.reserved[8][i] = true; m.modules[8][i] = 0; }
        if (!m.reserved[i][8]) { m.reserved[i][8] = true; m.modules[i][8] = 0; }
    }
    for (let i = 0; i < 8; i++) {
        if (!m.reserved[8][size - 1 - i]) { m.reserved[8][size - 1 - i] = true; m.modules[8][size - 1 - i] = 0; }
        if (!m.reserved[size - 1 - i][8]) { m.reserved[size - 1 - i][8] = true; m.modules[size - 1 - i][8] = 0; }
    }

    // Version information for version 7 and above.
    if (version >= 7) {
        const bits = versionBits(version);
        for (let i = 0; i < 18; i++) {
            const bit = (bits >> i) & 1;
            const r = Math.floor(i / 3);
            const c = i % 3;
            m.modules[r][size - 11 + c] = bit; m.reserved[r][size - 11 + c] = true;
            m.modules[size - 11 + c][r] = bit; m.reserved[size - 11 + c][r] = true;
        }
    }
}

function versionBits(version) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    return ((version << 12) | rem) >>> 0;
}

function placeData(m, codewords) {
    const { size } = m;
    const bits = [];
    for (const byte of codewords) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);

    let index = 0;
    let upward = true;
    for (let right = size - 1; right > 0; right -= 2) {
        if (right === 6) right = 5; // skip the vertical timing column
        for (let step = 0; step < size; step++) {
            const y = upward ? size - 1 - step : step;
            for (const x of [right, right - 1]) {
                if (m.reserved[y][x]) continue;
                m.modules[y][x] = index < bits.length ? bits[index] : 0;
                index++;
            }
        }
        upward = !upward;
    }
}

const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(m, maskIndex) {
    const masked = emptyMatrix(m.size);
    for (let r = 0; r < m.size; r++) {
        for (let c = 0; c < m.size; c++) {
            masked.reserved[r][c] = m.reserved[r][c];
            masked.modules[r][c] = m.reserved[r][c]
                ? m.modules[r][c]
                : (MASKS[maskIndex](r, c) ? m.modules[r][c] ^ 1 : m.modules[r][c]);
        }
    }
    return masked;
}

// Format information: 2 bits EC level (M = 00) + 3 bits mask, BCH(15,5), XORed with 0x5412.
function formatBits(maskIndex) {
    const data = (0b00 << 3) | maskIndex;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    return (((data << 10) | rem) ^ 0x5412) >>> 0;
}

function placeFormat(m, maskIndex) {
    const bits = formatBits(maskIndex);
    const { size } = m;
    // Format bits are laid out most-significant first: position 0 carries bit 14, not bit 0.
    // Getting this backwards produces a symbol that looks perfectly well formed and decodes
    // in nothing, so it is worth stating plainly.
    const get = (i) => (bits >> (14 - i)) & 1;
    // Around the top-left finder.
    for (let i = 0; i <= 5; i++) m.modules[8][i] = get(i);
    m.modules[8][7] = get(6);
    m.modules[8][8] = get(7);
    m.modules[7][8] = get(8);
    for (let i = 9; i <= 14; i++) m.modules[14 - i][8] = get(i);
    // Mirrored copy: bits 0-6 run up the left column beside the bottom-left finder, bits 7-14
    // run along row 8 beside the top-right finder. The split is 7/8, not 8/7 — getting that
    // wrong puts bit 7 on top of the dark module and nothing will scan.
    for (let i = 0; i <= 6; i++) m.modules[size - 1 - i][8] = get(i);
    for (let i = 7; i <= 14; i++) m.modules[8][size - 15 + i] = get(i);
    m.modules[size - 8][8] = 1; // dark module stays set
}

// Standard penalty rules, used to pick the mask that scans most reliably.
function penalty(m) {
    const { size, modules } = m;
    let score = 0;
    const runScore = (run) => (run >= 5 ? 3 + (run - 5) : 0);

    for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
            if (modules[r][c] === modules[r][c - 1]) run++;
            else { score += runScore(run); run = 1; }
        }
        score += runScore(run);
    }
    for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
            if (modules[r][c] === modules[r - 1][c]) run++;
            else { score += runScore(run); run = 1; }
        }
        score += runScore(run);
    }
    for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
            const v = modules[r][c];
            if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) score += 3;
        }
    }
    const PATTERN = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const matches = (get) => {
        let found = 0;
        for (let i = 0; i + PATTERN.length <= size; i++) {
            let ok = true;
            for (let j = 0; j < PATTERN.length; j++) if (get(i + j) !== PATTERN[j]) { ok = false; break; }
            if (ok) found++;
        }
        return found;
    };
    for (let r = 0; r < size; r++) score += 40 * matches((i) => modules[r][i]);
    for (let c = 0; c < size; c++) score += 40 * matches((i) => modules[i][c]);

    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += modules[r][c];
    const percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
}

// Returns a square matrix of 0/1 modules (no quiet zone).
function encodeMatrix(text, { forceMask } = {}) {
    const bytes = Buffer.from(String(text), 'utf8');
    const version = chooseVersion(bytes.length);
    const codewords = buildCodewords(bytes, version);

    const base = emptyMatrix(17 + 4 * version);
    placeFunctionPatterns(base, version);
    const withData = emptyMatrix(base.size);
    for (let r = 0; r < base.size; r++) for (let c = 0; c < base.size; c++) {
        withData.modules[r][c] = base.modules[r][c];
        withData.reserved[r][c] = base.reserved[r][c];
    }
    placeData(withData, codewords);
    // Remainder bits are already zero-filled by placeData.

    let best = null;
    const candidates = forceMask !== undefined ? [forceMask] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (const maskIndex of candidates) {
        const masked = applyMask(withData, maskIndex);
        placeFormat(masked, maskIndex);
        const score = penalty(masked);
        if (!best || score < best.score) best = { score, matrix: masked, maskIndex };
    }
    return { modules: best.matrix.modules, size: best.matrix.size, version, mask: best.maskIndex };
}

// ---------------------------------------------------------------- PNG

const crc32 = (() => {
    if (typeof zlib.crc32 === 'function') return (buf) => zlib.crc32(buf) >>> 0;
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c;
    }
    return (buf) => {
        let crc = -1;
        for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
        return (crc ^ -1) >>> 0;
    };
})();

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crcInput = Buffer.concat([head.subarray(4, 8), data]);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([head, data, tail]);
}

// 8-bit greyscale PNG, no interlacing. `scale` modules per pixel, `quiet` modules of margin.
function toPng(modules, { scale = 8, quiet = 4 } = {}) {
    const count = modules.length;
    const size = (count + quiet * 2) * scale;
    const raw = Buffer.alloc((size + 1) * size);
    for (let y = 0; y < size; y++) {
        const rowStart = y * (size + 1);
        raw[rowStart] = 0; // filter: none
        const moduleRow = Math.floor(y / scale) - quiet;
        for (let x = 0; x < size; x++) {
            const moduleCol = Math.floor(x / scale) - quiet;
            const dark = moduleRow >= 0 && moduleRow < count && moduleCol >= 0 && moduleCol < count
                && modules[moduleRow][moduleCol] === 1;
            raw[rowStart + 1 + x] = dark ? 0x00 : 0xff;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 0;  // colour type: greyscale
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

// Convenience: text -> `data:image/png;base64,...` ready for an <Image> source.
function toDataUri(text, options = {}) {
    const { modules } = encodeMatrix(text, options);
    return `data:image/png;base64,${toPng(modules, options).toString('base64')}`;
}

module.exports = { encodeMatrix, toPng, toDataUri, chooseVersion, dataCapacity, MASKS };
