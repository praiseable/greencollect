import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final _secureStorage = const FlutterSecureStorage();

  // Auth Token
  Future<void> setToken(String token, [int? expiresInSeconds]) async {
    await _secureStorage.write(key: ApiConfig.tokenKey, value: token);
    // Store expiry timestamp for proactive refresh (skill requirement)
    if (expiresInSeconds != null) {
      final prefs = await SharedPreferences.getInstance();
      final expiresAt = DateTime.now().millisecondsSinceEpoch + (expiresInSeconds * 1000);
      await prefs.setInt(ApiConfig.tokenExpiresAtKey, expiresAt);
    }
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: ApiConfig.tokenKey);
  }

  /// Alias for getToken() — used by ApiService in fixes
  Future<String?> getAccessToken() async => getToken();

  /// Check if token expires soon (for proactive refresh)
  Future<bool> isTokenExpiringSoon([int thresholdSeconds = 60]) async {
    final prefs = await SharedPreferences.getInstance();
    final expiresAt = prefs.getInt(ApiConfig.tokenExpiresAtKey);
    if (expiresAt == null) return false;
    final now = DateTime.now().millisecondsSinceEpoch;
    return (expiresAt - now) < (thresholdSeconds * 1000);
  }

  /// Aliases for fix auth/chat providers
  Future<void> saveAccessToken(String token, [int? expiresInSeconds]) async => setToken(token, expiresInSeconds);
  Future<void> saveRefreshToken(String token) async => setRefreshToken(token);
  Future<void> saveUser(Map<String, dynamic>? user) async {
    if (user != null) await setUser(user);
  }
  Future<void> clearAll() async => clearAuth();

  Future<void> setRefreshToken(String token) async {
    await _secureStorage.write(key: ApiConfig.refreshTokenKey, value: token);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: ApiConfig.refreshTokenKey);
  }

  // User data
  Future<void> setUser(Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(ApiConfig.userKey, json.encode(user));
  }

  Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(ApiConfig.userKey);
    if (data != null) return json.decode(data);
    return null;
  }

  // Language
  Future<void> setLanguage(String lang) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(ApiConfig.languageKey, lang);
  }

  Future<String> getLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(ApiConfig.languageKey) ?? 'en';
  }

  // Clear auth data
  Future<void> clearAuth() async {
    await _secureStorage.delete(key: ApiConfig.tokenKey);
    await _secureStorage.delete(key: ApiConfig.refreshTokenKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(ApiConfig.userKey);
    await prefs.remove(ApiConfig.tokenExpiresAtKey); // Clear expiry timestamp
  }
}
