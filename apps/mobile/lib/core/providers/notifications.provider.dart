import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../models/notification.model.dart';

// ✅ FIX: Removed all MockService/MockData usage.
//          Now fetches notifications from real backend via ApiService.

/// Riverpod provider used by NotificationsScreen (ref.watch(notificationsProvider))
final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, List<NotificationModel>>((ref) {
  return NotificationsNotifier()..fetchNotifications();
});

class NotificationsNotifier extends StateNotifier<List<NotificationModel>> {
  final ApiService _api = ApiService();

  NotificationsNotifier() : super([]);

  Future<void> fetchNotifications({bool refresh = false}) async {
    try {
      final response = await _api.get('notifications', queryParams: {
        'page': '1',
        'limit': '30',
      });
      final List<dynamic> raw =
          (response['notifications'] ?? response['data'] ?? response) as List<dynamic>;
      state = raw.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('fetchNotifications error: $e');
    }
  }

  Future<void> markAsRead(String notificationId) async {
    state = state.map((n) =>
        n.id == notificationId ? n.copyWith(isRead: true) : n).toList();
    try {
      await _api.patch('notifications/$notificationId/read', {});
    } catch (e) {
      debugPrint('markAsRead error: $e');
      await fetchNotifications();
    }
  }

  Future<void> markAllRead() async {
    state = state.map((n) => n.copyWith(isRead: true)).toList();
    try {
      await _api.patch('notifications/read-all', {});
    } catch (e) {
      debugPrint('markAllRead error: $e');
      await fetchNotifications();
    }
  }
}

/// ChangeNotifier version for code using Provider.of<NotificationsProvider>
class NotificationsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  String? _error;

  List<NotificationModel> get notifications => _notifications;
  int     get unreadCount => _unreadCount;
  bool    get loading     => _loading;
  String? get error       => _error;

  // ── Fetch notifications ──────────────────────────────────────────────────
  Future<void> fetchNotifications({bool refresh = false}) async {
    if (_loading) return;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      // ✅ Calls GET /v1/notifications?page=1&limit=30
      final response = await _api.get('notifications', queryParams: {
        'page':  '1',
        'limit': '30',
      });

      final List<dynamic> raw =
          (response['notifications'] ?? response['data'] ?? response) as List<dynamic>;

      _notifications = raw.map((e) => NotificationModel.fromJson(e)).toList();
      _unreadCount   = _notifications.where((n) => !n.isRead).length;
    } catch (e) {
      _error = _parseError(e, 'Failed to load notifications');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Fetch unread count only (for badge) ─────────────────────────────────
  Future<void> fetchUnreadCount() async {
    try {
      // ✅ Calls GET /v1/notifications/unread-count
      final response = await _api.get('notifications/unread-count');
      _unreadCount = (response['count'] ?? response['unreadCount'] ?? 0) as int;
      notifyListeners();
    } catch (e) {
      debugPrint('fetchUnreadCount error: $e');
    }
  }

  // ── Mark single notification as read ────────────────────────────────────
  Future<void> markAsRead(String notificationId) async {
    // Optimistic update
    _notifications = _notifications.map((n) {
      return n.id == notificationId ? n.copyWith(isRead: true) : n;
    }).toList();
    _unreadCount = _notifications.where((n) => !n.isRead).length;
    notifyListeners();

    try {
      // ✅ Calls PATCH /v1/notifications/:id/read
      await _api.patch('notifications/$notificationId/read', {});
    } catch (e) {
      debugPrint('markAsRead error: $e');
      // Revert optimistic update on failure
      await fetchNotifications();
    }
  }

  // ── Mark all as read ─────────────────────────────────────────────────────
  Future<void> markAllAsRead() async {
    // Optimistic update
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _unreadCount = 0;
    notifyListeners();

    try {
      // ✅ Calls PATCH /v1/notifications/read-all
      await _api.patch('notifications/read-all', {});
    } catch (e) {
      debugPrint('markAllAsRead error: $e');
      await fetchNotifications();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _parseError(dynamic e, String fallback) {
    if (e is Map) {
      return e['error']?['message'] ?? e['message'] ?? fallback;
    }
    return e.toString().contains('Exception:')
        ? e.toString().split('Exception:').last.trim()
        : fallback;
  }
}
