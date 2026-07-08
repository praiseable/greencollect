import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/auth_route_policy.dart';
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
  group('AuthRoutePolicy M1 contract', () {
    test('unauthenticated private routes go to login', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/wallet',
          isLoggedIn: false,
          user: null,
        ),
        AuthRoutePolicy.login,
      );
    });

    test('authenticated users are redirected away from auth routes', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/auth/login',
          isLoggedIn: true,
          user: _user(),
        ),
        AuthRoutePolicy.home,
      );
    });

    test('Pro professional users with pending KYC are routed to KYC', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/home',
          isLoggedIn: true,
          user: _user(
            role: UserRole.localDealer,
            kycStatus: KycStatus.underReview,
            accountStatus: AccountStatus.underReview,
          ),
          isProFlavor: true,
        ),
        AuthRoutePolicy.kyc,
      );
    });

    test('approved Pro professional users can enter app routes', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/home',
          isLoggedIn: true,
          user: _user(role: UserRole.wholesale),
          isProFlavor: true,
        ),
        isNull,
      );
    });

    test('customer flavor never routes a seller through KYC just to list', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/create',
          isLoggedIn: true,
          user: _user(kycStatus: KycStatus.pending),
          isProFlavor: false,
        ),
        isNull,
      );
    });

    test('suspended accounts are pushed back to login reason state', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/home',
          isLoggedIn: true,
          user: _user(accountStatus: AccountStatus.suspended),
        ),
        '/auth/login?reason=suspended',
      );
    });

    test('force update overrides all other app routes', () {
      expect(
        AuthRoutePolicy.redirect(
          location: '/home',
          isLoggedIn: true,
          user: _user(),
          forceUpdateRequired: true,
        ),
        '/force-update',
      );
    });
  });
}
