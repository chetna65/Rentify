# Rentify — Quick Start & Run Guide

This guide details the exact steps to start the Rentify platform on a fresh day.

---

## 1. Daily Startup Sequence (In Order)

### Step 1: Start Docker Desktop
* Open **Docker Desktop** on Windows and wait until the status indicator turns green (**"Engine running"**).
* Verify in PowerShell:
  ```powershell
  docker ps
  ```

---

### Step 2: Start the Databases
Open a terminal in the `database/` directory:
```powershell
cd database
npm run db:up
```
> Both `rentify-db-mysql-1` and `rentify-db-mongo-1` will start and report `(healthy)`.
> *(If running for the very first time on a fresh setup, initialize with `npm run db:setup`)*.

---

### Step 3: Start the Backend API Server
Open a second terminal in the `server/` directory:
```powershell
cd server
npm run dev
```
> Server will start on **`http://localhost:5000`** with watch mode enabled.  
> Verify health: `http://localhost:5000/api/health` returns `{"mysql":"up","mongo":"up"}`.

---

### Step 4: Start the Frontend Application
Open a third terminal in the project root:
```powershell
npm run dev
```
> Vite dev server will launch on **`http://localhost:5173`**.  
> Open **`http://localhost:5173`** in your browser. All API requests (`/api/...`) are automatically proxied to port 5000 without CORS issues.

---

## 2. Demo Stakeholder Accounts & Credentials

* **Dev OTP (all accounts):** `123456`

| Persona / Role | Demo Phone Number | Name & Title | Assigned City / Zone |
| :--- | :--- | :--- | :--- |
| **Customer** | `+910000000001` | Aarav Sharma (Tenant / Scholar) | Nagpur / Pune |
| **Vendor** | `+910000000002` | Rajesh M. Sharma (Property Owner) | Nagpur |
| **Admin** | `+910000000003` | Arvind Mehta (Chief Registrar) | Nagpur & Pune Desks |
| **Partner (Nagpur)** | `+910000000004` | Amit Patil (Field Officer, VP-042) | Nagpur Central & Civil Lines |
| **Partner (Pune)** | `+910000000005` | Pooja Kulkarni (Field Officer, VP-108) | Pune Metro & Viman Nagar |

---

## 3. How to Stop Everything

1. **Frontend & Server:** Press `Ctrl + C` in their respective terminal windows.
2. **Databases:** In the `database/` directory, run:
   ```powershell
   cd database
   npm run db:down
   ```
   *(This stops both MySQL and MongoDB containers while preserving existing database records).*

---

## 4. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Docker not running** | Docker Desktop engine is stopped or not launched yet. | Open the Docker Desktop app from the Start menu and wait until the bottom-left icon shows green / "Engine running". |
| **Port already in use** (e.g. `3306` or `5173`) | A local Windows service (like a native `mysqld` service) or background process is already listening on that port. | • **For MySQL (3306):** In `database/.env` and `server/.env`, set `MYSQL_PORT=3307`. Docker maps host port `3307` to container port `3306`, resolving host conflicts.<br>• **For Frontend (5173):** Check `netstat -ano \| findstr :5173` and terminate conflicting background Node instances with `Stop-Process -Id <PID> -Force`. |
| **"Access Denied" after editing `.env`** | Passwords in `.env` were modified, but Docker is still mounting old database volumes initialized with previous credentials. | Recreate the volumes with the new credentials in the `database/` folder:<br>1. `docker compose down -v`<br>2. `npm run db:up`<br>3. `npm run db:setup` |
| **CORS errors in browser** | Frontend client is making direct cross-origin calls to port 5000 instead of using relative `/api` paths through Vite's proxy, or `CORS_ORIGIN` mismatch. | • Verify frontend requests use relative paths (e.g. `/api/listings`) so Vite's dev server proxies them.<br>• Ensure `CORS_ORIGIN=http://localhost:5173` is set in `server/.env`. |
