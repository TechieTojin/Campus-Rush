const express = require('express');
const router = express.Router();

const CanteenController = require('../controllers/canteenController')
const StaffController = require('../controllers/staffController')
const UserController = require('../controllers/userController')
const PaymentController = require('../controllers/paymentController')
const Auth = require('../middleware/auth')


// Register canteen
router.post('/canteens', CanteenController.registerCanteen);
// Get canteens
router.get('/canteens/get-canteens',CanteenController.getAllCanteens)
// Get canteen by id
router.get('/canteens/:canteenID/get-canteen',CanteenController.getcanteenById)
//get menu item by id
router.get('/canteens/:itemId/get-item',CanteenController.getMenuById)
 

// Register staff
router.post('/staff/register', StaffController.registerStaff);
// Login staff
router.post('/staff/login', StaffController.loginStaff); 
//authentication
router.get('/staff/auth',Auth.verifyToken,StaffController.authStaff)
//staff logout
router.get('/staff/logout', StaffController.logout);
// Update menu item stock
router.put('/menu/:dishId/stock', StaffController.updateMenuItemStock);
// Add menu item
router.post('/menu/add', StaffController.addMenuItem);
// Edit a menu item
router.put('/menu/:menuItemId', StaffController.editMenuItem);
//delete item
router.delete('/menu/delete/:menuItemId', StaffController.deleteMenuItem);
// Update availability of menu item
router.put('/menu/availability/:menuItemId', StaffController.updateAvailability)
// Set canteen open status
router.put('/canteen/open', StaffController.setCanteenOpenStatus);
// Get canteen orders
router.get('/canteen/:canteenId/orders', StaffController.getCanteenOrders);
// Update order status
router.put('/orders/:orderId/status', StaffController.updateOrderStatus);
// get order by id
router.get('/orders/:orderId/get-order', StaffController.getOrderByOrderId);
//unique customer
router.get('/canteens/:canteenId/unique-customers',StaffController.uniqueCustomer)
//most ordered items
router.get("/most-ordered-item/:canteenId",StaffController.mostOrderedItems)

// Register user
router.post('/users/register', UserController.registerUser);
// Login user
router.post('/users/login', UserController.loginUser);
//Get user
router.post('/users/get-user', UserController.getUser);
// Add favorites
router.post('/users/set-fav',UserController.addFavorites)
//delete favorites
router.delete('/users/:userId/favoriteCanteens/:canteenId', UserController.deleteFavorite);
// Get user favorites
router.get('/users/:userId/favorites', UserController.getFavorites);
// Get user orders
router.get('/users/:userId/orders', UserController.getOrders);
// Place order
router.post('/users/place-order', UserController.placeOrder);
// get user by id
router.get('/users/:userId/get-user', UserController.getUserById)


//payment
router.post('/payments', PaymentController.paymentIntent)


module.exports = router;