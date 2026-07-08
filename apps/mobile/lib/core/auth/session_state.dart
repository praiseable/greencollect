import '../models/user.model.dart';

/// Immutable auth/session state used by M1-B screens and providers.
///
/// This state intentionally contains no UI objects and no BuildContext so it can
/// be tested as a pure contract. Token values are never exposed here; they live
/// only in secure storage through [SecureSessionStore].
enum SessionStatus {
  unknown,
  unauthenticated,
  loading,
  authenticated,
  suspended,
  forceUpdateRequired,
  error,
}

class SessionState {
  final SessionStatus status;
  final UserModel? user;
  final String? message;
  final bool forceUpdateRequired;

  const SessionState({
    this.status = SessionStatus.unknown,
    this.user,
    this.message,
    this.forceUpdateRequired = false,
  });

  const SessionState.unknown() : this();

  const SessionState.unauthenticated([String? message])
      : this(status: SessionStatus.unauthenticated, message: message);

  const SessionState.loading()
      : this(status: SessionStatus.loading);

  const SessionState.authenticated(UserModel user)
      : this(status: SessionStatus.authenticated, user: user);

  const SessionState.suspended([String? message])
      : this(status: SessionStatus.suspended, message: message);

  const SessionState.forceUpdate([String? message])
      : this(
          status: SessionStatus.forceUpdateRequired,
          message: message,
          forceUpdateRequired: true,
        );

  const SessionState.error(String message)
      : this(status: SessionStatus.error, message: message);

  bool get isAuthenticated =>
      status == SessionStatus.authenticated && user != null;

  bool get isLoading => status == SessionStatus.loading;

  bool get isProfessionalUser =>
      user?.role == UserRole.localDealer ||
      user?.role == UserRole.cityFranchise ||
      user?.role == UserRole.wholesale;

  bool get needsKyc =>
      isProfessionalUser &&
      !(user?.kycStatus == KycStatus.approved &&
          user?.accountStatus == AccountStatus.active);

  SessionState copyWith({
    SessionStatus? status,
    UserModel? user,
    String? message,
    bool? forceUpdateRequired,
  }) {
    return SessionState(
      status: status ?? this.status,
      user: user ?? this.user,
      message: message ?? this.message,
      forceUpdateRequired: forceUpdateRequired ?? this.forceUpdateRequired,
    );
  }
}
