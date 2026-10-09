// Announcements, student-app banners, platform settings and the public app-config endpoints.
const { Announcement, Banner, Setting, Canteen } = require('../lib/models');
const realtime = require('../lib/realtime');
const { isValidImagePath } = require('./uploadController');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const EMAIL = /^[\w.+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
const fail = (res, status, message) => res.status(status).json({ message });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : undefined);
const DISCOVERABLE = { status: { $nin: ['pending', 'suspended', 'rejected'] } };

const parseDate = (v) => {
    if (v === null || v === '') return { value: null };
    if (v === undefined) return {};
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? { error: true } : { value: d };
};

const live = (now = new Date()) => ({
    active: true,
    $and: [
        { $or: [{ startsAt: null }, { startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $exists: false } }, { endsAt: { $gt: now } }] },
    ],
});

// ================================================================= announcements

const announcementTargets = (a) => ({
    admin: true,
    students: a.audience === 'students' || a.audience === 'all',
    allCanteens: (a.audience === 'canteens' || a.audience === 'all') && !a.canteen,
    canteen: (a.audience === 'canteens' || a.audience === 'all') && a.canteen ? String(a.canteen) : undefined,
});

const parseAnnouncement = async (b, partial) => {
    const data = {};
    if (!partial || b.title !== undefined) {
        const title = str(b.title, 100) || '';
        if (title.length < 3 || title.length > 100) return { error: 'Title must be 3–100 characters' };
        data.title = title;
    }
    if (!partial || b.body !== undefined) {
        const body = str(b.body, 1000) || '';
        if (body.length < 3 || body.length > 1000) return { error: 'Message must be 3–1000 characters' };
        data.body = body;
    }
    if (!partial || b.audience !== undefined) {
        if (!['students', 'canteens', 'all'].includes(b.audience)) return { error: 'Choose who should see this' };
        data.audience = b.audience;
    }
    if (b.canteen !== undefined) {
        if (b.canteen === null || b.canteen === '') data.canteen = null;
        else if (!OBJECT_ID.test(b.canteen) || !(await Canteen.exists({ _id: b.canteen }))) return { error: 'Unknown canteen' };
        else data.canteen = b.canteen;
    }
    if (b.tone !== undefined) {
        if (!['info', 'success', 'warning', 'critical'].includes(b.tone)) return { error: 'Unknown style' };
        data.tone = b.tone;
    }
    if (b.active !== undefined) {
        if (typeof b.active !== 'boolean') return { error: 'active must be true or false' };
        data.active = b.active;
    }
    for (const f of ['startsAt', 'endsAt']) {
        const d = parseDate(b[f]);
        if (d.error) return { error: 'Enter valid dates' };
        if (d.value !== undefined) data[f] = d.value;
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) return { error: 'End must be after start' };
    return { data };
};

exports.listAnnouncements = async (req, res) => {
    const items = await Announcement.find().sort({ createdAt: -1 }).limit(200).populate('canteen', 'name').populate('createdBy', 'name').lean();
    const now = new Date();
    res.json({
        status: 'ok',
        data: items.map((a) => ({
            ...a,
            readBy: undefined,
            readCount: (a.readBy || []).length,
            live: a.active && (!a.startsAt || a.startsAt <= now) && (!a.endsAt || a.endsAt > now),
        })),
    });
};

exports.createAnnouncement = async (req, res) => {
    const { data, error } = await parseAnnouncement(req.body || {}, false);
    if (error) return fail(res, 400, error);
    if (data.audience === 'students') data.canteen = null;
    const a = await Announcement.create({ ...data, createdBy: res.locals.admin._id });
    realtime.emit('announcement.updated', { announcementId: String(a._id) }, announcementTargets(a));
    res.locals.auditOutcome = { announcementId: String(a._id) };
    res.status(201).json({ status: 'ok', data: a });
};

exports.updateAnnouncement = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Announcement not found');
    const a = await Announcement.findById(req.params.id);
    if (!a) return fail(res, 404, 'Announcement not found');
    const before = announcementTargets(a);
    const { data, error } = await parseAnnouncement(req.body || {}, true);
    if (error) return fail(res, 400, error);
    Object.assign(a, data);
    if (a.audience === 'students') a.canteen = null;
    await a.save();
    // Notify both the old and new audiences so the announcement disappears/appears correctly.
    realtime.emit('announcement.updated', { announcementId: String(a._id) }, before);
    realtime.emit('announcement.updated', { announcementId: String(a._id) }, announcementTargets(a));
    res.json({ status: 'ok', data: a });
};

// Students: announcements for students/all that are live now.
exports.studentAnnouncements = async (req, res) => {
    const items = await Announcement.find({ ...live(), audience: { $in: ['students', 'all'] } }, 'title body tone createdAt startsAt endsAt').sort({ createdAt: -1 }).limit(10).lean();
    res.json({ status: 'ok', data: items });
};

// Staff: announcements for canteens/all addressed to every canteen or to this one, with read state.
exports.staffAnnouncements = async (req, res) => {
    const canteen = res.locals.canteen;
    const staff = res.locals.user;
    const items = await Announcement.find({
        ...live(),
        audience: { $in: ['canteens', 'all'] },
        $or: [{ canteen: null }, { canteen: { $exists: false } }, { canteen: canteen._id }],
    }, 'title body tone createdAt readBy canteen').sort({ createdAt: -1 }).limit(20).lean();
    res.json({
        status: 'ok',
        data: items.map((a) => ({ _id: a._id, title: a.title, body: a.body, tone: a.tone, createdAt: a.createdAt, targeted: !!a.canteen, read: (a.readBy || []).some((id) => String(id) === String(staff._id)) })),
    });
};

exports.markAnnouncementRead = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Announcement not found');
    const canteen = res.locals.canteen;
    const r = await Announcement.updateOne(
        { _id: req.params.id, audience: { $in: ['canteens', 'all'] }, $or: [{ canteen: null }, { canteen: { $exists: false } }, { canteen: canteen._id }] },
        { $addToSet: { readBy: res.locals.user._id } }
    );
    if (!r.matchedCount) return fail(res, 404, 'Announcement not found');
    res.json({ status: 'ok' });
};

// ================================================================= banners

const parseBanner = async (b, partial) => {
    const data = {};
    if (!partial || b.title !== undefined) {
        const title = str(b.title, 60) || '';
        if (title.length < 2 || title.length > 60) return { error: 'Title must be 2–60 characters' };
        data.title = title;
    }
    if (b.subtitle !== undefined) {
        const s = str(b.subtitle, 120) || '';
        if (s.length > 120) return { error: 'Subtitle must be 120 characters or fewer' };
        data.subtitle = s;
    }
    if (b.image !== undefined) {
        if (!isValidImagePath(b.image)) return { error: 'Image was not uploaded correctly — upload it again' };
        data.image = b.image;
    }
    if (b.tone !== undefined) {
        if (!['brand', 'saffron', 'dark'].includes(b.tone)) return { error: 'Unknown style' };
        data.tone = b.tone;
    }
    if (b.target !== undefined) {
        const t = b.target || {};
        // Only in-app destinations: a canteen page or a search. No external links.
        if (t.type === 'canteen') {
            if (!OBJECT_ID.test(t.canteen || '') || !(await Canteen.exists({ _id: t.canteen, ...DISCOVERABLE }))) return { error: 'Choose an active canteen to link to' };
            data.target = { type: 'canteen', canteen: t.canteen, query: '' };
        } else if (t.type === 'search') {
            const q = str(t.query, 40) || '';
            if (q.length < 2 || q.length > 40 || !/^[\p{L}\p{N} &'-]+$/u.test(q)) return { error: 'Search text must be 2–40 letters or numbers' };
            data.target = { type: 'search', query: q, canteen: null };
        } else if (!t.type || t.type === 'none') {
            data.target = { type: 'none', canteen: null, query: '' };
        } else return { error: 'Unknown banner destination' };
    }
    if (b.active !== undefined) {
        if (typeof b.active !== 'boolean') return { error: 'active must be true or false' };
        data.active = b.active;
    }
    if (b.sortOrder !== undefined) {
        const n = Number(b.sortOrder);
        if (!Number.isInteger(n) || n < 0 || n > 999) return { error: 'Order must be 0–999' };
        data.sortOrder = n;
    }
    for (const f of ['startsAt', 'endsAt']) {
        const d = parseDate(b[f]);
        if (d.error) return { error: 'Enter valid dates' };
        if (d.value !== undefined) data[f] = d.value;
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) return { error: 'End must be after start' };
    return { data };
};

const emitContent = () => realtime.emit('content.updated', {}, { students: true, admin: true });

exports.listBanners = async (req, res) => {
    const items = await Banner.find().sort({ sortOrder: 1, createdAt: -1 }).populate('target.canteen', 'name status').lean();
    const now = new Date();
    res.json({ status: 'ok', data: items.map((b) => ({ ...b, live: b.active && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now) })) });
};

exports.createBanner = async (req, res) => {
    const { data, error } = await parseBanner(req.body || {}, false);
    if (error) return fail(res, 400, error);
    const b = await Banner.create({ ...data, createdBy: res.locals.admin._id });
    emitContent();
    res.locals.auditOutcome = { bannerId: String(b._id) };
    res.status(201).json({ status: 'ok', data: b });
};

exports.updateBanner = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Banner not found');
    const b = await Banner.findById(req.params.id);
    if (!b) return fail(res, 404, 'Banner not found');
    const { data, error } = await parseBanner(req.body || {}, true);
    if (error) return fail(res, 400, error);
    Object.assign(b, data);
    await b.save();
    emitContent();
    res.json({ status: 'ok', data: b });
};

exports.deleteBanner = async (req, res) => {
    if (!OBJECT_ID.test(req.params.id)) return fail(res, 404, 'Banner not found');
    const b = await Banner.findByIdAndDelete(req.params.id);
    if (!b) return fail(res, 404, 'Banner not found');
    emitContent();
    res.locals.auditOutcome = { title: b.title };
    res.json({ status: 'ok' });
};

// Student app: live banners whose canteen target is still discoverable.
exports.publicBanners = async (req, res) => {
    const items = await Banner.find(live(), 'title subtitle image target tone sortOrder').sort({ sortOrder: 1, createdAt: -1 }).limit(10).populate('target.canteen', 'name status').lean();
    res.json({
        status: 'ok',
        data: items
            .filter((b) => b.target?.type !== 'canteen' || (b.target.canteen && !['pending', 'suspended', 'rejected'].includes(b.target.canteen.status)))
            .map((b) => ({ _id: b._id, title: b.title, subtitle: b.subtitle, image: b.image, tone: b.tone, target: b.target?.type === 'canteen' ? { type: 'canteen', canteen: b.target.canteen._id, name: b.target.canteen.name } : b.target })),
    });
};

// ================================================================= settings

const settingsView = (s) => {
    const o = s.toObject();
    delete o.__v;
    return o;
};

exports.getSettings = async (req, res) => res.json({ status: 'ok', data: settingsView(await Setting.get()) });

// Partial update; every field is validated and only known fields are accepted.
exports.updateSettings = async (req, res) => {
    const b = req.body || {};
    const s = await Setting.findOne({ key: 'platform' }) || await Setting.create({ key: 'platform' });
    const before = settingsView(s);
    const bool = (v, label) => { if (typeof v !== 'boolean') throw new Error(`${label} must be on or off`); return v; };
    const text = (v, max, label) => { if (typeof v !== 'string' || v.trim().length > max) throw new Error(`${label} must be ${max} characters or fewer`); return v.trim(); };
    const int = (v, min, max, label) => { const n = Number(v); if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}`); return n; };
    try {
        if (b.platformName !== undefined) {
            const n = text(b.platformName, 40, 'Platform name');
            if (n.length < 2) throw new Error('Platform name must be at least 2 characters');
            s.platformName = n;
        }
        if (b.support) {
            if (b.support.email !== undefined) {
                const e = text(b.support.email, 120, 'Support email');
                if (e && !EMAIL.test(e)) throw new Error('Enter a valid support email');
                s.support.email = e;
            }
            if (b.support.phone !== undefined) {
                const p = text(b.support.phone, 20, 'Support phone');
                if (p && !/^[+\d][\d\s-]{6,18}$/.test(p)) throw new Error('Enter a valid support phone number');
                s.support.phone = p;
            }
            if (b.support.hours !== undefined) s.support.hours = text(b.support.hours, 80, 'Support hours');
        }
        if (b.maintenance) {
            if (b.maintenance.enabled !== undefined) s.maintenance.enabled = bool(b.maintenance.enabled, 'Maintenance mode');
            if (b.maintenance.message !== undefined) s.maintenance.message = text(b.maintenance.message, 200, 'Maintenance message');
        }
        if (b.ordering) {
            if (b.ordering.maxItemsPerOrder !== undefined) s.ordering.maxItemsPerOrder = int(b.ordering.maxItemsPerOrder, 1, 100, 'Items per order');
            if (b.ordering.maxQuantityPerItem !== undefined) s.ordering.maxQuantityPerItem = int(b.ordering.maxQuantityPerItem, 1, 50, 'Quantity per item');
        }
        if (b.onboarding) {
            if (b.onboarding.staffSignupEnabled !== undefined) s.onboarding.staffSignupEnabled = bool(b.onboarding.staffSignupEnabled, 'Canteen sign-up');
            if (b.onboarding.requireCanteenApproval !== undefined) s.onboarding.requireCanteenApproval = bool(b.onboarding.requireCanteenApproval, 'Approval requirement');
        }
        if (b.studentApp) {
            if (b.studentApp.showPopularItems !== undefined) s.studentApp.showPopularItems = bool(b.studentApp.showPopularItems, 'Popular items');
            if (b.studentApp.enableFavorites !== undefined) s.studentApp.enableFavorites = bool(b.studentApp.enableFavorites, 'Favorites');
            if (b.studentApp.featuredCanteens !== undefined) {
                const ids = b.studentApp.featuredCanteens;
                if (!Array.isArray(ids) || ids.length > 6 || ids.some((id) => !OBJECT_ID.test(id))) throw new Error('Choose up to 6 featured canteens');
                if ((await Canteen.countDocuments({ _id: { $in: ids }, ...DISCOVERABLE })) !== new Set(ids).size) throw new Error('Featured canteens must be active');
                s.studentApp.featuredCanteens = [...new Set(ids)];
            }
        }
    } catch (e) {
        return fail(res, 400, e.message);
    }
    s.updatedBy = res.locals.admin._id;
    await s.save();
    Setting.invalidate();
    res.locals.auditOutcome = { before: { maintenance: before.maintenance, ordering: before.ordering, onboarding: before.onboarding, studentApp: before.studentApp, support: before.support, platformName: before.platformName } };
    realtime.emit('config.updated', {}, { students: true, admin: true, allCanteens: true });
    res.json({ status: 'ok', data: settingsView(s) });
};

// Public subset for the student app (and canteen website). Only explicitly supported settings.
exports.publicConfig = async (req, res) => {
    const s = await Setting.get();
    const featured = s.studentApp?.featuredCanteens?.length
        ? (await Canteen.find({ _id: { $in: s.studentApp.featuredCanteens }, ...DISCOVERABLE }, '_id').lean()).map((c) => c._id)
        : [];
    res.json({
        status: 'ok',
        data: {
            platformName: s.platformName,
            support: s.support,
            maintenance: { enabled: !!s.maintenance?.enabled, message: s.maintenance?.message || '' },
            ordering: s.ordering,
            onboarding: { staffSignupEnabled: !!s.onboarding?.staffSignupEnabled },
            studentApp: { featuredCanteens: featured, showPopularItems: s.studentApp?.showPopularItems !== false, enableFavorites: s.studentApp?.enableFavorites !== false },
            updatedAt: s.updatedAt,
        },
    });
};
