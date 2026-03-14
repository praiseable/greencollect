import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../models/notification.model.dart';

// ✅ FIX: Removed all MockService/MockData usage.
//          Now fetches notifications from real backend via ApiService.
//          Also listens to socket notifications for real-time updates.

/// Riverpod provider used by NotificationsScreen (ref.watch(notificationsProvider))
final notificationsProvider =
    StateNotifierProvider<NotificationsNotifier, List<NotificationModel>>((ref) {
  return NotificationsNotifier()..init();
});

class NotificationsNotifier extends StateNotifier<List<NotificationModel>> {
  final ApiService _api = ApiService();
  final StorageService _storage = StorageService();
  io.Socket? _socket;

  NotificationsNotifier() : super([]);

  Future<void> init() async {
    await fetchNotifications();
    await _initSocket();
  }

  Future<void> _initSocket() async {
    final token = await _storage.getAccessToken();
    if (token == null) return;

    // Connect to socket for real-time notifications
    _socket = io.io(
      ApiConfig.effectiveSocketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    _socket!.connect();

    _socket!.on('connect', (_) async {
      debugPrint('[NotificationsProvider] Socket connected');
      // Join personal room for notifications
      final user = await _storage.getUser();
      final userId = user?['id']?.toString();
      if (userId != null && userId.isNotEmpty) {
        _socket!.emit('join-room', userId);
        debugPrint('[NotificationsProvider] Joined user room: user-$userId');
      }
    });

    // Listen for real-time notifications
    _socket!.on('notification', (data) {
      debugPrint('[NotificationsProvider] Received socket notification: $data');
      try {
        final notifData = data as Map<String, dynamic>;
        // Convert socket notification to NotificationModel
        final notifType = notifData['type'] as String? ?? 'system';
        final normalizedType = NotificationModel._normalizeType(notifType);
        final notifDataMap = notifData['data'] as Map<String, dynamic>? ?? {};
        final dataStr = <String, String>{};
        for (final e in notifDataMap.entries) {
          if (e.value != null) dataStr[e.key.toString()] = e.value.toString();
        }
        
        final notification = NotificationModel(
          id: 'socket_${DateTime.now().millisecondsSinceEpoch}',
          type: normalizedType,
          title: notifData['title'] as String? ?? '',
          titleUr: '',
          body: notifData['body'] as String? ?? '',
          bodyUr: '',
          data: dataStr,
          isRead: false,
          createdAt: DateTime.now(),
        );
        
        // Add to beginning of list (newest first)
        state = [notification, ...state];
        debugPrint('[NotificationsProvider] Added notification: ${notification.title}');
      } catch (e) {
        debugPrint('[NotificationsProvider] Error processing socket notification: $e');
      }
    });

    _socket!.on('disconnect', (_) => debugPrint('[NotificationsProvider] Socket disconnected'));
    _socket!.on('error', (e) => debugPrint('[NotificationsProvider] Socket error: $e'));
  }

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
  final StorageService _storage = StorageService();
  io.Socket? _socket;

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  String? _error;

  List<NotificationModel> get notifications => _notifications;
  int     get unreadCount => _unreadCount;
  bool    get loading     => _loading;
  String? get error       => _error;

  // ── Initialize socket connection for real-time notifications ─────────────
  Future<void> initSocket() async {
    if (_socket != null && _socket!.connected) return;
    
    final token = await _storage.getAccessToken();
    if (token == null) return;

    _socket = io.io(
      ApiConfig.effectiveSocketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    _socket!.connect();

    _socket!.on('connect', (_) async {
      debugPrint('[NotificationsProvider] Socket connected');
      final user = await _storage.getUser();
      final userId = user?['id']?.toString();
      if (userId != null && userId.isNotEmpty) {
        _socket!.emit('join-room', userId);
        debugPrint('[NotificationsProvider] Joined user room: user-$userId');
      }
    });

    // Listen for real-time notifications
    _socket!.on('notification', (data) {
      debugPrint('[NotificationsProvider] Received socket notification: $data');
      try {
        final notifData = data as Map<String, dynamic>;
        // Convert socket notification to NotificationModel
        final notifType = notifData['type'] as String? ?? 'system';
        final normalizedType = NotificationModel._normalizeType(notifType);
        final notifDataMap = notifData['data'] as Map<String, dynamic>? ?? {};
        final dataStr = <String, String>{};
        for (final e in notifDataMap.entries) {
          if (e.value != null) dataStr[e.key.toString()] = e.value.toString();
        }
        
        final notification = NotificationModel(
          id: 'socket_${DateTime.now().millisecondsSinceEpoch}',
          type: normalizedType,
          title: notifData['title'] as String? ?? '',
          titleUr: '',
          body: notifData['body'] as String? ?? '',
          bodyUr: '',
          data: dataStr,
          isRead: false,
          createdAt: DateTime.now(),
        );
        
        // Add to beginning of list (newest first)
        _notifications = [notification, ..._notifications];
        _unreadCount = _notifications.where((n) => !n.isRead).length;
        notifyListeners();
        debugPrint('[NotificationsProvider] Added notification: ${notification.title}');
      } catch (e) {
        debugPrint('[NotificationsProvider] Error processing socket notification: $e');
      }
    });

    _socket!.on('disconnect', (_) => debugPrint('[NotificationsProvider] Socket disconnected'));
    _socket!.on('error', (e) => debugPrint('[NotificationsProvider] Socket error: $e'));
  }

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
      
      // Initialize socket if not already done
      if (_socket == null || !_socket!.connected) {
        await initSocket();
      }
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
