import '../config/app_variant.dart';
import '../models/user.model.dart';

/// Pure routing rules for M1 Auth/KYC.
///
/// Keep this class free of Flutter BuildContext so it can be tested without a
/// widget tree. The GoRouter redirect calls this policy and then performs the
/// actual navigation.
class AuthRoutePolicy {
  const AuthRoutePolicy._();

  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String otp = '/auth/otp';
  static const String kyc = '/auth/kyc';
  static const String home = '/home';
  static const String forceUpdate = '/force-update';

  static bool isAuthRoute(String location) => location.startsWith('/auth');

  static bool isPublicRoute(String location) =>
      location == splash ||
      location == onboarding ||
      location == login ||
      location == register ||
      location == otp;

  static bool isProfessionalRole(UserRole role) =>
      role == UserRole.localDealer ||
      role == UserRole.cityFranchise ||
      role == UserRole.wholesale;

  static bool isKycApproved(UserModel user) =>
      user.kycStatus == KycStatus.approved &&
      user.accountStatus == AccountStatus.active;

  static bool shouldRouteToKyc({
    required UserModel? user,
    required bool isProFlavor,
  }) {
    if (user == null) return false;
    if (!isProFlavor) return false;
    if (!isProfessionalRole(user.role)) return false;
    return !isKycApproved(user);
  }

  static String? redirect({
    required String location,
    required bool isLoggedIn,
    required UserModel? user,
    bool isProFlavor = false,
    bool forceUpdateRequired = false,
  }) {
    if (forceUpdateRequired) {
      return location == forceUpdate ? null : forceUpdate;
    }

    if (location == splash || location == onboarding) return null;

    if (!isLoggedIn) {
      // KYC and all private app routes require an authenticated session.
      return isPublicRoute(location) ? null : login;
    }

    if (user?.accountStatus == AccountStatus.suspended) {
      return location == login ? null : '$login?reason=suspended';
    }

    if (isAuthRoute(location) && location != kyc) return home;

    if (shouldRouteToKyc(user: user, isProFlavor: isProFlavor) &&
        location != kyc) {
      return kyc;
    }

    return null;
  }

  static String? redirectForCurrentVariant({
    required String location,
    required bool isLoggedIn,
    required UserModel? user,
    bool forceUpdateRequired = false,
  }) {
    return redirect(
      location: location,
      isLoggedIn: isLoggedIn,
      user: user,
      isProFlavor: AppVariant.isPro,
      forceUpdateRequired: forceUpdateRequired,
    );
  }
}
