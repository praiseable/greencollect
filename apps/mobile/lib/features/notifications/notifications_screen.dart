import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/notification.model.dart';
import '../../core/providers/notifications.provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  // ── route to the relevant screen based on notification type ──
  void _onNotificationTap(
      BuildContext context, WidgetRef ref, NotificationModel notif) {
    // Mark read via provider (updates badge globally)
    ref.read(notificationsProvider.notifier).markAsRead(notif.id);

    final data = notif.data;

    switch (notif.type) {
      case NotificationType.newListing:
      case NotificationType.priceAlert:
        final listingId = data['listingId'];
        if (listingId != null && listingId.isNotEmpty) {
          context.push('/listing/$listingId');
        }
        break;

      case NotificationType.offerReceived:
      case NotificationType.offerAccepted:
      case NotificationType.offerRejected:
      case NotificationType.dealFinalized:
        final listingId = data['listingId'];
        if (listingId != null && listingId.isNotEmpty) {
          context.push('/listing/$listingId');
        } else {
          context.push('/transactions');
        }
        break;

      case NotificationType.paymentReceived:
      case NotificationType.paymentSent:
        context.push('/transactions');
        break;

      case NotificationType.subscriptionExpiring:
      case NotificationType.subscriptionExpired:
        context.push('/subscription');
        break;

      case NotificationType.chatMessage:
        final roomId = data['chatRoomId'];
        if (roomId != null && roomId.isNotEmpty) {
          context.push('/chat/$roomId');
        }
        break;

      case NotificationType.kycUpdate:
        context.go('/profile');
        break;

      case NotificationType.escalation:
        context.push('/transactions');
        break;

      case NotificationType.system:
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(notif.body)),
        );
        break;
    }
  }

  IconData _getIcon(String type) {
    switch (type) {
      case NotificationType.newListing:
        return Icons.inventory_2;
      case NotificationType.priceAlert:
        return Icons.trending_up;
      case NotificationType.offerReceived:
      case NotificationType.offerAccepted:
      case NotificationType.offerRejected:
        return Icons.local_offer;
      case NotificationType.dealFinalized:
        return Icons.handshake;
      case NotificationType.chatMessage:
        return Icons.message;
      case NotificationType.paymentReceived:
      case NotificationType.paymentSent:
        return Icons.payment;
      case NotificationType.subscriptionExpiring:
      case NotificationType.subscriptionExpired:
        return Icons.card_membership;
      case NotificationType.kycUpdate:
        return Icons.verified_user;
      case NotificationType.escalation:
        return Icons.escalator_warning;
      case NotificationType.system:
        return Icons.info;
      default:
        return Icons.notifications;
    }
  }

  Color _getIconColor(String type) {
    switch (type) {
      case NotificationType.newListing:
        return Colors.blue;
      case NotificationType.priceAlert:
        return Colors.orange;
      case NotificationType.offerReceived:
      case NotificationType.offerAccepted:
      case NotificationType.offerRejected:
        return Colors.deepPurple;
      case NotificationType.dealFinalized:
        return const Color(0xFF16A34A);
      case NotificationType.chatMessage:
        return Colors.green;
      case NotificationType.paymentReceived:
      case NotificationType.paymentSent:
        return Colors.teal;
      case NotificationType.subscriptionExpiring:
      case NotificationType.subscriptionExpired:
        return Colors.amber.shade700;
      case NotificationType.kycUpdate:
        return Colors.cyan;
      case NotificationType.escalation:
        return Colors.red;
      case NotificationType.system:
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _typeLabel(String type) {
    switch (type) {
      case NotificationType.newListing:
        return 'New Listing';
      case NotificationType.priceAlert:
        return 'Price Alert';
      case NotificationType.offerReceived:
        return 'Offer';
      case NotificationType.offerAccepted:
        return 'Offer Accepted';
      case NotificationType.offerRejected:
        return 'Offer Rejected';
      case NotificationType.dealFinalized:
        return 'Deal';
      case NotificationType.chatMessage:
        return 'Chat';
      case NotificationType.paymentReceived:
      case NotificationType.paymentSent:
        return 'Payment';
      case NotificationType.subscriptionExpiring:
      case NotificationType.subscriptionExpired:
        return 'Subscription';
      case NotificationType.kycUpdate:
        return 'KYC';
      case NotificationType.escalation:
        return 'Escalation';
      case NotificationType.system:
        return 'System';
      default:
        return 'Info';
    }
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  String _dateGroupLabel(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dateDay = DateTime(date.year, date.month, date.day);
    if (dateDay == today) return 'TODAY';
    if (dateDay == today.subtract(const Duration(days: 1))) return 'YESTERDAY';
    return 'EARLIER';
  }

  bool _isActionable(NotificationModel notif) {
    switch (notif.type) {
      case NotificationType.newListing:
      case NotificationType.priceAlert:
        return notif.data.containsKey('listingId');
      case NotificationType.offerReceived:
      case NotificationType.offerAccepted:
      case NotificationType.offerRejected:
      case NotificationType.dealFinalized:
        return notif.data.containsKey('listingId') ||
            notif.data.containsKey('transactionId');
      case NotificationType.chatMessage:
        return notif.data.containsKey('chatRoomId');
      case NotificationType.subscriptionExpiring:
      case NotificationType.subscriptionExpired:
      case NotificationType.kycUpdate:
      case NotificationType.paymentReceived:
      case NotificationType.paymentSent:
      case NotificationType.escalation:
        return true;
      default:
        return false;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final unreadCount = notifications.where((n) => !n.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications ($unreadCount)'),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: () {
                ref.read(notificationsProvider.notifier).markAllRead();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('All notifications marked as read ✓')),
                );
              },
              child: const Text('Mark All Read'),
            ),
        ],
      ),
      body: notifications.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none,
                      size: 60, color: Colors.grey[300]),
                  const SizedBox(height: 12),
                  const Text('No notifications yet',
                      style: TextStyle(color: Colors.grey, fontSize: 16)),
                  const SizedBox(height: 4),
                  Text(
                    "You'll be notified about listings in your zone and categories",
                    style: TextStyle(color: Colors.grey[400], fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.only(bottom: 16),
              itemCount: notifications.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final notif = notifications[i];
                final color = _getIconColor(notif.type);
                final isActionable = _isActionable(notif);

                Widget? groupHeader;
                final groupLabel = _dateGroupLabel(notif.createdAt);
                if (i == 0 ||
                    _dateGroupLabel(notifications[i - 1].createdAt) !=
                        groupLabel) {
                  groupHeader = Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Text(
                      groupLabel,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[500],
                        letterSpacing: 0.5,
                      ),
                    ),
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (groupHeader != null) groupHeader,
                    InkWell(
                      onTap: () => _onNotificationTap(context, ref, notif),
                      child: Container(
                        color: notif.isRead
                            ? null
                            : Colors.green.withOpacity(0.04),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: color.withOpacity(0.1),
                              child: Icon(_getIcon(notif.type),
                                  color: color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          notif.title,
                                          style: TextStyle(
                                            fontWeight: notif.isRead
                                                ? FontWeight.w500
                                                : FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      if (!notif.isRead)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: Color(0xFF16A34A),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    notif.body,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: color.withOpacity(0.1),
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                        child: Text(
                                          _typeLabel(notif.type),
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: color,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        _timeAgo(notif.createdAt),
                                        style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey[400]),
                                      ),
                                      const Spacer(),
                                      if (isActionable)
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              'View',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: color,
                                              ),
                                            ),
                                            const SizedBox(width: 2),
                                            Icon(Icons.chevron_right,
                                                size: 16, color: color),
                                          ],
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }
}
