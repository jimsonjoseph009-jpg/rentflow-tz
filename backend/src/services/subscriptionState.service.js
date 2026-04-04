const pool = require('../config/db');

const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
const ACCESS_ALLOWED_STATUSES = ['active', 'trial', 'grace_period'];

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const deriveEffectiveSubscription = (subscription) => {
  if (!subscription) return null;

  const storedStatus = normalizeStatus(subscription.status) || 'trial';
  const expiresAtMs = subscription.expires_at ? new Date(subscription.expires_at).getTime() : null;
  const hasKnownExpiry = Number.isFinite(expiresAtMs);
  const now = Date.now();
  const expired = hasKnownExpiry ? expiresAtMs < now : false;

  let effectiveStatus = storedStatus;
  let withinGracePeriod = false;
  let gracePeriodEndsAt = null;

  if (expired) {
    if (storedStatus === 'active' && now - expiresAtMs <= GRACE_PERIOD_MS) {
      effectiveStatus = 'grace_period';
      withinGracePeriod = true;
      gracePeriodEndsAt = new Date(expiresAtMs + GRACE_PERIOD_MS).toISOString();
    } else {
      effectiveStatus = 'expired';
    }
  }

  return {
    ...subscription,
    status: effectiveStatus,
    stored_status: storedStatus,
    expired,
    within_grace_period: withinGracePeriod,
    grace_period_ends_at: gracePeriodEndsAt,
    access_allowed: ACCESS_ALLOWED_STATUSES.includes(effectiveStatus),
  };
};

const buildLegacyFallbackSubscription = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       l.subscription_plan AS legacy_plan_code,
       l.subscription_status AS legacy_status,
       p.id AS plan_id,
       p.code AS plan_code,
       p.name AS plan_name,
       p.price_monthly,
       p.price_yearly
     FROM landlords l
     LEFT JOIN plans p
       ON p.code = CASE
         WHEN l.subscription_plan IS NULL OR l.subscription_plan = 'trial' THEN 'starter'
         ELSE l.subscription_plan
       END
     WHERE l.user_id=$1
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) return null;

  const legacy = rows[0];
  const legacyStatus = normalizeStatus(legacy.legacy_status);
  const planCode = legacy.plan_code || (legacy.legacy_plan_code === 'trial' ? 'starter' : legacy.legacy_plan_code || 'starter');

  let status = legacyStatus || 'trial';
  if (legacy.legacy_plan_code === 'trial' && status === 'active') {
    status = 'trial';
  }
  if (!['active', 'trial', 'cancelled', 'expired'].includes(status)) {
    status = 'trial';
  }

  return deriveEffectiveSubscription({
    id: null,
    user_id: userId,
    plan_id: legacy.plan_id || null,
    plan_code: planCode,
    plan_name: legacy.plan_name || 'Starter Plan',
    price_monthly: legacy.price_monthly || null,
    price_yearly: legacy.price_yearly || null,
    status,
    billing_cycle: null,
    started_at: null,
    expires_at: null,
    cancelled_at: null,
    is_legacy_fallback: true,
  });
};

const resolveUserSubscription = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       us.*,
       p.code AS plan_code,
       p.name AS plan_name,
       p.price_monthly,
       p.price_yearly
     FROM user_subscriptions us
     LEFT JOIN plans p ON us.plan_id = p.id
     WHERE us.user_id=$1
     LIMIT 1`,
    [userId]
  );

  if (rows.length) {
    return deriveEffectiveSubscription(rows[0]);
  }

  return buildLegacyFallbackSubscription(userId);
};

const syncDerivedSubscriptionStatus = async (userId, subscription) => {
  if (!subscription?.id) return subscription;
  if (subscription.status !== 'expired') return subscription;
  if (!['active', 'trial'].includes(subscription.stored_status)) return subscription;

  await pool.query(
    `UPDATE user_subscriptions
     SET status='expired', updated_at=NOW()
     WHERE user_id=$1`,
    [userId]
  );

  return {
    ...subscription,
    stored_status: 'expired',
  };
};

const hasSubscriptionAccess = (subscription) => Boolean(subscription?.access_allowed);

module.exports = {
  ACCESS_ALLOWED_STATUSES,
  GRACE_PERIOD_MS,
  deriveEffectiveSubscription,
  hasSubscriptionAccess,
  resolveUserSubscription,
  syncDerivedSubscriptionStatus,
};
