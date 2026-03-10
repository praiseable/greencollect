# Deployment: gc.directconnect.services

Backend API and admin portal are deployed with DNS **gc.directconnect.services**, served over **HTTPS** via **Docker**.

---

## Validation (verified)

| Check | Result |
|-------|--------|
| **Server IP** | `49.13.119.60` |
| **DNS** | `gc.directconnect.services` → `49.13.119.60` ✅ |
| **HTTPS** | TLS on 443, HSTS enabled ✅ |
| **API** | `https://gc.directconnect.services/api/*` → backend (Docker) ✅ |
| **Stack** | Docker Compose (backend + web-client Nginx + web-admin) |

- **Main site / API:** `https://gc.directconnect.services` (Nginx → backend, SSL via Let’s Encrypt).
- **Admin portal:** `https://gc.directconnect.services:8080` (web-admin container).

---

## 1. Backend (API)

Runs in Docker on the server **49.13.119.60** (hostname **gc.directconnect.services**).

### Environment (backend)

Create `backend/.env` (do not commit). Example:

```env
# Database — your PostgreSQL URL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"

# Server
PORT=4000
NODE_ENV=production

# JWT (use strong random secrets in production)
JWT_SECRET=your_jwt_secret_min_32_chars_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

### Run backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

- API base: `https://gc.directconnect.services/api`
- Backend health (inside Docker): backend container `http://backend:4000/health`. (Nginx currently serves the SPA at `/`; to expose health publicly, add a `location /health` proxy in `apps/web-client/nginx.conf`.)
- **Docker:** Use `docker-compose.prod.yml`; backend runs on port 4000, Nginx (web-client) handles 80/443 with HTTPS and proxies `/api/`, `/v1/`, `/uploads/`, `/socket.io/` to the backend.

### Run with Docker (production)

On the server (49.13.119.60), with DNS pointing to this host and SSL certs in place (e.g. Certbot volume `certbot-certs`):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Ensure ports 80, 443, and 8080 are open; 4000 is only used internally by Nginx.

---

## 2. Web admin (portal)

Deployed so the portal is reachable at **gc.directconnect.services** (or a path like `/admin` on the same host).

### Build with API URL

Set the API base URL to your backend. Create `apps/web-admin/.env.production` (or `.env` when building):

```env
# Backend API at gc.directconnect.services
VITE_API_URL=https://gc.directconnect.services/api
```

For HTTP (no TLS) use: `VITE_API_URL=http://gc.directconnect.services/api`

Build:

```bash
cd apps/web-admin
npm install
npm run build
```

Serve the `dist/` folder from your server (same Nginx as backend or separate):

- **Option A:** Portal at root: `https://gc.directconnect.services/` → serve `web-admin/dist`, and proxy `https://gc.directconnect.services/api` → backend (e.g. `http://127.0.0.1:4000`).
- **Option B:** Portal at subpath: e.g. `https://gc.directconnect.services/admin/` → serve `web-admin/dist` with base `/admin/`, and proxy `/api` to backend.

If portal is on a different subdomain (e.g. `admin.gc.directconnect.services`), set:

```env
VITE_API_URL=https://gc.directconnect.services/api
```

and build again so the portal talks to the API at **gc.directconnect.services**.

---

## 3. Summary

| What        | URL / note |
|------------|------------|
| **Server IP** | `49.13.119.60` |
| **DNS** | **gc.directconnect.services** → `49.13.119.60` |
| **HTTPS** | Yes (Let’s Encrypt, Nginx in Docker) |
| **Backend API** | `https://gc.directconnect.services/api` |
| **Web app** | `https://gc.directconnect.services` (web-client SPA) |
| **Admin portal** | `https://gc.directconnect.services:8080` (web-admin in Docker) |
| **DB** | PostgreSQL in Docker (`db` service) or set `DATABASE_URL` in `docker-compose.prod.yml` |
| **Portal build** | Use `VITE_API_URL=https://gc.directconnect.services/api` when building web-admin |
