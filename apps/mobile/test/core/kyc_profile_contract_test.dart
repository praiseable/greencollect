import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/auth/auth_validators.dart';

void main() {
  group('M1-B KYC/tax profile contract', () {
    test('tax profile fields are optional and validated only when supplied', () {
      expect(AuthValidators.isValidOptionalNtn(null), isTrue);
      expect(AuthValidators.isValidOptionalNtn(''), isTrue);
      expect(AuthValidators.isValidOptionalNtn('1234567-8'), isTrue);
      expect(AuthValidators.isValidOptionalNtn('not-a-tax-id'), isFalse);

      expect(AuthValidators.isValidOptionalStrn(null), isTrue);
      expect(AuthValidators.isValidOptionalStrn(''), isTrue);
      expect(AuthValidators.isValidOptionalStrn('1234567890123'), isTrue);
      expect(AuthValidators.isValidOptionalStrn('123'), isFalse);
    });

    test('professional KYC payload never requires wallet or subscription', () {
      final payload = AuthValidators.proKycPayload(
        requestedRole: 'city_franchise',
        cnicNumber: '42101-1234567-1',
        businessName: 'Franchise Metals',
        businessAddress: 'Karachi',
        businessType: 'individual',
      );

      expect(payload['businessType'], 'individual');
      expect(payload.containsKey('walletRequired'), isFalse);
      expect(payload.containsKey('subscriptionRequired'), isFalse);
      expect(payload.containsKey('sellerFee'), isFalse);
    });
  });
}
