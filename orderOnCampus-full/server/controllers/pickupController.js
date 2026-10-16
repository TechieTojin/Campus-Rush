// QR pickup verification and collection, plus the staff-facing pickup-time controls.
//
// Three actors, three levels of authority:
//   student  issues a short-lived credential for an order they own that is Ready
//   staff    verifies a scanned credential (read-only) and then collects the order
//   staff    adjusts the estimated ready time for an order in their own canteen
//
// IMPORTANT: scanning a QR does not grant staff any power they didn't already have — canteen
// staff can already move an order Ready -> Completed through PUT /orders/:orderId/status. The QR
// proves the right student is standing at the counter; it is a verification step, not a new
// permission. The manual fallback below is that same pre-existing authority, which is why it is
// safe to offer when a camera isn't available.
const mongoose = require('mongoose');
const Order = require('../model/order.model');
const Activity = require('../model/activity.model');
const Token = require('../lib/pickupToken');
const Estimate = require('../lib/pickupEstimate');
const QR = require('../lib/qr');
const { transitionOrder, emitOrder, ref } = require('../lib/orders');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const fail = (res, status, message, code) => res.status(status).json(code ? { message, code } : { message });

// What staff are shown about a scanned order. Deliberately minimal: the student's display name is
// needed to call out the order; no email, phone or other profile data is included.
const pickupView = (order) => ({
    _id: order._id,
    ref: ref(order._id),
    status: order.status,
    totalPrice: order.totalPrice,
    paymentStatus: order.paymentStatus || 'unpaid',
    paymentMethod: order.paymentMethod || 'counter',
    timestamp: order.timestamp,
    readyAt: order.readyAt || null,
    customer: order.user && typeof order.user === 'object'
        ? { name: order.user.name || 'Student' }
        : { name: 'Student' },
    lines: (order.lineItems || []).map(l => ({
        name: l.name,
        quantity: l.quantity,
        price: l.price,
        selections: (l.selections || []).map(s => ({ groupName: s.groupName, label: s.label })),
        instructions: l.instructions || '',
    })),
    itemCount: (order.lineItems || []).reduce((sum, l) => sum + (l.quantity || 0), 0),
});

// ---------------------------------------------------------------- student: issue a credential

// POST /users/orders/:orderId/pickup-token
// Issues a fresh short-lived credential, replacing any previous one for this order.
exports.issueToken = async (req, res) => {
    const { orderId } = req.params;
    if (!OBJECT_ID.test(orderId || '')) return fail(res, 404, 'Order not found');
    try {
        const order = await Order.findOne({ _id: orderId, user: req.user._id }).populate('canteen', 'name pickupInstructions');
        if (!order) return fail(res, 404, 'Order not found');

        if (order.status === 'Completed') return fail(res, 409, 'This order has already been collected', 'ALREADY_COLLECTED');
        if (order.status === 'Cancelled') return fail(res, 409, 'This order was cancelled', 'CANCELLED');
        if (order.status !== 'Ready') {
            return fail(res, 409, 'Your pickup code appears when the canteen marks this order ready', 'NOT_READY');
        }

        const issued = Token.issue();
        await Order.updateOne({ _id: order._id }, {
            $set: {
                'pickup.tokenId': issued.tokenId,
                'pickup.tokenHash': issued.tokenHash,
                'pickup.issuedAt': new Date(),
                'pickup.expiresAt': issued.expiresAt,
            },
            // Re-issuing clears any earlier consumption marker from an abandoned attempt.
            $unset: { 'pickup.consumedAt': '' },
        });

        return res.json({
            status: 'ok',
            data: {
                // The only place this value is ever returned.
                code: issued.payload,
                // Rendered here so the mobile app needs no QR library of its own — it just
                // shows this as an <Image>. See lib/qr.js for why.
                qr: QR.toDataUri(issued.payload, { scale: 8, quiet: 3 }),
                expiresAt: issued.expiresAt,
                ttlMs: issued.ttlMs,
                ref: ref(order._id),
                orderStatus: order.status,
                canteen: order.canteen ? { name: order.canteen.name, pickupInstructions: order.canteen.pickupInstructions || '' } : null,
            },
        });
    } catch (err) {
        console.error('Error issuing pickup token:', err);
        return fail(res, 500, 'Internal server error');
    }
};

// ---------------------------------------------------------------- staff: verify and collect

// Resolves a scanned payload to an order owned by this canteen. Returns { error } shaped for a
// direct response, or { order }.
async function resolveScanned(code, canteen) {
    const parsed = Token.parse(code);
    if (!parsed) return { error: { status: 400, message: "That doesn't look like a Campus Rush pickup code", code: 'INVALID_CODE' } };

    // +pickup.tokenHash because the schema hides it by default.
    const order = await Order.findOne({ 'pickup.tokenId': parsed.tokenId })
        .select('+pickup.tokenHash')
        .populate('user', 'name');
    if (!order) return { error: { status: 404, message: 'This pickup code is not valid any more', code: 'INVALID_CODE' } };

    // Compare before anything else is revealed about the order.
    if (!Token.matches(parsed.secret, order.pickup && order.pickup.tokenHash)) {
        return { error: { status: 400, message: 'This pickup code is not valid any more', code: 'INVALID_CODE' } };
    }
    if (String(order.canteen) !== String(canteen._id)) {
        return { error: { status: 403, message: 'This order belongs to a different canteen', code: 'WRONG_CANTEEN' } };
    }
    if (order.pickup.consumedAt) {
        return { error: { status: 409, message: 'This pickup code has already been used', code: 'ALREADY_USED' } };
    }
    if (Token.isExpired(order.pickup.expiresAt)) {
        return { error: { status: 410, message: 'This pickup code has expired — ask the student to refresh it', code: 'EXPIRED' } };
    }
    return { order };
}

// POST /staff/canteens/:canteenId/pickup/verify   { code }
// Read-only: shows staff what they scanned so they can check payment before collecting.
exports.verify = async (req, res) => {
    try {
        const { order, error } = await resolveScanned((req.body || {}).code, res.locals.canteen);
        if (error) return fail(res, error.status, error.message, error.code);

        if (order.status === 'Completed') return fail(res, 409, 'This order has already been collected', 'ALREADY_COLLECTED');
        if (order.status === 'Cancelled') return fail(res, 409, 'This order was cancelled', 'CANCELLED');
        if (order.status !== 'Ready') return fail(res, 409, `This order is still ${order.status.toLowerCase()}`, 'NOT_READY');

        return res.json({
            status: 'ok',
            data: {
                order: pickupView(order),
                // Pay-at-counter: an unpaid order must have payment recorded through the normal
                // payment endpoint before it can be collected.
                requiresPayment: (order.paymentStatus || 'unpaid') !== 'paid',
            },
        });
    } catch (err) {
        console.error('Error verifying pickup code:', err);
        return fail(res, 500, 'Internal server error');
    }
};

// POST /staff/canteens/:canteenId/pickup/collect   { code }  or  { orderId }
// Completes the order. The token is consumed in the same atomic update that claims the order, so
// two scanners hitting this at once cannot both win.
exports.collect = async (req, res) => {
    const canteen = res.locals.canteen;
    const body = req.body || {};
    try {
        let order;
        let method;

        if (typeof body.code === 'string' && body.code.trim()) {
            const resolved = await resolveScanned(body.code, canteen);
            if (resolved.error) return fail(res, resolved.error.status, resolved.error.message, resolved.error.code);
            order = resolved.order;
            method = 'qr';
        } else if (typeof body.orderId === 'string') {
            // Counter fallback for when the camera is unavailable. This is the same authority
            // staff already have to complete an order, scoped to their own canteen.
            if (!OBJECT_ID.test(body.orderId)) return fail(res, 404, 'Order not found');
            order = await Order.findOne({ _id: body.orderId, canteen: canteen._id }).populate('user', 'name');
            if (!order) return fail(res, 404, 'Order not found');
            method = 'manual';
        } else {
            return fail(res, 400, 'Scan a pickup code or choose an order to collect');
        }

        if (order.status === 'Completed') return fail(res, 409, 'This order has already been collected', 'ALREADY_COLLECTED');
        if (order.status === 'Cancelled') return fail(res, 409, 'This order was cancelled', 'CANCELLED');
        if (order.status !== 'Ready') return fail(res, 409, `This order is still ${order.status.toLowerCase()}`, 'NOT_READY');

        // Payment gate. Campus Rush is pay-at-counter: collection must not become a way to hand
        // food over without the money being recorded. Staff record payment through the existing
        // payment endpoint and then scan again.
        if ((order.paymentStatus || 'unpaid') !== 'paid') {
            return res.status(409).json({
                message: 'Record the counter payment before completing this pickup',
                code: 'PAYMENT_PENDING',
                data: { order: pickupView(order), requiresPayment: true },
            });
        }

        const now = new Date();
        const staffId = res.locals.user ? res.locals.user._id : undefined;

        if (method === 'qr') {
            // Claim the credential atomically; a second scanner gets null and is told it's done.
            const claimed = await Order.findOneAndUpdate(
                { _id: order._id, status: 'Ready', 'pickup.tokenId': order.pickup.tokenId, 'pickup.consumedAt': { $exists: false } },
                { $set: { 'pickup.consumedAt': now, 'pickup.collectedBy': staffId, 'pickup.method': 'qr' } },
                { new: true }
            );
            if (!claimed) return fail(res, 409, 'This pickup code has already been used', 'ALREADY_USED');
            order = claimed;
        } else {
            await Order.updateOne({ _id: order._id }, { $set: { 'pickup.collectedBy': staffId, 'pickup.method': 'manual' } });
        }

        const result = await transitionOrder(order, 'Completed', { actor: 'staff' });
        if (result.message) {
            // Transition lost a race — release the credential so the student isn't stranded.
            if (method === 'qr') {
                await Order.updateOne({ _id: order._id }, { $unset: { 'pickup.consumedAt': '' } }).catch(() => {});
            }
            return fail(res, result.status, result.message);
        }

        Activity.record({
            actor: 'staff',
            canteen: canteen._id,
            type: 'order_status',
            order: order._id,
            message: `Order ${ref(order._id)} collected${method === 'qr' ? ' (QR verified)' : ' (recorded at the counter)'}`,
        });

        const populated = await Order.findById(order._id).populate('user', 'name');
        return res.json({ status: 'ok', data: { order: pickupView(populated), method } });
    } catch (err) {
        console.error('Error completing pickup:', err);
        return fail(res, 500, 'Internal server error');
    }
};

// ---------------------------------------------------------------- staff: pickup time

// PUT /staff/canteens/:canteenId/orders/:orderId/estimate   { minutes }  or  { addDelay }
// `minutes` sets a new "ready in N minutes from now"; `addDelay` adds to the current estimate.
exports.setEstimate = async (req, res) => {
    const canteen = res.locals.canteen;
    const { orderId } = req.params;
    const { minutes, addDelay } = req.body || {};
    if (!OBJECT_ID.test(orderId || '')) return fail(res, 404, 'Order not found');

    const hasMinutes = minutes !== undefined && minutes !== null && minutes !== '';
    const hasDelay = addDelay !== undefined && addDelay !== null && addDelay !== '';
    if (!hasMinutes && !hasDelay) return fail(res, 400, 'Send either minutes or addDelay');
    if (hasMinutes && hasDelay) return fail(res, 400, 'Send minutes or addDelay, not both');

    const value = Number(hasMinutes ? minutes : addDelay);
    if (!Number.isInteger(value)) return fail(res, 400, 'Minutes must be a whole number');
    if (hasMinutes && (value < Estimate.MIN_MINUTES || value > Estimate.MAX_MINUTES)) {
        return fail(res, 400, `Pickup time must be between ${Estimate.MIN_MINUTES} and ${Estimate.MAX_MINUTES} minutes`);
    }
    if (hasDelay && (value < 1 || value > 60)) return fail(res, 400, 'A delay must be between 1 and 60 minutes');

    try {
        const order = await Order.findOne({ _id: orderId, canteen: canteen._id });
        if (!order) return fail(res, 404, 'Order not found');
        // An estimate is only meaningful while the food is still being made.
        if (!['Placed', 'Processing'].includes(order.status)) {
            return fail(res, 400, `The pickup time can't be changed once an order is ${order.status.toLowerCase()}`);
        }

        const now = new Date();
        let estimatedReadyAt;
        let estimateMinutes;
        let prepDelayMinutes = order.prepDelayMinutes || 0;

        if (hasMinutes) {
            estimateMinutes = value;
            estimatedReadyAt = Estimate.readyAtFrom(now, value);
        } else {
            const from = order.estimatedReadyAt && new Date(order.estimatedReadyAt) > now ? new Date(order.estimatedReadyAt) : now;
            estimatedReadyAt = Estimate.readyAtFrom(from, value);
            estimateMinutes = Math.max(Estimate.MIN_MINUTES, Math.round((estimatedReadyAt.getTime() - new Date(order.timestamp).getTime()) / 60000));
            prepDelayMinutes += value;
        }

        const updated = await Order.findOneAndUpdate(
            { _id: order._id, status: order.status },
            { $set: { estimatedReadyAt, estimateMinutes, estimateSource: 'staff', estimateUpdatedAt: now, prepDelayMinutes } },
            { new: true }
        );
        if (!updated) return fail(res, 409, 'This order was just updated by someone else. Refresh to see its current status.');

        Activity.record({
            actor: 'staff',
            canteen: canteen._id,
            type: 'order_status',
            order: order._id,
            message: hasDelay
                ? `Order ${ref(order._id)} delayed by ${value} min`
                : `Order ${ref(order._id)} pickup time set to about ${value} min`,
        });
        // Reuses the existing order channel so every client already listening updates itself.
        emitOrder('order.updated', updated);

        return res.json({
            status: 'ok',
            data: {
                estimatedReadyAt: updated.estimatedReadyAt,
                estimateMinutes: updated.estimateMinutes,
                estimateSource: updated.estimateSource,
                prepDelayMinutes: updated.prepDelayMinutes,
            },
        });
    } catch (err) {
        console.error('Error updating pickup estimate:', err);
        return fail(res, 500, 'Internal server error');
    }
};

exports._internals = { pickupView, resolveScanned };
