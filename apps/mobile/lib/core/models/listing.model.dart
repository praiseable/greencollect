enum ListingStatus {
  active,
  underNegotiation,
  sold,
  expired,
}

enum VisibilityLevel {
  local,
  neighbor,
  city,
  province,
  national,
  wholesale,
  public,
}

class ListingModel {
  final String id;
  final String title;
  final String titleUrdu;
  final String description;
  final String? descUrdu;
  final int pricePkr;
  final String unit;
  final double quantity;
  final String categoryId;
  final String categoryName;
  final String categoryNameUr;
  final String sellerName;
  final String sellerPhone;
  /// Seller's user ID (from API). Used for chat room so each buyer-seller pair has a unique conversation.
  final String? sellerId;
  final String city;
  final String? area;
  final double latitude;
  final double longitude;
  final ListingStatus status;
  final VisibilityLevel visibilityLevel;
  final List<String> images;
  final int daysAgo;
  final int interestedCount;

  ListingModel({
    required this.id,
    required this.title,
    required this.titleUrdu,
    required this.description,
    this.descUrdu,
    required this.pricePkr,
    required this.unit,
    required this.quantity,
    required this.categoryId,
    required this.categoryName,
    required this.categoryNameUr,
    required this.sellerName,
    required this.sellerPhone,
    this.sellerId,
    required this.city,
    this.area,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.visibilityLevel,
    required this.images,
    required this.daysAgo,
    required this.interestedCount,
  });

  /// Parse from API JSON (e.g. GET /v1/listings, GET /v1/listings/:id)
  factory ListingModel.fromJson(Map<String, dynamic> json) {
    List<String> imgList = [];
    final imgs = json['images'];
    if (imgs is List) {
      imgList = imgs.map((e) => e is Map ? (e['url'] ?? e['path'] ?? '').toString() : e.toString()).where((s) => s.isNotEmpty).toList();
    } else if (json['imageUrls'] is List) {
      imgList = (json['imageUrls'] as List).map((e) => e is Map ? (e['url'] ?? e['path'] ?? '').toString() : e.toString()).where((s) => s.isNotEmpty).toList();
    }
    return ListingModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      titleUrdu: json['titleUrdu'] as String? ?? json['titleUr'] as String? ?? '',
      description: json['description'] as String? ?? '',
      descUrdu: json['descUrdu'] as String? ?? json['descUr'] as String?,
      pricePkr: _parsePricePkr(json),
      unit: _parseUnit(json),
      quantity: _toDouble(json['quantity'], 1),
      categoryId: json['categoryId']?.toString() ?? '',
      categoryName: json['categoryName'] as String? ?? json['category']?['name'] as String? ?? '',
      categoryNameUr: json['categoryNameUr'] as String? ?? json['categoryNameUrdu'] as String? ?? '',
      sellerName: json['sellerName'] as String? ?? json['seller']?['name'] as String? ?? '',
      sellerPhone: json['sellerPhone'] as String? ?? json['seller']?['phone'] as String? ?? '',
      sellerId: json['sellerId']?.toString() ?? json['seller']?['id']?.toString(),
      city: json['cityName'] as String? ?? json['geoZone']?['name'] as String? ?? json['city'] as String? ?? '',
      area: json['area'] as String?,
      latitude: (json['latitude'] ?? 0) is double
          ? (json['latitude'] ?? 0) as double
          : ((json['latitude'] ?? 0) as num).toDouble(),
      longitude: (json['longitude'] ?? 0) is double
          ? (json['longitude'] ?? 0) as double
          : ((json['longitude'] ?? 0) as num).toDouble(),
      status: _parseStatus(json['status']),
      visibilityLevel: _parseVisibility(json['visibilityLevel'] ?? json['visibility']),
      images: imgList,
      daysAgo: _toInt(json['daysAgo'], 0),
      interestedCount: _toInt(json['interestedCount'], 0),
    );
  }

  static double _toDouble(dynamic v, double def) {
    if (v == null) return def;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? def;
    return def;
  }

  static int _toInt(dynamic v, int def) {
    if (v == null) return def;
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? def;
    return def;
  }

  static int _parsePricePkr(Map<String, dynamic> json) {
    final pricePaisa = json['pricePaisa'];
    if (pricePaisa != null) {
      final n = pricePaisa is int ? pricePaisa : int.tryParse(pricePaisa.toString());
      if (n != null) return (n / 100).round();
    }
    final p = json['pricePkr'] ?? json['price'] ?? 0;
    if (p is int) return p;
    return ((p as num).toDouble()).round();
  }

  static String _parseUnit(Map<String, dynamic> json) {
    final u = json['unit'];
    if (u is Map) return u['slug'] as String? ?? u['abbreviation'] as String? ?? json['unitName'] as String? ?? 'kg';
    if (u is String) return u;
    return json['unitName'] as String? ?? 'kg';
  }

  static ListingStatus _parseStatus(dynamic v) {
    if (v == null) return ListingStatus.active;
    final s = v.toString().toLowerCase();
    if (s.contains('sold')) return ListingStatus.sold;
    if (s.contains('negotiation')) return ListingStatus.underNegotiation;
    if (s.contains('expired')) return ListingStatus.expired;
    return ListingStatus.active;
  }

  static VisibilityLevel _parseVisibility(dynamic v) {
    if (v == null) return VisibilityLevel.public;
    final s = v.toString().toLowerCase();
    for (final level in VisibilityLevel.values) {
      if (s == level.name) return level;
    }
    return VisibilityLevel.public;
  }
}
