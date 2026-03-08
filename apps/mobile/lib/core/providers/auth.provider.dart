import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.model.dart';
import '../mock/mock_service.dart';

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

  /// Step 1: Send OTP — does NOT log in yet
  Future<bool> sendOtp(String phone, String role) async {
    _pendingPhone = phone;
    _pendingRole = role;
    // Simulate OTP being sent
    await Future.delayed(const Duration(milliseconds: 500));
    return true;
  }

  /// Step 2: Verify OTP — actually logs in
  Future<bool> verifyOtp(String otp) async {
    final otpValid =
        await _mockService.verifyOtp(otp, phone: _pendingPhone);
    if (otpValid && _pendingPhone != null) {
      final user =
          await _mockService.login(_pendingPhone!, _pendingRole ?? 'customer');
      state = user;
      _pendingPhone = null;
      _pendingRole = null;
      _ref.read(authChangeNotifierProvider).notify();
      return true;
    }
    return false;
  }

  void logout() {
    state = null;
    _pendingPhone = null;
    _pendingRole = null;
    _ref.read(authChangeNotifierProvider).notify();
  }
}
