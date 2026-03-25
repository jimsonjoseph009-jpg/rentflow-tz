# RentFlow-TZ: Deploy for iOS + Android (PWA)

## 1) Deploy backend (Render)

- Use `render.yaml` in repo root.
- Create Web Service from this repo.
- Confirm root directory is `backend`.
- Set env vars in Render dashboard (sensitive keys):
  - `JWT_SECRET`
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`
  - `FASTLIPA_API_KEY`, `FASTLIPA_SECRET`, `FASTLIPA_MERCHANT_ID`
  - `BEEM_API_KEY`, `BEEM_SECRET_KEY`
  - `FRONTEND_URL` (set after frontend deploy)
  - `API_PUBLIC_URL` (your backend URL)

Health check: `https://<backend-domain>/api/health`

## 2) Deploy frontend (Vercel)

- Import `frontend` as project.
- Framework preset: Create React App.
- Build command: `npm run build`
- Output directory: `build`
- Add env var:
  - `REACT_APP_API_BASE=https://<backend-domain>`

`frontend/vercel.json` already handles SPA route rewrites.

## 3) Connect CORS

After frontend is live, set backend env:
- `FRONTEND_URL=https://<frontend-domain>`

If you have multiple domains, use comma-separated values:
- `FRONTEND_URL=https://app.example.com,https://www.app.example.com`

## 4) Test install on mobile

- Android/Chrome: open site -> menu -> `Install app`.
- iOS/Safari: open site -> Share -> `Add to Home Screen`.

## 5) Verify payment + webhook

- Fastlipa callback should target:
  - `https://<backend-domain>/api/payments/callback`

## 6) Important security note

Your current `.env` shows a real-looking Fastlipa key. Rotate API keys after deployment and keep only fresh keys in production env.
