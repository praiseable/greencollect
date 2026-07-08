import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('create/update listing UI sends priceRupees, not pricePaisa', () {
    final files = <File>[
      File('lib/features/listings/create_listing_screen.dart'),
      File('lib/features/listings/edit_listing_screen.dart'),
      File('lib/screens/listings/create_listing_screen.dart'),
    ];

    for (final file in files) {
      final source = file.readAsStringSync();
      expect(source.contains("'priceRupees'"), isTrue, reason: file.path);
      expect(source.contains("'pricePaisa':"), isFalse, reason: file.path);
      expect(source.contains('"pricePaisa":'), isFalse, reason: file.path);
    }
  });

  test('router does not force Pro users through a wallet balance gate', () {
    final source = File('lib/core/router/app_router.dart').readAsStringSync();
    expect(source.contains('canAccessProFeatures'), isFalse);
    expect(source.contains('return \'/balance-gate\''), isFalse);
  });
}
