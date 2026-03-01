# 🔄 User Flow Diagrams — GreenCollect

## Flow 1: House Owner Posts Garbage

```
House Owner Opens App
        │
        ▼
  Login via OTP
        │
        ▼
  Tap "Post Garbage"
        │
        ▼
  Take / Upload Photo(s)
        │
        ▼
  Select Garbage Type
  (Paper / Plastic / Metal...)
        │
        ▼
  GPS auto-fills location
  (can edit manually)
        │
        ▼
  Enter Weight Estimate
  + Asking Price
        │
        ▼
  Submit Listing ──────────────► [Server: listing created, status=OPEN]
        │                                    │
        ▼                                    ▼
  "Listing Posted!"              Nearby collectors notified
  Status: Waiting                via push notification (FCM)
```

---

## Flow 2: Local Collector Accepts & Collects

```
Collector receives push notification
"New garbage listing 1.2km away - Paper - ₹50"
        │
        ▼
  Opens App → Map View
  (sees listing pin)
        │
        ▼
  Taps listing → Views details
  (photo, address, weight, price)
        │
        ▼
  Taps "Accept Job"
        │
        ▼
  [Server: status = ASSIGNED]
  House owner notified:
  "Collector is coming!"
        │
        ▼
  Navigates to location
  (Google Maps / in-app)
        │
        ▼
  Arrives, collects garbage
  Confirms actual weight
        │
        ▼
  Pays house owner (cash/UPI)
  Taps "Mark as Collected + Paid"
        │
        ▼
  [Server: status = COMPLETED]
  House owner gets notification
  + payment confirmation
        │
        ▼
  Collector selects
  "Add to Collection Point"
  ──► Inventory updated at CP
```

---

## Flow 3: Notification Radius Logic

```
New listing posted at location L

Server queries:
SELECT users WHERE role = 'local_collector'
  AND is_active = TRUE
  AND distance(location, L) <= 5km
  ORDER BY distance ASC

Top 10 nearest collectors → FCM push notification sent

If nobody accepts in 30 mins → expand radius to 10km
If nobody accepts in 1 hour  → expand radius to 20km
```

---

## Flow 4: Regional Collector Buys Bulk

```
Regional Collector logs in (App or Web Portal)
        │
        ▼
  Browse "Available Inventory"
  Filter: City | Garbage Type | Min Weight
        │
        ▼
  Views Collection Point inventory
  e.g. "Delhi North CP: 125kg Paper available"
        │
        ▼
  Places Bulk Order
  "I want 100kg Paper @ ₹7.50/kg"
        │
        ▼
  [Server: bulk_order status = PENDING]
  CP Manager notified
        │
        ▼
  CP Manager confirms order
  [status = CONFIRMED]
        │
        ▼
  Regional Collector arrives
  Picks up garbage
  Taps "Pickup Done"
        │
        ▼
  [status = COMPLETED]
  Inventory reduced at CP
  Payment processed
```

---

## Flow 5: Admin Oversight

```
Admin Web Portal:
        │
        ├─► User Management
        │     - Verify new collectors (ID check)
        │     - Ban fraudulent users
        │
        ├─► Listings Overview
        │     - Filter by city/status/type
        │     - Intervene in disputes
        │
        ├─► Collection Points
        │     - View inventory levels
        │     - Assign managers
        │
        └─► Analytics
              - Daily/weekly/monthly stats
              - Revenue, volume by type
              - Collector performance
```

---

## Notification Types Summary

| Event | Who Gets Notified | Message |
|-------|------------------|---------|
| New listing posted | Nearby collectors (5km) | "New pickup: Paper, 5kg, ₹50 — 1.2km away" |
| Collector accepted | House owner | "Collector Raju is on the way!" |
| Job collected | House owner | "Garbage collected! Payment: ₹45 received" |
| Bulk order placed | CP Manager | "Regional buyer wants 100kg Paper" |
| Order confirmed | Regional collector | "Your order confirmed. Pickup ready." |
| No collectors (30min) | House owner | "Still searching for a collector nearby" |
