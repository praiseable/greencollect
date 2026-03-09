# How Listings Are Stored in the Backend & How to Access Them (Admin)

This guide explains **where listings are stored**, **how they get there**, and **how you can view and manage them** from a backend/admin perspective.

---

## 1. Where are listings stored?

Listings are stored in the **PostgreSQL database** used by the backend. The backend app (in the `backend/` folder) uses **Prisma** to read and write to tables such as:

- **`Listing`** — main table: title, description, price, quantity, category, seller, location (geoZoneId, cityName, lat/lng), status, etc.
- **`ListingImage`** — one row per image per listing (URL or path).
- Related tables: **Category**, **Unit**, **GeoZone**, **User** (seller).

So when we say “store in the backend”, we mean: **the backend API receives the data and saves it into these database tables**.

---

## 2. How do listings get into the backend?

Listings get into the backend when the **mobile app (or any client) calls the backend API** to create a listing.

### API endpoint (create listing)

- **URL:** `POST /v1/listings` (or `POST /api/listings` — same handler).
- **Base URL:** From the mobile app config it is `https://gc.directconnect.services/v1` (production) or `http://10.0.2.2:4000/v1` (Android emulator to local backend).
- **Auth:** **Required.** The request must include a valid JWT in the header:  
  `Authorization: Bearer <token>`
- **Body (JSON):** The backend expects something like:

```json
{
  "title": "200 kg Copper Wire",
  "description": "99% pure copper wire from factory.",
  "categoryId": "<uuid-of-category-from-backend>",
  "pricePaisa": 2500000,
  "priceNegotiable": true,
  "quantity": 200,
  "unitId": "<uuid-of-unit-from-backend>",
  "geoZoneId": "<uuid-of-zone-from-backend>",
  "latitude": 24.8607,
  "longitude": 67.0011,
  "address": "Korangi Industrial Area",
  "cityName": "Karachi",
  "contactNumber": "+923005268167"
}
```

Notes:

- **pricePaisa** = price in paisa (e.g. Rs. 25,000 → `2500000`).
- **categoryId**, **unitId**, **geoZoneId** must be **IDs that already exist** in the database (from seed or from backend APIs like `GET /v1/categories`, `GET /v1/units`, `GET /v1/geo-zones`).
- The backend sets **sellerId** from the JWT (logged-in user). It does **not** accept sellerId in the body.

When this request succeeds (201), the backend **creates a row in the `Listing` table** (and optionally `ListingImage` if you upload images). So **the list is stored in the backend** as soon as this API is used successfully.

### Current mobile app behaviour

- The **create listing** screen in the app currently **does not call this API**. It only adds the new listing to **in-memory state** (Riverpod `userPostedListingsProvider`), so:
  - New listings **do not** persist in the database.
  - They **do not** appear in the admin or in other devices.
- To **store listings in the backend**, the app must:
  1. Use **real login** that returns a JWT and store it (e.g. in `StorageService`), and
  2. On submit of the create-listing form, call `POST /v1/listings` with the body above (mapping form fields and resolving categoryId/unitId/geoZoneId from backend APIs or config).

So: **the list is stored in the backend only when the client (e.g. mobile app) actually calls the create-listing API with a valid token.**

---

## 3. How can I access the list from the backend / admin?

You have **three** main ways to “see” and manage listings that are stored in the backend.

### Option A — Admin REST API (recommended for integration)

The backend exposes **admin-only** routes. You need to be logged in as an **admin** user and use the returned JWT.

**1. Get an admin token**

- Login (e.g. with an admin user created by the seed):
  - `POST /api/auth/login` (or `/v1/auth/login` if you have it) with body like:
    `{ "email": "admin@marketplace.pk", "password": "Admin@123456" }`
  - Or use the credentials from `backend/prisma/seed.js` (see “Default Admin” in `backend/README.md`).
- Use the **token** from the response in the next requests.

**2. List all listings (admin)**

- **GET** `/api/admin/all-listings`
- **Headers:** `Authorization: Bearer <admin-token>`
- **Query (optional):** `?page=1&limit=20&status=ACTIVE`
- **Response:** Paginated list of listings (with seller, category, geoZone, etc.).

So you can **access the list** by calling this endpoint from:

- Postman / Insomnia
- A custom “admin portal” (web or mobile) that you build and that calls this API
- A script (curl, Node, etc.)

**3. Change a listing’s status (admin)**

- **PUT** `/api/admin/listings/:id/status`
- **Body:** `{ "status": "ACTIVE" }` (or CLOSED, SOLD, etc. — see Prisma schema `ListingStatus`).
- **Headers:** `Authorization: Bearer <admin-token>`

There is **no built-in “admin portal UI”** in this repo — only the **API**. So “access using backend admin portal” means: **use the admin API** (and optionally build a small UI that calls it).

### Option B — Prisma Studio (direct database view)

You can open the database in a visual editor:

1. In a terminal:
   ```bash
   cd backend
   npx prisma studio
   ```
2. Browser opens (e.g. `http://localhost:5555`).
3. Open the **Listing** model to see all rows (the “list” of listings).
4. You can filter, sort, and edit rows (e.g. change status). This is **direct DB access**, not through the API.

So you can **access the list** (and every stored listing) here without writing any admin UI.

### Option C — Public/list API (for app and for debugging)

- **GET** `/v1/listings` — returns listings (geo-fenced for non-admins; admins can see all).
- **GET** `/v1/listings/:id` — returns one listing by id.

These are the same APIs the mobile app would use to **load** the list after listings are stored in the backend. You can call them from the app, Postman, or a future admin UI to “see” what’s in the backend.

---

## 4. Short answers to your questions

| Question | Answer |
|----------|--------|
| **How can the list be stored in the backend?** | By having the app (or any client) call **POST /v1/listings** with a valid JWT and the required body (title, categoryId, pricePaisa, quantity, unitId, geoZoneId, etc.). The backend then saves a row in the `Listing` table. |
| **How can I access it using the backend admin portal?** | There is no pre-built admin portal UI in this repo. You can: **(1)** Use the **admin API** — **GET /api/admin/all-listings** (with admin JWT) to get the list, and **PUT /api/admin/listings/:id/status** to change status; **(2)** Use **Prisma Studio** (`npx prisma studio`) to open the database and view/edit the **Listing** table; **(3)** Build a small admin web app that calls the admin API. |

---

## 5. Summary diagram

```
[Mobile App]  --(POST /v1/listings + JWT)-->  [Backend API]  -->  [PostgreSQL: Listing table]
                                                                           |
[You / Admin]  <--(GET /api/admin/all-listings + admin JWT)--  [Backend API]
     or
[You]  <--(Prisma Studio)-->  [PostgreSQL: Listing table]  (direct DB view)
```

- **Storing the list:** client calls **POST /v1/listings** → backend writes to DB.
- **Accessing the list (admin):** call **GET /api/admin/all-listings** with admin token, or open **Prisma Studio** and look at the **Listing** table.

If you want, the next step can be: **wire the mobile create-listing screen to POST /v1/listings** (with auth and correct payload) so that new listings are actually stored in the backend and show up in the admin API and in Prisma Studio.
