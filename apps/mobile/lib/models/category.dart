class Category {
  final String id;
  final String name;
  final String? description;
  final String? iconUrl;
  final String? slug;
  final bool isRecyclable;
  final bool isReusable;

  Category({
    required this.id,
    required this.name,
    this.description,
    this.iconUrl,
    this.slug,
    this.isRecyclable = false,
    this.isReusable = false,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      iconUrl: json['iconUrl'],
      slug: json['slug'],
      isRecyclable: json['isRecyclable'] ?? false,
      isReusable: json['isReusable'] ?? false,
    );
  }
}

class ProductType {
  final String id;
  final String name;
  final String? categoryId;
  final String? description;
  final String? iconUrl;

  ProductType({
    required this.id,
    required this.name,
    this.categoryId,
    this.description,
    this.iconUrl,
  });

  factory ProductType.fromJson(Map<String, dynamic> json) {
    return ProductType(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      categoryId: json['categoryId'],
      description: json['description'],
      iconUrl: json['iconUrl'],
    );
  }
}
