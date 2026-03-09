/// Message delivery status
enum MessageStatus {
  pending,   // Saved locally, not yet sent
  sent,      // Sent to server successfully
  delivered, // Server confirmed delivery to recipient
  read,      // Recipient has read the message
  failed,    // Failed to send to server
}

/// A single chat message — stored both locally (SQLite) and on the server
class ChatMessageModel {
  final String id;             // UUID — generated locally
  final String roomId;         // Conversation/room identifier
  final String fromUserId;
  final String toUserId;
  final String message;
  final MessageStatus status;
  final DateTime createdAt;
  final DateTime? syncedAt;    // When synced to server (null = not yet synced)
  final bool isMe;             // Convenience flag for display

  const ChatMessageModel({
    required this.id,
    required this.roomId,
    required this.fromUserId,
    required this.toUserId,
    required this.message,
    this.status = MessageStatus.pending,
    required this.createdAt,
    this.syncedAt,
    this.isMe = false,
  });

  ChatMessageModel copyWith({
    MessageStatus? status,
    DateTime? syncedAt,
    bool? isMe,
  }) {
    return ChatMessageModel(
      id: id,
      roomId: roomId,
      fromUserId: fromUserId,
      toUserId: toUserId,
      message: message,
      status: status ?? this.status,
      createdAt: createdAt,
      syncedAt: syncedAt ?? this.syncedAt,
      isMe: isMe ?? this.isMe,
    );
  }

  /// Convert to SQLite row
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'roomId': roomId,
      'fromUserId': fromUserId,
      'toUserId': toUserId,
      'message': message,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'syncedAt': syncedAt?.toIso8601String(),
      'isMe': isMe ? 1 : 0,
    };
  }

  /// Create from SQLite row
  factory ChatMessageModel.fromMap(Map<String, dynamic> map) {
    return ChatMessageModel(
      id: map['id'] as String,
      roomId: map['roomId'] as String,
      fromUserId: map['fromUserId'] as String,
      toUserId: map['toUserId'] as String,
      message: map['message'] as String,
      status: MessageStatus.values.firstWhere(
        (s) => s.name == map['status'],
        orElse: () => MessageStatus.pending,
      ),
      createdAt: DateTime.parse(map['createdAt'] as String),
      syncedAt: map['syncedAt'] != null
          ? DateTime.parse(map['syncedAt'] as String)
          : null,
      isMe: (map['isMe'] as int?) == 1,
    );
  }

  /// Create from server JSON response
  factory ChatMessageModel.fromServerJson(
    Map<String, dynamic> json, {
    required String currentUserId,
    required String roomId,
  }) {
    final fromId = json['fromUserId'] as String? ?? '';
    return ChatMessageModel(
      id: json['id'] as String? ?? '',
      roomId: roomId,
      fromUserId: fromId,
      toUserId: json['toUserId'] as String? ?? '',
      message: json['message'] as String? ?? json['content'] as String? ?? '',
      status: MessageStatus.sent,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      syncedAt: DateTime.now(),
      isMe: fromId == currentUserId,
    );
  }
}
