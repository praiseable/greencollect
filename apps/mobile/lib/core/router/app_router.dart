import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/otp_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/kyc_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/listings/listings_screen.dart';
import '../../features/listings/listing_detail_screen.dart';
import '../../features/listings/create_listing_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/edit_profile_screen.dart';
import '../../features/transactions/transactions_screen.dart';
import '../../features/transactions/negotiation_screen.dart';
import '../../features/transactions/bond_viewer_screen.dart';
import '../../features/subscription/subscription_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/chat/chat_screen.dart';
import '../../features/analytics/analytics_screen.dart';
import '../../features/wallet/wallet_screen.dart';
import '../../features/shell/shell_screen.dart';
import '../providers/auth.provider.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.read(authChangeNotifierProvider);
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final isLoggedIn = auth != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');
      final isSplash = state.matchedLocation == '/splash';
      final isOnboarding = state.matchedLocation == '/onboarding';

      if (isSplash || isOnboarding) return null;
      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/auth/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '+92 300-1234567';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: '/auth/kyc',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const KycScreen(),
      ),
      // Shell route with bottom navigation
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: '/listings',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ListingsScreen(),
            ),
          ),
          GoRoute(
            path: '/create',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: CreateListingScreen(),
            ),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: NotificationsScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
      // Full-screen routes (outside shell / no bottom nav)
      GoRoute(
        path: '/listing/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ListingDetailScreen(listingId: id);
        },
      ),
      GoRoute(
        path: '/transactions',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const TransactionsScreen(),
      ),
      GoRoute(
        path: '/transactions/:id/negotiate',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return NegotiationScreen(transactionId: id);
        },
      ),
      GoRoute(
        path: '/transactions/:id/bond',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return BondViewerScreen(transactionId: id);
        },
      ),
      GoRoute(
        path: '/subscription',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SubscriptionScreen(),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/analytics',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/chat/:roomId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final roomId = state.pathParameters['roomId'] ?? '';
          return ChatScreen(roomId: roomId);
        },
      ),
      GoRoute(
        path: '/edit-profile',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const EditProfileScreen(),
      ),
      GoRoute(
        path: '/wallet',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const WalletScreen(),
      ),
      GoRoute(
        path: '/wallet/recharge',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const RechargeScreen(),
      ),
    ],
  );
});
