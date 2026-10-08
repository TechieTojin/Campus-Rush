const Canteen = require('../model/canteen.model');
const MenuItem = require('../model/menuItem.model')
const Staff = require('../model/staff.model');
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET;
// Register canteen 
exports.registerCanteen = async (req, res) => {
    try {
        const { canteenName, location, canteenDescription, category, openingHours, menu } = req.body;
        const canteen = await Canteen.create({ name: canteenName, location, canteenDescription, category, openingHours, menu });
        const createdCanteenId = canteen._id;
        console.log("created ID", createdCanteenId);

        const token = req.cookies.token // Get the JWT token from the request cookies
        console.log(token)
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const user = jwt.verify(token, secretKey)
        const loggedUser = Staff.findOne({ _id: user._id }).then(async (userData) => {
            const staffId = userData._id;
            console.log("Staff Id is ", staffId)
            const updatedStaff = await Staff.findByIdAndUpdate(
                staffId,
                { $push: { ownedCanteens: createdCanteenId } },
                { new: true }
            );
        })
        res.status(201).json({ message: 'Canteen created successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
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
        const item = await MenuItem.findById(itemId)
        console.log("MENU ITEM BY ID",item)
        res.send({ status: "ok", data: item })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}        