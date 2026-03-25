# Monetization API Smoke Tests

Run backend first, then execute:

```bash
TOKEN=<jwt_token> API_BASE=http://localhost:5000/api ./backend/scripts/smoke-monetization.sh
```

This validates key SaaS endpoints:
- `/api/plans`
- `/api/subscription-status`
- `/api/billing-history`
- `/api/transaction-fees`
- `/api/sms-usage`

For CI later, migrate these checks into automated integration tests with seeded DB fixtures.
