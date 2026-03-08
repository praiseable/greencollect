enum UserRole {
  customer,
  localDealer,
  cityFranchise,
  wholesale,
}

enum KycStatus {
  pending,
  approved,
  rejected,
}

enum SubscriptionStatus {
  active,
  expired,
  cancelled,
}

class UserModel {
  final String id;
  final String name;
  final String nameUrdu;
  final String phone;
  final String email;
  final UserRole role;
  final String city;
  final KycStatus kycStatus;
  final String languageCode;
  final String? zone;
  final SubscriptionStatus? subscriptionStatus;
  final int? subscriptionDaysLeft;

  UserModel({
    required this.id,
    required this.name,
    required this.nameUrdu,
    required this.phone,
    required this.email,
    required this.role,
    required this.city,
    required this.kycStatus,
    required this.languageCode,
    this.zone,
    this.subscriptionStatus,
    this.subscriptionDaysLeft,
  });
}
