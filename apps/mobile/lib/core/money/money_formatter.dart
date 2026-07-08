/// Strict rupees money helpers for Kabariya mobile apps.
///
/// Backend is in strict rupees mode. New mobile code must use `amountRupees`,
/// `priceRupees`, and related `*Rupees` fields. Legacy `*Paisa` response
/// fields may still appear during the backend transition, but their numeric
/// values are treated as rupees when no `*Rupees` field is present.
class MoneyFormatter {
  static const String symbol = '₨';
  static const String moneyBaseUnit = 'rupees';

  static const List<String> _urduDigits = <String>[
    '\u06F0',
    '\u06F1',
    '\u06F2',
    '\u06F3',
    '\u06F4',
    '\u06F5',
    '\u06F6',
    '\u06F7',
    '\u06F8',
    '\u06F9',
  ];

  /// Parses a rupee integer from common backend shapes.
  ///
  /// Preferred keys are checked first. Legacy fallback keys are accepted only
  /// for parsing responses that still contain transitional names.
  static int parseRupees(
    Map<String, dynamic> json, {
    List<String> preferredKeys = const <String>[],
    List<String> legacyKeys = const <String>[],
    int fallback = 0,
  }) {
    for (final key in <String>[...preferredKeys, ...legacyKeys]) {
      if (!json.containsKey(key)) continue;
      final parsed = _parseInteger(json[key]);
      if (parsed != null) return parsed;
    }
    return fallback;
  }

  static int? _parseInteger(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.round();
    final text = value.toString().trim().replaceAll(',', '');
    if (text.isEmpty) return null;
    final asInt = int.tryParse(text);
    if (asInt != null) return asInt;
    final asDouble = double.tryParse(text);
    return asDouble?.round();
  }

  static String formatRupees(dynamic value, {String locale = 'en'}) {
    final amount = _parseInteger(value) ?? 0;
    final sign = amount < 0 ? '-' : '';
    final absolute = amount.abs().toString();
    final grouped = absolute.replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match[1]},',
    );
    final formatted = '$sign$symbol $grouped';
    return locale == 'ur' ? toUrduNumerals(formatted) : formatted;
  }

  static String toUrduNumerals(String input) {
    return input.replaceAllMapped(RegExp(r'[0-9]'), (match) {
      final digit = int.parse(match.group(0)!);
      return _urduDigits[digit];
    });
  }

  static bool containsLegacyPaisaPayload(Map<String, dynamic> json) {
    return json.keys.any((key) => key.toLowerCase().endsWith('paisa'));
  }
}
