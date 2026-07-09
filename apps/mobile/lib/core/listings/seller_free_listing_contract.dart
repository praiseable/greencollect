import '../money/money_formatter.dart';

/// Seller-side listing policy for the buyer-funded marketplace.
///
/// Creating/editing listings is free. Wallet balance, subscription tier, and KYC
/// must never be required for a normal seller listing flow.
class SellerListingAccessPolicy {
  const SellerListingAccessPolicy._();

  static bool canCreateListing({
    required bool phoneVerified,
    bool hasWalletBalance = false,
    bool hasBuyerSubscription = false,
    bool kycApproved = false,
  }) {
    return phoneVerified;
  }

  static List<String> blockingReasons({required bool phoneVerified}) {
    return phoneVerified ? const [] : const ['PHONE_VERIFICATION_REQUIRED'];
  }
}

class SellerListingDraft {
  final String title;
  final String description;
  final String categoryId;
  final String? productTypeId;
  final int priceRupees;
  final double quantity;
  final String unitId;
  final String? geoZoneId;
  final String? address;
  final String? contactNumber;

  const SellerListingDraft({
    required this.title,
    required this.description,
    required this.categoryId,
    this.productTypeId,
    required this.priceRupees,
    required this.quantity,
    required this.unitId,
    this.geoZoneId,
    this.address,
    this.contactNumber,
  });

  List<String> validate() {
    final errors = <String>[];
    if (title.trim().isEmpty) errors.add('TITLE_REQUIRED');
    if (categoryId.trim().isEmpty) errors.add('CATEGORY_REQUIRED');
    if (unitId.trim().isEmpty) errors.add('UNIT_REQUIRED');
    if (priceRupees <= 0) errors.add('PRICE_RUPEES_REQUIRED');
    if (quantity <= 0) errors.add('QUANTITY_REQUIRED');
    return errors;
  }

  Map<String, dynamic> toCreatePayload() {
    final errors = validate();
    if (errors.isNotEmpty) {
      throw StateError('Invalid seller listing draft: ${errors.join(',')}');
    }

    return <String, dynamic>{
      'title': title.trim(),
      'description': description.trim(),
      'categoryId': categoryId.trim(),
      if (productTypeId != null && productTypeId!.trim().isNotEmpty)
        'productTypeId': productTypeId!.trim(),
      'priceRupees': priceRupees,
      'quantity': quantity,
      'unitId': unitId.trim(),
      if (geoZoneId != null && geoZoneId!.trim().isNotEmpty)
        'geoZoneId': geoZoneId!.trim(),
      if (address != null && address!.trim().isNotEmpty)
        'address': address!.trim(),
      if (contactNumber != null && contactNumber!.trim().isNotEmpty)
        'contactNumber': contactNumber!.trim(),
    };
  }
}

class ListingContactVisibility {
  final bool canSeeContact;
  final bool isGeoFenceBlocked;
  final String? phone;
  final String? address;

  const ListingContactVisibility({
    required this.canSeeContact,
    required this.isGeoFenceBlocked,
    this.phone,
    this.address,
  });

  factory ListingContactVisibility.fromListingDetailJson(
      Map<String, dynamic> json) {
    final listing = json['listing'] is Map
        ? Map<String, dynamic>.from(json['listing'] as Map)
        : json;
    final error = json['error'] is Map
        ? Map<String, dynamic>.from(json['error'] as Map)
        : const <String, dynamic>{};
    final code = error['code']?.toString();

    final phone = _firstNonMaskedString(listing, const [
      'sellerPhone',
      'seller_phone',
      'contactNumber',
      'contact_number',
      'phone',
      'phoneNumber',
    ]);
    final address = _firstNonMaskedString(listing, const [
      'exactAddress',
      'exact_address',
      'address',
      'pickupAddress',
    ]);

    return ListingContactVisibility(
      canSeeContact: phone != null || address != null,
      isGeoFenceBlocked: code == 'GEO_FENCE_RESTRICTED',
      phone: phone,
      address: address,
    );
  }

  static String? _firstNonMaskedString(
    Map<String, dynamic> data,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = data[key];
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isEmpty) continue;
      final lower = text.toLowerCase();
      if (lower == 'null' || lower.contains('masked') || lower == 'hidden') {
        continue;
      }
      return text;
    }
    return null;
  }
}

class ListingDepositDisplay {
  final int listingPriceRupees;
  final int depositPercent;
  final int minimumFlatRupees;

  const ListingDepositDisplay({
    required this.listingPriceRupees,
    this.depositPercent = 5,
    this.minimumFlatRupees = 500,
  });

  int get percentAmountRupees =>
      ((listingPriceRupees * depositPercent) / 100).round();

  int get requiredDepositRupees => percentAmountRupees > minimumFlatRupees
      ? percentAmountRupees
      : minimumFlatRupees;

  String formatRequired({String lang = 'en'}) =>
      MoneyFormatter.formatRupees(requiredDepositRupees, locale: lang);
}
