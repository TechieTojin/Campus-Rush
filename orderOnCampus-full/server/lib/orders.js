// Order status changes shared by canteen staff and platform admins — one set of rules for everyone.
const Order = require('../model/order.model');
const Activity = require('../model/activity.model');
const realtime = require('./realtime');

const ALLOWED_TRANSITIONS = {
    Placed: ['Processing', 'Cancelled'],
    Processing: ['Ready', 'Completed'],
    Ready: ['Completed'],
    Completed: [],
    Cancelled: [],
};
const STATUSES = Object.keys(ALLOWED_TRANSITIONS);
const ref = (id) => `#${String(id).slice(-6).toUpperCase()}`;

// Returns { order } on success or { status, message } on failure.
async function transitionOrder(order, newStatus, { actor = 'staff', actorName, reason } = {}) {
    if (!STATUSES.includes(newStatus)) {
        return { status: 400, message: `Invalid status. Must be one of: ${STATUSES.join(', ')}` };
    }
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
        return { status: 400, message: `Cannot transition from '${order.status}' to '${newStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal status)'}` };
    }
    // Conditional on the status we validated against, so two people updating the same order
    // at once can't both succeed with a transition that is no longer valid.
    const updated = await Order.findOneAndUpdate(
        { _id: order._id, status: order.status },
        { $set: { status: newStatus }, $push: { statusHistory: { status: newStatus, at: new Date() } } },
        { new: true, runValidators: true }
    );
    if (!updated) {
        return { status: 409, message: 'This order was just updated by someone else. Refresh to see its current status.' };
    }
    Activity.record({
        canteen: order.canteen,
        type: 'order_status',
        order: order._id,
        actor: actor === 'admin' ? 'admin' : 'staff',
        message: `Order ${ref(order._id)} moved from ${order.status} to ${newStatus}${actor === 'admin' ? ` by Campus Rush admin${actorName ? ` (${actorName})` : ''}${reason ? ` — ${reason}` : ''}` : ''}`,
    });
    emitOrder('order.updated', updated);
    return { order: updated };
}

function emitOrder(type, order) {
    realtime.emit(type, { orderId: String(order._id), canteenId: String(order.canteen), status: order.status }, {
        admin: true,
        canteen: String(order.canteen),
        user: order.user ? String(order.user) : undefined,
    });
}

module.exports = { ALLOWED_TRANSITIONS, STATUSES, transitionOrder, emitOrder, ref };
