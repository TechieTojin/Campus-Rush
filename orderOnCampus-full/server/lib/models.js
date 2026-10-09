// Single import point for models (avoids circular requires between lib/ and controllers/).
module.exports = {
    Admin: require('../model/admin.model'),
    AuditLog: require('../model/auditLog.model'),
    Announcement: require('../model/announcement.model'),
    Banner: require('../model/banner.model'),
    Setting: require('../model/setting.model'),
    Ticket: require('../model/ticket.model'),
    Activity: require('../model/activity.model'),
    Canteen: require('../model/canteen.model'),
    MenuItem: require('../model/menuItem.model'),
    Order: require('../model/order.model'),
    Staff: require('../model/staff.model'),
    User: require('../model/user.model'),
};
