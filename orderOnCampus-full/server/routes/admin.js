// Platform administration API (/admin). Every route except login/setup requires an active admin
// session cookie; every mutation also requires the CSRF header and is written to the audit log.
const express = require('express');
const router = express.Router();

const Auth = require('../middleware/auth');
const rateLimit = require('../lib/rateLimit');
const realtime = require('../lib/realtime');
const AdminAuth = require('../controllers/admin/authController');
const People = require('../controllers/admin/peopleController');
const Ops = require('../controllers/admin/operationsController');
const Admins = require('../controllers/admin/adminsController');
const System = require('../controllers/admin/systemController');
const Manage = require('../controllers/manageController');
const Content = require('../controllers/contentController');
const Support = require('../controllers/supportController');
const Upload = require('../controllers/uploadController');
const { MenuItem } = require('../lib/models');

const { audit, requirePermission: allow } = Auth;
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, failuresOnly: true, key: rateLimit.emailKey, message: 'Too many sign-in attempts. Wait 15 minutes and try again.' });
const ipLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, failuresOnly: true });

// ---------------------------------------------------------------- public (no session)
router.post('/auth/login', ipLimit, loginLimit, AdminAuth.login);
router.post('/auth/setup', ipLimit, AdminAuth.completeSetup);

// ---------------------------------------------------------------- everything below needs an admin session
router.use(Auth.requireAdmin, Auth.csrf('admin_csrf'));

router.get('/auth/me', AdminAuth.me);
router.post('/auth/logout', AdminAuth.logout);
router.post('/auth/logout-all', AdminAuth.logoutAll);
router.put('/auth/profile', AdminAuth.updateProfile);
router.put('/auth/password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), AdminAuth.changePassword);

router.post('/uploads', rateLimit({ windowMs: 60 * 1000, max: 30 }), Upload.rawImage, Upload.uploadErrors, Upload.uploadImage);

// ---- dashboard & analytics
router.get('/overview', allow('analytics'), Ops.overview);
router.get('/analytics', allow('analytics'), Ops.analytics);

// ---- canteens
const canteenTarget = (req, res) => ({ type: 'canteen', id: req.params.canteenId, label: res.locals.canteen?.name });
const menuChanged = realtime.canteenChanged('menu.updated');
const canteenChanged = realtime.canteenChanged('canteen.updated');
router.get('/canteens', allow('canteens'), People.listCanteens);
router.post('/canteens', allow('canteens'), audit('canteen.create', { target: (req) => ({ type: 'canteen', label: req.body?.name }) }), People.createCanteen);
router.get('/canteens/:canteenId', allow('canteens'), People.loadCanteen, People.getCanteenDetail);
router.put('/canteens/:canteenId', allow('canteens'), People.loadCanteen,
    audit('canteen.update', { target: canteenTarget, before: (req, res) => ({ name: res.locals.canteen.name, location: res.locals.canteen.location, openStatus: res.locals.canteen.openStatus }) }),
    canteenChanged, Manage.updateCanteen);
router.put('/canteens/:canteenId/status', allow('canteens'), People.loadCanteen, audit('canteen.status', { target: canteenTarget }), People.setCanteenStatus);
router.get('/canteens/:canteenId/orders', allow('orders'), People.loadCanteen, Manage.listOrders);

// ---- canteen menus & categories (same handlers and validation as the canteen website)
const itemBefore = async (req) => {
    const i = await MenuItem.findById(req.params.itemId, 'name price available category description image').lean();
    return i ? { name: i.name, price: i.price, available: i.available, category: i.category } : undefined;
};
const itemTarget = (req, res) => ({ type: 'menu_item', id: req.params.itemId, label: res.locals.canteen?.name });
router.get('/menu', allow('menu'), Ops.listMenu);
router.get('/menu/:itemId/activity', allow('menu'), Ops.itemActivity);
router.get('/canteens/:canteenId/menu', allow('menu'), People.loadCanteen, Manage.listMenu);
router.post('/canteens/:canteenId/menu', allow('menu'), People.loadCanteen, audit('menu.create', { target: canteenTarget }), menuChanged, Manage.createMenuItem);
router.get('/canteens/:canteenId/menu/:itemId', allow('menu'), People.loadCanteen, Manage.getMenuItem);
router.put('/canteens/:canteenId/menu/:itemId', allow('menu'), People.loadCanteen, audit('menu.update', { target: itemTarget, before: itemBefore }), menuChanged, Manage.updateMenuItem);
router.delete('/canteens/:canteenId/menu/:itemId', allow('menu'), People.loadCanteen, audit('menu.archive', { target: itemTarget, before: itemBefore }), menuChanged, Manage.archiveMenuItem);
router.put('/canteens/:canteenId/menu-availability', allow('menu'), People.loadCanteen, audit('menu.availability', { target: canteenTarget }), menuChanged, Manage.bulkAvailability);
router.get('/canteens/:canteenId/categories', allow('menu'), People.loadCanteen, Manage.listCategories);
router.post('/canteens/:canteenId/categories', allow('menu'), People.loadCanteen, audit('category.create', { target: canteenTarget }), menuChanged, Manage.createCategory);
router.put('/canteens/:canteenId/categories/rename', allow('menu'), People.loadCanteen, audit('category.rename', { target: canteenTarget }), menuChanged, Manage.renameCategory);
router.put('/canteens/:canteenId/categories/order', allow('menu'), People.loadCanteen, audit('category.reorder', { target: canteenTarget }), menuChanged, Manage.reorderCategories);
router.put('/canteens/:canteenId/categories/remove', allow('menu'), People.loadCanteen, audit('category.remove', { target: canteenTarget }), menuChanged, Manage.deleteCategory);

// ---- staff
const staffTarget = (req) => ({ type: 'staff', id: req.params.staffId });
router.get('/staff', allow('staff'), People.listStaff);
router.post('/staff', allow('staff'), audit('staff.create', { target: (req) => ({ type: 'staff', label: req.body?.email }) }), People.createStaff);
router.get('/staff/:staffId', allow('staff'), People.getStaff);
router.put('/staff/:staffId', allow('staff'), audit('staff.update', { target: staffTarget }), People.updateStaff);
router.put('/staff/:staffId/status', allow('staff'), audit('staff.status', { target: staffTarget }), People.setStaffStatus);
router.post('/staff/:staffId/remove-access', allow('staff'), audit('staff.access.remove', { target: staffTarget }), People.removeStaffAccess);
router.post('/staff/:staffId/reset-access', allow('staff'), audit('staff.access.reset', { target: staffTarget }), People.resetStaffAccess);

// ---- students
router.get('/students', allow('students'), People.listStudents);
router.get('/students/:userId', allow('students'), People.getStudent);
router.put('/students/:userId/status', allow('students'), audit('student.status', { target: (req) => ({ type: 'student', id: req.params.userId }) }), People.setStudentStatus);

// ---- orders
router.get('/orders', allow('orders'), Ops.listOrders);
router.get('/orders/live', allow('orders'), Ops.liveOrders);
router.get('/orders/:orderId', allow('orders'), Ops.getOrder);
router.put('/orders/:orderId/status', allow('orders'), audit('order.status.override', { target: (req) => ({ type: 'order', id: req.params.orderId, label: `#${String(req.params.orderId).slice(-6).toUpperCase()}` }) }), Ops.setOrderStatus);

// ---- content: announcements & banners
router.get('/announcements', allow('content'), Content.listAnnouncements);
router.post('/announcements', allow('content'), audit('announcement.create', { target: (req) => ({ type: 'announcement', label: req.body?.title }) }), Content.createAnnouncement);
router.put('/announcements/:id', allow('content'), audit('announcement.update', { target: (req) => ({ type: 'announcement', id: req.params.id }) }), Content.updateAnnouncement);
router.get('/banners', allow('content'), Content.listBanners);
router.post('/banners', allow('content'), audit('banner.create', { target: (req) => ({ type: 'banner', label: req.body?.title }) }), Content.createBanner);
router.put('/banners/:id', allow('content'), audit('banner.update', { target: (req) => ({ type: 'banner', id: req.params.id }) }), Content.updateBanner);
router.delete('/banners/:id', allow('content'), audit('banner.delete', { target: (req) => ({ type: 'banner', id: req.params.id }) }), Content.deleteBanner);

// ---- platform settings (super admins change them; everyone can read)
router.get('/settings', Content.getSettings);
router.put('/settings', allow('platform.settings'), audit('settings.update', { target: () => ({ type: 'settings', label: 'Platform settings' }) }), Content.updateSettings);

// ---- support
router.get('/support', allow('support'), Support.adminList);
router.get('/support/:id', allow('support'), Support.adminGet);
router.put('/support/:id', allow('support'), audit('support.update', { target: (req) => ({ type: 'ticket', id: req.params.id }) }), Support.adminUpdate);
router.post('/support/:id/notes', allow('support'), audit('support.note', { target: (req) => ({ type: 'ticket', id: req.params.id }) }), Support.adminNote);

// ---- administrators (super admins only)
const adminTarget = (req) => ({ type: 'admin', id: req.params.adminId });
router.get('/admins', allow('admins.manage'), Admins.list);
router.get('/admins/:adminId/activity', allow('admins.manage'), Admins.activity);
router.post('/admins', allow('admins.manage'), audit('admin.invite', { target: (req) => ({ type: 'admin', label: req.body?.email }) }), Admins.invite);
router.put('/admins/:adminId/role', allow('admins.manage'), audit('admin.role', { target: adminTarget }), Admins.setRole);
router.put('/admins/:adminId/status', allow('admins.manage'), audit('admin.status', { target: adminTarget }), Admins.setStatus);

// ---- audit & system
router.get('/audit', allow('audit.read'), System.audit);
router.get('/system/health', allow('system.read'), System.health);

module.exports = router;
