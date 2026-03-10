import 'dart:convert';
import 'package:http/http.dart' as http;
import 'storage_service.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String get baseUrl => ApiConfig.baseUrl;

  Future<Map<String, String>> _headers() async {
    final token = await StorageService().getToken();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en',
    };
    if (token != null) headers['Authorization'] = 'Bearer $token';
    return headers;
  }

  Future<dynamic> get(String path) async {
    final response = await http
        .get(Uri.parse('$baseUrl$path'), headers: await _headers())
        .timeout(ApiConfig.receiveTimeout);
    return _handleResponse(response);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl$path'),
          headers: await _headers(),
          body: body != null ? json.encode(body) : null,
        )
        .timeout(ApiConfig.receiveTimeout);
    return _handleResponse(response);
  }

  Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    final response = await http
        .put(
          Uri.parse('$baseUrl$path'),
          headers: await _headers(),
          body: body != null ? json.encode(body) : null,
        )
        .timeout(ApiConfig.receiveTimeout);
    return _handleResponse(response);
  }

  Future<dynamic> delete(String path) async {
    final response = await http
        .delete(Uri.parse('$baseUrl$path'), headers: await _headers())
        .timeout(ApiConfig.receiveTimeout);
    return _handleResponse(response);
  }

  Future<dynamic> multipartPost(
    String path, {
    required Map<String, String> fields,
    List<http.MultipartFile>? files,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
    final headers = await _headers();
    headers.remove('Content-Type');
    request.headers.addAll(headers);
    request.fields.addAll(fields);
    if (files != null) request.files.addAll(files);

    final streamedResponse =
        await request.send().timeout(const Duration(seconds: 60));
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? json.decode(response.body) : null;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    final errorMessage = body?['error']?['message'] ?? body?['message'] ?? 'Something went wrong';

    if (response.statusCode == 401) {
      StorageService().clearAuth();
      throw ApiException('Session expired. Please login again.', 401);
    }

    throw ApiException(errorMessage, response.statusCode);
  }

  /// App version config for force-update (Kabariya spec). platform: 'android' | 'ios'
  Future<Map<String, dynamic>> getAppVersion(String platform) async {
    final res = await get('config/app-version?platform=$platform');
    if (res is Map && res['success'] == true && res['data'] != null) {
      return Map<String, dynamic>.from(res['data'] as Map);
    }
    return {'minVersion': '1.0.0', 'latestVersion': '1.0.0', 'forceUpdate': false};
  }

  /// List user's favourited listings (paginated).
  Future<Map<String, dynamic>> getListingsFavorites({int page = 1, int limit = 20}) async {
    final res = await get('listings/favorites?page=$page&limit=$limit');
    if (res is Map && res['success'] == true) {
      return Map<String, dynamic>.from(res as Map);
    }
    return {'data': [], 'meta': {}};
  }

  /// Toggle favourite for a listing. Returns { favorited: true | false }.
  Future<bool> toggleListingFavorite(String listingId) async {
    final res = await post('listings/$listingId/favorite');
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
