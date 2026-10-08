const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// User routes
router.post('/login', UserController.loginUser);
router.post('/register', UserController.registerUser);
router.post('/get-user', UserController.getUser);
router.get('/:userId', UserController.getUserById);
router.post('/set-fav', UserController.addFavorites);
router.delete('/:userId/favoriteCanteens/:canteenId', UserController.deleteFavorite);
router.get('/:userId/favorites', UserController.getFavorites);
router.get('/orders/:orderId', UserController.getOrders);
router.post('/place-order', UserController.placeOrder);

module.exports = router; 