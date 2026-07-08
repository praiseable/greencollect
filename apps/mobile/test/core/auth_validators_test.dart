import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/auth_validators.dart';

void main() {
  group('AuthValidators M1 contract', () {
    test('normalizes Pakistan mobile numbers to +92 format', () {
      expect(AuthValidators.normalizePakistanPhone('03001234567'), '+923001234567');
      expect(AuthValidators.normalizePakistanPhone('3001234567'), '+923001234567');
      expect(AuthValidators.normalizePakistanPhone('923001234567'), '+923001234567');
    });

    test('validates OTP and CNIC formats', () {
      expect(AuthValidators.isValidOtp('111111'), isTrue);
      expect(AuthValidators.isValidOtp('11111'), isFalse);
      expect(AuthValidators.isValidCnic('42101-1234567-1'), isTrue);
      expect(AuthValidators.isValidCnic('4210112345671'), isFalse);
    });

    test('tax identifiers are optional but format checked when present', () {
      expect(AuthValidators.isValidOptionalNtn(null), isTrue);
      expect(AuthValidators.isValidOptionalNtn(''), isTrue);
      expect(AuthValidators.isValidOptionalNtn('1234567-8'), isTrue);
      expect(AuthValidators.isValidOptionalNtn('abc'), isFalse);

      expect(AuthValidators.isValidOptionalStrn(null), isTrue);
      expect(AuthValidators.isValidOptionalStrn('1234567890123'), isTrue);
      expect(AuthValidators.isValidOptionalStrn('123'), isFalse);
    });

    test('login payload uses phone for Pakistan numbers and email otherwise', () {
      expect(
        AuthValidators.loginPayload(
          emailOrPhone: '03001234567',
          password: 'Secret123',
        ),
        {'phone': '+923001234567', 'password': 'Secret123'},
      );

      expect(
        AuthValidators.loginPayload(
          emailOrPhone: 'user@example.com',
          password: 'Secret123',
        ),
        {'email': 'user@example.com', 'password': 'Secret123'},
      );
    });

    test('register and KYC payloads keep tax fields optional', () {
      final register = AuthValidators.registerPayload(
        firstName: ' Ali ',
        lastName: ' Khan ',
        phone: '03001234567',
        password: 'Secret123',
      );
      expect(register['phone'], '+923001234567');
      expect(register.containsKey('email'), isFalse);

      final kyc = AuthValidators.proKycPayload(
        requestedRole: 'local_dealer',
        cnicNumber: '42101-1234567-1',
        businessName: 'Ali Metals',
        businessAddress: 'Karachi',
      );
      expect(kyc['requestedRole'], 'local_dealer');
      expect(kyc.containsKey('ntnNumber'), isFalse);
      expect(kyc.containsKey('strnNumber'), isFalse);
    });
  });
}
