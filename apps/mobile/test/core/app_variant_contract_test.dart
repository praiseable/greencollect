import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/config/app_variant.dart';

void main() {
  test('Kabariya variants never wallet-gate seller access', () {
    expect(AppVariant.requiresBalance, isFalse);
    expect(AppVariant.showWallet, isTrue);
  });
}
