# Rentify frontend integration notes

The updated frontend from the supplied `Idea Lab Project frontend` archive has been merged into the existing Rentify application. The Express backend, database migrations, API client modules, and `/api` Vite development proxy were retained.

## What changed
- Added the refreshed public landing page, cookie-consent banner, privacy and terms pages, custom 404 page, and page metadata/analytics helpers.
- Updated the shared UI components and role dashboards from the refreshed frontend.
- Kept `src/api/` and the backend-aware `RentifyContext` from the existing Rentify project so API workflows are not silently replaced by the updated archive's local-only demo store.
- Added compatibility methods (`loginAsDemoUser`, `loginAsGuest`) required by the refreshed login/landing pages. Demo role sign-in uses the existing backend demo OTP flow; guest access is a local-only customer demo session.
- Preserved the Vite `/api` proxy to `http://localhost:5000`.

## Run locally
1. Install root dependencies: `npm install`
2. Start the backend in a separate terminal: `cd server && npm install && npm run dev` (or use the script documented in `server/README.md`).
3. Start the frontend from the project root: `npm run dev`
4. Configure `server/.env` and `database/.env` from their respective `.env.example` files. Do not commit real secrets.

The integration archive intentionally excludes `node_modules`, generated build folders, local `.env` secrets, and uploaded verification documents. Keep your original local `.env` files and uploaded files backed up when replacing a local project folder.
