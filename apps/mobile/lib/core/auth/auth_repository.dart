import '../../services/api_service.dart';
import '../models/user.model.dart';
import 'auth_validators.dart';
import 'secure_session_store.dart';
import 'session_state.dart';

class AuthResult {
  final UserModel? user;
  final String? accessToken;
  final String? refreshToken;
  final int? expiresIn;
  final String? message;
  final String? devOtp;

  const AuthResult({
    this.user,
    this.accessToken,
    this.refreshToken,
    this.expiresIn,
    this.message,
    this.devOtp,
  });

  bool get hasSession => accessToken != null && accessToken!.isNotEmpty;
}

/// Backend-facing auth repository for M1-B.
///
/// Screens should use this class through providers instead of directly building
/// auth payloads. It centralizes endpoint names, payload normalization, token
/// persistence, KYC submit, optional tax fields, and force-update checks.
class AuthRepository {
  final ApiService _api;
  final SecureSessionStore _store;

  AuthRepository({ApiService? api, SecureSessionStore? store})
      : _api = api ?? ApiService(),
        _store = store ?? SecureSessionStore();

  static const String loginPath = 'auth/login';
  static const String registerPath = 'auth/register';
  static const String sendOtpPath = 'auth/otp/send';
  static const String verifyOtpPath = 'auth/otp/verify';
  static const String refreshPath = 'auth/refresh';
  static const String logoutPath = 'auth/logout';
  static const String mePath = 'auth/me';
  static const String appVersionPath = 'config/app-version';
  static const String kycPath = 'kyc/submit';
  static const String taxProfilePath = 'users/me/tax-profile';

  Future<SessionState> restoreSession() async {
    final token = await _store.accessToken;
    if (token == null || token.isEmpty) {
      return const SessionState.unauthenticated();
    }

    try {
      final user = await fetchMe();
      return SessionState.authenticated(user);
    } catch (_) {
      final refreshed = await refresh();
      if (refreshed.user != null) return SessionState.authenticated(refreshed.user!);
      await _store.clear();
      return const SessionState.unauthenticated();
    }
  }

  Future<Map<String, dynamic>> checkAppVersion({String platform = 'android'}) async {
    final response = await _api.get(
      appVersionPath,
      queryParams: {'platform': platform},
    );
    final body = _asMap(response);
    return _asMap(body['data'] ?? body);
  }

  Future<AuthResult> sendOtp(String phone) async {
    final normalized = AuthValidators.normalizePakistanPhone(phone);
    final response = await _api.post(sendOtpPath, {'phone': normalized});
    final body = _asMap(response);
    return AuthResult(
      message: body['message']?.toString(),
      devOtp: body['otp']?.toString() ?? body['devOtp']?.toString(),
    );
  }

  Future<AuthResult> verifyOtp({required String phone, required String otp}) async {
    final response = await _api.post(verifyOtpPath, {
      'phone': AuthValidators.normalizePakistanPhone(phone),
      'otp': otp.trim(),
    });
    return _persistAuthResponse(response);
  }

  Future<AuthResult> login({
    required String emailOrPhone,
    required String password,
  }) async {
    final payload = AuthValidators.loginPayload(
      emailOrPhone: emailOrPhone,
      password: password,
    );
    final response = await _api.post(loginPath, payload);
    return _persistAuthResponse(response);
  }

  Future<AuthResult> register({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
    String? email,
  }) async {
    final payload = AuthValidators.registerPayload(
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      password: password,
      email: email,
    );
    final response = await _api.post(registerPath, payload);
    return _persistAuthResponse(response);
  }

  Future<AuthResult> refresh() async {
    final refreshToken = await _store.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) {
      return const AuthResult();
    }
    final response = await _api.post(refreshPath, {'refreshToken': refreshToken});
    return _persistAuthResponse(response);
  }

  Future<UserModel> fetchMe() async {
    final response = await _api.get(mePath);
    final user = _userFromResponse(response);
    await _store.saveUser(user);
    return user;
  }

  Future<void> logout() async {
    try {
      await _api.post(logoutPath, {});
    } finally {
      await _store.clear();
    }
  }

  Future<Map<String, dynamic>> submitProKyc({
    required String requestedRole,
    required String cnicNumber,
    required String businessName,
    required String businessAddress,
    String? ntnNumber,
    String? strnNumber,
    String? businessType,
  }) async {
    final payload = AuthValidators.proKycPayload(
      requestedRole: requestedRole,
      cnicNumber: cnicNumber,
      businessName: businessName,
      businessAddress: businessAddress,
      ntnNumber: ntnNumber,
      strnNumber: strnNumber,
      businessType: businessType,
    );
    final response = await _api.post(kycPath, payload);
    return _asMap(response);
  }

  Future<Map<String, dynamic>> updateTaxProfile({
    String? ntnNumber,
    String? strnNumber,
    String? businessType,
  }) async {
    if (!AuthValidators.isValidOptionalNtn(ntnNumber)) {
      throw ArgumentError('Invalid NTN format');
    }
    if (!AuthValidators.isValidOptionalStrn(strnNumber)) {
      throw ArgumentError('Invalid STRN format');
    }
    final response = await _api.patch(taxProfilePath, {
      if (ntnNumber != null) 'ntnNumber': ntnNumber.trim(),
      if (strnNumber != null) 'strnNumber': strnNumber.trim(),
      if (businessType != null) 'businessType': businessType.trim(),
    });
    return _asMap(response);
  }

  Future<AuthResult> _persistAuthResponse(dynamic response) async {
    final body = _asMap(response);
    final data = _asMap(body['data'] ?? body);
    final accessToken = data['accessToken']?.toString() ?? body['accessToken']?.toString();
    final refreshToken = data['refreshToken']?.toString() ?? body['refreshToken']?.toString();
    final expiresInRaw = data['expiresIn'] ?? body['expiresIn'];
    final expiresIn = expiresInRaw is num ? expiresInRaw.toInt() : null;
    final user = _maybeUserFromResponse(data) ?? _maybeUserFromResponse(body);

    if (accessToken != null && accessToken.isNotEmpty) {
      await _store.saveSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresIn: expiresIn,
        user: user,
      );
    } else if (user != null) {
      await _store.saveUser(user);
    }

    return AuthResult(
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
      message: body['message']?.toString(),
    );
  }

  UserModel _userFromResponse(dynamic response) {
    final user = _maybeUserFromResponse(response);
    if (user == null) throw StateError('User payload missing');
    return user;
  }

  UserModel? _maybeUserFromResponse(dynamic response) {
    final map = _asMap(response);
    final raw = map['user'] ?? map['profile'] ?? map['data'];
    if (raw is Map<String, dynamic>) return UserModel.fromJson(raw);
    if (raw is Map) return UserModel.fromJson(Map<String, dynamic>.from(raw));
    return null;
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }
}
