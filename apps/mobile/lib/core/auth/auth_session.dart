import '../models/user.model.dart';

/// Immutable access/refresh token bundle used by the mobile auth layer.
///
/// Tokens are sensitive. Store them only through [AuthSessionStore]
/// implementations backed by flutter_secure_storage.
class AuthTokens {
  final String accessToken;
  final String? refreshToken;
  final int expiresInSeconds;

  const AuthTokens({
    required this.accessToken,
    this.refreshToken,
    this.expiresInSeconds = 900,
  });

  bool get hasAccessToken => accessToken.trim().isNotEmpty;
}

/// Snapshot of the current mobile auth session.
class AuthSessionSnapshot {
  final AuthTokens? tokens;
  final UserModel? user;

  const AuthSessionSnapshot({this.tokens, this.user});

  bool get isAuthenticated => tokens?.hasAccessToken == true && user != null;

  static const empty = AuthSessionSnapshot();
}

/// Minimal contract for persisting/restoring auth state.
///
/// M1-B keeps this abstract so the contract can be tested with in-memory
/// stores while production uses SecureSessionStore.
abstract class AuthSessionStore {
  Future<AuthSessionSnapshot> readSession();
  Future<void> saveSession(AuthSessionSnapshot session);
  Future<void> clearSession();
}

/// Converts backend user DTOs into the app's current UserModel shape.
///
/// The backend can return either displayName/name or firstName/lastName. This
/// adapter intentionally keeps missing fields safe so the route policy never
/// crashes during login/refresh restoration.
UserModel userFromAuthJson(Map<String, dynamic> json) {
  String enumString(Object? value) => value?.toString().trim() ?? '';
  final firstName = enumString(json['firstName']);
  final lastName = enumString(json['lastName']);
  final displayName = enumString(json['displayName']);
  final fullName = displayName.isNotEmpty
      ? displayName
      : [firstName, lastName].where((v) => v.isNotEmpty).join(' ').trim();

  UserRole roleFrom(Object? value) {
    final raw = enumString(value).toLowerCase();
    if (raw.contains('local')) return UserRole.localDealer;
    if (raw.contains('city') || raw.contains('franchise')) {
      return UserRole.cityFranchise;
    }
    if (raw.contains('wholesale')) return UserRole.wholesale;
    return UserRole.customer;
  }

  KycStatus kycFrom(Object? value) {
    final raw = enumString(value).toLowerCase();
    if (raw.contains('approve')) return KycStatus.approved;
    if (raw.contains('reject')) return KycStatus.rejected;
    if (raw.contains('review')) return KycStatus.underReview;
    if (raw.contains('submit')) return KycStatus.submitted;
    return KycStatus.pending;
  }

  bool boolFrom(Object? value) =>
      value == true || value?.toString().toLowerCase() == 'true';

  double moneyFrom(Object? value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  AccountStatus accountFrom(Object? value, bool isActive) {
    final raw = enumString(value).toLowerCase();
    if (raw.contains('suspend')) return AccountStatus.suspended;
    if (raw.contains('reject')) return AccountStatus.rejected;
    if (raw.contains('review')) return AccountStatus.underReview;
    if (raw.contains('document')) return AccountStatus.documentsSubmitted;
    if (raw.contains('pending')) return AccountStatus.pendingVerification;
    if (isActive == false) return AccountStatus.suspended;
    return AccountStatus.active;
  }

  return UserModel(
    id: enumString(json['id']),
    name: fullName.isNotEmpty ? fullName : enumString(json['phone']),
    nameUrdu: enumString(json['nameUrdu']),
    phone: enumString(json['phone']),
    email: enumString(json['email']),
    role: roleFrom(json['role'] ?? json['roleName']),
    city: enumString(json['city'] ?? json['cityName']),
    kycStatus: kycFrom(json['kycStatus'] ?? json['kycStatusName']),
    languageCode: enumString(json['languageId']).isNotEmpty
        ? enumString(json['languageId'])
        : enumString(json['languageCode']).isNotEmpty
            ? enumString(json['languageCode'])
            : 'en',
    accountStatus: accountFrom(json['accountStatus'], boolFrom(json['isActive'] ?? true)),
    balancePkr: moneyFrom(json['balanceRupees'] ?? json['balancePkr']),
  );
}