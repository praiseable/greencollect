# Kabariya App - Test Users & APK Information

## 📱 APK Files (Release Mode)

### Customer App (General Public)
- **File**: `apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk`
- **Size**: 53.3 MB
- **App Name**: Kabariya
- **Use Case**: For general public users who want to buy/sell recyclable materials

### Pro App (Dealers & Franchises)
- **File**: `apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk`
- **Size**: 53.3 MB
- **App Name**: Kabariya Pro
- **Use Case**: For authorized dealers, franchises, and wholesale buyers

---

## 👥 Test Users List

### 🟢 Customer App Users (Install Customer APK)

| # | Phone Number | OTP | Name | City | Status | Test Scenarios |
|---|--------------|-----|------|------|--------|----------------|
| 1 | **03001234567** | **111111** | Ali Hassan | Karachi | ✅ Approved | • Free registration<br>• Post listings<br>• Browse all listings<br>• Make offers<br>• Chat with sellers<br>• View transactions |

---

### 🔵 Pro App Users - Karachi (Install Pro APK)

| # | Phone Number | OTP | Name | Role | Area | Balance | Status | Test Scenarios |
|---|--------------|-----|------|------|------|---------|--------|----------------|
| 2 | **03219876543** | **222222** | Bilal Traders | Local Dealer | Korangi, Karachi | ₨12,500 | ✅ Active | • View zone-specific listings<br>• Accept collections<br>• Update collection status<br>• View ratings<br>• Chat & call features |
| 3 | **03335551234** | **333333** | City Franchise Karachi | City Franchise | Karachi (City-wide) | ₨45,000 | ✅ Active | • Multi-zone access<br>• Escalated listings<br>• Analytics dashboard<br>• Carbon credits view<br>• Territory management |

---

### 🟡 Pro App Users - Lahore (Install Pro APK)

| # | Phone Number | OTP | Name | Role | Area | Balance | Status | Test Scenarios |
|---|--------------|-----|------|------|------|---------|--------|----------------|
| 4 | **03451112233** | **444444** | National Recyclers | Wholesale | All Zones (National) | ₨150,000 | ✅ Active | • National-level listings<br>• Wholesale deals<br>• High-value transactions<br>• Analytics & reports |

---

### 🟠 Pro App Users - Islamabad Area Dealers (Install Pro APK)

| # | Phone Number | OTP | Name | Role | Area | Balance | Status | Test Scenarios |
|---|--------------|-----|------|------|------|---------|--------|----------------|
| 5 | **03001110001** | **550001** | Usman BaraKahu | Local Dealer | Bara Kahu, ISB | ₨5,000 | ✅ Active | • Area-bounded listings (Bara Kahu only)<br>• Collection workflow<br>• GPS verification<br>• Rating system |
| 6 | **03001110002** | **660002** | G-6 Dealer | Local Dealer | G-6, ISB | ₨8,000 | ✅ Active | • Area-bounded listings (G-6 only)<br>• Collection tracking<br>• Chat & notifications |
| 7 | **03001110003** | **770003** | G-8 Dealer | Local Dealer | G-8, ISB | ₨0 | ⚠️ Zero Balance | • Balance gate screen<br>• Cannot view listings<br>• Deposit required |
| 8 | **03001110004** | **880004** | ISB Franchise | City Franchise | ISB (City-level) | ₨25,000 | ✅ Active | • Multi-area access (all ISB areas)<br>• Escalated listings<br>• Carbon analytics |

---

### 🔴 Pro App Users - KYC Testing Scenarios (Install Pro APK)

| # | Phone Number | OTP | Name | Role | Area | KYC Status | Test Scenarios |
|---|--------------|-----|------|------|------|------------|----------------|
| 9 | **03002220001** | **990001** | Pending Dealer | Local Dealer | Rawalpindi | ⏳ PENDING | • KYC registration flow<br>• Document upload<br>• Cannot access app until approved |
| 10 | **03002220002** | **990002** | Submitted Dealer | Local Dealer | I-8, ISB | 📤 SUBMITTED | • KYC under review<br>• Waiting for admin approval<br>• Cannot access app |
| 11 | **03002220003** | **990003** | Rejected Dealer | Local Dealer | Model Town, Lahore | ❌ REJECTED | • Criminal check failed<br>• Account blocked<br>• Cannot access app |
| 12 | **03002220004** | **990004** | Deposit Pending | Local Dealer | F-10, ISB | ✅ APPROVED (No Deposit) | • KYC approved but no deposit<br>• Balance gate screen<br>• Must deposit to access |

---

## 🧪 Testing Checklist

### Customer App Testing
- [ ] Login with Customer account (03001234567 / 111111)
- [ ] Post a new listing with images
- [ ] Browse all listings (no area restrictions)
- [ ] View listing details
- [ ] Make an offer on a listing
- [ ] Chat with seller (message button)
- [ ] Call seller (call button)
- [ ] View notifications
- [ ] View profile & transactions
- [ ] Session persistence (close app, reopen - should stay logged in)
- [ ] Back button behavior (double-tap to exit)

### Pro App - Active Dealer Testing
- [ ] Login with active dealer (03219876543 / 222222)
- [ ] View zone-specific listings (Korangi only)
- [ ] Accept a collection request
- [ ] Update collection status (with GPS & photo)
- [ ] View dealer ratings
- [ ] Chat & call features
- [ ] View collections screen
- [ ] View carbon credits
- [ ] Balance management
- [ ] Session persistence

### Pro App - Area-Bounded Testing (Islamabad)
- [ ] Login with Bara Kahu dealer (03001110001 / 550001)
- [ ] Verify only Bara Kahu listings are visible
- [ ] Login with G-6 dealer (03001110002 / 660002)
- [ ] Verify only G-6 listings are visible
- [ ] Login with ISB Franchise (03001110004 / 880004)
- [ ] Verify all ISB area listings are visible
- [ ] Test escalation (listing moves to adjacent area after timeout)

### Pro App - Balance Gate Testing
- [ ] Login with zero balance dealer (03001110003 / 770003)
- [ ] Verify balance gate screen appears
- [ ] Verify listings are not accessible
- [ ] Verify deposit payment flow

### Pro App - KYC Testing
- [ ] Login with pending dealer (03002220001 / 990001)
- [ ] Complete KYC registration flow
- [ ] Upload all required documents
- [ ] Submit KYC application
- [ ] Login with submitted dealer (03002220002 / 990002)
- [ ] Verify "Under Review" message
- [ ] Login with rejected dealer (03002220003 / 990003)
- [ ] Verify rejection message
- [ ] Login with deposit pending (03002220004 / 990004)
- [ ] Verify deposit requirement screen

### General Features Testing
- [ ] Image upload in listing creation
- [ ] Chat window opens correctly
- [ ] Call button opens phone dialer
- [ ] Navigation back button works
- [ ] Notifications routing works
- [ ] Offline chat (send message offline, sync when online)
- [ ] Message status indicators (pending/sent/delivered/read/failed)

---

## 📍 APK Installation Instructions

### Via ADB (Android Debug Bridge)
```bash
# Install Customer APK
adb install -r apps/mobile/build/app/outputs/flutter-apk/app-customer-release.apk

# Install Pro APK
adb install -r apps/mobile/build/app/outputs/flutter-apk/app-pro-release.apk
```

### Via File Transfer
1. Copy APK files to device storage
2. Open file manager on device
3. Tap on APK file
4. Allow installation from unknown sources if prompted
5. Install

---

## 🔑 Quick Login Reference

### Customer App
```
Phone: 03001234567
OTP: 111111
```

### Pro App - Karachi Dealers
```
Phone: 03219876543 (Local Dealer)
OTP: 222222

Phone: 03335551234 (City Franchise)
OTP: 333333
```

### Pro App - Islamabad Area Dealers
```
Phone: 03001110001 (Bara Kahu)
OTP: 550001

Phone: 03001110002 (G-6)
OTP: 660002

Phone: 03001110003 (G-8 - Zero Balance)
OTP: 770003

Phone: 03001110004 (ISB Franchise)
OTP: 880004
```

### Pro App - KYC Testing
```
Phone: 03002220001 (Pending)
OTP: 990001

Phone: 03002220002 (Submitted)
OTP: 990002

Phone: 03002220003 (Rejected)
OTP: 990003

Phone: 03002220004 (Deposit Pending)
OTP: 990004
```

---

## 📝 Notes

- All phone numbers can be entered with or without country code (+92)
- OTPs are 6 digits
- Customer app users can register freely
- Pro app users must be approved by admin (except for KYC testing accounts)
- Balance gate restricts Pro users with zero balance
- Area-bounded dealers only see listings from their designated area
- Chat and call features require proper permissions on device

---

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**APK Version**: 1.0.0+1
**Build Type**: Release
