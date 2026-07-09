/// M2 catalog/geo contract helpers.
///
/// The app must consume catalog, unit, product-type, and geo-zone data from the
/// backend. No user-facing category/unit labels should be hardcoded into screens.
class LocalizedTextValue {
  final String id;
  final String slug;
  final String nameEn;
  final String nameUr;
  final String? descriptionEn;
  final String? descriptionUr;

  const LocalizedTextValue({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.nameUr,
    this.descriptionEn,
    this.descriptionUr,
  });

  String labelFor(String languageCode) {
    final isUrdu = languageCode.toLowerCase().startsWith('ur');
    if (isUrdu && nameUr.trim().isNotEmpty) return nameUr;
    return nameEn.trim().isNotEmpty ? nameEn : nameUr;
  }

  static LocalizedTextValue fromJson(
    Map<String, dynamic> json, {
    String fallbackSlug = '',
  }) {
    final translations = _translationsByLanguage(json['translations']);
    final en = translations['en'];
    final ur = translations['ur'];

    String textFrom(Map<String, dynamic>? source, List<String> keys) {
      if (source == null) return '';
      for (final key in keys) {
        final value = source[key]?.toString().trim();
        if (value != null && value.isNotEmpty) return value;
      }
      return '';
    }

    final directName = json['name']?.toString().trim() ?? '';
    final directNameEn = json['nameEn']?.toString().trim() ?? '';
    final directNameUr = json['nameUr']?.toString().trim() ??
        json['nameUrdu']?.toString().trim() ??
        '';

    final nameEn = textFrom(en, const ['name', 'title', 'label']).isNotEmpty
        ? textFrom(en, const ['name', 'title', 'label'])
        : directNameEn.isNotEmpty
            ? directNameEn
            : directName;
    final nameUr = textFrom(ur, const ['name', 'title', 'label']).isNotEmpty
        ? textFrom(ur, const ['name', 'title', 'label'])
        : directNameUr;

    return LocalizedTextValue(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? fallbackSlug,
      nameEn: nameEn,
      nameUr: nameUr,
      descriptionEn: textFrom(en, const ['description']),
      descriptionUr: textFrom(ur, const ['description']),
    );
  }

  static Map<String, Map<String, dynamic>> _translationsByLanguage(dynamic raw) {
    if (raw is! List) return const {};
    final out = <String, Map<String, dynamic>>{};
    for (final item in raw) {
      if (item is! Map) continue;
      final map = Map<String, dynamic>.from(item);
      final lang = (map['languageId'] ?? map['languageCode'] ?? map['lang'])
          ?.toString()
          .toLowerCase();
      if (lang == null || lang.isEmpty) continue;
      out[lang] = map;
    }
    return out;
  }
}

class CatalogCategoryContract {
  final LocalizedTextValue text;
  final String icon;
  final String colorHex;
  final bool isActive;

  const CatalogCategoryContract({
    required this.text,
    required this.icon,
    required this.colorHex,
    required this.isActive,
  });

  String get id => text.id;
  String get slug => text.slug;

  factory CatalogCategoryContract.fromJson(Map<String, dynamic> json) {
    return CatalogCategoryContract(
      text: LocalizedTextValue.fromJson(json),
      icon: json['icon']?.toString() ?? '',
      colorHex: json['colorHex']?.toString() ?? '#777777',
      isActive: json['isActive'] != false,
    );
  }
}

class CatalogUnitContract {
  final LocalizedTextValue text;
  final String type;
  final String abbreviation;
  final bool isActive;

  const CatalogUnitContract({
    required this.text,
    required this.type,
    required this.abbreviation,
    required this.isActive,
  });

  String get id => text.id;
  String get slug => text.slug;

  factory CatalogUnitContract.fromJson(Map<String, dynamic> json) {
    final text = LocalizedTextValue.fromJson(json);
    final firstTranslation = json['translations'] is List &&
            (json['translations'] as List).isNotEmpty &&
            (json['translations'] as List).first is Map
        ? Map<String, dynamic>.from((json['translations'] as List).first as Map)
        : const <String, dynamic>{};

    return CatalogUnitContract(
      text: text,
      type: json['type']?.toString() ?? '',
      abbreviation: json['abbreviation']?.toString() ??
          firstTranslation['abbreviation']?.toString() ??
          text.slug,
      isActive: json['isActive'] != false,
    );
  }
}

class GeoZoneContract {
  final String id;
  final String name;
  final String type;
  final String? parentId;
  final bool isActive;

  const GeoZoneContract({
    required this.id,
    required this.name,
    required this.type,
    this.parentId,
    required this.isActive,
  });

  factory GeoZoneContract.fromJson(Map<String, dynamic> json) {
    return GeoZoneContract(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['cityName']?.toString() ?? '',
      type: json['type']?.toString() ?? json['zoneType']?.toString() ?? '',
      parentId: json['parentId']?.toString(),
      isActive: json['isActive'] != false,
    );
  }
}

class CatalogResponseParser {
  const CatalogResponseParser._();

  static List<Map<String, dynamic>> asObjects(dynamic response, List<String> keys) {
    dynamic raw = response;
    if (response is Map) {
      for (final key in keys) {
        final candidate = response[key];
        if (candidate is List) {
          raw = candidate;
          break;
        }
      }
      if (raw == response) raw = response['data'];
    }
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList(growable: false);
  }
}
