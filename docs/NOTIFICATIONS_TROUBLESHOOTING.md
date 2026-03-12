# New listing notifications not showing on Pro app

## Why dealers get "New Listing in Your Zone"

When a **customer** creates a listing (e.g. from the customer app on AVD), the backend:

1. Saves the listing with the chosen **city** (e.g. Islamabad → `geoZoneId` = Islamabad city zone).
2. Calls **notifyZoneDealersOnNewListing** and:
   - Finds dealers/franchises whose **territory** includes that zone (exact zone, city, or parent zone).
   - Creates a **Notification** row for each (type `NEW_LISTING`).
   - Optionally pushes via Socket.io if connected.

The **Pro app** (Alerts tab) loads notifications with **GET /v1/notifications** for the **logged-in user**. So the dealer must:

- Be logged in as a user that has **territory** covering the listing’s city/zone.
- Have that user’s notifications created by the backend when the listing was created.

## If no notifications appear on Pro (e.g. 03001110004)

### 1. Backend must have territories for that dealer

Notifications are only created for users who have **DealerTerritory** rows for the listing’s zone (or its city/parent).

- If the **production** DB was never seeded, or seed didn’t run the territory steps, there will be **no** territory for Islamabad → **no** notifications for the Islamabad franchise.
- **Fix:** On the server (or wherever the app’s API runs), run the seed so that the user for **03001110004** (e.g. `isb.franchise@marketplace.pk`) has an active **DealerTerritory** for **Islamabad** (city zone):

  ```bash
  cd backend
  npx prisma db seed
  ```

  Or, add the territory manually in the DB for that user and the Islamabad city zone.

### 2. Deploy latest backend

The code that:

- Resolves **cityName** → **geoZoneId** when creating listings,
- Notifies **city** and **parent-zone** dealers (not only exact zone),

must be deployed. After deploy, new listings will create notifications for the right dealers.

### 3. Pro app must load data

If the Pro app shows **“Failed to load listings”** on Home, it may be an auth or network issue. Fix that first (e.g. deploy geo-fencing fix so dealers can load listings, and ensure the device can reach the API). Notifications (Alerts) use the same auth; if the app can’t load listings, Alerts may also fail.

### 4. Check server logs

After a customer creates a listing, the server should log either:

- `[Notification] New listing "..." → notified N dealers/admins`
- or `[Notification] New listing "..." (geoZoneId=..., cityName=...) → no dealers/admins found to notify. Run seed or assign territories.`

If you see the second line, no notifications were created because no dealers/admins were found for that zone → run seed or assign territories (see 1).

## Quick check in DB (if you have access)

- **Notification** table: any rows with `userId` = the Pro user’s id (for 03001110004) and `type` = `NEW_LISTING`?
- **DealerTerritory** table: any row with that same `userId` and `geoZoneId` = the Islamabad city zone id?

If DealerTerritory is empty for that user, seed or add the territory. If it exists but Notification has no NEW_LISTING for that user, the notification step may be failing (check logs).
