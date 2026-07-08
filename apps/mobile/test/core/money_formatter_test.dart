import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/money/money_formatter.dart';

void main() {
  group('MoneyFormatter strict rupees contract', () {
    test('formats English rupees with PKR symbol and grouping', () {
      expect(MoneyFormatter.formatRupees(1500), '₨ 1,500');
      expect(MoneyFormatter.formatRupees('1000000'), '₨ 1,000,000');
    });

    test('formats Urdu rupees with Urdu numerals', () {
      final formatted = MoneyFormatter.formatRupees(1500, locale: 'ur');
      expect(formatted.contains('۱'), isTrue);
      expect(formatted.contains('۵'), isTrue);
      expect(formatted.contains('۰'), isTrue);
    });

    test('parses canonical rupees before transitional legacy field names', () {
      final parsed = MoneyFormatter.parseRupees(
        const {'priceRupees': '10000', 'pricePaisa': '999999'},
        preferredKeys: const ['priceRupees'],
        legacyKeys: const ['pricePaisa'],
      );
      expect(parsed, 10000);
    });

    test('treats legacy response field names as rupees only as fallback', () {
      final parsed = MoneyFormatter.parseRupees(
        const {'pricePaisa': '10000'},
        preferredKeys: const ['priceRupees'],
        legacyKeys: const ['pricePaisa'],
      );
      expect(parsed, 10000);
    });
  });
}
