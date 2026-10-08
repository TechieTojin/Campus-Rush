const express = require('express');
const router = express.Router();

const CanteenController = require('../controllers/canteenController')
const StaffController = require('../controllers/staffController')
const UserController = require('../controllers/userController')
const PaymentController = require('../controllers/paymentController')
const Manage = require('../controllers/manageController')
const Upload = require('../controllers/uploadController')
const Auth = require('../middleware/auth')


// Register canteen (signed-in staff without a canteen)
router.post('/canteens', Auth.verifyToken, CanteenController.registerCanteen);
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
router.post('/staff/logout', StaffController.logout);
// Staff account
router.put('/staff/me', Auth.verifyToken, StaffController.updateAccount);
router.put('/staff/me/password', Auth.verifyToken, StaffController.changePassword);
router.put('/staff/me/preferences', Auth.verifyToken, StaffController.updatePreferences);
// Image upload (raw image body, max 2 MB)
router.post('/staff/uploads', Auth.verifyToken, Upload.rawImage, Upload.uploadErrors, Upload.uploadImage);

// Canteen management — every route is limited to a canteen the signed-in staff member owns.
const own = [Auth.verifyToken, Auth.requireCanteenOwner];
const base = '/staff/canteens/:canteenId';
router.get(base, own, Manage.getCanteen);
router.put(base, own, Manage.updateCanteen);
router.get(`${base}/dashboard`, own, Manage.dashboard);
router.get(`${base}/analytics`, own, Manage.analytics);
router.get(`${base}/menu`, own, Manage.listMenu);
router.post(`${base}/menu`, own, Manage.createMenuItem);
router.put(`${base}/menu-availability`, own, Manage.bulkAvailability);
router.get(`${base}/menu/:itemId`, own, Manage.getMenuItem);
router.put(`${base}/menu/:itemId`, own, Manage.updateMenuItem);
router.delete(`${base}/menu/:itemId`, own, Manage.archiveMenuItem);
router.get(`${base}/categories`, own, Manage.listCategories);
router.post(`${base}/categories`, own, Manage.createCategory);
router.put(`${base}/categories/rename`, own, Manage.renameCategory);
router.put(`${base}/categories/order`, own, Manage.reorderCategories);
router.put(`${base}/categories/remove`, own, Manage.deleteCategory);
router.get(`${base}/orders`, own, Manage.listOrders);
router.get(`${base}/orders/live`, own, Manage.liveOrders);
router.get(`${base}/orders/:orderId`, own, Manage.getOrder);
router.put(`${base}/orders/:orderId/payment`, own, Manage.setPayment);
router.get(`${base}/customers`, own, Manage.customers);
router.get(`${base}/customers/:userId/orders`, own, Manage.customerOrders);
router.get(`${base}/activity`, own, Manage.activity);
router.post(`${base}/activity/seen`, own, Manage.markActivitySeen);

// Get canteen orders
router.get('/canteen/:canteenId/orders', Auth.verifyToken, StaffController.getCanteenOrders);
// Update order status (transition rules enforced in the controller)
router.put('/orders/:orderId/status', Auth.verifyToken, StaffController.updateOrderStatus);
// get order by id
router.get('/orders/:orderId/get-order', Auth.verifyToken, StaffController.getOrderByOrderId);
//most ordered items (public: item names and counts only, used by the student app)
router.get("/most-ordered-item/:canteenId",StaffController.mostOrderedItems)

// Register user
router.post('/users/register', UserController.registerUser);
// Login user
router.post('/users/login', UserController.loginUser);
//Get user
router.post('/users/get-user', UserController.getUser);
// Add favorites
router.post('/users/set-fav', Auth.verifyStudent, UserController.addFavorites)
//delete favorites
router.delete('/users/favoriteCanteens/:canteenId', Auth.verifyStudent, UserController.deleteFavorite);
// Get user favorites
router.get('/users/favorites', Auth.verifyStudent, UserController.getFavorites);
// Authenticated student's own orders, profile and password
router.get('/users/me/orders', Auth.verifyStudent, UserController.getMyOrders);
router.put('/users/me', Auth.verifyStudent, UserController.updateProfile);
router.put('/users/me/password', Auth.verifyStudent, UserController.changePassword);
// Place order
router.post('/users/place-order', Auth.verifyStudent, UserController.placeOrder);


//payment
router.post('/payments', PaymentController.paymentIntent)


module.exports = router;
