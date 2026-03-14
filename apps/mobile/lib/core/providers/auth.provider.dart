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

      // Use new skill-compliant endpoint (backward compatible)
      final response = await _api.post('auth/refresh', {
        'refreshToken': refreshToken,
      });

      final newAccessToken  = response['accessToken']  as String?;
      final newRefreshToken = response['refreshToken'] as String?;
      final expiresIn = response['expiresIn'] as int? ?? 900; // Default 15 minutes

      if (newAccessToken == null) return false;

      await _storage.saveAccessToken(newAccessToken, expiresIn);
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
  /// Returns { success: true, otp?: string } on success (otp only when backend sends it in dev).
  /// Returns null on failure; _error is set.
  Future<Map<String, dynamic>?> sendOtp(String phone) async {
    final normalized = AuthProvider.normalizePhone(phone);
    debugPrint('[Auth] sendOtp: raw=$phone normalized=$normalized');
    if (normalized.length < 10) {
      debugPrint('[Auth] sendOtp: rejected (length < 10)');
      _error = 'Enter a valid Pakistan phone (e.g. 03001234567)';
      _status = AuthStatus.error;
      notifyListeners();
      return null;
    }
    _status = AuthStatus.loading;
    _error  = null;
    notifyListeners();
    try {
      final response = await _api.post('auth/otp/send', { 'phone': normalized }) as Map<String, dynamic>?;
      final otp = response != null ? response['otp'] as String? : null;
      if (otp != null) debugPrint('[Auth] Dev OTP: $otp');
      _status = AuthStatus.idle;
      notifyListeners();
      return { 'success': true, if (otp != null) 'otp': otp };
    } catch (e) {
      debugPrint('[Auth] sendOtp: error $e');
      _error  = _parseError(e, 'Failed to send OTP');
      _status = AuthStatus.error;
      notifyListeners();
      return null;
    }
  }

  // ── Verify OTP ───────────────────────────────────────────────────────────
  Future<bool> verifyOtp(String phone, String otp) async {
    final normalized = AuthProvider.normalizePhone(phone);
    debugPrint('[Auth] verifyOtp: phone=$normalized otp=${otp.trim()}');
    _status = AuthStatus.loading;
    _error  = null;
    notifyListeners();
    try {
      final response = await _api.post('auth/otp/verify', {
        'phone': normalized,
        'otp':   otp.trim(),
      });

      final accessToken  = response['accessToken']  as String?;
      final refreshToken = response['refreshToken'] as String?;
      final userData     = response['user'];

      if (accessToken == null) {
        debugPrint('[Auth] verifyOtp: no accessToken in response');
        _error  = 'No token received from server';
        _status = AuthStatus.error;
        notifyListeners();
        return false;
      }

      debugPrint('[Auth] verifyOtp: success user=${userData != null ? userData['id'] : null}');
      final expiresIn = response['expiresIn'] as int? ?? 900; // Default 15 minutes
      await _storage.saveAccessToken(accessToken, expiresIn);
      if (refreshToken != null) await _storage.saveRefreshToken(refreshToken);

      _user = userData != null ? UserModel.fromJson(userData) : null;
      if (_user != null) await _storage.setUser(_user!.toJson());

      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('[Auth] verifyOtp: error $e');
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

      final expiresIn = response['expiresIn'] as int? ?? 900; // Default 15 minutes
      await _storage.saveAccessToken(accessToken, expiresIn);
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
  bool _isLoggingOut = false; // Prevent multiple simultaneous logout calls
  
  Future<void> logout() async {
    // Prevent multiple simultaneous logout calls
    if (_isLoggingOut) {
      if (kDebugMode) debugPrint('[Auth] Logout already in progress, skipping');
      return;
    }
    
    _isLoggingOut = true;
    
    // Temporarily disable session expired callback to prevent loop
    final originalCallback = _api.onSessionExpired;
    _api.onSessionExpired = null;
    
    try {
      // Check if we have a valid token before attempting API logout
      // If token is expired/invalid, skip API call to avoid 401 loop
      final token = await _storage.getAccessToken();
      final hasValidToken = token != null && token.isNotEmpty;
      
      if (hasValidToken) {
        try {
          // API service now handles logout specially to prevent loops
          await _api.post('auth/logout', {});
        } catch (e) {
          // If logout fails, just clear local storage
          // Don't retry to avoid infinite loop
          if (kDebugMode) debugPrint('[Auth] Logout API call failed, clearing local storage: $e');
        }
      }
    } finally {
      // Restore callback
      _api.onSessionExpired = originalCallback;
      
      // Always clear local storage regardless of API call result
      await _storage.clearAll();
      _user   = null;
      _status = AuthStatus.unauthenticated;
      _isLoggingOut = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _parseError(dynamic e, String fallback) {
    if (e is ApiException) return e.message;
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
        : (str.isNotEmpty && str.length < 200 ? str : fallback);
  }

  /// Normalize phone for backend: strip spaces/dashes. Backend expects (+92|0)?3[0-9]{9}
  static String normalizePhone(String input) {
    String s = input.replaceAll(RegExp(r'[\s\-]'), '');
    String digits = s.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) return digits;
    String ten = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
    if (!ten.startsWith('3')) return digits;
    if (s.trimLeft().startsWith('+92') || digits.length > 10) return '+92$ten';
    if (digits.startsWith('0')) return '0$ten';
    return ten;
  }
}
