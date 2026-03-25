const toMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const getOverride = (code, cycle) => {
  const key = `${String(code || '').toUpperCase()}_PRICE_${cycle === 'yearly' ? 'YEARLY' : 'MONTHLY'}_TZS`;
  return toMoney(process.env[key]);
};

exports.resolvePlanPrice = (plan, billingCycle) => {
  const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const code = plan?.code;
  const override = getOverride(code, cycle);
  if (override != null) return override;
  return Number(cycle === 'yearly' ? plan.price_yearly : plan.price_monthly);
};

exports.applyPlanPriceOverrides = (plan) => {
  if (!plan) return plan;
  const monthly = getOverride(plan.code, 'monthly');
  const yearly = getOverride(plan.code, 'yearly');
  return {
    ...plan,
    price_monthly: monthly != null ? monthly : plan.price_monthly,
    price_yearly: yearly != null ? yearly : plan.price_yearly,
  };
};

