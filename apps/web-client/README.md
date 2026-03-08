# 🌐 GreenCollect Web Client Portal

> React.js + Vite + TailwindCSS — Public Marketplace Portal

---

## 📋 Overview

The web client is a **React.js** single-page application that serves as the public-facing marketplace portal. Buyers, sellers, and dealers use it to browse listings, create posts, manage transactions, chat, and handle subscriptions. It features interactive **Leaflet/OpenStreetMap** maps and bilingual support (Urdu/English).

---

## 🛠️ Tech Stack

| Component       | Technology                           |
|-----------------|--------------------------------------|
| Framework       | React.js 18                          |
| Build Tool      | Vite                                 |
| Styling         | TailwindCSS                          |
| State Mgmt      | Zustand                              |
| Routing         | React Router DOM v6                  |
| Maps            | Leaflet + React-Leaflet (OpenStreetMap) |
| HTTP            | Axios                                |
| Notifications   | React-Toastify                       |
| Icons           | React-Icons (Feather)                |

---

## 📁 Project Structure

```
apps/web-client/
├── src/
│   ├── App.jsx                # Routes & layout
│   ├── main.jsx               # Entry point
│   ├── index.css              # Tailwind imports
│   ├── components/
│   │   ├── Layout.jsx         # Navbar + Outlet wrapper
│   │   ├── Navbar.jsx         # Top navigation bar
│   │   ├── MapPicker.jsx      # Interactive location picker (Leaflet)
│   │   └── MapView.jsx        # Single & multi-marker map views
│   ├── pages/
│   │   ├── Home.jsx           # Landing page, featured listings, map
│   │   ├── Login.jsx          # Email + password login
│   │   ├── Register.jsx       # User registration
│   │   ├── Listings.jsx       # Browse listings (grid + map toggle)
│   │   ├── ListingDetail.jsx  # Full listing details with map
│   │   ├── CreateListing.jsx  # Create listing form with MapPicker
│   │   ├── Dashboard.jsx      # User dashboard
│   │   ├── Profile.jsx        # User profile management
│   │   ├── Notifications.jsx  # Notification list
│   │   ├── Subscriptions.jsx  # Subscription plans
│   │   ├── Transactions.jsx   # Transaction history & deals
│   │   ├── Wallet.jsx         # Wallet balance & recharge
│   │   └── Chat.jsx           # Real-time chat interface
│   ├── store/
│   │   └── authStore.js       # Zustand auth state
│   └── services/
│       └── api.js             # Axios instance & API helpers
├── public/                    # Static assets
├── index.html                 # Leaflet CSS CDN link
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── package.json
├── Dockerfile                 # Multi-stage Nginx build
├── nginx.conf                 # Nginx server config
├── .dockerignore
└── README.md                  # This file
```

---

## 🚀 Quick Start

### 1. Environment Setup

Create `apps/web-client/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 2. Install & Run

```bash
cd apps/web-client
npm install
npm run dev
```

Opens at `http://localhost:5173` (Vite dev server)

### 3. Build for Production

```bash
npm run build
# Output: dist/
```

---

## 📄 Pages & Routes

| Route                | Component         | Auth | Description                    |
|----------------------|-------------------|------|--------------------------------|
| `/`                  | Home              | ❌   | Landing page                   |
| `/login`             | Login             | ❌   | User login                     |
| `/register`          | Register          | ❌   | User registration              |
| `/listings`          | Listings          | ❌   | Browse (grid + map toggle)     |
| `/listings/:id`      | ListingDetail     | ❌   | Listing detail with map        |
| `/create-listing`    | CreateListing     | ✅   | Post new listing               |
| `/dashboard`         | Dashboard         | ✅   | User dashboard                 |
| `/profile`           | Profile           | ✅   | Profile settings               |
| `/notifications`     | Notifications     | ✅   | Notification list              |
| `/subscriptions`     | Subscriptions     | ✅   | Subscription management        |
| `/transactions`      | Transactions      | ✅   | Deals & transaction history    |
| `/wallet`            | Wallet            | ✅   | Wallet balance & recharge      |
| `/chat`              | Chat              | ✅   | Chat rooms                     |
| `/chat/:roomId`      | Chat              | ✅   | Specific chat room             |

---

## 🗺️ Map Integration

- **MapPicker** — Click-to-place marker, address search, GPS location
- **MapView (Single)** — Show one listing location
- **MapView (Multi)** — Show all listings as markers on browse page
- **Library**: Leaflet + React-Leaflet (free, no API key needed)
- **Tile provider**: OpenStreetMap

---

## 🐳 Docker

```bash
# Build image
docker build -t gc-web-client .

# Run container
docker run -p 3003:80 gc-web-client
```

- Served by Nginx on port 80 inside container
- Exposed on port 3003 in docker-compose
- `client_max_body_size 25m` for file uploads

---

## 🔗 Related Docs

- [Project README](../../README.md) — Overall setup & deployment
- [Backend API](../../backend/README.md) — API endpoints reference
- [User Manual](../../docs/USER_MANUAL.md) — End-user guide
- [Original Requirements](../../docs/prompts/cursor_prompt.md) — Full specification

---

**Last Updated**: March 2026
