/// Notification types matching backend NotificationType enum
class NotificationType {
  static const String newListing = 'new_listing';
  static const String offerReceived = 'offer_received';
  static const String offerAccepted = 'offer_accepted';
  static const String offerRejected = 'offer_rejected';
  static const String paymentReceived = 'payment_received';
  static const String paymentSent = 'payment_sent';
  static const String escalation = 'escalation';
  static const String subscriptionExpiring = 'subscription_expiring';
  static const String subscriptionExpired = 'subscription_expired';
  static const String system = 'system';
  static const String chatMessage = 'chat_message';
  static const String priceAlert = 'price_alert';
  static const String kycUpdate = 'kyc_update';
  static const String dealFinalized = 'deal_finalized';
}

class NotificationModel {
  final String id;
  final String title;
  final String titleUr;
  final String body;
  final String bodyUr;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  /// Routing payload — carries IDs needed to navigate on tap.
  /// Keys used:  listingId, transactionId, chatRoomId, etc.
  final Map<String, String> data;

  NotificationModel({
    required this.id,
    required this.title,
    required this.titleUr,
    required this.body,
    required this.bodyUr,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.data = const {},
  });

  /// Parse from API JSON (e.g. GET /v1/notifications)
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    final dataStr = <String, String>{};
    if (data != null) {
      for (final e in data.entries) {
        if (e.value != null) dataStr[e.key.toString()] = e.value.toString();
      }
    }
    return NotificationModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      titleUr: json['titleUr'] as String? ?? '',
      body: json['body'] as String? ?? '',
      bodyUr: json['bodyUr'] as String? ?? '',
      type: json['type'] as String? ?? NotificationType.system,
      isRead: (json['isRead'] as bool?) ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      data: dataStr,
    );
  }

  /// Copy with read status toggled
  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      title: title,
      titleUr: titleUr,
      body: body,
      bodyUr: bodyUr,
      type: type,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      data: data,
    );
  }
}
