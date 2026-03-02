import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/notification_provider.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  @override
  void initState() {
    super.initState();
    context.read<NotificationProvider>().fetchNotifications();
  }

  IconData _getIcon(String? type) {
    switch (type) {
      case 'NEW_LISTING': return Icons.inventory_2;
      case 'NEW_MESSAGE': return Icons.message;
      case 'ORDER_UPDATE': return Icons.receipt_long;
      default: return Icons.notifications;
    }
  }

  Color _getIconColor(String? type) {
    switch (type) {
      case 'NEW_LISTING': return Colors.blue;
      case 'NEW_MESSAGE': return Colors.green;
      case 'ORDER_UPDATE': return Colors.purple;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (provider.unreadCount > 0)
            TextButton(
              onPressed: () => provider.markAllRead(),
              child: const Text('Mark All Read', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_none, size: 60, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      const Text('No notifications yet', style: TextStyle(color: Colors.grey, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('You\'ll be notified about new listings and messages',
                        style: TextStyle(color: Colors.grey[400], fontSize: 13)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => provider.fetchNotifications(),
                  child: ListView.separated(
                    itemCount: provider.notifications.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final notif = provider.notifications[i];
                      final isRead = notif['isRead'] ?? false;

                      return ListTile(
                        tileColor: isRead ? null : Colors.green.withOpacity(0.05),
                        leading: CircleAvatar(
                          backgroundColor: _getIconColor(notif['type']).withOpacity(0.1),
                          child: Icon(_getIcon(notif['type']), color: _getIconColor(notif['type']), size: 20),
                        ),
                        title: Text(notif['title'] ?? 'Notification',
                          style: TextStyle(fontWeight: isRead ? FontWeight.normal : FontWeight.bold, fontSize: 14)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (notif['body'] != null)
                              Text(notif['body'], maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12)),
                            const SizedBox(height: 2),
                            Text(_timeAgo(notif['createdAt']),
                              style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                          ],
                        ),
                        trailing: !isRead
                            ? Container(width: 10, height: 10,
                                decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.green))
                            : null,
                        onTap: () {
                          provider.markAsRead(notif['id']);
                          if (notif['listingId'] != null) {
                            context.go('/listings/${notif['listingId']}');
                          }
                        },
                      );
                    },
                  ),
                ),
    );
  }

  String _timeAgo(String? dateStr) {
    if (dateStr == null) return '';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}
