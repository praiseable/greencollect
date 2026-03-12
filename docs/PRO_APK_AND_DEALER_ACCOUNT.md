# Pro app release APK & dealer account for testing

## Pro release APK

- **Path:** `apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk`
- **Full path (this repo):** `d:\gc-app\apps\mobile\build\app\outputs\flutter-apk\app-pro-release.apk`
- **Size:** ~53 MB

Install on a device:
```bash
adb install -r apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk
```
Or copy the APK to the device and open it to install.

---

## Dealer account to see listing from customer 03001234567

The listing was created with **city: Islamabad**, **address: i-9 industrial area**. Use a dealer/franchise account that has **Islamabad** in their territory.

### Recommended: Islamabad franchise (sees all Islamabad listings)

| Field    | Value |
|----------|--------|
| **Phone** | `03001110004` (or `+923001110004`) |
| **Password** | (Pro app uses **OTP login** – enter phone, then use the OTP sent by the backend, or dev OTP if `ALLOW_TEST_OTP` is set) |
| **Email** | `isb.franchise@marketplace.pk` (for reference; login is by phone) |

- **Name:** Zubair, Islamabad-Franchise  
- **Role:** FRANCHISE_OWNER  
- **Territory:** Islamabad (city) + Bara Kahu, G-6, G-8  

This account should see all listings in Islamabad, including the one from 03001234567.

### Alternative: Islamabad area dealers (city-level listing may appear depending on geo-fencing)

| Account        | Phone        | Password     | Territory  |
|----------------|-------------|--------------|------------|
| G-6 Dealer     | 03001110002 | (OTP login)  | G-6        |
| G-8 Dealer     | 03001110003 | (OTP login)  | G-8        |
| Bara Kahu      | 03001110001 | (OTP login)  | Bara Kahu  |

### Regional manager (Islamabad Capital – province level)

| Field  | Value |
|--------|--------|
| **Phone** | `030099999003` (from +929999990003) |
| **Email** | `regional@marketplace.pk` |
| **Role** | REGIONAL_MANAGER – Islamabad Capital |

---

**Note:** These users come from the backend seed. If your deployed backend was seeded, use **phone 03001110004** in the Pro app, request OTP, then enter the OTP you receive (or 111111 if the server has test OTP enabled). After login you should see the customer’s Islamabad listing on the dealer side.
