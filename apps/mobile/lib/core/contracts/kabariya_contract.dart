/// Frontend contract for the verified Kabariya backend baseline.
class KabariyaContract {
  static const String moneyBaseUnit = 'rupees';

  /// Canonical money fields for new mobile/web work.
  static const List<String> canonicalMoneyFields = <String>[
    'amountRupees',
    'priceRupees',
    'offeredPriceRupees',
    'counterPriceRupees',
    'finalPriceRupees',
    'actualPriceRupees',
    'settlementPriceRupees',
    'commissionRupees',
    'availableBalanceRupees',
    'escrowedBalanceRupees',
    'balanceRupees',
    'totalBalanceRupees',
  ];

  /// Legacy fields may appear while backend tables are renamed. UI should not
  /// send these fields in new create/update requests.
  static const List<String> legacyMoneyFields = <String>[
    'amountPaisa',
    'pricePaisa',
    'offeredPricePaisa',
    'counterPricePaisa',
    'finalPricePaisa',
    'actualPricePaisa',
    'settlementPricePaisa',
    'commissionPaisa',
    'availableBalancePaisa',
    'escrowedBalancePaisa',
    'balancePaisa',
    'totalBalancePaisa',
  ];

  static const bool sellersAreFree = true;
  static const bool buyerDepositUnlocksContact = true;
  static const bool secureHandshakeRequiredToFinalize = true;
}
