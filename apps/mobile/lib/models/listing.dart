class Listing {
  final String id;
  final String title;
  final String? description;
  final String? categoryName;
  final String? productTypeName;
  final double? quantity;
  final String? unitName;
  final int pricePaisa;
  final bool priceNegotiable;
  final String? condition;
  final String? cityName;
  final String? geoZoneName;
  final List<ListingImage> images;
  final String? sellerName;
  final String? sellerPhone;
  final String status;
  final int viewCount;
  final DateTime createdAt;
  final List<ListingAttribute>? attributes;

  Listing({
    required this.id,
    required this.title,
    this.description,
    this.categoryName,
    this.productTypeName,
    this.quantity,
    this.unitName,
    required this.pricePaisa,
    this.priceNegotiable = false,
    this.condition,
    this.cityName,
    this.geoZoneName,
    this.images = const [],
    this.sellerName,
    this.sellerPhone,
    this.status = 'ACTIVE',
    this.viewCount = 0,
    required this.createdAt,
    this.attributes,
  });

  String get priceFormatted => '₨ ${pricePaisa.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get location => geoZoneName ?? cityName ?? 'Pakistan';

  factory Listing.fromJson(Map<String, dynamic> json) {
    return Listing(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      categoryName: json['category']?['name'] ?? json['categoryName'],
      productTypeName: json['productType']?['name'] ?? json['productTypeName'],
      quantity: (json['quantity'] as num?)?.toDouble(),
      unitName: json['unit']?['name'] ?? json['unitName'],
      pricePaisa: (json['pricePaisa'] as num?)?.toInt() ?? 0,
      priceNegotiable: json['priceNegotiable'] ?? false,
      condition: json['condition'],
      cityName: json['city']?['name'] ?? json['cityName'],
      geoZoneName: json['geoZone']?['name'] ?? json['geoZoneName'],
      images: (json['images'] as List<dynamic>?)
              ?.map((i) => ListingImage.fromJson(i))
              .toList() ??
          [],
      sellerName: json['seller'] != null
          ? '${json['seller']['firstName']} ${json['seller']['lastName']}'
          : json['sellerName'],
      sellerPhone: json['seller']?['phone'] ?? json['sellerPhone'],
      status: json['status'] ?? 'ACTIVE',
      viewCount: json['viewCount'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      attributes: (json['attributes'] as List<dynamic>?)
          ?.map((a) => ListingAttribute.fromJson(a))
          .toList(),
    );
  }
}

class ListingImage {
  final String url;
  final int? order;

  ListingImage({required this.url, this.order});

  factory ListingImage.fromJson(Map<String, dynamic> json) {
    return ListingImage(url: json['url'] ?? '', order: json['order']);
  }
}

class ListingAttribute {
  final String name;
  final String value;

  ListingAttribute({required this.name, required this.value});

  factory ListingAttribute.fromJson(Map<String, dynamic> json) {
    return ListingAttribute(name: json['name'] ?? '', value: json['value'] ?? '');
  }
}
