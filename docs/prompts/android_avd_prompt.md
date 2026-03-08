# 🤖 CursorAI Prompt — Flutter Android App
## Geo-Franchise Marketplace | Pakistan Edition | AVD-Ready Build

---

## 🎯 OBJECTIVE

Build a **fully functional Flutter Android application** that can be compiled and installed on an **Android Virtual Device (AVD)** using Android Studio or VS Code. The app must run on **Android API 24+** (Android 7.0 Nougat and above). This is Phase 1 of the mobile app — a **working prototype with mock data** that demonstrates all screens and flows before connecting to the real backend.

---

## ✅ PRE-REQUISITES (Verify before starting)

Before writing any code, confirm and set up the following:

```bash
# 1. Check Flutter is installed and healthy
flutter doctor -v
# Required: Flutter SDK ≥ 3.16, Dart ≥ 3.2
# Required: Android toolchain ✓
# Required: Android Studio ✓ OR VS Code with Flutter extension

# 2. Check AVD exists (or create one)
# Open Android Studio → Device Manager → Create Virtual Device
# Recommended AVD: Pixel 6 Pro, API 33 (Android 13), x86_64
# Min supported: Pixel 4, API 24 (Android 7)

# 3. Start AVD
# Android Studio: Device Manager → Play ▶
# OR via terminal:
emulator -avd Pixel_6_Pro_API_33

# 4. Verify device visible to Flutter
flutter devices
# Should show: emulator-5554 • Android SDK Built for x86 64 • android-x86

# 5. Run app on AVD
flutter run -d emulator-5554
```

---

## 📁 PROJECT STRUCTURE (Create Exactly This)

```
/marketplace_app
├── android/                        ← Android native configs
│   ├── app/
│   │   ├── build.gradle            ← minSdk 24, targetSdk 34
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml ← Permissions
│   │   │   └── res/
│   │   │       ├── mipmap-*/       ← App icons
│   │   │       └── values/
│   │   │           └── styles.xml  ← Splash screen
│   └── build.gradle
├── assets/
│   ├── fonts/
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-Medium.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   ├── Inter-Bold.ttf
│   │   └── JameelNooriNastaleeq.ttf  ← Urdu font
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo_white.png
│   │   ├── onboarding_1.png
│   │   ├── onboarding_2.png
│   │   └── onboarding_3.png
│   ├── animations/
│   │   ├── splash_lottie.json
│   │   ├── success_lottie.json
│   │   └── empty_state.json
│   └── translations/
│       ├── en.json
│       └── ur.json
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   │   ├── app_theme.dart
│   │   │   ├── app_colors.dart
│   │   │   ├── app_typography.dart
│   │   │   └── app_spacing.dart
│   │   ├── router/
│   │   │   └── app_router.dart
│   │   ├── mock/
│   │   │   ├── mock_data.dart        ← All mock data
│   │   │   └── mock_service.dart     ← Simulated API delay
│   │   ├── models/
│   │   │   ├── user.model.dart
│   │   │   ├── listing.model.dart
│   │   │   ├── category.model.dart
│   │   │   ├── transaction.model.dart
│   │   │   ├── notification.model.dart
│   │   │   └── subscription.model.dart
│   │   ├── providers/
│   │   │   ├── auth.provider.dart
│   │   │   ├── listing.provider.dart
│   │   │   ├── category.provider.dart
│   │   │   ├── transaction.provider.dart
│   │   │   ├── notification.provider.dart
│   │   │   └── locale.provider.dart
│   │   └── utils/
│   │       ├── currency.util.dart
│   │       ├── date.util.dart
│   │       ├── validators.util.dart
│   │       └── pk_cities.dart
│   └── features/
│       ├── splash/
│       │   └── splash_screen.dart
│       ├── onboarding/
│       │   └── onboarding_screen.dart
│       ├── auth/
│       │   ├── login_screen.dart
│       │   ├── register_screen.dart
│       │   ├── otp_screen.dart
│       │   └── kyc_screen.dart
│       ├── home/
│       │   ├── home_screen.dart
│       │   └── widgets/
│       │       ├── category_grid.dart
│       │       ├── recent_listings.dart
│       │       └── stats_banner.dart
│       ├── listings/
│       │   ├── browse_listings_screen.dart
│       │   ├── listing_detail_screen.dart
│       │   ├── create_listing/
│       │   │   ├── create_listing_screen.dart
│       │   │   ├── step1_category.dart
│       │   │   ├── step2_photos.dart
│       │   │   ├── step3_details.dart
│       │   │   ├── step4_location.dart
│       │   │   └── step5_preview.dart
│       │   ├── my_listings_screen.dart
│       │   └── widgets/
│       │       ├── listing_card.dart
│       │       ├── listing_map_view.dart
│       │       ├── price_badge.dart
│       │       └── visibility_badge.dart
│       ├── transactions/
│       │   ├── transactions_screen.dart
│       │   ├── transaction_detail_screen.dart
│       │   ├── negotiation_screen.dart
│       │   └── bond_viewer_screen.dart
│       ├── chat/
│       │   ├── chat_screen.dart
│       │   └── widgets/
│       │       ├── message_bubble.dart
│       │       └── offer_card.dart
│       ├── notifications/
│       │   └── notifications_screen.dart
│       ├── subscription/
│       │   ├── subscription_screen.dart
│       │   ├── plans_screen.dart
│       │   └── payment_screen.dart
│       ├── wallet/
│       │   ├── wallet_screen.dart
│       │   └── recharge_screen.dart
│       ├── analytics/
│       │   └── analytics_screen.dart
│       ├── profile/
│       │   ├── profile_screen.dart
│       │   └── edit_profile_screen.dart
│       └── settings/
│           └── settings_screen.dart
├── pubspec.yaml
└── README.md
```

---

## 📦 PUBSPEC.YAML (Complete — Copy Exactly)

```yaml
name: marketplace_app
description: Geo-Franchise Marketplace - Pakistan Edition
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: ">=3.16.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.4.9
  riverpod_annotation: ^2.3.3

  # Navigation
  go_router: ^13.2.0

  # UI Components
  google_fonts: ^6.1.0
  shimmer: ^3.0.0
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.9
  lottie: ^3.1.0
  dotted_border: ^2.1.0
  badges: ^3.1.2
  smooth_page_indicator: ^1.1.0
  step_progress_indicator: ^1.0.2
  pinput: ^3.0.1           # OTP input
  photo_view: ^0.14.0

  # Forms & Validation
  reactive_forms: ^17.0.0
  image_picker: ^1.0.7
  image_cropper: ^5.0.1
  file_picker: ^6.1.1

  # Maps & Location
  google_maps_flutter: ^2.5.3
  geolocator: ^11.0.0
  geocoding: ^3.0.0

  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2

  # Networking (mock-ready, backend-ready)
  dio: ^5.4.1
  pretty_dio_logger: ^1.3.1

  # Localization
  easy_localization: ^3.0.3
  intl: ^0.19.0

  # Charts
  fl_chart: ^0.66.2
  syncfusion_flutter_charts: ^24.1.41

  # PDF Viewer
  syncfusion_flutter_pdfviewer: ^24.1.41

  # Utilities
  uuid: ^4.3.3
  timeago: ^3.6.0
  url_launcher: ^6.2.4
  share_plus: ^7.2.2
  permission_handler: ^11.3.0
  connectivity_plus: ^6.0.2
  package_info_plus: ^5.0.1
  device_info_plus: ^10.1.0
  flutter_animate: ^4.5.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  build_runner: ^2.4.8
  riverpod_generator: ^2.3.9
  flutter_gen_runner: ^5.4.0

flutter:
  uses-material-design: true

  assets:
    - assets/images/
    - assets/animations/
    - assets/translations/

  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
    - family: JameelNooriNastaleeq
      fonts:
        - asset: assets/fonts/JameelNooriNastaleeq.ttf
```

---

## 🤖 ANDROID NATIVE CONFIGURATION

### `android/app/build.gradle`:

```gradle
android {
    compileSdkVersion 34
    ndkVersion flutter.ndkVersion

    defaultConfig {
        applicationId "com.marketplace.pk"
        minSdkVersion 24          // Android 7.0 — AVD compatible
        targetSdkVersion 34
        versionCode flutterVersionCode.toInteger()
        versionName flutterVersionName
        multiDexEnabled true
    }

    buildTypes {
        release {
            signingConfig signingConfigs.debug  // debug signing for AVD testing
            minifyEnabled false
            shrinkResources false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.multidex:multidex:2.0.1'
}
```

### `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="28"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>

    <application
        android:label="مارکیٹ پلیس"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:usesCleartextTraffic="true"
        android:requestLegacyExternalStorage="true">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
                android:name="io.flutter.embedding.android.NormalTheme"
                android:resource="@style/NormalTheme"/>
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_GOOGLE_MAPS_API_KEY"/>

    </application>
</manifest>
```

---

## 🎨 THEME & DESIGN SYSTEM

### `lib/core/theme/app_colors.dart`:

```dart
class AppColors {
  // Primary — Green (recycling/eco theme)
  static const primary = Color(0xFF16A34A);
  static const primaryDark = Color(0xFF15803D);
  static const primaryLight = Color(0xFFDCFCE7);

  // Secondary — Amber (market/trade theme)
  static const secondary = Color(0xFFF59E0B);
  static const secondaryDark = Color(0xFFD97706);
  static const secondaryLight = Color(0xFFFEF3C7);

  // Neutrals
  static const background = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceVariant = Color(0xFFF1F5F9);
  static const border = Color(0xFFE2E8F0);
  static const divider = Color(0xFFF1F5F9);

  // Text
  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF64748B);
  static const textMuted = Color(0xFF94A3B8);
  static const textInverse = Color(0xFFFFFFFF);

  // Status
  static const success = Color(0xFF16A34A);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFDC2626);
  static const info = Color(0xFF2563EB);

  // Visibility Level Colors
  static const visibilityLocal = Color(0xFF16A34A);
  static const visibilityNeighbor = Color(0xFF2563EB);
  static const visibilityCity = Color(0xFFF59E0B);
  static const visibilityWholesale = Color(0xFF7C3AED);
  static const visibilityPublic = Color(0xFFDC2626);

  // Role Colors
  static const roleCustomer = Color(0xFF64748B);
  static const roleDealer = Color(0xFF2563EB);
  static const roleFranchise = Color(0xFF7C3AED);
  static const roleWholesale = Color(0xFFDC2626);

  // Category Colors (matches backend seed)
  static const catMetals = Color(0xFFF59E0B);
  static const catPlastics = Color(0xFF3B82F6);
  static const catPaper = Color(0xFF10B981);
  static const catElectronics = Color(0xFF8B5CF6);
  static const catOrganic = Color(0xFFEF4444);
  static const catFurniture = Color(0xFFF97316);
  static const catHousehold = Color(0xFF06B6D4);
  static const catGlass = Color(0xFF64748B);
}
```

### `lib/core/theme/app_theme.dart`:

```dart
class AppTheme {
  static ThemeData get lightTheme => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    ),
    fontFamily: 'Inter',
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.surface,
      elevation: 0,
      centerTitle: true,
      foregroundColor: AppColors.textPrimary,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    ),
    cardTheme: CardTheme(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceVariant,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: AppColors.surface,
      selectedItemColor: AppColors.primary,
      unselectedItemColor: AppColors.textMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
  );
}
```

---

## 🗄️ MOCK DATA SYSTEM

### `lib/core/mock/mock_data.dart`:

```dart
// Complete mock data that drives the entire prototype
// When backend is ready, replace MockService calls with real Dio calls

class MockData {

  // ── AUTH ──────────────────────────────────────────────────
  static final users = {
    'customer': UserModel(
      id: 'u1', name: 'Ali Hassan', nameUrdu: 'علی حسن',
      phone: '+92 300-1234567', email: 'ali@example.com',
      role: UserRole.customer, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      subscriptionStatus: null,
    ),
    'dealer': UserModel(
      id: 'u2', name: 'Bilal Traders', nameUrdu: 'بلال ٹریڈرز',
      phone: '+92 321-9876543', email: 'bilal@example.com',
      role: UserRole.localDealer, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      zone: 'Korangi Industrial Area',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 18,
    ),
    'franchise': UserModel(
      id: 'u3', name: 'City Franchise Karachi', nameUrdu: 'سٹی فرنچائز کراچی',
      phone: '+92 333-5551234', email: 'franchise@example.com',
      role: UserRole.cityFranchise, city: 'Karachi',
      kycStatus: KycStatus.approved, languageCode: 'ur',
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionDaysLeft: 25,
    ),
  };

  // ── CATEGORIES ────────────────────────────────────────────
  static final categories = [
    CategoryModel(id: 'c1', slug: 'metals', nameEn: 'Metals', nameUr: 'دھاتیں', colorHex: '#F59E0B', icon: '⚙️',
      subCategories: [
        SubCategoryModel(id: 'sc1', nameEn: 'Copper', nameUr: 'تانبا', colorHex: '#F59E0B'),
        SubCategoryModel(id: 'sc2', nameEn: 'Iron', nameUr: 'لوہا', colorHex: '#6B7280'),
        SubCategoryModel(id: 'sc3', nameEn: 'Silver', nameUr: 'چاندی', colorHex: '#9CA3AF'),
      ]
    ),
    CategoryModel(id: 'c2', slug: 'plastics', nameEn: 'Plastics', nameUr: 'پلاسٹک', colorHex: '#3B82F6', icon: '🧴'),
    CategoryModel(id: 'c3', slug: 'paper', nameEn: 'Paper & Cardboard', nameUr: 'کاغذ اور گتہ', colorHex: '#10B981', icon: '📦'),
    CategoryModel(id: 'c4', slug: 'electronics', nameEn: 'Electronics', nameUr: 'الیکٹرانکس', colorHex: '#8B5CF6', icon: '🔌'),
    CategoryModel(id: 'c5', slug: 'organic', nameEn: 'Organic', nameUr: 'نامیاتی', colorHex: '#EF4444', icon: '🦴'),
    CategoryModel(id: 'c6', slug: 'furniture', nameEn: 'Furniture', nameUr: 'فرنیچر', colorHex: '#F97316', icon: '🪑'),
    CategoryModel(id: 'c7', slug: 'household', nameEn: 'Household', nameUr: 'گھریلو', colorHex: '#06B6D4', icon: '🏠'),
    CategoryModel(id: 'c8', slug: 'glass', nameEn: 'Glass', nameUr: 'شیشہ', colorHex: '#64748B', icon: '🪟'),
  ];

  // ── LISTINGS ──────────────────────────────────────────────
  static final listings = [
    ListingModel(
      id: 'l1', title: 'Copper Wire Scrap', titleUrdu: 'تانبے کی تار کا کباڑ',
      description: '99% pure copper wire, collected from factory.', descUrdu: 'فیکٹری سے جمع کی گئی تانبے کی تار',
      pricePkr: 850, unit: 'kg', quantity: 200,
      categoryId: 'c1', categoryName: 'Metals', categoryNameUr: 'دھاتیں',
      sellerName: 'Ali Hassan', sellerPhone: '+92 300-1234567',
      city: 'Karachi', area: 'Korangi', latitude: 24.8607, longitude: 67.0011,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/copper/400/300'],
      daysAgo: 1, interestedCount: 2,
    ),
    ListingModel(
      id: 'l2', title: 'Iron Scrap Bulk', titleUrdu: 'لوہے کا کباڑ بڑی مقدار',
      description: 'Mixed iron scrap from demolition site, 2 truck loads.', descUrdu: 'توڑ پھوڑ سائٹ سے لوہے کا کباڑ',
      pricePkr: 120, unit: 'kg', quantity: 5000,
      categoryId: 'c1', categoryName: 'Metals', categoryNameUr: 'دھاتیں',
      sellerName: 'Zain Construction', sellerPhone: '+92 321-7654321',
      city: 'Karachi', area: 'SITE Industrial Area', latitude: 24.9056, longitude: 67.0215,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.wholesale,
      images: ['https://picsum.photos/seed/iron/400/300'],
      daysAgo: 2, interestedCount: 8,
    ),
    ListingModel(
      id: 'l3', title: 'Electronic Scrap Mix', titleUrdu: 'الیکٹرانک کباڑ مکس',
      description: 'Old computers, PCBs, cables from office clearance.',
      pricePkr: 300, unit: 'kg', quantity: 150,
      categoryId: 'c4', categoryName: 'Electronics', categoryNameUr: 'الیکٹرانکس',
      sellerName: 'Raza Office Solutions', sellerPhone: '+92 333-1122334',
      city: 'Lahore', area: 'Gulberg', latitude: 31.5204, longitude: 74.3587,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.city,
      images: ['https://picsum.photos/seed/electronics/400/300'],
      daysAgo: 5, interestedCount: 4,
    ),
    ListingModel(
      id: 'l4', title: 'Paper Waste - Office Ream', titleUrdu: 'دفتری ردی کاغذ',
      description: 'Clean white paper waste, well sorted.',
      pricePkr: 45, unit: 'kg', quantity: 800,
      categoryId: 'c3', categoryName: 'Paper', categoryNameUr: 'کاغذ',
      sellerName: 'National Bank Branch', sellerPhone: '+92 300-9988776',
      city: 'Islamabad', area: 'Blue Area', latitude: 33.7294, longitude: 73.0931,
      status: ListingStatus.active, visibilityLevel: VisibilityLevel.neighbor,
      images: ['https://picsum.photos/seed/paper/400/300'],
      daysAgo: 3, interestedCount: 1,
    ),
    ListingModel(
      id: 'l5', title: 'Plastic Bottles PET', titleUrdu: 'پی ای ٹی پلاسٹک بوتلیں',
      description: 'Crushed PET plastic bottles, ready for recycling.',
      pricePkr: 75, unit: 'kg', quantity: 300,
      categoryId: 'c2', categoryName: 'Plastics', categoryNameUr: 'پلاسٹک',
      sellerName: 'Soft Drink Factory', sellerPhone: '+92 321-3344556',
      city: 'Faisalabad', area: 'Industrial Estate', latitude: 31.4504, longitude: 73.1350,
      status: ListingStatus.underNegotiation, visibilityLevel: VisibilityLevel.local,
      images: ['https://picsum.photos/seed/plastic/400/300'],
      daysAgo: 7, interestedCount: 6,
    ),
  ];

  // ── TRANSACTIONS ─────────────────────────────────────────
  static final transactions = [
    TransactionModel(
      id: 't1', listingId: 'l1', listingTitle: 'Copper Wire Scrap',
      buyerName: 'Bilal Traders', sellerName: 'Ali Hassan',
      offeredPricePkr: 820, finalPricePkr: 840, quantity: 200, unit: 'kg',
      status: TransactionStatus.finalized, totalPkr: 168000,
      createdAt: DateTime.now().subtract(Duration(days: 2)),
    ),
    TransactionModel(
      id: 't2', listingId: 'l3', listingTitle: 'Electronic Scrap Mix',
      buyerName: 'City Franchise Karachi', sellerName: 'Raza Office Solutions',
      offeredPricePkr: 280, finalPricePkr: null, quantity: 150, unit: 'kg',
      status: TransactionStatus.negotiating, totalPkr: 42000,
      createdAt: DateTime.now().subtract(Duration(hours: 5)),
    ),
  ];

  // ── NOTIFICATIONS ─────────────────────────────────────────
  static final notifications = [
    NotificationModel(id: 'n1', title: 'New listing in your zone', titleUr: 'آپ کے علاقے میں نئی فہرست',
      body: 'Copper Wire Scrap - 200kg added in Korangi', bodyUr: 'کوڑنگی میں تانبے کی تار کا کباڑ شامل ہوا',
      type: 'new_listing', isRead: false, createdAt: DateTime.now().subtract(Duration(hours: 1))),
    NotificationModel(id: 'n2', title: 'Offer received', titleUr: 'پیشکش ملی',
      body: 'Bilal Traders offered ₨820/kg for your Copper Wire', bodyUr: 'بلال ٹریڈرز نے تانبے کی تار کے لیے ₨820 فی کلو پیشکش کی',
      type: 'offer', isRead: false, createdAt: DateTime.now().subtract(Duration(hours: 3))),
    NotificationModel(id: 'n3', title: 'Subscription expiring', titleUr: 'سبسکرپشن ختم ہونے والی ہے',
      body: 'Your plan expires in 3 days. Renew now.', bodyUr: 'آپ کی سبسکرپشن 3 دن میں ختم ہوگی۔ ابھی تجدید کریں',
      type: 'subscription', isRead: true, createdAt: DateTime.now().subtract(Duration(days: 1))),
  ];

  // ── SUBSCRIPTION PLANS ────────────────────────────────────
  static final subscriptionPlans = [
    SubscriptionPlanModel(id: 'sp1', name: 'Local Dealer Weekly', nameUr: 'لوکل ڈیلر ہفتہ وار',
      role: 'local_dealer', priceWeekly: 500, priceMonthly: 1500,
      features: ['Zone listings access', 'Deal finalization', 'Digital bonds'],
      featuresUr: ['علاقے کی فہرستیں', 'ڈیل مکمل کریں', 'ڈیجیٹل بانڈ'],
    ),
    SubscriptionPlanModel(id: 'sp2', name: 'Franchise Monthly', nameUr: 'فرنچائز ماہانہ',
      role: 'city_franchise', priceWeekly: 1500, priceMonthly: 4500,
      features: ['Multi-zone access', 'Escalated listings', 'Analytics dashboard', 'Priority support'],
      featuresUr: ['متعدد علاقے', 'ترقی یافتہ فہرستیں', 'تجزیاتی ڈیش بورڈ', 'ترجیحی سپورٹ'],
    ),
    SubscriptionPlanModel(id: 'sp3', name: 'Wholesale Monthly', nameUr: 'ہول سیل ماہانہ',
      role: 'wholesale', priceWeekly: 4000, priceMonthly: 12000,
      features: ['All listings access', 'Bulk inventory view', 'Price history', 'API access'],
      featuresUr: ['تمام فہرستیں', 'بلک انوینٹری', 'قیمت کی تاریخ', 'API رسائی'],
    ),
  ];
}
```

### `lib/core/mock/mock_service.dart`:

```dart
// Simulates real API calls with realistic delays
// Replace each method with a real Dio call when backend is ready

class MockService {
  Future<T> simulate<T>(T data, {int ms = 600}) async {
    await Future.delayed(Duration(milliseconds: ms));
    return data;
  }

  Future<List<ListingModel>> getListings({String? categoryId, String? role}) =>
    simulate(MockData.listings.where((l) =>
      categoryId == null || l.categoryId == categoryId).toList());

  Future<UserModel> login(String phone, String role) =>
    simulate(MockData.users[role] ?? MockData.users['customer']!);

  Future<bool> verifyOtp(String otp) =>
    simulate(otp == '123456', ms: 800); // mock OTP: 123456

  Future<List<CategoryModel>> getCategories() =>
    simulate(MockData.categories);

  Future<List<TransactionModel>> getTransactions() =>
    simulate(MockData.transactions);

  Future<List<NotificationModel>> getNotifications() =>
    simulate(MockData.notifications);
}
```

---

## 🧭 ROUTER (`lib/core/router/app_router.dart`)

```dart
final appRouter = GoRouter(
  initialLocation: '/splash',
  redirect: (ctx, state) {
    final auth = ctx.read(authProvider);
    final isLoggedIn = auth.user != null;
    final isAuthRoute = state.matchedLocation.startsWith('/auth');
    final isSplash = state.matchedLocation == '/splash';
    if (isSplash) return null;
    if (!isLoggedIn && !isAuthRoute) return '/auth/login';
    if (isLoggedIn && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (_, __) => SplashScreen()),
    GoRoute(path: '/onboarding', builder: (_, __) => OnboardingScreen()),
    ShellRoute(
      builder: (ctx, state, child) => AuthShell(child: child),
      routes: [
        GoRoute(path: '/auth/login', builder: (_, __) => LoginScreen()),
        GoRoute(path: '/auth/register', builder: (_, __) => RegisterScreen()),
        GoRoute(path: '/auth/otp', builder: (_, s) => OtpScreen(phone: s.extra as String)),
        GoRoute(path: '/auth/kyc', builder: (_, __) => KycScreen()),
      ],
    ),
    ShellRoute(
      builder: (ctx, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/home', builder: (_, __) => HomeScreen()),
        GoRoute(path: '/listings', builder: (_, __) => BrowseListingsScreen()),
        GoRoute(path: '/listings/create', builder: (_, __) => CreateListingScreen()),
        GoRoute(path: '/listings/:id', builder: (_, s) => ListingDetailScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/my-listings', builder: (_, __) => MyListingsScreen()),
        GoRoute(path: '/transactions', builder: (_, __) => TransactionsScreen()),
        GoRoute(path: '/transactions/:id', builder: (_, s) => TransactionDetailScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/transactions/:id/negotiate', builder: (_, s) => NegotiationScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/transactions/:id/bond', builder: (_, s) => BondViewerScreen(id: s.pathParameters['id']!)),
        GoRoute(path: '/chat/:roomId', builder: (_, s) => ChatScreen(roomId: s.pathParameters['roomId']!)),
        GoRoute(path: '/notifications', builder: (_, __) => NotificationsScreen()),
        GoRoute(path: '/subscription', builder: (_, __) => SubscriptionScreen()),
        GoRoute(path: '/subscription/plans', builder: (_, __) => PlansScreen()),
        GoRoute(path: '/wallet', builder: (_, __) => WalletScreen()),
        GoRoute(path: '/analytics', builder: (_, __) => AnalyticsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => ProfileScreen()),
        GoRoute(path: '/settings', builder: (_, __) => SettingsScreen()),
      ],
    ),
  ],
);
```

---

## 📱 SCREENS — BUILD EACH ONE FULLY

### 1. Splash Screen (`/features/splash/splash_screen.dart`):
```
- Full screen green gradient background
- Centered Lottie animation (recycling/market animation)
- App name in both Urdu and English below animation
- After 3 seconds: check if user is logged in
  → Yes: navigate to /home
  → No + first launch: navigate to /onboarding
  → No + returning: navigate to /auth/login
```

### 2. Onboarding (`/features/onboarding/onboarding_screen.dart`):
```
- 3 slides with PageView
- Slide 1: "List your scrap" / "اپنا کباڑ فروخت کریں" + image
- Slide 2: "Connect with dealers" / "ڈیلرز سے جڑیں" + image
- Slide 3: "Get the best price" / "بہترین قیمت پائیں" + image
- SmoothPageIndicator dots at bottom
- "Skip" button top right
- "Next" / "Get Started" primary button
- Language toggle top: EN | اردو
```

### 3. Login Screen (`/features/auth/login_screen.dart`):
```
- Logo at top
- Tab bar: Phone Number | Email
- Phone tab:
  → Country code dropdown showing 🇵🇰 +92 (default, fixed for now)
  → Phone number input with Pakistan format hint "3XX XXXXXXX"
  → "Send OTP" primary button
- Email tab:
  → Email input
  → Password input with show/hide toggle
  → "Login" button
- "Don't have an account? Register" link
- Language switch at bottom (EN | اردو)
- Test credentials shown in a dev banner:
  Customer: 0300-1234567 | OTP: 123456
  Dealer: 0321-9876543 | OTP: 123456
```

### 4. OTP Screen (`/features/auth/otp_screen.dart`):
```
- "We sent a code to +92 XXX-XXXXXXX"
- Pinput 6-digit OTP field (styled, auto-focus)
- Countdown timer "Resend in 04:32"
- "Verify" button
- "Resend OTP" link (active after countdown)
- Auto-submit when 6 digits entered
- Mock OTP: 123456 always works
- Loading state during verification
```

### 5. Register Screen (`/features/auth/register_screen.dart`):
```
- Full name field
- Phone number field (+92)
- Password + confirm password
- Role selector (styled card buttons):
  → Customer (free) - icon: person
  → Local Dealer (paid) - icon: store
  → City Franchise (paid) - icon: business
  → Wholesale (paid) - icon: warehouse
- City dropdown (Pakistan cities list)
- Terms checkbox
- "Create Account" button → goes to OTP screen
```

### 6. Home Screen (`/features/home/home_screen.dart`):
```
Top section:
  - Greeting: "السلام علیکم، Ali 👋" (Urdu) or "Welcome, Ali" (English)
  - City: "Karachi" with location pin icon
  - Notification bell icon (badge with count)

Stats Banner (for dealers/franchise):
  - 3 cards: "In Your Zone: 12" | "Your Deals: 3" | "This Month: ₨45,000"
  - Horizontal scroll

Search bar:
  - "کیا ڈھونڈ رہے ہیں؟" / "What are you looking for?"

Categories Grid (2-column):
  - Each card: colored background, emoji icon, name in selected language
  - 8 categories + "See All" card
  - Tap → navigate to /listings?category=xxx

Recent Listings section:
  - Heading "تازہ فہرستیں" / "Recent Listings"
  - Horizontal scroll of ListingCards
  - "View All" link

Bottom Navigation Bar:
  - Home | Browse | + (Create) | Deals | Profile
  - Center button (+) is FAB-style, green, slightly elevated
```

### 7. Browse Listings Screen (`/features/listings/browse_listings_screen.dart`):
```
- Toggle: List View | Map View (top right icon buttons)
- Category filter chips (horizontal scroll): All | Metals | Plastics | ...
- Sort button: Latest | Price Low | Price High | Quantity
- Visibility filter (for dealers): All | My Zone | Neighbor | City

List View:
  - ListView.builder of ListingCards
  - Pull to refresh
  - Infinite scroll (mock: load 5 more on scroll)
  - Empty state with Lottie animation

Map View:
  - Google Maps centered on user's city
  - Marker per listing (color = category color)
  - Tap marker → show ListingCard bottom sheet
  - Cluster nearby markers (default Flutter Maps clustering)
```

### 8. Listing Card Widget (`/features/listings/widgets/listing_card.dart`):
```
- Image (CachedNetworkImage with shimmer placeholder)
- Category color strip on left side
- Title (language-aware)
- Price: "₨ 850 / kg" in large text
- Quantity: "200 kg available"
- Location: "Korangi, Karachi"
- Time ago: "2 گھنٹے پہلے" / "2 hours ago"
- Visibility badge (colored chip): LOCAL | NEIGHBOR | CITY | WHOLESALE
- Interested count: "👁 5 interested"
```

### 9. Listing Detail Screen (`/features/listings/listing_detail_screen.dart`):
```
- Image carousel (PageView) with dot indicators
- Category + product type tags
- Title (large, language-aware)
- Price section: "₨ 850 / kg" + "Negotiable" chip
- Quantity: "200 kg"
- Location map snippet (small Google Map, non-interactive)
- Seller info card: name, rating, member since
- Description (collapsible)
- Attributes section (if present): Purity: High | Condition: Good
- Bottom bar:
  → Customer: "Edit Listing" (if own) or "Share"
  → Dealer: "Express Interest" green button + "Chat" outlined button
  → Already interested: "Negotiating..." badge
```

### 10. Create Listing (5-step wizard):
```
Step 1 — Category:
  - Grid of category cards (same as home)
  - Select category → show subcategories
  - Progress indicator at top: Step 1 of 5

Step 2 — Photos:
  - "Add up to 5 photos" instruction
  - Grid with + boxes
  - Tap → bottom sheet: Camera | Gallery
  - Drag to reorder
  - Delete icon on each photo
  - At least 1 photo required

Step 3 — Details:
  - Title field
  - Description field (multiline)
  - Price field (PKR, number keyboard)
  - "Price Negotiable" toggle
  - Quantity field + Unit dropdown (kg/ton/piece/bag/etc.)
  - Min order quantity (optional)
  - Dynamic attribute fields (from selected product type):
    → e.g. for Copper: Purity (dropdown), Grade (dropdown)
  - Contact number (pre-filled from profile, editable)

Step 4 — Location:
  - Google Map with draggable pin
  - "Use my current location" button (requests GPS permission)
  - City dropdown (Pakistan cities)
  - Area/neighborhood text field
  - Full address field (optional)

Step 5 — Preview:
  - Full preview of how listing will look
  - "Looks good, Submit" primary button
  - "Edit" button (goes back)
  - Success dialog with Lottie animation on submit
```

### 11. Transactions Screen (`/features/transactions/transactions_screen.dart`):
```
- Tab bar: Active | Completed | Cancelled
- Transaction card:
  → Listing thumbnail + title
  → Buyer/Seller name
  → Offered price → Final price
  → Status chip (color-coded)
  → "View" button
```

### 12. Negotiation Screen (`/features/transactions/negotiation_screen.dart`):
```
- Listing summary card at top
- Current offer displayed prominently
- Make/counter offer:
  → Price input field
  → Quantity confirmation
  → "Make Offer" button
- Accept offer button (green)
- Reject button (red outlined)
- "Finalize Deal" button (appears when both accepted)
- Chat section below (mini chat)
```

### 13. Chat Screen (`/features/chat/chat_screen.dart`):
```
- AppBar: contact name + online status dot
- ListView of message bubbles (mock messages)
- Message types:
  → Text bubble (green = sent, grey = received)
  → Offer card (special styled card with price + accept/reject)
  → System message (centered grey text)
- Input bar: text field + send button + image attach
- RTL-aware: Urdu messages right-aligned
- Mock: 5 pre-loaded messages, typing simulation on send
```

### 14. Notifications Screen:
```
- "Mark all read" button in AppBar
- Grouped by: Today | Yesterday | Earlier
- Each notification:
  → Icon (type-based: bell, offer, subscription, system)
  → Title + body (in user's language)
  → Time ago
  → Unread = slight blue tint background
  → Tap → navigate to relevant screen
```

### 15. Subscription Screen:
```
- Current plan card:
  → Plan name + role
  → Days remaining (large number, progress bar)
  → "18 days left" / "باقی 18 دن"
  → Expiry date
  → "Renew" button
- Plan comparison cards (3 plans)
- Payment section:
  → "Select Payment Method"
  → JazzCash (logo + "most popular" badge)
  → Easypaisa (logo)
  → Credit/Debit Card (Stripe)
  → Phone number field (for JazzCash/Easypaisa)
  → "Pay ₨1,500" button
- Mock: show success dialog on pay tap
```

### 16. Analytics Screen (Dealer/Franchise only):
```
- Summary row: Total Listings | Deals | Revenue | Zone Rank
- Bar chart: Monthly listings by category (fl_chart)
- Line chart: Deal value trend (last 6 months)
- Pie chart: Category breakdown
- Recent deals table
- All data from MockData
```

### 17. Profile Screen:
```
- Avatar (initials-based circle if no photo)
- Name + Role badge
- Phone + Email
- KYC status chip
- Zone assignment (for dealers)
- "Edit Profile" button
- Language switcher: English | اردو
- Subscription status mini card
- Sign out button (bottom, red text)
```

### 18. Settings Screen:
```
- Language: English | اردو (toggle, saves to SharedPreferences)
- Notifications: toggles per type
- App version
- Privacy Policy link
- Terms of Service link
- Contact Support
- "Delete Account" (red, confirmation dialog)
```

---

## 🌐 LOCALIZATION (`assets/translations/`)

### `assets/translations/en.json`:
```json
{
  "app_name": "Marketplace",
  "welcome": "Welcome",
  "login": "Login",
  "register": "Register",
  "phone_number": "Phone Number",
  "send_otp": "Send OTP",
  "verify": "Verify",
  "create_listing": "Create Listing",
  "browse_listings": "Browse Listings",
  "my_listings": "My Listings",
  "transactions": "Transactions",
  "profile": "Profile",
  "settings": "Settings",
  "price": "Price",
  "quantity": "Quantity",
  "category": "Category",
  "location": "Location",
  "submit": "Submit",
  "cancel": "Cancel",
  "next": "Next",
  "back": "Back",
  "make_offer": "Make an Offer",
  "accept": "Accept",
  "reject": "Reject",
  "finalize_deal": "Finalize Deal",
  "download_bond": "Download Bond",
  "your_zone": "Your Zone",
  "subscription_expires": "Subscription expires in {days} days",
  "renew_now": "Renew Now",
  "pay_now": "Pay Now",
  "sign_out": "Sign Out",
  "language": "Language",
  "notifications": "Notifications",
  "interested": "Interested",
  "hours_ago": "{n} hours ago",
  "days_ago": "{n} days ago"
}
```

### `assets/translations/ur.json`:
```json
{
  "app_name": "مارکیٹ پلیس",
  "welcome": "خوش آمدید",
  "login": "لاگ ان",
  "register": "رجسٹر کریں",
  "phone_number": "فون نمبر",
  "send_otp": "OTP بھیجیں",
  "verify": "تصدیق کریں",
  "create_listing": "فہرست بنائیں",
  "browse_listings": "فہرستیں دیکھیں",
  "my_listings": "میری فہرستیں",
  "transactions": "لین دین",
  "profile": "پروفائل",
  "settings": "ترتیبات",
  "price": "قیمت",
  "quantity": "مقدار",
  "category": "زمرہ",
  "location": "مقام",
  "submit": "جمع کریں",
  "cancel": "منسوخ کریں",
  "next": "اگلا",
  "back": "پیچھے",
  "make_offer": "پیشکش کریں",
  "accept": "قبول کریں",
  "reject": "رد کریں",
  "finalize_deal": "ڈیل مکمل کریں",
  "download_bond": "بانڈ ڈاؤنلوڈ کریں",
  "your_zone": "آپ کا علاقہ",
  "subscription_expires": "سبسکرپشن {days} دن میں ختم ہوگی",
  "renew_now": "ابھی تجدید کریں",
  "pay_now": "ابھی ادائیگی کریں",
  "sign_out": "سائن آؤٹ",
  "language": "زبان",
  "notifications": "اطلاعات",
  "interested": "دلچسپی ہے",
  "hours_ago": "{n} گھنٹے پہلے",
  "days_ago": "{n} دن پہلے"
}
```

---

## 🛠️ MAIN.DART

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('ur')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      startLocale: Locale('ur'),   // default Urdu
      child: ProviderScope(
        child: MarketplaceApp(),
      ),
    ),
  );
}

class MarketplaceApp extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = context.locale;
    return MaterialApp.router(
      title: 'مارکیٹ پلیس',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      locale: locale,
      supportedLocales: context.supportedLocales,
      localizationsDelegates: context.localizationDelegates,
      routerConfig: appRouter,
      builder: (context, child) {
        // Apply RTL for Urdu
        return Directionality(
          textDirection: locale.languageCode == 'ur'
              ? TextDirection.rtl
              : TextDirection.ltr,
          child: child!,
        );
      },
    );
  }
}
```

---

## 🚀 BUILD & RUN ON AVD COMMANDS

Add these to `README.md` and run them in order:

```bash
# ── SETUP ────────────────────────────────────────────────────

# 1. Get dependencies
flutter pub get

# 2. Generate code (Riverpod, etc.)
flutter pub run build_runner build --delete-conflicting-outputs

# 3. Verify no errors
flutter analyze

# ── AVD ──────────────────────────────────────────────────────

# 4. List available AVDs
emulator -list-avds

# 5. Start AVD (replace name with yours)
emulator -avd Pixel_6_Pro_API_33 &

# 6. Wait for AVD to boot, then verify
flutter devices

# ── RUN ──────────────────────────────────────────────────────

# 7. Run debug build on AVD
flutter run -d emulator-5554

# 8. Run with Urdu locale forced
flutter run -d emulator-5554 --dart-define=FORCE_LOCALE=ur

# ── BUILD APK ────────────────────────────────────────────────

# 9. Build debug APK (faster, for AVD testing)
flutter build apk --debug

# 10. Install debug APK directly on running AVD
flutter install --debug

# 11. Build release APK (for sharing/testing on real device)
flutter build apk --release --target-platform android-arm64

# APK location:
# build/app/outputs/flutter-apk/app-debug.apk
# build/app/outputs/flutter-apk/app-release.apk

# ── INSTALL APK ON AVD MANUALLY ─────────────────────────────

# 12. Install APK via ADB (if flutter install doesn't work)
adb install build/app/outputs/flutter-apk/app-debug.apk

# 13. Check ADB connected devices
adb devices

# ── HOT RELOAD (during development) ─────────────────────────
# Press 'r' in terminal = Hot Reload
# Press 'R' = Hot Restart
# Press 'q' = Quit
```

---

## ⚠️ COMMON AVD ISSUES & FIXES

```
Issue: "No connected devices"
Fix: adb kill-server && adb start-server && flutter devices

Issue: "License not accepted"
Fix: flutter doctor --android-licenses → accept all

Issue: "Gradle build failed"
Fix: cd android && ./gradlew clean && cd .. && flutter run

Issue: "SDK version too low"
Fix: In android/app/build.gradle → minSdkVersion 24

Issue: "Google Maps blank/grey on AVD"
Fix: Add valid API key in AndroidManifest.xml
    OR use: GoogleMap(myLocationEnabled: false) for prototype

Issue: "App crashes on Urdu RTL"
Fix: Wrap all Row widgets with Directionality check

Issue: "Lottie animation not loading"
Fix: Ensure lottie JSON files are in assets/animations/ 
    and declared in pubspec.yaml

Issue: "Image picker crash on AVD"
Fix: AVD must have API 24+. Add to AndroidManifest:
    android:requestLegacyExternalStorage="true"

Issue: "Build too slow"
Fix: In gradle.properties add:
    org.gradle.jvmargs=-Xmx4G
    org.gradle.parallel=true
    android.enableR8.fullMode=false
```

---

## 🧪 DEMO FLOW TO TEST ON AVD

After installing, test this exact flow:

```
1. Open app → see Splash with animation
2. Tap through 3 onboarding slides
3. Login screen → toggle to Urdu → see RTL layout
4. Enter phone: 03001234567 → Send OTP
5. Enter OTP: 123456 → verify → home screen
6. Browse home: see categories grid + recent listings
7. Tap "Metals" category → filtered listings
8. Tap Copper Wire listing → detail screen
9. Tap "Express Interest" → transaction created
10. Go to Transactions tab → see negotiation
11. Tap negotiate → make offer (₨800/kg)
12. Go to Chat → see conversation
13. Go to Profile → switch language to English → UI changes
14. Go to Subscription → see plan + JazzCash payment mock
15. Tap Create (+) → go through 5-step listing creation
16. Submit listing → success animation
17. Go to My Listings → see new listing
```

---

## 🎯 CURSOR AI INSTRUCTIONS

1. Build **every screen listed above** fully — no placeholder screens
2. Use **MockService** for all data — no real API calls yet
3. Every screen must work in **both English (LTR) and Urdu (RTL)**
4. All prices displayed as **₨ X,XXX** format (PKR)
5. All screens must be **responsive** — test on Pixel 6 Pro (1080x2400) and Pixel 4 (1080x2280)
6. Use **flutter_animate** for smooth page transitions and micro-animations
7. Use **shimmer** for all loading states — no circular progress indicators on list screens
8. Navigation via **GoRouter only** — no Navigator.push anywhere
9. State via **Riverpod only** — no setState except inside StatefulWidget for local UI state
10. The app must **compile and run** with `flutter run` on first try — zero runtime errors
11. After every feature: run `flutter analyze` — fix all warnings before moving to next screen
12. Build in this order: pubspec → main.dart → theme → models → mock data → router → splash → onboarding → auth → home → listings → transactions → chat → rest
```
