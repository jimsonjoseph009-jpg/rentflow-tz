const fail = (res, errors) => res.status(400).json({ message: 'Validation failed', errors });

const requireFields = (fields) => (req, res, next) => {
  const errors = [];
  for (const field of fields) {
    const value = req.body[field];
    if (value === undefined || value === null || value === '') {
      errors.push({ field, message: `${field} is required` });
    }
  }
  if (errors.length) return fail(res, errors);
  return next();
};

const oneOf = (field, allowed) => (req, res, next) => {
  const value = req.body[field];
  if (value === undefined || value === null || value === '') return next();
  if (!allowed.includes(value)) {
    return fail(res, [{ field, message: `${field} must be one of: ${allowed.join(', ')}` }]);
  }
  return next();
};

const isPositiveNumber = (field) => (req, res, next) => {
  const value = req.body[field];
  if (value === undefined || value === null || value === '') return next();
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fail(res, [{ field, message: `${field} must be a positive number` }]);
  }
  return next();
};

const isPhoneLike = (field) => (req, res, next) => {
  const value = req.body[field];
  if (!value) return next();
  if (!/^\+?[0-9]{9,15}$/.test(String(value).replace(/\s+/g, ''))) {
    return fail(res, [{ field, message: `${field} must be a valid phone number` }]);
  }
  return next();
};

module.exports = {
  requireFields,
  oneOf,
  isPositiveNumber,
  isPhoneLike,
};
