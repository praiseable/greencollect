import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth.provider.dart';
import 'listings.provider.dart';
import '../models/user.model.dart';
import 'chat.provider.dart';
import 'notifications.provider.dart';

/// Auth notifier for router refresh and screen method calls.
final authChangeNotifierProvider =
    ChangeNotifierProvider<AuthProvider>((ref) {
  final p = AuthProvider();
  p.init();
  return p;
});

/// Current user (null = not logged in). Used by router redirect and screens.
final authProvider = Provider<UserModel?>((ref) {
  return ref.watch(authChangeNotifierProvider).user;
});

/// Listings notifier (for ProviderScope-overridden access if needed).
final listingsProvider = ChangeNotifierProvider<ListingsProvider>((ref) {
  return ListingsProvider();
});

/// Chat notifier.
final chatProvider = ChangeNotifierProvider<ChatProvider>((ref) {
  return ChatProvider();
});

/// Unread notification count for shell badge.
final unreadNotificationCountProvider = Provider<int>((ref) {
  final list = ref.watch(notificationsProvider);
  return list.where((n) => !n.isRead).length;
});

/// No-op chat sync service (startListening does nothing).
class _ChatSyncService {
  void startListening() {}
}
final chatSyncServiceProvider = Provider<_ChatSyncService>((ref) {
  return _ChatSyncService();
});
