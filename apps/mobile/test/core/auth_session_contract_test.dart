import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/secure_session_store.dart';
import 'package:kabariya/core/auth/session_state.dart';
import 'package:kabariya/core/models/user.model.dart';

UserModel _user({
  UserRole role = UserRole.customer,
  KycStatus kycStatus = KycStatus.approved,
  AccountStatus accountStatus = AccountStatus.active,
}) {
  return UserModel(
    id: 'user-1',
    name: 'Test User',
    nameUrdu: 'ٹیسٹ',
    phone: '+923001234567',
    email: 'test@example.com',
    role: role,
    city: 'Karachi',
    kycStatus: kycStatus,
    languageCode: 'en',
    accountStatus: accountStatus,
  );
}

void main() {
  group('M1-B secure session contract', () {
    test('MemorySessionStore saves and clears tokens without SharedPreferences', () async {
      final store = MemorySessionStore();
      await store.saveSession(
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        user: _user(),
      );

      expect(await store.accessToken, 'access-token');
      expect(await store.refreshToken, 'refresh-token');
      expect((await store.cachedUser)?.id, 'user-1');

      await store.clear();
      expect(await store.accessToken, isNull);
      expect(await store.refreshToken, isNull);
      expect(await store.cachedUser, isNull);
    });

    test('SessionState identifies professional pending KYC users', () {
      final state = SessionState.authenticated(_user(
        role: UserRole.localDealer,
        kycStatus: KycStatus.underReview,
        accountStatus: AccountStatus.underReview,
      ));

      expect(state.isAuthenticated, isTrue);
      expect(state.isProfessionalUser, isTrue);
      expect(state.needsKyc, isTrue);
    });

    test('Customer session is never KYC-gated just to sell/list', () {
      final state = SessionState.authenticated(_user(
        role: UserRole.customer,
        kycStatus: KycStatus.pending,
      ));

      expect(state.isProfessionalUser, isFalse);
      expect(state.needsKyc, isFalse);
    });
  });
}
