const Canteen = require('../model/canteen.model');
const MenuItem = require('../model/menuItem.model')
const Staff = require('../model/staff.model');
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Register canteen (runs after verifyToken). A staff account sets up exactly one canteen, which it then owns;
// it can never attach itself to an existing canteen.
exports.registerCanteen = async (req, res) => {
    const staff = res.locals.user;
    try {
        if (staff.ownedCanteens.length > 0) {
            return res.status(409).json({ message: 'This account already manages a canteen' });
        }
        const name = str(req.body.canteenName, 60);
        const location = str(req.body.location, 120);
        const canteenDescription = str(req.body.canteenDescription, 500);
        const category = str(req.body.category, 40);
        if (name.length < 3) return res.status(400).json({ message: 'Canteen name must be at least 3 characters' });
        if (location.length < 3) return res.status(400).json({ message: 'Location must be at least 3 characters' });
        if (!category) return res.status(400).json({ message: 'Choose a canteen type' });

        const canteen = await Canteen.create({ name, location, canteenDescription, category, openStatus: false, menu: [], orders: [], menuCategories: [] });
        await Staff.updateOne({ _id: staff._id, ownedCanteens: { $size: 0 } }, { $push: { ownedCanteens: canteen._id } });
        const fresh = await Staff.findById(staff._id);
        if (!fresh.ownedCanteens.some(id => id.equals(canteen._id))) {
            await Canteen.deleteOne({ _id: canteen._id });
            return res.status(409).json({ message: 'This account already manages a canteen' });
        }
        res.status(201).json({ message: 'Canteen created successfully', data: { _id: canteen._id, name: canteen.name } });
    } catch (error) {
        console.error('Canteen registration failed:', error);
        res.status(500).json({ message: 'Could not create the canteen' });
    }
};
//get canteens
exports.getAllCanteens = async (req, res) => {
    try {
        const canteens = await Canteen.find().select('-orders').populate('menu');
        // console.log(canteens)
        res.send({ status: "ok", data: canteens })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get canteen by id
exports.getcanteenById = async (req, res) => {
    const {canteenID} = req.params
    try {
        const canteen = await Canteen.findById(canteenID).select('-orders').populate('menu')
        res.send({ status: "ok", data: canteen })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

//get menu by id
exports.getMenuById = async (req, res) => {
    const { itemId } = req.params
    console.log(itemId)
    try {
        const item = await MenuItem.findOne({ _id: itemId, archived: { $ne: true } })
        res.send({ status: "ok", data: item })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}        