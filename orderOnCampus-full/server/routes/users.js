const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const Auth = require('../middleware/auth');

// User routes
router.post('/login', UserController.loginUser);
router.post('/register', UserController.registerUser);
router.post('/get-user', UserController.getUser);
router.get('/:userId', UserController.getUserById);
router.post('/set-fav', Auth.verifyStudent, UserController.addFavorites);
router.delete('/favoriteCanteens/:canteenId', Auth.verifyStudent, UserController.deleteFavorite);
router.get('/favorites', Auth.verifyStudent, UserController.getFavorites);
router.get('/orders/:orderId', UserController.getOrders);
router.post('/place-order', Auth.verifyStudent, UserController.placeOrder);

module.exports = router; 