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

  /// Lock so only one refresh runs when multiple requests get 401 or proactive refresh.
  bool _refreshing = false;
  /// When set, other callers can await this to get the result of the in-flight refresh.
  Future<bool>? _refreshFuture;

  String get baseUrl => ApiConfig.effectiveBaseUrl;

  /// Seconds before expiry at which we proactively refresh the access token.
  static const int _refreshBeforeExpirySeconds = 120;

  /// Decode JWT payload (no verification) to read exp. Returns expiry seconds since epoch or null.
  static int? _tokenExpiry(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      String payload = parts[1];
      payload = payload.replaceAll('-', '+').replaceAll('_', '/');
      switch (payload.length % 4) {
        case 2: payload += '=='; break;
        case 3: payload += '='; break;
      }
      final bytes = base64Decode(payload);
      final map = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>?;
      final exp = map?['exp'];
      if (exp is int) return exp;
      if (exp is num) return exp.toInt();
      return null;
    } catch (_) {
      return null;
    }
  }

  // ── Build headers with auth token ────────────────────────────────────────
  /// Proactively refreshes access token if it expires in the next [_refreshBeforeExpirySeconds].
  /// Uses stored expiry timestamp first (faster), falls back to JWT decoding.
  Future<Map<String, String>> _headers() async {
    String? token = await _storage.getAccessToken();
    final lang = await _storage.getLanguage() ?? 'en';

    if (token != null && token.isNotEmpty) {
      // Check stored expiry timestamp first (skill requirement - faster than JWT decode)
      bool shouldRefresh = await _storage.isTokenExpiringSoon(_refreshBeforeExpirySeconds);
      
      // Fallback to JWT exp claim if timestamp not available
      if (!shouldRefresh) {
        final exp = _tokenExpiry(token);
        final now = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        shouldRefresh = exp != null && exp <= now + _refreshBeforeExpirySeconds;
      }
      
      if (shouldRefresh) {
        final refreshed = await _doRefresh();
        if (refreshed) token = await _storage.getAccessToken();
      }
    }

    return {
      'Content-Type':   'application/json',
      'Accept':         'application/json',
      'Accept-Language': lang,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// Call POST /auth/refresh-token and save new tokens. Returns true if new access token was saved.
  /// Concurrent callers share the same refresh (one runs, others await its result).
  Future<bool> _doRefresh() async {
    if (_refreshing && _refreshFuture != null) return _refreshFuture!;
    _refreshing = true;
    _refreshFuture = _performRefresh();
    try {
      return await _refreshFuture!;
    } finally {
      _refreshing = false;
      _refreshFuture = null;
    }
  }

  Future<bool> _performRefresh() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        if (kDebugMode) debugPrint('[API] Refresh skipped: no refresh token in storage');
        return false;
      }

      if (kDebugMode) debugPrint('[API] Sending refresh token request to auth/refresh');
      // Use new skill-compliant endpoint (backward compatible with /auth/refresh-token)
      final uri = _uri('auth/refresh');
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
      final expiresIn = data?['expiresIn'] as int? ?? 900; // Default 15 minutes
      if (accessToken == null || accessToken.isEmpty) return false;

      await _storage.saveAccessToken(accessToken, expiresIn);
      if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
        await _storage.saveRefreshToken(newRefreshToken);
      }
      if (kDebugMode) debugPrint('[API] Refresh token succeeded');
      return true;
    } catch (e) {
      if (kDebugMode) debugPrint('[API] Refresh token failed: $e');
      return false;
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
  /// Checks X-Token-Error header to distinguish expired vs invalid tokens (skill requirement).
  Future<dynamic> _requestWithRefreshRetry(Future<http.Response> Function() request) async {
    http.Response res = await request();
    if (res.statusCode == 401) {
      // Check X-Token-Error header (skill requirement)
      final tokenError = res.headers['x-token-error'] ?? 
                        (res.headers['x-token-expired'] == 'true' ? 'tokenExpired' : null);
      
      // If token is invalid (tampered/revoked), don't try refresh - clear session immediately
      if (tokenError == 'tokenInvalid') {
        if (kDebugMode) debugPrint('[API] Token invalid (X-Token-Error: tokenInvalid) - clearing session');
        _clearSession();
        _parse(res);
      }
      
      // Try refresh for expired tokens
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
    return _requestWithRefreshRetry(() async => _client.get(
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
    
    // Skip retry mechanism for logout to prevent infinite loops
    if (path.contains('auth/logout')) {
      try {
        final res = await _client.post(
          uri,
          headers: await _headers(),
          body: body != null ? jsonEncode(body) : null,
        ).timeout(ApiConfig.receiveTimeout);
        
        // For logout, always return success even on 401 to prevent loops
        if (res.statusCode == 401 || (res.statusCode >= 200 && res.statusCode < 300)) {
          if (kDebugMode) debugPrint('[API] Logout call completed (status: ${res.statusCode})');
          return {};
        }
        return _parse(res);
      } catch (e) {
        // For logout, ignore errors to prevent loops
        if (kDebugMode) debugPrint('[API] Logout call failed (ignored): $e');
        return {};
      }
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
    return _requestWithRefreshRetry(() async => _client.put(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    return _requestWithRefreshRetry(() async => _client.patch(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout));
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  Future<dynamic> delete(String path) async {
    return _requestWithRefreshRetry(() async => _client.delete(
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
