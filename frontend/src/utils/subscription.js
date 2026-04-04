export const ACCESS_ALLOWED_STATUSES = ['active', 'trial', 'grace_period'];

export const getSubscriptionStatus = (subscriptionOrStatus) => {
  if (typeof subscriptionOrStatus === 'string') {
    return subscriptionOrStatus.trim().toLowerCase();
  }

  return String(subscriptionOrStatus?.status || '').trim().toLowerCase();
};

export const hasSubscriptionAccess = (subscription) => {
  if (!subscription) return false;
  if (typeof subscription.access_allowed === 'boolean') {
    return subscription.access_allowed;
  }

  return ACCESS_ALLOWED_STATUSES.includes(getSubscriptionStatus(subscription));
};

export const isTrialSubscription = (subscription) => getSubscriptionStatus(subscription) === 'trial';

export const isGracePeriodSubscription = (subscription) => getSubscriptionStatus(subscription) === 'grace_period';
