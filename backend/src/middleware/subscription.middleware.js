const pool = require('../config/db');

const getUserPlanContext = async (userId) => {
  const { rows } = await pool.query(
    `SELECT us.status, us.expires_at, p.id AS plan_id, p.code AS plan_code
     FROM user_subscriptions us
     LEFT JOIN plans p ON us.plan_id = p.id
     WHERE us.user_id=$1`,
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  const sub = rows[0];
  const expired = sub.expires_at && new Date(sub.expires_at) < new Date();
  return { ...sub, expired };
};

const requireActiveSubscription = async (req, res, next) => {
  try {
    // Tenants don't have subscriptions but need access to certain sub-protected features (like emergency contacts)
    if (req.user.role === 'tenant') {
      return next();
    }

    const sub = await getUserPlanContext(req.user.id);

    if (!sub) {
      return res.status(402).json({ message: 'No subscription found' });
    }

    if (!['active', 'trial'].includes(sub.status) || sub.expired) {
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
    const sub = await getUserPlanContext(req.user.id);

    if (!sub || !['active', 'trial'].includes(sub.status) || sub.expired) {
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
    const sub = await getUserPlanContext(req.user.id);

    if (!sub || !sub.plan_id || !['active', 'trial'].includes(sub.status) || sub.expired) {
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
    const userId = req.user.id;
    const subRes = await pool.query(
      `SELECT us.status, us.expires_at, us.plan_id
       FROM user_subscriptions us
       WHERE us.user_id=$1`,
      [userId]
    );

    const activeSub = subRes.rows[0] || null;
    let expired = activeSub?.expires_at ? new Date(activeSub.expires_at) < new Date() : false;
    
    // account for grace period
    if (expired && activeSub?.expires_at) {
      const msLeft = new Date(activeSub.expires_at).getTime() - Date.now();
      if (Math.abs(msLeft) <= 48 * 60 * 60 * 1000) expired = false; // allow creation during grace period
    }

    let quotaLimit = 10; // Default limit for trial / absent plan
    if (activeSub && ['active', 'trial'].includes(activeSub.status) && !expired) {
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
