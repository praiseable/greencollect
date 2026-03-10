import 'dart:convert';
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
    // Parse error body
    Map<String, dynamic> errorBody = {};
    try { errorBody = jsonDecode(res.body); } catch (_) {}
    final msg = errorBody['error']?['message'] ??
                errorBody['message'] ??
                'Request failed (${res.statusCode})';
    if (res.statusCode == 401) _storage.clearAuth();
    throw ApiException(msg, res.statusCode);
  }

  // ── GET ──────────────────────────────────────────────────────────────────
  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final res = await _client.get(
      _uri(path, queryParams: queryParams),
      headers: await _headers(),
    ).timeout(ApiConfig.receiveTimeout);
    return _parse(res);
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await _client.post(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout);
    return _parse(res);
  }

  // ── PUT ──────────────────────────────────────────────────────────────────
  Future<dynamic> put(String path, [Map<String, dynamic>? body]) async {
    final res = await _client.put(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout);
    return _parse(res);
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  // ✅ FIX: patch() was missing — needed for mark-notification-read endpoints
  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    final res = await _client.patch(
      _uri(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    ).timeout(ApiConfig.receiveTimeout);
    return _parse(res);
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  Future<dynamic> delete(String path) async {
    final res = await _client.delete(
      _uri(path),
      headers: await _headers(),
    ).timeout(ApiConfig.receiveTimeout);
    return _parse(res);
  }

  // ── Multipart POST (image upload) ────────────────────────────────────────
  Future<dynamic> multipartPost(
    String path, {
    required Map<String, String> fields,
    List<http.MultipartFile>? files,
  }) async {
    final headers = await _headers()
      ..remove('Content-Type');
    final request = http.MultipartRequest('POST', _uri(path))
      ..headers.addAll(headers)
      ..fields.addAll(fields);
    if (files != null) request.files.addAll(files);
    final streamed = await request.send().timeout(const Duration(seconds: 60));
    final res = await http.Response.fromStream(streamed);
    return _parse(res);
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
  ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}
