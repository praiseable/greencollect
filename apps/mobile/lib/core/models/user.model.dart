enum UserRole {
  customer,
  localDealer,
  cityFranchise,
  wholesale,
}

enum KycStatus {
  pending,
  submitted,
  underReview,
  approved,
  rejected,
}

enum SubscriptionStatus {
  active,
  expired,
  cancelled,
}

enum AccountStatus {
  pendingVerification, // just created by admin, docs not yet submitted
  documentsSubmitted,  // dealer submitted docs
  underReview,         // admin is reviewing
  active,              // approved & enabled by admin
  suspended,           // admin disabled (non-payment, violation, etc.)
  rejected,            // docs rejected
}

enum CriminalCheckStatus {
  notChecked,
  pending,
  cleared,
  flagged,
}

/// KYC / verification documents for Pro users (Dealer, Franchise, Wholesale)
class DealerVerification {
  final String cnicNumber;          // National ID
  final String? cnicFrontImage;     // URL/path to front of CNIC (original)
  final String? cnicBackImage;      // URL/path to back of CNIC (original)
  final String businessName;
  final String businessAddress;
  final String area;                // Assigned territory area
  final String city;
  final String? policeVerificationCert; // URL/path
  final String? characterCertificate;   // URL/path
  final String? dealerPhoto;            // URL/path to dealer's photo (must match CNIC)
  final String? shopPhoto;              // URL/path to shop photo
  final String? ntnNumber;              // Tax number (optional)
  final String? bankAccountTitle;
  final String? bankAccountNumber;
  final String? bankName;
  final DateTime? submittedAt;
  final DateTime? approvedAt;
  final String? rejectionReason;

  // ── Warehouse verification (new) ──
  final String? warehouseAddress;       // Full warehouse address
  final String? warehouseInsidePhoto;   // Interior photo
  final String? warehouseStreetPhoto;   // Street outside photo
  final String? warehouseFrontDoorPhoto; // Front door photo

  // ── SIM ownership ──
  final String? simOwnerName;           // Name on SIM (must match CNIC)
  final bool simVerified;               // OTP verified on registered SIM

  // ── Criminal record ──
  final CriminalCheckStatus criminalCheckStatus;
  final bool criminalFlagged;
  final String? criminalCheckNotes;

  // ── Deposit ──
  final int requiredDeposit;            // Amount required to activate
  final bool depositPaid;
  final int depositAmount;

  // ── KYC progress ──
  final int kycStep;                    // Current step (0-6)

  DealerVerification({
    required this.cnicNumber,
    this.cnicFrontImage,
    this.cnicBackImage,
    required this.businessName,
    required this.businessAddress,
    required this.area,
    required this.city,
    this.policeVerificationCert,
    this.characterCertificate,
    this.dealerPhoto,
    this.shopPhoto,
    this.ntnNumber,
    this.bankAccountTitle,
    this.bankAccountNumber,
    this.bankName,
    this.submittedAt,
    this.approvedAt,
    this.rejectionReason,
    this.warehouseAddress,
    this.warehouseInsidePhoto,
    this.warehouseStreetPhoto,
    this.warehouseFrontDoorPhoto,
    this.simOwnerName,
    this.simVerified = false,
    this.criminalCheckStatus = CriminalCheckStatus.notChecked,
    this.criminalFlagged = false,
    this.criminalCheckNotes,
    this.requiredDeposit = 0,
    this.depositPaid = false,
    this.depositAmount = 0,
    this.kycStep = 0,
  });
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

  // ── Pro-only fields ──
  final AccountStatus accountStatus;      // Admin-controlled activation
  final double balancePkr;                // Wallet balance (Rs.)
  final DealerVerification? verification; // Full KYC details

  /// Whether this Pro user's account is fully active (approved + enabled by admin)
  bool get isProAccountActive => accountStatus == AccountStatus.active;

  /// Whether this Pro user has sufficient balance to access features
  bool get hasBalance => balancePkr > 0;

  /// Whether all screens should be accessible (active account + balance > 0)
  bool get canAccessProFeatures => isProAccountActive && hasBalance;

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
    this.accountStatus = AccountStatus.active,
    this.balancePkr = 0,
    this.verification,
  });

  UserModel copyWith({
    double? balancePkr,
    AccountStatus? accountStatus,
  }) {
    return UserModel(
      id: id,
      name: name,
      nameUrdu: nameUrdu,
      phone: phone,
      email: email,
      role: role,
      city: city,
      kycStatus: kycStatus,
      languageCode: languageCode,
      zone: zone,
      subscriptionStatus: subscriptionStatus,
      subscriptionDaysLeft: subscriptionDaysLeft,
      accountStatus: accountStatus ?? this.accountStatus,
      balancePkr: balancePkr ?? this.balancePkr,
      verification: verification,
    );
  }

  /// Serialize to JSON for local persistence
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'nameUrdu': nameUrdu,
      'phone': phone,
      'email': email,
      'role': role.name,
      'city': city,
      'kycStatus': kycStatus.name,
      'languageCode': languageCode,
      'zone': zone,
      'subscriptionStatus': subscriptionStatus?.name,
      'subscriptionDaysLeft': subscriptionDaysLeft,
      'accountStatus': accountStatus.name,
      'balancePkr': balancePkr,
    };
  }

  /// Deserialize from JSON for session restoration
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      nameUrdu: json['nameUrdu'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'] ?? '',
      role: UserRole.values.firstWhere(
        (r) => r.name == json['role'],
        orElse: () => UserRole.customer,
      ),
      city: json['city'] ?? '',
      kycStatus: KycStatus.values.firstWhere(
        (k) => k.name == json['kycStatus'],
        orElse: () => KycStatus.pending,
      ),
      languageCode: json['languageCode'] ?? 'en',
      zone: json['zone'],
      subscriptionStatus: json['subscriptionStatus'] != null
          ? SubscriptionStatus.values.firstWhere(
              (s) => s.name == json['subscriptionStatus'],
              orElse: () => SubscriptionStatus.expired,
            )
          : null,
      subscriptionDaysLeft: json['subscriptionDaysLeft'],
      accountStatus: AccountStatus.values.firstWhere(
        (a) => a.name == json['accountStatus'],
        orElse: () => AccountStatus.active,
      ),
      balancePkr: (json['balancePkr'] ?? 0).toDouble(),
    );
  }
}
