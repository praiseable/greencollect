class SubCategoryModel {
  final String id;
  final String nameEn;
  final String nameUr;
  final String colorHex;

  SubCategoryModel({
    required this.id,
    required this.nameEn,
    required this.nameUr,
    required this.colorHex,
  });
}

class CategoryModel {
  final String id;
  final String slug;
  final String nameEn;
  final String nameUr;
  final String colorHex;
  final String icon;
  final List<SubCategoryModel> subCategories;

  CategoryModel({
    required this.id,
    required this.slug,
    required this.nameEn,
    required this.nameUr,
    required this.colorHex,
    required this.icon,
    this.subCategories = const [],
  });
}
