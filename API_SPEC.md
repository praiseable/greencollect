# 📡 API Specification — GreenCollect Mobile Backend

Base URL: `https://api.greencollect.app/v1`

All requests require `Authorization: Bearer <JWT>` except auth endpoints.

---

## 🔐 Authentication

### POST `/auth/send-otp`
```json
Request:  { "phone": "+919876543210" }
Response: { "message": "OTP sent", "otp_id": "abc123" }
```

### POST `/auth/verify-otp`
```json
Request:  { "phone": "+919876543210", "otp": "123456", "otp_id": "abc123" }
Response: { "access_token": "...", "refresh_token": "...", "user": {...} }
```

### POST `/auth/refresh`
```json
Request:  { "refresh_token": "..." }
Response: { "access_token": "..." }
```

### PUT `/auth/register-details`
```json
Request:  { "name": "Raju Kumar", "role": "house_owner", "fcm_token": "..." }
Response: { "user": {...} }
```

---

## 📦 Listings

### POST `/listings` _(house owner)_
```json
Request (multipart/form-data):
{
  "photos": [File, File],
  "garbage_type_id": "uuid",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "address": "123 Main St, Delhi",
  "estimated_weight": 5.5,
  "asking_price": 50.00,
  "description": "Old newspapers and cartons"
}
Response: { "listing": { "id": "...", "status": "open", ... } }
```

### GET `/listings/my` _(house owner)_
```json
Query: ?status=open&page=1&limit=10
Response: { "listings": [...], "total": 25, "page": 1 }
```

### GET `/listings/nearby` _(local collector)_
```json
Query: ?lat=28.6139&lng=77.2090&radius=5&garbage_type=paper
Response: {
  "listings": [
    { "id": "...", "distance_km": 1.2, "garbage_type": "Paper", "asking_price": 50, ... }
  ]
}
```

### PUT `/listings/:id/accept` _(local collector)_
```json
Response: { "listing": { "status": "assigned", ... } }
```

### PUT `/listings/:id/collect` _(local collector)_
```json
Request:  { "actual_weight": 4.8, "final_price": 45.00, "collection_point_id": "uuid" }
Response: { "listing": { "status": "collected", ... } }
```

### PUT `/listings/:id/complete-payment` _(local collector)_
```json
Request:  { "payment_method": "cash", "amount": 45.00 }
Response: { "listing": { "status": "completed" }, "payment": {...} }
```

---

## 🗂️ Garbage Types

### GET `/garbage-types`
```json
Response: {
  "types": [
    { "id": "...", "name": "Paper", "slug": "paper", "base_price_per_kg": 8.00, "icon_url": "..." }
  ]
}
```

---

## 🏭 Collection Points

### GET `/collection-points/nearby`
```json
Query: ?lat=28.6&lng=77.2&radius=20
Response: { "points": [{ "id": "...", "name": "...", "distance_km": 3.4 }] }
```

### GET `/collection-points/:id/inventory`
```json
Response: {
  "inventory": [
    { "garbage_type": "Paper", "available_weight_kg": 125.5, "last_updated": "..." }
  ]
}
```

---

## 🛒 Bulk Orders _(regional collector)_

### GET `/bulk-orders/available`
```json
Query: ?city=Delhi&garbage_type=paper&min_weight=50
Response: {
  "lots": [
    {
      "collection_point_id": "...",
      "collection_point_name": "Delhi North CP",
      "garbage_type": "Paper",
      "available_weight_kg": 125.5,
      "suggested_price_per_kg": 8.00
    }
  ]
}
```

### POST `/bulk-orders`
```json
Request: {
  "collection_point_id": "uuid",
  "garbage_type_id": "uuid",
  "requested_weight_kg": 100,
  "offered_price_per_kg": 7.50
}
Response: { "order": { "id": "...", "status": "pending", ... } }
```

### PUT `/bulk-orders/:id/confirm` _(admin/CP manager)_
### PUT `/bulk-orders/:id/pickup-done` _(regional collector)_

---

## 🔔 Notifications

### GET `/notifications`
```json
Response: { "notifications": [...], "unread_count": 5 }
```

### PUT `/notifications/mark-read`
```json
Request: { "ids": ["uuid1", "uuid2"] }
```

---

## 👤 User Profile

### GET `/users/me`
### PUT `/users/me`
```json
Request: { "name": "...", "fcm_token": "...", "profile_photo": File }
```

---

## 💳 Payments

### GET `/payments/history`
```json
Query: ?role=payer&page=1
Response: { "payments": [...] }
```

---

## ⭐ Reviews

### POST `/reviews`
```json
Request: { "listing_id": "uuid", "reviewee_id": "uuid", "rating": 4, "comment": "Fast pickup!" }
```

---

## 📊 Admin Endpoints (Web Portal Backend)

### GET `/admin/stats`
```json
Response: {
  "total_listings_today": 42,
  "total_collected_kg": 1250.5,
  "active_collectors": 18,
  "revenue_today": 5200.00,
  "by_garbage_type": [...]
}
```

### GET `/admin/users?role=local_collector&page=1`
### PUT `/admin/users/:id/verify`
### PUT `/admin/users/:id/ban`
### GET `/admin/listings?status=open&city=Delhi`
