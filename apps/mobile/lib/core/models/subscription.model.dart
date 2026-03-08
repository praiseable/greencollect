class SubscriptionPlanModel {
  final String id;
  final String name;
  final String nameUr;
  final String role;
  final int priceWeekly;
  final int priceMonthly;
  final List<String> features;
  final List<String> featuresUr;

  SubscriptionPlanModel({
    required this.id,
    required this.name,
    required this.nameUr,
    required this.role,
    required this.priceWeekly,
    required this.priceMonthly,
    required this.features,
    required this.featuresUr,
  });
}
