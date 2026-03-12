import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'storage_service.dart';

// ✅ FIX: Uses ApiConfig.effectiveBaseUrl (switches dev/prod via useDev flag).
//        Added patch() method needed by NotificationsProvider.
//        Automatically attaches Bearer token from SecureStorage.

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final StorageService _storage = StorageService();
  final http.Client _client = http.Client();

  /// Called when session is expired and refresh failed (so we cleared auth). Set from app to sync AuthProvider.
  void Function()? onSessionExpired;

  /// Lock so only one refresh runs when multiple requests get 401.
  bool _refreshing = false;

  String get baseUrl => ApiConfig.effectiveBaseUrl;

  // ── Build headers with auth token ────────────────────────────────────────
  Future<Map<String, String>> _headers() async {
    final token = await _storage.getAccessToken();
    final lang  = await _storage.getLanguage() ?? 'en';
    return {
      'Content-Type':   'application/json',
      'Accept':         'application/json',
      'Accept-Language': lang,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// Call POST /auth/refresh-token and save new tokens. Returns true if new access token was saved.
  /// Does not use _parse (so no clearAuth). Used only for retry-after-401.
  Future<bool> _doRefresh() async {
    if (_refreshing) return false;
    _refreshing = true;
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return false;

      final uri = _uri('auth/refresh-token');
      final res = await _client.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({'refreshToken': refreshToken}),
      ).timeout(ApiConfig.receiveTimeout);

      if (res.statusCode != 200) return false;
      final data = jsonDecode(res.body) as Map<String, dynamic>?;
      final accessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || accessToken.isEmpty) return false;

      await _storage.saveAccessToken(accessToken);
      if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
        await _storage.saveRefreshToken(newRefreshToken);
      }
      if (kDebugMode) debugPrint('[API] Refresh token succeeded');
      return true;
    } catch (e) {
      if (kDebugMode) debugPrint('[API] Refresh token failed: $e');
      return false;
    } finally {
      _refreshing = false;
    }
  }

  /// Clear auth and notify app so AuthProvider can sync (e.g. redirect to login).
  void _clearSession() {
    _storage.clearAuth();
    onSessionExpired?.call();
  }

  // ── Build full URI ───────────────────────────────────────────────────────
  Uri _uri(String path, {Map<String, String>? queryParams}) {
    final cleanPath = path.startsWith('/') ? path.substring(1) : path;
    final base = Uri.parse(baseUrl);
    final fullPath = '${base.path}/$cleanPath';
    return base.replace(path: fullPath, queryParameters: queryParams);
  }

  // ── Parse response ───────────────────────────────────────────────────────
  dynamic _parse(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return {};
      return jsonDecode(res.body);
    }
    // Parse error body (support both { error: { message } } and { errors: [ { msg } ] })
    Map<String, dynamic> errorBody = {};
    try { errorBody = jsonDecode(res.body); } catch (_) {}
    if (kDebugMode && res.body.isNotEmpty) {
      debugPrint('[API] Error ${res.statusCode} response: ${res.body.length > 500 ? "${res.body.substring(0, 500)}..." : res.body}');
    }
    String msg = errorBody['error']?['message'] ??
        errorBody['message'] ??
        'Request failed (${res.statusCode})';
    final validationErrors = errorBody['errors'] as List?;
    if (validationErrors != null && validationErrors.isNotEmpty) {
      final first = validationErrors.first;
      if (first is Map && first['msg'] != null) {
        msg = first['msg'] as String;
      }
    }
    // Build detail string for UI (code, details, or raw body snippet)
    String? detail;
    final err = errorBody['error'];
    if (err is Map) {
      final parts = <String>[];
      if (err['code'] != null) parts.add('code: ${err['code']}');
      if (err['details'] != null) parts.add(err['details'].toString());
      if (parts.isNotEmpty) detail = parts.join(' · ');
    }
    if (detail == null && res.body.isNotEmpty && res.body.length <= 300) {
      detail = res.body;
    } else if (detail == null && res.body.length > 300) {
      detail = '${res.body.substring(0, 300)}…';
    }
    // 401: caller may retry after refresh; if not retried, _clearSession() is used
    throw ApiException(msg, res.statusCode, details: detail);
  }

  /// On 401: try refresh once, retry request, then parse. If still 401 or refresh fails, clear session and throw.
  Future<dynamic> _requestWithRefreshRetry(Future<http.Response> Function() request) async {
    http.Response res = await request();
    if (res.statusCode == 401) {
      final refreshed = await _doRefresh();
      if (refreshed) res = await request();
      if (res.statusCode == 401) {
        _clearSession();
        _parse(res);
      }
    }
    return _parse(res);
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    return _requestWithRefreshRetry(() => _client.get(
      _uri(path, queryParams: queryParams),
      headers: await _headers(),
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final uri = _uri(path);
    if (kDebugMode && path.contains('auth')) {
      debugPrint('[API] POST $uri body=${body != null ? body.toString().replaceAll(RegExp(r'[\s\n]+'), ' ') : null}');
    }
    return _requestWithRefreshRetry(() async {
      final res = await _client.post(
        uri,
        headers: await _headers(),
        body: body != null ? jsonEncode(body) : null,
      ).timeout(ApiConfig.receiveTimeout);
      if (kDebugMode && path.contains('auth')) {
        debugPrint('[API] POST $path → ${res.statusCode}');
      }
      return res;
    });
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    return _requestWithRefreshRetry(() => _client.put(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    return _requestWithRefreshRetry(() => _client.patch(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  Future<dynamic> delete(String path) async {
    return _requestWithRefreshRetry(() => _client.delete(
      _uri(path),
      headers: await _headers(),
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── Multipart POST (image upload) ────────────────────────────────────────
  Future<dynamic> multipartPost(
    String path, {
    required Map<String, String> fields,
    List<http.MultipartFile>? files,
  }) async {
    return _requestWithRefreshRetry(() async {
      final headers = await _headers()
        ..remove('Content-Type');
      final request = http.MultipartRequest('POST', _uri(path))
        ..headers.addAll(headers)
        ..fields.addAll(fields);
      if (files != null) request.files.addAll(files);
      final streamed = await request.send().timeout(const Duration(seconds: 60));
      return http.Response.fromStream(streamed);
    });
  }

  // ── App version / listings helpers (keep compatibility) ───────────────────
  Future<Map<String, dynamic>> getAppVersion([String platform = 'android']) async {
    final res = await get('config/app-version', queryParams: {'platform': platform});
    if (res is Map && res['success'] == true && res['data'] != null) {
      return Map<String, dynamic>.from(res['data'] as Map);
    }
    return {'minVersion': '1.0.0', 'latestVersion': '1.0.0', 'forceUpdate': false};
  }

  Future<Map<String, dynamic>> getListingsFavorites({int page = 1, int limit = 20}) async {
    final res = await get('listings/favorites', queryParams: {'page': '$page', 'limit': '$limit'});
    if (res is Map && res['success'] == true) return Map<String, dynamic>.from(res as Map);
    return {'data': [], 'meta': {}};
  }

  Future<bool> toggleListingFavorite(String listingId) async {
    final res = await post('listings/$listingId/favorite', {});
    if (res is Map && res['success'] == true && res['data'] != null) {
      return (res['data'] as Map)['favorited'] == true;
    }
    return false;
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  final String? details;

  ApiException(this.message, this.statusCode, {this.details});

  /// Full message for UI: message + HTTP status + optional details.
  String get displayMessage {
    final buf = StringBuffer(message);
    buf.write(' (HTTP $statusCode)');
    if (details != null && details!.isNotEmpty) {
      buf.write('\n$details');
    }
    return buf.toString();
  }

  @override
  String toString() => message;
}
