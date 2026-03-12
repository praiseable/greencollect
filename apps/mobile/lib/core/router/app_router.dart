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
import '../../features/chat/chat_inbox_screen.dart';
import '../../features/analytics/analytics_screen.dart';
import '../../features/wallet/wallet_screen.dart';
import '../../features/territory/territory_screen.dart';
import '../../features/collections/collections_screen.dart';
import '../../features/collections/collection_detail_screen.dart';
import '../../features/collections/dealer_rating_screen.dart';
import '../../features/shell/shell_screen.dart';
import '../../features/paywall/balance_gate_screen.dart';
import '../providers/app_providers.dart';
import '../config/app_variant.dart';
import '../models/user.model.dart';
import '../../services/api_service.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.read(authChangeNotifierProvider);
  ApiService().onSessionExpired = () => authNotifier.logout();
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
      final isBalanceGate = state.matchedLocation == '/balance-gate';

      if (isSplash || isOnboarding) return null;
      if (!isLoggedIn && !isAuthRoute) return '/auth/login';
      if (isLoggedIn && isAuthRoute) return '/home';

      // ── PRO APP: Balance-gate enforcement ──
      // If user is logged in, this is the Pro app, and user has no balance
      // or account is not active → redirect to balance-gate.
      // Exception: allow /profile, /settings, /edit-profile, /balance-gate itself
      if (isLoggedIn && AppVariant.isPro && !isBalanceGate) {
        final user = auth!;
        final isProUser = user.role != UserRole.customer;
        final allowedPaths = [
          '/profile', '/settings', '/edit-profile', '/balance-gate',
          '/auth/login', '/auth/otp', '/auth/kyc',
          '/chat', '/chat-inbox',
        ];
        final isAllowedPath = allowedPaths.any(
            (p) => state.matchedLocation.startsWith(p));

        if (isProUser && !user.canAccessProFeatures && !isAllowedPath) {
          return '/balance-gate';
        }
      }

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
          final devOtp = state.uri.queryParameters['dev_otp'];
          return OtpScreen(phone: phone, devOtp: devOtp);
        },
      ),
      GoRoute(
        path: '/auth/kyc',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const KycScreen(),
      ),
      // Balance-gate for Pro users with no balance
      GoRoute(
        path: '/balance-gate',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const BalanceGateScreen(),
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
        path: '/chat-inbox',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const ChatInboxScreen(),
      ),
      GoRoute(
        path: '/chat/:roomId',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final otherUserId = state.pathParameters['roomId'] ?? '';
          return ChatScreen(otherUserId: otherUserId);
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
      GoRoute(
        path: '/territory',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const TerritoryScreen(),
      ),
      GoRoute(
        path: '/collections',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) => const CollectionsScreen(),
      ),
      GoRoute(
        path: '/collections/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return CollectionDetailScreen(collectionId: id);
        },
      ),
      GoRoute(
        path: '/my-rating',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (context, state) {
          final dealerId = ref.read(authChangeNotifierProvider).user?.id ?? '';
          return DealerRatingScreen(dealerId: dealerId);
        },
      ),
    ],
  );
});
