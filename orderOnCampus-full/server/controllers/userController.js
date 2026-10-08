const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const io = require('socket.io')
const User = require('../model/user.model');
const Order = require('../model/order.model')
const Canteen = require('../model/canteen.model');
const secretKey = process.env.JWT_SECRET;

// Register user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const userExist = await User.findOne({ email: email });
        if (userExist) {
            return res.json("exists");
        }
        const user = await User.create({ name, email, password: hashedPassword });
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const data = await User.findOne({ email: email });
        if (data) {
            bcrypt.compare(password, data.password, (err, result) => {
                if (err) {
                    res.status(500).json("An error occurred");
                }
                if (result) {
                    const token = jwt.sign({ _id: data._id }, secretKey);
                    console.log(token)
                    res.send({ status: "ok", data: token });
                } else {
                    res.json("Incorrect password");
                }
            });
        } else {
            res.json("No user found");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred");
    }
};
//getUser
exports.getUser = async (req, res) => {
    const { token } = req.body;
    try {
        const user = jwt.verify(token, secretKey);
        const userData = await User.findOne({ _id: user._id })
            .populate('favoriteCanteens') // Populate the favoriteCanteens field
            .populate('orders') // Populate the orders field
            .populate({
                path: 'favoriteCanteens',
                populate: {
                    path: 'menu' // Populate the menu field of each favoriteCanteen
                }
            });
        console.log("User data", userData)
        if (!userData) {
            return res.status(404).json({ msg: 'User not found' });
        }
        // io.emit('userDataUpdated', userData);
        return res.send({ status: "ok", data: userData });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(401).json({ msg: 'Auth failed' });
    }
}
//get user id
exports.getUserById = async (req, res) => {
    const { userId } = req.params;
    try {
        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(200).json({ status: 'ok', data: userData });
    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

//add fav
exports.addFavorites = async (req, res) => {
    const { userId, canteenId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.favoriteCanteens.includes(canteenId)) {
            return res.status(400).json({ message: 'Canteen already added to favorites' });
        }
        user.favoriteCanteens.push(canteenId);
        await user.save();
        return res.status(200).json({ message: 'Canteen added to favorites successfully', user: user });
    } catch (error) {
        console.error('Error adding favorite canteen:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
//delete fav
exports.deleteFavorite = async (req, res) => {
    const { userId, canteenId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the canteenId exists in the user's favoriteCanteens array
        if (!user.favoriteCanteens.includes(canteenId)) {
            return res.status(400).json({ message: 'Canteen not found in favorites' });
        }

        // Use $pull operator to remove the specified canteenId from the favoriteCanteens array
        await User.findByIdAndUpdate(userId, { $pull: { favoriteCanteens: canteenId } });

        return res.status(200).json({ message: 'Canteen removed from favorites successfully' });
    } catch (error) {
        console.error('Error removing favorite canteen:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// favorites
exports.getFavorites = async (req, res) => {
    const { userId } = req.params
    try {
        const user = await User.findById(userId).populate('favoriteCanteens');
        res.status(200).json(user.favoriteCanteens);
    } catch (error) {
        res.status(500).json({ error: 'Could not retrieve favorites' });
    }
};
// orders 
exports.getOrders = async (req, res) => {
    const {orderId} = req.params;
    try {
        const orders = await Order.find({ orderId })
        .populate('canteen')
        .populate('items');
        console.log(orders);
        res.send({status: "ok", data:orders});
    } catch (error) {
        res.status(500).json({ error: 'Could not retrieve orders' });
    }
};
//place order
exports.placeOrder = async (req, res) => {
    try {
        const { user, canteen, items, totalPrice, status } = req.body;
        const newOrder = new Order({
            user,
            canteen,
            items,
            totalPrice,
            status
        });
        const savedOrder = await newOrder.save();
        await User.findByIdAndUpdate(
            user,
            { $push: { orders: savedOrder._id } }, // Add the new order's ObjectId to the 'orders' array
            { new: true } // Return the updated document
        );
        await Canteen.findByIdAndUpdate(
            canteen,
            { $push: { orders: savedOrder._id } }, // Add the new order's ObjectId to the 'orders' array
            { new: true } // Return the updated document
        );
        res.status(201).json(savedOrder);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


// paymentDetails
// exports.updatePaymentDetails = async (req, res) => {
//     try {
//         const userId = req.user.userId; // Assuming user ID is available in the request object after authentication
//         const { paymentDetails } = req.body;
//         await User.findByIdAndUpdate(userId, { paymentDetails }, { new: true });
//         res.status(200).json({ message: 'Payment details updated successfully' });
//     } catch (error) {
//         res.status(500).json({ error: 'Could not update payment details' });
//     }
// };