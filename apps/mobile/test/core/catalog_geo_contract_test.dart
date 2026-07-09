import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/catalog/catalog_contract.dart';

void main() {
  group('M2 catalog and geo contracts', () {
    test('parses dynamic category translations with Urdu fallback', () {
      final category = CatalogCategoryContract.fromJson(const {
        'id': 'cat-metal',
        'slug': 'metals',
        'icon': 'metal',
        'colorHex': '#777777',
        'translations': [
          {'languageId': 'en', 'name': 'Metals'},
          {'languageId': 'ur', 'name': 'دھاتیں'},
        ],
      });

      expect(category.id, 'cat-metal');
      expect(category.text.labelFor('en'), 'Metals');
      expect(category.text.labelFor('ur'), 'دھاتیں');
      expect(category.isActive, isTrue);
    });

    test('parses units from backend translation shape', () {
      final unit = CatalogUnitContract.fromJson(const {
        'id': 'unit-kg',
        'slug': 'kg',
        'type': 'WEIGHT',
        'translations': [
          {'languageId': 'en', 'name': 'Kilogram', 'abbreviation': 'kg'},
        ],
      });

      expect(unit.id, 'unit-kg');
      expect(unit.abbreviation, 'kg');
      expect(unit.text.labelFor('en'), 'Kilogram');
    });

    test('normalizes array and envelope API responses', () {
      final direct = CatalogResponseParser.asObjects([
        {'id': 'a'},
      ], const ['categories']);
      final enveloped = CatalogResponseParser.asObjects({
        'categories': [
          {'id': 'b'},
        ],
      }, const ['categories']);

      expect(direct.single['id'], 'a');
      expect(enveloped.single['id'], 'b');
    });

    test('parses geo-zone/city records without hardcoded city labels', () {
      final zone = GeoZoneContract.fromJson(const {
        'id': 'zone-karachi',
        'name': 'Karachi',
        'type': 'CITY',
        'parentId': 'pk-sindh',
      });

      expect(zone.id, 'zone-karachi');
      expect(zone.name, 'Karachi');
      expect(zone.type, 'CITY');
      expect(zone.parentId, 'pk-sindh');
    });
  });
}
