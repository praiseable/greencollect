// ✅ Single source of truth for all backend URLs in the mobile app.
//    Both ApiService and ChatProvider read from here.

class ApiConfig {
  ApiConfig._();

  // Production backend — all API calls go here
  static const String baseUrl    = 'https://gc.directconnect.services/v1';

  // Socket.io connects to the root (no /v1 prefix)
  static const String socketUrl  = 'https://gc.directconnect.services';

  // Android emulator → host machine local backend (only when useDev is true)
  static const String devBaseUrl = 'http://10.0.2.2:4000/v1';
  static const String devSocketUrl = 'http://10.0.2.2:4000';

  // Use production by default. Set to true only when running backend locally (e.g. AVD + npm run dev) for OTP 111111 testing.
  static const bool useDev = false;

  static String get effectiveBaseUrl   => useDev ? devBaseUrl   : baseUrl;
  static String get effectiveSocketUrl => useDev ? devSocketUrl : socketUrl;

  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  // Pakistan-specific defaults
  static const String defaultCurrency = 'PKR';
  static const String defaultCurrencySymbol = '₨';
  static const String defaultCountryCode = '+92';
  static const String defaultTimezone = 'Asia/Karachi';
  static const String defaultLanguage = 'en';

  // Storage keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String tokenExpiresAtKey = 'token_expires_at'; // Expiry timestamp (skill requirement)
  static const String userKey = 'user_data';
  static const String languageKey = 'app_language';
}
