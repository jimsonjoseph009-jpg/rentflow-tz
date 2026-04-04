const pool = require('../config/db');
const {
  hasSubscriptionAccess,
  resolveUserSubscription,
  syncDerivedSubscriptionStatus,
} = require('../services/subscriptionState.service');

const requireActiveSubscription = async (req, res, next) => {
  try {
    // Tenants and Admins don't have subscriptions but need access
    if (req.user.role === 'tenant' || req.user.role === 'admin') {
      return next();
    }

    let sub = await resolveUserSubscription(req.user.id);

    if (!sub) {
      return res.status(402).json({ message: 'Subscription required' });
    }

    sub = await syncDerivedSubscriptionStatus(req.user.id, sub);

    if (!hasSubscriptionAccess(sub)) {
      return res.status(402).json({ message: 'Subscription inactive or expired' });
    }

    req.subscription = sub;
    return next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Failed to validate subscription' });
  }
};

const requirePlan = (allowedPlans) => async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();

    let sub = await resolveUserSubscription(req.user.id);

    if (!sub) {
      return res.status(402).json({ message: 'Active subscription required' });
    }

    sub = await syncDerivedSubscriptionStatus(req.user.id, sub);

    if (!hasSubscriptionAccess(sub)) {
      return res.status(402).json({ message: 'Active subscription required' });
    }

    if (!allowedPlans.includes(sub.plan_code)) {
      return res.status(403).json({ message: 'Feature not available on current plan' });
    }

    req.planCode = sub.plan_code;
    return next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Plan validation failed' });
  }
};

const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();

    let sub = await resolveUserSubscription(req.user.id);

    if (!sub) {
      return res.status(402).json({ message: 'Active subscription required' });
    }

    sub = await syncDerivedSubscriptionStatus(req.user.id, sub);

    if (!sub.plan_id || !hasSubscriptionAccess(sub)) {
      return res.status(402).json({ message: 'Active subscription required' });
    }

    const { rows } = await pool.query(
      `SELECT 1
       FROM plan_features
       WHERE plan_id=$1 AND feature_key=$2
       LIMIT 1`,
      [sub.plan_id, featureKey]
    );

    if (!rows.length) {
      return res.status(403).json({ message: `Feature '${featureKey}' is not available on your plan` });
    }

    req.subscription = sub;
    return next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Feature validation failed' });
  }
};

const enforceQuotaLimit = (entityType) => async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();

    const userId = req.user.id;
    let activeSub = await resolveUserSubscription(userId);
    activeSub = await syncDerivedSubscriptionStatus(userId, activeSub);

    let quotaLimit = 10; // Default limit for trial / absent plan
    if (activeSub && activeSub.plan_id && hasSubscriptionAccess(activeSub)) {
      const featureKey = entityType === 'properties' ? 'max_properties' : 'max_units';
      const fRes = await pool.query(
        `SELECT "limit" FROM plan_features WHERE plan_id=$1 AND feature_key=$2 LIMIT 1`,
        [activeSub.plan_id, featureKey]
      );
      if (fRes.rows.length) {
        quotaLimit = fRes.rows[0].limit == null ? null : Number(fRes.rows[0].limit);
      }
    }

    // null means unlimited
    if (quotaLimit == null) {
      return next();
    }

    const countQuery = entityType === 'properties'
      ? 'SELECT COUNT(*)::int AS total FROM properties WHERE landlord_id=$1'
      : 'SELECT COUNT(*)::int AS total FROM units u JOIN properties p ON u.property_id = p.id WHERE p.landlord_id=$1';
      
    const countRes = await pool.query(countQuery, [userId]);
    const currentCount = Number(countRes.rows[0].total || 0);

    if (currentCount >= quotaLimit) {
      return res.status(403).json({
        message: `${entityType === 'properties' ? 'Property' : 'Unit'} limit reached for current plan (${quotaLimit}). Upgrade to add more.`,
      });
    }

    return next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: `Failed to validate ${entityType} limit` });
  }
};

module.exports = {
  requireActiveSubscription,
  requirePlan,
  requireFeature,
  enforceQuotaLimit,
};
