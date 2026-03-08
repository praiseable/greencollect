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
}
