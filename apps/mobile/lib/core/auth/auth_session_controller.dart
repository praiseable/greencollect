import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';
import 'session_state.dart';

class AuthSessionController extends StateNotifier<SessionState> {
  final AuthRepository _repository;

  AuthSessionController(this._repository) : super(const SessionState.unknown());

  Future<void> restore() async {
    state = const SessionState.loading();
    state = await _repository.restoreSession();
  }

  Future<bool> login({
    required String emailOrPhone,
    required String password,
  }) async {
    state = const SessionState.loading();
    try {
      final result = await _repository.login(
        emailOrPhone: emailOrPhone,
        password: password,
      );
      if (result.user == null) {
        state = const SessionState.error('Login succeeded but user profile was missing');
        return false;
      }
      state = SessionState.authenticated(result.user!);
      return true;
    } catch (e) {
      final message = e.toString().contains('ACCOUNT_SUSPENDED')
          ? 'Account suspended. Contact support.'
          : e.toString();
      state = SessionState.error(message);
      return false;
    }
  }

  Future<bool> register({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
    String? email,
  }) async {
    state = const SessionState.loading();
    try {
      final result = await _repository.register(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        password: password,
        email: email,
      );
      if (result.user != null) {
        state = SessionState.authenticated(result.user!);
      } else {
        state = const SessionState.unauthenticated('OTP verification required');
      }
      return true;
    } catch (e) {
      state = SessionState.error(e.toString());
      return false;
    }
  }

  Future<bool> submitKyc({
    required String requestedRole,
    required String cnicNumber,
    required String businessName,
    required String businessAddress,
    String? ntnNumber,
    String? strnNumber,
    String? businessType,
  }) async {
    state = state.copyWith(status: SessionStatus.loading);
    try {
      await _repository.submitProKyc(
        requestedRole: requestedRole,
        cnicNumber: cnicNumber,
        businessName: businessName,
        businessAddress: businessAddress,
        ntnNumber: ntnNumber,
        strnNumber: strnNumber,
        businessType: businessType,
      );
      final user = await _repository.fetchMe();
      state = SessionState.authenticated(user);
      return true;
    } catch (e) {
      state = SessionState.error(e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const SessionState.unauthenticated();
  }
}
