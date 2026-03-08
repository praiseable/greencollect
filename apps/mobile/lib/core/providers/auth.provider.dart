import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.model.dart';
import '../mock/mock_service.dart';

/// Storage key for persisted user session
const _kSessionKey = 'persisted_user_session';

/// Listenable that GoRouter can watch to re-evaluate redirects
/// when auth state changes.
class AuthChangeNotifier extends ChangeNotifier {
  void notify() => notifyListeners();
}

final authChangeNotifierProvider = Provider<AuthChangeNotifier>((ref) {
  return AuthChangeNotifier();
});

final authProvider = StateNotifierProvider<AuthNotifier, UserModel?>((ref) {
  return AuthNotifier(ref);
});

class AuthNotifier extends StateNotifier<UserModel?> {
  final Ref _ref;
  AuthNotifier(this._ref) : super(null);
  final _mockService = MockService();
  String? _pendingPhone;
  String? _pendingRole;

  String? get pendingPhone => _pendingPhone;

  /// Try to restore a previously persisted session from SharedPreferences.
  /// Returns true if a valid session was restored.
  Future<bool> tryRestoreSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sessionJson = prefs.getString(_kSessionKey);
      if (sessionJson == null || sessionJson.isEmpty) return false;

      final json = jsonDecode(sessionJson) as Map<String, dynamic>;
      final user = UserModel.fromJson(json);

      // For mock mode: also resolve full user data from MockData so
      // verification/listings etc. are populated
      final fullUser = await _mockService.loginById(user.id);
      state = fullUser ?? user;

      _ref.read(authChangeNotifierProvider).notify();
      return true;
    } catch (e) {
      debugPrint('Session restore failed: $e');
      return false;
    }
  }

  /// Persist the current user session to local storage
  Future<void> _persistSession(UserModel user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kSessionKey, jsonEncode(user.toJson()));
    } catch (e) {
      debugPrint('Session persist failed: $e');
    }
  }

  /// Clear persisted session from local storage
  Future<void> _clearSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_kSessionKey);
    } catch (e) {
      debugPrint('Session clear failed: $e');
    }
  }

  /// Step 1: Send OTP — does NOT log in yet
  Future<bool> sendOtp(String phone, String role) async {
    _pendingPhone = phone;
    _pendingRole = role;
    // Simulate OTP being sent
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }

  /// Step 2: Verify OTP — actually logs in and persists session
  Future<bool> verifyOtp(String otp) async {
    final otpValid =
        await _mockService.verifyOtp(otp, phone: _pendingPhone);
    if (otpValid && _pendingPhone != null) {
      final user =
          await _mockService.login(_pendingPhone!, _pendingRole ?? 'customer');
      state = user;
      _pendingPhone = null;
      _pendingRole = null;

      // Persist session so user stays logged in across app restarts
      await _persistSession(user);

      _ref.read(authChangeNotifierProvider).notify();
      return true;
    }
    return false;
  }

  /// Explicit logout — clears state AND persisted session
  void logout() {
    state = null;
    _pendingPhone = null;
    _pendingRole = null;
    _clearSession();
    _ref.read(authChangeNotifierProvider).notify();
  }
}
