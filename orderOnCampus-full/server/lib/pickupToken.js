// Secure pickup tokens for the QR collection flow.
//
// THREAT MODEL. The order reference students already see (`#A1B2C3`) is just the tail of the
// MongoDB id: it is short, guessable from a neighbouring order and printed on every screen. It is
// fine as a human "call out the number" code and useless as a credential. A QR code that merely
// encoded the order id would let anyone who glanced at another student's screen — or who tried a
// few ids — collect someone else's food. So the QR carries a real secret instead.
//
// DESIGN
//   • 32 random bytes from crypto.randomBytes, base64url encoded (256 bits — unguessable).
//   • Paired with a random 16-hex lookup id so the QR never contains the order id, the student id
//     or any personal data, and the database lookup doesn't need the secret.
//   • Only sha256(secret) is stored. A dump of the orders collection cannot be replayed.
//   • Short lived (5 minutes) and re-issued on demand while the order is Ready.
//   • Single use: the collect step stamps consumedAt in the same atomic update that claims the
//     order, so two simultaneous scans cannot both succeed.
//
// KNOWN LIMITATION (documented, not solved here): a screenshot or photo of the QR stays valid for
// the rest of its 5-minute window, so a student could hand one to a friend. That is the same risk
// as handing over a paper token and is bounded by the short lifetime; a counter check of the order
// reference remains the human backstop. Binding the token to the device would need either a
// device-registration flow or rotating codes, neither of which exists in Campus Rush today.

const crypto = require('crypto');

const PREFIX = 'CRP1';
const TOKEN_BYTES = 32;
const TOKEN_ID_BYTES = 8;              // 16 hex characters
const TTL_MS = 5 * 60 * 1000;          // 5 minutes
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_ID_PATTERN = /^[0-9a-f]{16}$/;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Creates a fresh credential. Only `payload` ever leaves the server for the student; only
// `tokenId`, `tokenHash` and `expiresAt` are stored on the order.
function issue() {
    const tokenId = crypto.randomBytes(TOKEN_ID_BYTES).toString('hex');
    const secret = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + TTL_MS);
    return {
        tokenId,
        secret,
        tokenHash: sha256(secret),
        expiresAt,
        payload: `${PREFIX}.${tokenId}.${secret}`,
        ttlMs: TTL_MS,
    };
}

// Parses what a scanner sent us. Returns null for anything malformed — never throws, and never
// logs the value.
function parse(payload) {
    if (typeof payload !== 'string') return null;
    const trimmed = payload.trim();
    if (trimmed.length > 200) return null;
    const parts = trimmed.split('.');
    if (parts.length !== 3) return null;
    const [prefix, tokenId, secret] = parts;
    if (prefix !== PREFIX) return null;
    if (!TOKEN_ID_PATTERN.test(tokenId)) return null;
    if (!SECRET_PATTERN.test(secret)) return null;
    return { tokenId, secret };
}

// Constant-time comparison so a scanner can't probe the hash byte by byte.
function matches(secret, storedHash) {
    if (typeof storedHash !== 'string' || storedHash.length !== 64) return false;
    const candidate = Buffer.from(sha256(secret), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    if (candidate.length !== stored.length) return false;
    return crypto.timingSafeEqual(candidate, stored);
}

const isExpired = (expiresAt) => !expiresAt || new Date(expiresAt).getTime() <= Date.now();

module.exports = { PREFIX, TTL_MS, issue, parse, matches, isExpired, sha256 };
