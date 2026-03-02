import 'package:flutter/material.dart';
import '../services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = false;
  int _unreadCount = 0;

  List<Map<String, dynamic>> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _unreadCount;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService().get('/notifications');
      final data = response['data'] ?? response;
      if (data is List) {
        _notifications = List<Map<String, dynamic>>.from(data);
        _unreadCount = _notifications.where((n) => !(n['isRead'] ?? false)).length;
      }
    } catch (e) {
      print('Error fetching notifications: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAsRead(String id) async {
    try {
      await ApiService().put('/notifications/$id/read');
      final idx = _notifications.indexWhere((n) => n['id'] == id);
      if (idx != -1) {
        _notifications[idx]['isRead'] = true;
        _unreadCount = _notifications.where((n) => !(n['isRead'] ?? false)).length;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await ApiService().put('/notifications/read-all');
      for (var n in _notifications) {
        n['isRead'] = true;
      }
      _unreadCount = 0;
      notifyListeners();
    } catch (_) {}
  }
}
