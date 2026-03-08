import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/notification.model.dart';
import '../models/user.model.dart';
import '../mock/mock_data.dart';
import 'auth.provider.dart';

/// Global notification state — shell badge reads [unreadCount],
/// NotificationsScreen reads the full list and can mark items read.
/// Notifications are geo-fenced: each user sees only their area's notifications.
final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, List<NotificationModel>>(
  (ref) {
    final user = ref.watch(authProvider);
    return NotificationsNotifier(user);
  },
);

/// Convenience provider for the shell badge
final unreadNotificationCountProvider = Provider<int>((ref) {
  final list = ref.watch(notificationsProvider);
  return list.where((n) => !n.isRead).length;
});

class NotificationsNotifier extends StateNotifier<List<NotificationModel>> {
  NotificationsNotifier(UserModel? user)
      : super(List.from(MockData.notificationsForUser(user?.id)));

  void markAsRead(String id) {
    state = [
      for (final n in state)
        if (n.id == id && !n.isRead) n.copyWith(isRead: true) else n,
    ];
  }

  void markAllRead() {
    state = [for (final n in state) n.copyWith(isRead: true)];
  }
}
