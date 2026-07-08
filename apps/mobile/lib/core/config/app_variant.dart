// Two app variants built from the same codebase:
//
// 1. **Pro** (dealer/franchise) — geo-fenced, territory-bounded,
//    area-specific listings & notifications, subscription features.
//
// 2. **Customer** (general public) — no area restrictions,
//    sees all listings, simplified UI, no territory screen.
//
// The variant is set at build time via `--dart-define=APP_VARIANT=pro`
// or `--dart-define=APP_VARIANT=customer`.
//
// Build commands:
//   flutter build apk --release --dart-define=APP_VARIANT=pro
//   flutter build apk --release --dart-define=APP_VARIANT=customer

enum AppVariantType { pro, customer }

class AppVariant {
  static const _raw = String.fromEnvironment('APP_VARIANT', defaultValue: 'customer');

  static AppVariantType get current =>
      _raw == 'pro' ? AppVariantType.pro : AppVariantType.customer;

  static bool get isPro => current == AppVariantType.pro;
  static bool get isCustomer => current == AppVariantType.customer;

  // ── Branding ──
  static String get appName =>
      isPro ? 'Kabariya Pro' : 'Kabariya';

  static String get appNameUrdu =>
      isPro ? 'کباڑیا پرو' : 'کباڑیا';

  static String get tagline =>
      isPro
          ? 'Dealer & Franchise Portal'
          : 'Buy & Sell Recyclable Materials';

  static String get taglineUrdu =>
      isPro
          ? 'ڈیلر اور فرنچائز پورٹل'
          : 'ری سائیکل مواد خریدیں اور بیچیں';

  // Alias used by some screens
  static String get appTagline => tagline;

  // ── Feature flags ──
  static bool get showTerritoryScreen => isPro;
  // Seller-side features must never be wallet/subscription gated.
  // Pro means role-aware professional UX, not paid seller access.
  static bool get showAnalytics => true;
  static bool get showSubscription => true; // buyer-side premium only
  static bool get enforceGeoFencing => isPro;
  static bool get showDealerRoles => isPro;
  static bool get showEscalationInfo => isPro;
  static bool get showWallet => true;
  static bool get requiresBalance => false; // balance is needed only when acting as buyer
  static bool get adminOnlyRegistration => false; // users may self-register then apply for Pro KYC

  static String get packageName =>
      isPro ? 'com.kabariya.app.pro' : 'com.kabariya.app';
}
