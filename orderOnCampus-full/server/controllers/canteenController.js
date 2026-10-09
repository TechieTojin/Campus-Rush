const Canteen = require('../model/canteen.model');
const MenuItem = require('../model/menuItem.model')
const Staff = require('../model/staff.model');
const Setting = require('../model/setting.model');
const realtime = require('../lib/realtime');
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Fields students may see. Orders, admin notes and audit details stay private.
const PUBLIC_FIELDS = '-orders -statusReason -createdByAdmin';
// Discovery shows active canteens only (documents created before `status` existed count as active).
const DISCOVERABLE = { status: { $nin: ['pending', 'suspended', 'rejected'] } };

// Register canteen (runs after verifyToken). A staff account sets up exactly one canteen, which it then owns;
// it can never attach itself to an existing canteen. New canteens wait for admin approval when the
// platform requires it.
exports.registerCanteen = async (req, res) => {
    const staff = res.locals.user;
    try {
        if (staff.ownedCanteens.length > 0) {
            return res.status(409).json({ message: 'This account already manages a canteen' });
        }
        // Accounts created by an admin are assigned canteens by admins; they can't register their own.
        if (staff.createdByAdmin) {
            return res.status(403).json({ message: 'Your canteen access is managed by Campus Rush. Ask an administrator to assign you a canteen.' });
        }
        if (!(await Setting.get()).onboarding?.staffSignupEnabled) {
            return res.status(403).json({ message: 'New canteen registrations are closed. Ask a Campus Rush administrator.' });
        }
        const name = str(req.body.canteenName, 60);
        const location = str(req.body.location, 120);
        const canteenDescription = str(req.body.canteenDescription, 500);
        const category = str(req.body.category, 40);
        if (name.length < 3) return res.status(400).json({ message: 'Canteen name must be at least 3 characters' });
        if (location.length < 3) return res.status(400).json({ message: 'Location must be at least 3 characters' });
        if (!category) return res.status(400).json({ message: 'Choose a canteen type' });

        const settings = await Setting.get();
        const status = settings.onboarding?.requireCanteenApproval ? 'pending' : 'active';
        const canteen = await Canteen.create({ name, location, canteenDescription, category, openStatus: false, menu: [], orders: [], menuCategories: [], status, statusChangedAt: new Date() });
        await Staff.updateOne({ _id: staff._id, ownedCanteens: { $size: 0 } }, { $push: { ownedCanteens: canteen._id } });
        const fresh = await Staff.findById(staff._id);
        if (!fresh.ownedCanteens.some(id => id.equals(canteen._id))) {
            await Canteen.deleteOne({ _id: canteen._id });
            return res.status(409).json({ message: 'This account already manages a canteen' });
        }
        realtime.emit('canteen.updated', { canteenId: String(canteen._id) }, { admin: true });
        res.status(201).json({ message: 'Canteen created successfully', data: { _id: canteen._id, name: canteen.name, status } });
    } catch (error) {
        console.error('Canteen registration failed:', error);
        res.status(500).json({ message: 'Could not create the canteen' });
    }
};
//get canteens
exports.getAllCanteens = async (req, res) => {
    try {
        const canteens = await Canteen.find(DISCOVERABLE).select(PUBLIC_FIELDS).populate('menu');
        res.send({ status: "ok", data: canteens })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get canteen by id
// Suspended canteens are still returned (with their status) so a student who opens one from favorites
// or an old cart sees that it is unavailable; pending and rejected canteens are not public at all.
exports.getcanteenById = async (req, res) => {
    const {canteenID} = req.params
    if (!/^[0-9a-fA-F]{24}$/.test(canteenID || '')) return res.status(404).json({ message: 'Canteen not found' });
    try {
        const canteen = await Canteen.findOne({ _id: canteenID, status: { $nin: ['pending', 'rejected'] } }).select(PUBLIC_FIELDS).populate('menu')
        if (!canteen) return res.status(404).json({ message: 'Canteen not found' });
        res.send({ status: "ok", data: canteen })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get menu by id
exports.getMenuById = async (req, res) => {
    const { itemId } = req.params
    if (!/^[0-9a-fA-F]{24}$/.test(itemId || '')) return res.status(404).json({ message: 'Item not found' });
    try {
        const item = await MenuItem.findOne({ _id: itemId, archived: { $ne: true } })
        res.send({ status: "ok", data: item })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}
