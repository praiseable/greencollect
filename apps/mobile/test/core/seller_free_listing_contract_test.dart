import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/listings/seller_free_listing_contract.dart';

void main() {
  group('M2 seller-free listing contract', () {
    test('seller listing is gated only by phone verification', () {
      expect(
        SellerListingAccessPolicy.canCreateListing(
          phoneVerified: true,
          hasWalletBalance: false,
          hasBuyerSubscription: false,
          kycApproved: false,
        ),
        isTrue,
      );

      expect(
        SellerListingAccessPolicy.canCreateListing(
          phoneVerified: false,
          hasWalletBalance: true,
          hasBuyerSubscription: true,
          kycApproved: true,
        ),
        isFalse,
      );
      expect(
        SellerListingAccessPolicy.blockingReasons(phoneVerified: false),
        contains('PHONE_VERIFICATION_REQUIRED'),
      );
    });

    test('create payload sends priceRupees and never pricePaisa or seller fees', () {
      final draft = SellerListingDraft(
        title: 'Copper Scrap',
        description: 'Clean copper lot',
        categoryId: 'cat-metal',
        productTypeId: 'pt-copper',
        priceRupees: 10000,
        quantity: 25,
        unitId: 'unit-kg',
        geoZoneId: 'zone-karachi',
        address: 'Warehouse Road',
        contactNumber: '+923001234567',
      );

      final payload = draft.toCreatePayload();
      expect(payload['priceRupees'], 10000);
      expect(payload.containsKey('pricePaisa'), isFalse);
      expect(payload.containsKey('listingFee'), isFalse);
      expect(payload.containsKey('subscriptionId'), isFalse);
      expect(payload.containsKey('walletBalance'), isFalse);
      expect(payload.containsKey('kycStatus'), isFalse);
    });

    test('draft validation catches missing dynamic catalog and unit data', () {
      final draft = SellerListingDraft(
        title: '',
        description: '',
        categoryId: '',
        priceRupees: 0,
        quantity: 0,
        unitId: '',
      );

      expect(draft.validate(), containsAll([
        'TITLE_REQUIRED',
        'CATEGORY_REQUIRED',
        'UNIT_REQUIRED',
        'PRICE_RUPEES_REQUIRED',
        'QUANTITY_REQUIRED',
      ]));
    });

    test('contact remains hidden before deposit and geo-fence errors are safe', () {
      final anonymous = ListingContactVisibility.fromListingDetailJson(const {
        'listing': {
          'sellerPhone': null,
          'contactNumber': null,
          'address': null,
          'latitude': null,
          'longitude': null,
        },
      });
      expect(anonymous.canSeeContact, isFalse);

      final geofenced = ListingContactVisibility.fromListingDetailJson(const {
        'error': {'code': 'GEO_FENCE_RESTRICTED'},
        'moneyBaseUnit': 'rupees',
      });
      expect(geofenced.isGeoFenceBlocked, isTrue);
      expect(geofenced.canSeeContact, isFalse);
    });

    test('post-deposit detail can expose contact to the deposited buyer only', () {
      final unlocked = ListingContactVisibility.fromListingDetailJson(const {
        'listing': {
          'contactNumber': '+923001234567',
          'address': 'Exact pickup address',
        },
      });

      expect(unlocked.canSeeContact, isTrue);
      expect(unlocked.phone, '+923001234567');
      expect(unlocked.address, 'Exact pickup address');
    });

    test('deposit display uses strict rupees base unit', () {
      final deposit = ListingDepositDisplay(
        listingPriceRupees: 10000,
        depositPercent: 5,
        minimumFlatRupees: 500,
      );

      expect(deposit.percentAmountRupees, 500);
      expect(deposit.requiredDepositRupees, 500);
      expect(deposit.formatRequired(), contains('500'));
    });
  });
}
