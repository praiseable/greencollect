import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/models/listing.model.dart';

void main() {
  group('ListingModel rupees contract', () {
    test('uses priceRupees from backend strict rupees responses', () {
      final listing = ListingModel.fromJson(const {
        'id': 'listing-1',
        'title': 'Copper Scrap',
        'description': 'Test listing',
        'priceRupees': '10000',
        'pricePaisa': '500000',
        'quantity': 10,
        'categoryId': 'cat-1',
        'categoryName': 'Metals',
        'sellerName': 'Seller',
        'sellerPhone': null,
        'cityName': 'Karachi',
      });

      expect(listing.priceRupees, 10000);
      // Deprecated compatibility getter must expose the same rupee value.
      // It must not divide by 100.
      // ignore: deprecated_member_use_from_same_package
      expect(listing.pricePkr, 10000);
    });

    test('does not leak seller contact when backend sends null fields', () {
      final listing = ListingModel.fromJson(const {
        'id': 'listing-2',
        'title': 'Masked Scrap',
        'description': 'Masked listing',
        'priceRupees': 5000,
        'quantity': 2,
        'categoryId': 'cat-1',
        'categoryName': 'Metals',
        'sellerName': 'Seller',
        'sellerPhone': null,
        'contactNumber': null,
        'address': null,
        'latitude': null,
        'longitude': null,
      });

      expect(listing.sellerPhone, isEmpty);
      expect(listing.latitude, 0);
      expect(listing.longitude, 0);
    });
  });
}
