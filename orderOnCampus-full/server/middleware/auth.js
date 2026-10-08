const jwt = require("jsonwebtoken");
const Staff = require('../model/staff.model');
const User = require('../model/user.model');
const secretKey = process.env.JWT_SECRET;

// Middleware to verify staff JWT token (from cookie)
exports.verifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        const userData = await Staff.findById(decoded._id);
        if (!userData) {
            return res.status(401).json({ message: 'Staff not found' });
        }
        res.locals.user = userData;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to verify student JWT token (from Authorization header)
exports.verifyStudent = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secretKey);
        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
