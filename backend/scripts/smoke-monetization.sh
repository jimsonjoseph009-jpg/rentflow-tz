#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:5000/api}"
TOKEN="${TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set TOKEN env var first. Example: TOKEN=... ./backend/scripts/smoke-monetization.sh"
  exit 1
fi

AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

printf "\n[1] Plans\n"
curl -sS "${API_BASE}/plans" | head -c 300; echo

printf "\n[2] Subscription Status\n"
curl -sS "${API_BASE}/subscription-status" "${AUTH[@]}" | head -c 300; echo

printf "\n[3] Billing History\n"
curl -sS "${API_BASE}/billing-history" "${AUTH[@]}" | head -c 300; echo

printf "\n[4] Transaction Fees\n"
curl -sS "${API_BASE}/transaction-fees" "${AUTH[@]}" | head -c 300; echo

printf "\n[5] SMS Usage\n"
curl -sS "${API_BASE}/sms-usage" "${AUTH[@]}" | head -c 300; echo

printf "\nSmoke checks completed.\n"
