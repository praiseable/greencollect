import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/auth_repository.dart';
import 'package:kabariya/core/auth/auth_validators.dart';

void main() {
  group('M1-B AuthRepository contract', () {
    test('endpoint constants stay aligned with backend auth routes', () {
      expect(AuthRepository.loginPath, 'auth/login');
      expect(AuthRepository.registerPath, 'auth/register');
      expect(AuthRepository.sendOtpPath, 'auth/otp/send');
      expect(AuthRepository.verifyOtpPath, 'auth/otp/verify');
      expect(AuthRepository.refreshPath, 'auth/refresh');
      expect(AuthRepository.logoutPath, 'auth/logout');
      expect(AuthRepository.mePath, 'auth/me');
      expect(AuthRepository.appVersionPath, 'config/app-version');
    });

    test('auth payloads normalize phone and never include seller-paywall fields', () {
      final login = AuthValidators.loginPayload(
        emailOrPhone: '03001234567',
        password: 'Secret123',
      );
      expect(login, {'phone': '+923001234567', 'password': 'Secret123'});
      expect(login.containsKey('walletBalance'), isFalse);
      expect(login.containsKey('subscriptionRequired'), isFalse);

      final register = AuthValidators.registerPayload(
        firstName: 'Ali',
        lastName: 'Khan',
        phone: '3001234567',
        password: 'Secret123',
      );
      expect(register['phone'], '+923001234567');
      expect(register.containsKey('sellerFee'), isFalse);
      expect(register.containsKey('pricePaisa'), isFalse);
    });

    test('KYC payload keeps NTN and STRN optional', () {
      final payload = AuthValidators.proKycPayload(
        requestedRole: 'local_dealer',
        cnicNumber: '42101-1234567-1',
        businessName: 'Ali Metals',
        businessAddress: 'Karachi',
      );

      expect(payload.containsKey('ntnNumber'), isFalse);
      expect(payload.containsKey('strnNumber'), isFalse);
      expect(payload['requestedRole'], 'local_dealer');
    });
  });
}
