import 'package:go_router/go_router.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/otp_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/listings/listing_list_screen.dart';
import '../screens/listings/listing_detail_screen.dart';
import '../screens/listings/create_listing_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/notifications/notification_screen.dart';
import '../screens/shell_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/otp', builder: (_, state) => OtpScreen(phone: state.extra as String? ?? '')),

    // Main shell with bottom nav
    ShellRoute(
      builder: (_, __, child) => ShellScreen(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/listings', builder: (_, __) => const ListingListScreen()),
        GoRoute(
          path: '/listings/:id',
          builder: (_, state) => ListingDetailScreen(id: state.pathParameters['id']!),
        ),
        GoRoute(path: '/create-listing', builder: (_, __) => const CreateListingScreen()),
        GoRoute(path: '/notifications', builder: (_, __) => const NotificationScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),
  ],
);
