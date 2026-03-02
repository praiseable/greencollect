class ApiConfig {
  // Base URL — change this for production
  static const String baseUrl = 'https://gc.directconnect.services/v1';
  static const String devBaseUrl = 'http://10.0.2.2:4000/v1'; // Android emulator

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
  static const String userKey = 'user_data';
  static const String languageKey = 'app_language';
}
