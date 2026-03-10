import 'package:flutter/foundation.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../models/user.model.dart';

enum AuthStatus { idle, loading, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final ApiService     _api     = ApiService();
  final StorageService _storage = StorageService();

  AuthStatus _status = AuthStatus.idle;
  UserModel? _user;
  String?    _error;

  AuthStatus get status        => _status;
  UserModel? get user          => _user;
  String?    get error         => _error;
  bool get isAuthenticated     => _status == AuthStatus.authenticated;

  // ── Initialise — restore saved session ──────────────────────────────────
  Future<void> init() async {
    final token = await _storage.getAccessToken();
    if (token == null || token.isEmpty) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    try {
      // Try using saved token first
      final response = await _api.get('auth/me');
      _user   = UserModel.fromJson(response['user'] ?? response);
      _status = AuthStatus.authenticated;
    } catch (e) {
      // Token expired or invalid — try refresh before giving up
      final refreshed = await _tryRefresh();
      if (!refreshed) {
        await _storage.clearAll();
        _status = AuthStatus.unauthenticated;
      }
    }
    notifyListeners();
  }

  // ── Token refresh ────────────────────────────────────────────────────────
  Future<bool> _tryRefresh() async {
    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return false;

      final response = await _api.post('auth/refresh-token', {
        'refreshToken': refreshToken,
      });

      final newAccessToken  = response['accessToken']  as String?;
      final newRefreshToken = response['refreshToken'] as String?;

      if (newAccessToken == null) return false;

      await _storage.saveAccessToken(newAccessToken);
      if (newRefreshToken != null) await _storage.saveRefreshToken(newRefreshToken);

      final profileRes = await _api.get('auth/me');
      _user   = UserModel.fromJson(profileRes['user'] ?? profileRes);
      _status = AuthStatus.authenticated;
      if (_user != null) await _storage.setUser(_user!.toJson());
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── Send OTP ─────────────────────────────────────────────────────────────
  Future<bool> sendOtp(String phone) async {
    _status = AuthStatus.loading;
    _error  = null;
    notifyListeners();
    try {
      await _api.post('auth/otp/send', { 'phone': phone });
      _status = AuthStatus.idle;
      notifyListeners();
      return true;
    } catch (e) {
      _error  = _parseError(e, 'Failed to send OTP');
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────────────
  Future<bool> verifyOtp(String phone, String otp) async {
    _status = AuthStatus.loading;
    _error  = null;
    notifyListeners();
    try {
      final response = await _api.post('auth/otp/verify', {
        'phone': phone,
        'otp':   otp,
      });

      final accessToken  = response['accessToken']  as String?;
      final refreshToken = response['refreshToken'] as String?;
      final userData     = response['user'];

      if (accessToken == null) {
        _error  = 'No token received from server';
        _status = AuthStatus.error;
        notifyListeners();
        return false;
      }

      await _storage.saveAccessToken(accessToken);
      if (refreshToken != null) await _storage.saveRefreshToken(refreshToken);

      _user = userData != null ? UserModel.fromJson(userData) : null;
      if (_user != null) await _storage.setUser(_user!.toJson());

      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error  = _parseError(e, 'OTP verification failed');
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  // ── Email/password login ─────────────────────────────────────────────────
  Future<bool> login(String email, String password) async {
    _status = AuthStatus.loading;
    _error  = null;
    notifyListeners();
    try {
      final response = await _api.post('auth/login', {
        'email':    email,
        'password': password,
      });

      final accessToken  = response['accessToken']  as String?;
      final refreshToken = response['refreshToken'] as String?;
      final userData     = response['user'];

      if (accessToken == null) throw Exception('No token in response');

      await _storage.saveAccessToken(accessToken);
      if (refreshToken != null) await _storage.saveRefreshToken(refreshToken);

      _user = userData != null ? UserModel.fromJson(userData) : null;
      if (_user != null) await _storage.setUser(_user!.toJson());

      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error  = _parseError(e, 'Login failed');
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  // ── Fetch / refresh user profile ─────────────────────────────────────────
  Future<void> fetchProfile() async {
    try {
      final response = await _api.get('auth/me');
      _user = UserModel.fromJson(response['user'] ?? response);
      if (_user != null) await _storage.setUser(_user!.toJson());
      notifyListeners();
    } catch (e) {
      if (e.toString().contains('401') || e.toString().contains('expired')) {
        await _tryRefresh();
      }
      debugPrint('fetchProfile error: $e');
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  Future<void> logout() async {
    try {
      await _api.post('auth/logout', {});
    } catch (_) {}
    await _storage.clearAll();
    _user   = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _parseError(dynamic e, String fallback) {
    if (e is Map) {
      final code = e['error']?['code'] as String?;
      if (code == 'OTP_LOCKED')   return 'Too many attempts. Please wait 15 minutes.';
      if (code == 'OTP_COOLDOWN') return 'Please wait 60 seconds before requesting another OTP.';
      if (code == 'OTP_INVALID')  return 'Incorrect OTP. Please try again.';
      return e['error']?['message'] ?? e['message'] ?? fallback;
    }
    final str = e.toString();
    if (str.contains('403')) return 'Account suspended. Contact support.';
    if (str.contains('429')) return 'Too many requests. Please slow down.';
    return str.contains('Exception:')
        ? str.split('Exception:').last.trim()
        : fallback;
  }
}
