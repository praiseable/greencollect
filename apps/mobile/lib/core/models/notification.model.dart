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

  /// Normalize backend enum (e.g. NEW_LISTING, CHAT_MESSAGE) to app type (new_listing, chat_message) for routing.
  static String _normalizeType(String? raw) {
    if (raw == null || raw.isEmpty) return NotificationType.system;
    final lower = raw.toLowerCase();
    // Handle both underscore and camelCase formats from backend
    if (lower == 'new_listing' || lower == 'newlisting') return NotificationType.newListing;
    if (lower == 'offer_received' || lower == 'offerreceived') return NotificationType.offerReceived;
    if (lower == 'offer_accepted' || lower == 'offeraccepted') return NotificationType.offerAccepted;
    if (lower == 'offer_rejected' || lower == 'offerrejected') return NotificationType.offerRejected;
    if (lower == 'payment_received' || lower == 'paymentreceived') return NotificationType.paymentReceived;
    if (lower == 'payment_sent' || lower == 'paymentsent') return NotificationType.paymentSent;
    if (lower == 'escalation') return NotificationType.escalation;
    if (lower == 'subscription_expiring' || lower == 'subscriptionexpiring') return NotificationType.subscriptionExpiring;
    if (lower == 'subscription_expired' || lower == 'subscriptionexpired') return NotificationType.subscriptionExpired;
    if (lower == 'system') return NotificationType.system;
    if (lower == 'chat_message' || lower == 'chatmessage') return NotificationType.chatMessage;
    if (lower == 'price_alert' || lower == 'pricealert') return NotificationType.priceAlert;
    if (lower == 'kyc_update' || lower == 'kycupdate') return NotificationType.kycUpdate;
    if (lower == 'deal_finalized' || lower == 'dealfinalized') return NotificationType.dealFinalized;
    return raw;
  }
  
  /// Public method for normalizing notification types (used by NotificationsProvider)
  static String normalizeType(String? raw) {
    return _normalizeType(raw);
  }

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
      type: _normalizeType(json['type'] as String?),
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
