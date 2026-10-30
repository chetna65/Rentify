# Rentify Deployment Guide

This guide details the deployment steps for running Rentify in a production environment (e.g., Frontend on Vercel, Backend on a Node.js cloud host like Render, Railway, Fly.io, or AWS, paired with managed MySQL and MongoDB Atlas).

---

## 1. Architecture Overview

- **Frontend**: Vite + React SPA hosted on **Vercel** with edge routing and API rewrites.
- **Backend API**: Node.js (v20.6+ / v22+) Express service hosted on a container/PaaS runner.
- **Relational Database**: Managed MySQL 8 (AWS RDS, GCP Cloud SQL, PlanetScale, Aiven).
- **Document Database**: MongoDB Atlas (v7.0+ or v8.0+).

---

## 2. Database Preparation & Migration

Before starting the backend, provision the databases and execute the schema migrations:

### A. Managed MySQL Configuration (Triggers & Functions)
If your managed MySQL instance has binary logging enabled (`log_bin = 1`), MySQL blocks creation of triggers/functions without elevated permissions or trust settings:
1. Verify the setting:
   ```sql
   SHOW VARIABLES LIKE 'log_bin_trust_function_creators';
   ```
2. If `OFF`, enable it:
   - In Cloud Console (AWS RDS Parameter Group, GCP Cloud SQL Flags, Aiven Advanced Configuration): set `log_bin_trust_function_creators = 1`.
   - Or as an admin user with `SUPER` or `SYSTEM_VARIABLES_ADMIN`:
     ```sql
     SET GLOBAL log_bin_trust_function_creators = 1;
     ```

### B. Run Migrations & Mongo Init
From the `database/` directory:
```bash
# Set your production database environment variables or populate a temporary .env
export MYSQL_HOST="db.prod.example.com"
export MYSQL_PORT="3306"
export MYSQL_DATABASE="rentify"
export MYSQL_USER="rentify_app"
export MYSQL_PASSWORD="<prod_mysql_password>"
export MYSQL_SSL="true"
# export MYSQL_SSL_CA="/path/to/ca.pem" (if custom CA required)

export MONGO_URI="mongodb+srv://rentify_app:<prod_mongo_password>@cluster0.example.mongodb.net/rentify?retryWrites=true&w=majority"
export MONGO_DB="rentify"

# Run migrations and setup
npm run db:setup
```

---

## 3. Backend API Deployment

### Build & Run Commands
- **Install Command**: `cd server && npm install --omit=dev`
- **Start Command**: `cd server && npm start` (or from repository root: `npm start`)
- The server automatically starts using host environment variables without requiring a `.env` file (`--env-file-if-exists=.env`).

### Ephemeral Storage Warning
Uploaded documents are written to local disk (configurable via `UPLOAD_DIR`, default `uploads`). Most cloud container hosts have ephemeral filesystems where files are cleared upon redeploy. For persistent document storage in production, mount a persistent volume to `UPLOAD_DIR` or attach cloud object storage (e.g., S3/GCS).

---

## 4. Backend Environment Variables Reference

Configure these environment variables in your hosting provider's dashboard (e.g. Render / Railway environment settings):

| Variable | Required | Example Production Value | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | Port for Express to bind. Most PaaS provide this automatically. |
| `NODE_ENV` | **Yes** | `production` | Enables production security guards, proxy IP trusting, and cookie flags. |
| `CORS_ORIGIN` | **Yes** | `https://rentify.example.com` | Allowed frontend origin. **Must be an `https://` URL in production.** |
| `SESSION_TTL_HOURS` | Optional | `72` | Session lifetime in hours. |
| `DEV_OTP` | **Yes** | `849201` | Secret fallback OTP. **Cannot be `123456` in production.** |
| `UPLOAD_DIR` | Optional | `/mnt/data/uploads` | Path to store uploaded files. Defaults to `./uploads`. |
| `MYSQL_HOST` | Conditional | `mysql.internal.example.com` | MySQL server hostname. |
| `MYSQL_PORT` | Optional | `3306` | MySQL port (defaults to 3306). |
| `MYSQL_DATABASE` | **Yes** | `rentify` | MySQL database name. |
| `MYSQL_USER` | **Yes** | `rentify_app` | MySQL username. |
| `MYSQL_PASSWORD` | **Yes** | `ProdPassword_982!x` | MySQL user password. |
| `MYSQL_SSL` | Optional | `true` | Set to `true` to enable TLS/SSL for MySQL. |
| `MYSQL_SSL_CA` | Optional | `/etc/ssl/certs/rds-ca.pem` | Path to CA cert file or pasted PEM contents. |
| `MONGO_URI` | **Yes (Preferred)** | `mongodb+srv://user:pass@cluster0.mongodb.net/rentify?retryWrites=true&w=majority` | Full MongoDB connection string. When provided, `MONGO_HOST/PORT/APP_USER/APP_PASSWORD` are not needed. |
| `MONGO_DB` | **Yes** | `rentify` | Name of the MongoDB database schema. |
| `MONGO_HOST` | Conditional | `127.0.0.1` | Used only if `MONGO_URI` is omitted. |
| `MONGO_PORT` | Optional | `27017` | Used only if `MONGO_URI` is omitted. |
| `MONGO_APP_USER` | Conditional | `rentify_app` | Used only if `MONGO_URI` is omitted. |
| `MONGO_APP_PASSWORD` | Conditional | `MongoSecret_482!z` | Used only if `MONGO_URI` is omitted. |

---

## 5. Frontend Deployment (Vercel)

1. Deploy the project to **Vercel** with Vite presets:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
2. Update `vercel.json`:
   Replace `https://REPLACE_WITH_BACKEND_URL` in `vercel.json` with your deployed backend URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://api.yourdomain.com/api/$1"
       },
       {
         "source": "/((?!api/).*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Push to Vercel. Requests to `/api/*` will automatically be proxied to your backend without CORS issues, and all client-side navigation paths will route to `/index.html`.

---

## 6. Post-Deployment Verification

1. **API Health Check**:
   ```bash
   curl -i https://api.yourdomain.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-10-30T00:00:00.000Z",
     "services": {
       "mysql": "up",
       "mongo": "up"
     }
   }
   ```
2. **Frontend Walkthrough**:
   Open `https://rentify.example.com`, verify property listings load, filter by city (Nagpur / Pune), and test the authentication and listing creation flows.
