import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/auth_route_policy.dart';
import 'package:kabariya/core/models/user.model.dart';

UserModel _user() => UserModel(
      id: 'user-1',
      name: 'Test User',
      nameUrdu: 'ٹیسٹ',
      phone: '+923001234567',
      email: 'test@example.com',
      role: UserRole.customer,
      city: 'Karachi',
      kycStatus: KycStatus.approved,
      languageCode: 'en',
    );

void main() {
  test('force update gate overrides private and auth routes', () {
    expect(
      AuthRoutePolicy.redirect(
        location: '/wallet',
        isLoggedIn: true,
        user: _user(),
        forceUpdateRequired: true,
      ),
      '/force-update',
    );

    expect(
      AuthRoutePolicy.redirect(
        location: '/auth/login',
        isLoggedIn: false,
        user: null,
        forceUpdateRequired: true,
      ),
      '/force-update',
    );
  });
}
