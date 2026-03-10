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
      imgList = imgs.map((e) => e.toString()).toList();
    } else if (json['imageUrls'] is List) {
      imgList = (json['imageUrls'] as List).map((e) => e.toString()).toList();
    }
    return ListingModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? '',
      titleUrdu: json['titleUrdu'] as String? ?? json['titleUr'] as String? ?? '',
      description: json['description'] as String? ?? '',
      descUrdu: json['descUrdu'] as String? ?? json['descUr'] as String?,
      pricePkr: (json['pricePkr'] ?? json['price'] ?? 0) is int
          ? (json['pricePkr'] ?? json['price'] ?? 0) as int
          : ((json['pricePkr'] ?? json['price'] ?? 0) as num).toInt(),
      unit: json['unit'] as String? ?? 'kg',
      quantity: (json['quantity'] ?? 1) is double
          ? (json['quantity'] ?? 1) as double
          : ((json['quantity'] ?? 1) as num).toDouble(),
      categoryId: json['categoryId']?.toString() ?? '',
      categoryName: json['categoryName'] as String? ?? json['category']?['name'] as String? ?? '',
      categoryNameUr: json['categoryNameUr'] as String? ?? json['categoryNameUrdu'] as String? ?? '',
      sellerName: json['sellerName'] as String? ?? json['seller']?['name'] as String? ?? '',
      sellerPhone: json['sellerPhone'] as String? ?? json['seller']?['phone'] as String? ?? '',
      sellerId: json['sellerId']?.toString() ?? json['seller']?['id']?.toString(),
      city: json['city'] as String? ?? '',
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
      daysAgo: (json['daysAgo'] ?? 0) is int
          ? (json['daysAgo'] ?? 0) as int
          : ((json['daysAgo'] ?? 0) as num).toInt(),
      interestedCount: (json['interestedCount'] ?? 0) is int
          ? (json['interestedCount'] ?? 0) as int
          : ((json['interestedCount'] ?? 0) as num).toInt(),
    );
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
