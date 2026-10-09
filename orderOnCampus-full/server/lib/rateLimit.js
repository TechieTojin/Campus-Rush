// Small in-memory fixed-window rate limiter (single-process development server).
// Production with several instances would need a shared store such as Redis.
const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
}, 60000).unref();

// key(req) decides what is counted together, e.g. IP + submitted email for logins.
// failuresOnly: only responses with status >= 400 count, so successful sign-ins never lock anyone out.
module.exports = ({ windowMs, max, key = (req) => req.ip, failuresOnly = false, message = 'Too many attempts. Please wait a few minutes and try again.' }) =>
  (req, res, next) => {
    const id = `${req.baseUrl}${req.path}|${key(req)}`;
    const now = Date.now();
    let b = buckets.get(id);
    if (!b || b.reset < now) { b = { count: 0, reset: now + windowMs }; buckets.set(id, b); }
    if (b.count >= max) {
      res.setHeader('Retry-After', Math.ceil((b.reset - now) / 1000));
      return res.status(429).json({ message });
    }
    if (failuresOnly) res.on('finish', () => { if (res.statusCode >= 400) b.count += 1; });
    else b.count += 1;
    return next();
  };

module.exports.emailKey = (req) => `${req.ip}|${String(req.body?.email || '').trim().toLowerCase()}`;
