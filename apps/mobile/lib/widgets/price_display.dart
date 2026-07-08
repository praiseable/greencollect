import 'package:flutter/material.dart';
import '../core/money/money_formatter.dart';

class PriceDisplay extends StatelessWidget {
  final int priceRupees;
  final TextStyle? style;
  final String locale;

  const PriceDisplay({
    super.key,
    required this.priceRupees,
    this.style,
    this.locale = 'en',
  });

  @Deprecated('Use PriceDisplay(priceRupees: ...) instead.')
  factory PriceDisplay.legacyPaisa({
    Key? key,
    required int pricePaisa,
    TextStyle? style,
    String locale = 'en',
  }) {
    return PriceDisplay(
      key: key,
      priceRupees: pricePaisa,
      style: style,
      locale: locale,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      MoneyFormatter.formatRupees(priceRupees, locale: locale),
      style: style,
    );
  }
}
