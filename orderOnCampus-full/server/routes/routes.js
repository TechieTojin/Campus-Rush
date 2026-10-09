const express = require('express');
const router = express.Router();

const CanteenController = require('../controllers/canteenController')
const StaffController = require('../controllers/staffController')
const UserController = require('../controllers/userController')
const PaymentController = require('../controllers/paymentController')
const Manage = require('../controllers/manageController')
const Upload = require('../controllers/uploadController')
const Content = require('../controllers/contentController')
const Support = require('../controllers/supportController')
const Auth = require('../middleware/auth')
const rateLimit = require('../lib/rateLimit')
const realtime = require('../lib/realtime')
const { emitOrder } = require('../lib/orders')
const Order = require('../model/order.model')
const Setting = require('../model/setting.model')

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, failuresOnly: true, key: rateLimit.emailKey, message: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
const setupLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, failuresOnly: true });
const ticketLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'You’ve sent several requests recently. Please wait before sending another.' });
const uploadLimit = rateLimit({ windowMs: 60 * 1000, max: 30 });

// Staff mutations use the cookie session, so they also need the CSRF header.
const staffCsrf = Auth.csrf('staff_csrf');


// Register canteen (signed-in staff without a canteen)
router.post('/canteens', Auth.verifyToken, staffCsrf, CanteenController.registerCanteen);
// Get canteens
router.get('/canteens/get-canteens',CanteenController.getAllCanteens)
// Get canteen by id
router.get('/canteens/:canteenID/get-canteen',CanteenController.getcanteenById)
//get menu item by id
router.get('/canteens/:itemId/get-item',CanteenController.getMenuById)

// Public, validated student-app configuration and content
router.get('/app/config', Content.publicConfig);
router.get('/app/banners', Content.publicBanners);


// Register staff
router.post('/staff/register', loginLimit, StaffController.registerStaff);
// Login staff
router.post('/staff/login', loginLimit, StaffController.loginStaff);
// Admin-created staff accounts set their first password from a one-time link
router.post('/staff/setup-password', setupLimit, StaffController.setupPassword);
//authentication
router.get('/staff/auth',Auth.verifyToken,StaffController.authStaff)
//staff logout
router.post('/staff/logout', StaffController.logout);
// Staff account
router.put('/staff/me', Auth.verifyToken, staffCsrf, StaffController.updateAccount);
router.put('/staff/me/password', Auth.verifyToken, staffCsrf, rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), StaffController.changePassword);
router.put('/staff/me/preferences', Auth.verifyToken, staffCsrf, StaffController.updatePreferences);
// Image upload (raw image body, max 2 MB) — managers only
router.post('/staff/uploads', Auth.verifyToken, staffCsrf, Auth.requireManager(), uploadLimit, Upload.rawImage, Upload.uploadErrors, Upload.uploadImage);

// Canteen management — every route is limited to a canteen the signed-in staff member owns.
// Managers can do everything; the 'staff' role handles orders and availability.
const own = [Auth.verifyToken, staffCsrf, Auth.requireCanteenOwner];
const manager = Auth.requireManager();
const menuChanged = realtime.canteenChanged('menu.updated');
const canteenChanged = realtime.canteenChanged('canteen.updated');
const paymentChanged = realtime.afterSuccess((req) => { Order.findById(req.params.orderId).then((o) => o && emitOrder('order.updated', o)).catch(() => {}); });
const base = '/staff/canteens/:canteenId';
router.get(base, own, Manage.getCanteen);
router.put(base, own, manager, canteenChanged, Manage.updateCanteen);
router.get(`${base}/dashboard`, own, Manage.dashboard);
router.get(`${base}/analytics`, own, Manage.analytics);
router.get(`${base}/menu`, own, Manage.listMenu);
router.post(`${base}/menu`, own, manager, menuChanged, Manage.createMenuItem);
router.put(`${base}/menu-availability`, own, menuChanged, Manage.bulkAvailability);
router.get(`${base}/menu/:itemId`, own, Manage.getMenuItem);
router.put(`${base}/menu/:itemId`, own, Auth.requireManager({ allowAvailability: true }), menuChanged, Manage.updateMenuItem);
router.delete(`${base}/menu/:itemId`, own, manager, menuChanged, Manage.archiveMenuItem);
router.get(`${base}/categories`, own, Manage.listCategories);
router.post(`${base}/categories`, own, manager, menuChanged, Manage.createCategory);
router.put(`${base}/categories/rename`, own, manager, menuChanged, Manage.renameCategory);
router.put(`${base}/categories/order`, own, manager, menuChanged, Manage.reorderCategories);
router.put(`${base}/categories/remove`, own, manager, menuChanged, Manage.deleteCategory);
router.get(`${base}/orders`, own, Manage.listOrders);
router.get(`${base}/orders/live`, own, Manage.liveOrders);
router.get(`${base}/orders/:orderId`, own, Manage.getOrder);
router.put(`${base}/orders/:orderId/payment`, own, paymentChanged, Manage.setPayment);
router.get(`${base}/customers`, own, Manage.customers);
router.get(`${base}/customers/:userId/orders`, own, Manage.customerOrders);
router.get(`${base}/activity`, own, Manage.activity);
router.post(`${base}/activity/seen`, own, Manage.markActivitySeen);
router.get(`${base}/announcements`, own, Content.staffAnnouncements);
router.post(`${base}/announcements/:id/read`, own, Content.markAnnouncementRead);
router.get(`${base}/support`, own, Support.staffList);
router.post(`${base}/support`, own, ticketLimit, Support.staffCreate);

// Get canteen orders
router.get('/canteen/:canteenId/orders', Auth.verifyToken, StaffController.getCanteenOrders);
// Update order status (transition rules enforced in lib/orders.js)
router.put('/orders/:orderId/status', Auth.verifyToken, staffCsrf, StaffController.updateOrderStatus);
// get order by id
router.get('/orders/:orderId/get-order', Auth.verifyToken, StaffController.getOrderByOrderId);
//most ordered items (public: item names and counts only, used by the student app)
router.get("/most-ordered-item/:canteenId",StaffController.mostOrderedItems)

// Favorites can be switched off platform-wide by admins.
const favoritesEnabled = async (req, res, next) => ((await Setting.get()).studentApp?.enableFavorites === false
    ? res.status(403).json({ message: 'Favorites are currently turned off' })
    : next());

// Register user
router.post('/users/register', loginLimit, UserController.registerUser);
// Login user
router.post('/users/login', loginLimit, UserController.loginUser);
//Get user
router.post('/users/get-user', UserController.getUser);
// Add favorites
router.post('/users/set-fav', Auth.verifyStudent, Auth.requireActiveStudent, favoritesEnabled, UserController.addFavorites)
//delete favorites
router.delete('/users/favoriteCanteens/:canteenId', Auth.verifyStudent, Auth.requireActiveStudent, UserController.deleteFavorite);
// Get user favorites
router.get('/users/favorites', Auth.verifyStudent, UserController.getFavorites);
// Authenticated student's own orders, profile and password
router.get('/users/me/orders', Auth.verifyStudent, UserController.getMyOrders);
router.put('/users/me', Auth.verifyStudent, Auth.requireActiveStudent, UserController.updateProfile);
router.put('/users/me/password', Auth.verifyStudent, rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), UserController.changePassword);
// Place order (suspended students are refused)
router.post('/users/place-order', Auth.verifyStudent, Auth.requireActiveStudent, UserController.placeOrder);
// Student-facing announcements and support
router.get('/users/announcements', Auth.verifyStudent, Content.studentAnnouncements);
router.get('/users/support', Auth.verifyStudent, Support.studentList);
router.post('/users/support', Auth.verifyStudent, ticketLimit, Support.studentCreate);


//payment
router.post('/payments', PaymentController.paymentIntent)


module.exports = router;
