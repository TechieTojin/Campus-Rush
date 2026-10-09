// Counts server errors (HTTP 5xx) for the admin system-health page. Records only method, route
// path and time — never request bodies, headers or stack traces.
const events = [];

exports.middleware = (req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode >= 500) {
            events.unshift({ at: new Date(), method: req.method, path: (req.route?.path ? req.baseUrl + req.route.path : req.path).slice(0, 120), status: res.statusCode });
            events.length = Math.min(events.length, 100);
        }
    });
    next();
};

exports.snapshot = () => {
    const hourAgo = Date.now() - 3600 * 1000;
    return { lastHour: events.filter((e) => e.at.getTime() > hourAgo).length, recent: events.slice(0, 10) };
};
