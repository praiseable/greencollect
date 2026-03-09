/// Chat module tests.
///
/// The chat module runs for both app types: **Pro** (Kabariya Pro) and
/// **Customer** (Kabariya). There is no variant-specific logic in chat;
/// the same code path is used in both builds.
import 'package:flutter_test/flutter_test.dart';
import 'package:kabariya/core/models/chat_message.model.dart';

void main() {
  group('ChatMessageModel', () {
    test('toMap and fromMap round-trip', () {
      final msg = ChatMessageModel(
        id: 'test-id-1',
        roomId: 'room_123',
        fromUserId: 'user_a',
        toUserId: 'user_b',
        message: 'Hello',
        status: MessageStatus.pending,
        createdAt: DateTime.utc(2025, 3, 9, 12, 0, 0),
        syncedAt: null,
        isMe: true,
      );
      final map = msg.toMap();
      expect(map['id'], 'test-id-1');
      expect(map['roomId'], 'room_123');
      expect(map['message'], 'Hello');
      expect(map['status'], 'pending');
      expect(map['isMe'], 1);

      final restored = ChatMessageModel.fromMap(map);
      expect(restored.id, msg.id);
      expect(restored.roomId, msg.roomId);
      expect(restored.fromUserId, msg.fromUserId);
      expect(restored.toUserId, msg.toUserId);
      expect(restored.message, msg.message);
      expect(restored.status, msg.status);
      expect(restored.isMe, msg.isMe);
      expect(restored.createdAt.toIso8601String(), msg.createdAt.toIso8601String());
    });

    test('fromMap with sent status and syncedAt', () {
      final map = {
        'id': 'msg-2',
        'roomId': 'room_456',
        'fromUserId': 'u1',
        'toUserId': 'u2',
        'message': 'Hi there',
        'status': 'sent',
        'createdAt': '2025-03-09T12:00:00.000Z',
        'syncedAt': '2025-03-09T12:00:01.000Z',
        'isMe': 0,
      };
      final msg = ChatMessageModel.fromMap(map);
      expect(msg.status, MessageStatus.sent);
      expect(msg.syncedAt, isNotNull);
      expect(msg.isMe, false);
    });

    test('copyWith updates status and syncedAt', () {
      final msg = ChatMessageModel(
        id: 'id',
        roomId: 'room',
        fromUserId: 'a',
        toUserId: 'b',
        message: 'text',
        status: MessageStatus.pending,
        createdAt: DateTime.now(),
        isMe: true,
      );
      final updated = msg.copyWith(
        status: MessageStatus.sent,
        syncedAt: DateTime.utc(2025, 3, 9),
      );
      expect(updated.status, MessageStatus.sent);
      expect(updated.syncedAt, isNotNull);
      expect(updated.message, 'text');
    });

    test('copyWith isMe updates isMe', () {
      final msg = ChatMessageModel(
        id: '1',
        roomId: 'r',
        fromUserId: 'u1',
        toUserId: 'u2',
        message: 'hi',
        status: MessageStatus.sent,
        createdAt: DateTime.now(),
        isMe: false,
      );
      final updated = msg.copyWith(isMe: true);
      expect(updated.isMe, true);
      expect(msg.isMe, false);
    });

    test('fromServerJson builds model with isMe from currentUserId', () {
      final json = {
        'id': 'server-1',
        'fromUserId': 'alice',
        'toUserId': 'bob',
        'message': 'Hello Bob',
        'createdAt': '2025-03-09T10:00:00.000Z',
      };
      final asAlice = ChatMessageModel.fromServerJson(
        json,
        currentUserId: 'alice',
        roomId: 'room_ab',
      );
      expect(asAlice.isMe, true);
      expect(asAlice.fromUserId, 'alice');

      final asBob = ChatMessageModel.fromServerJson(
        json,
        currentUserId: 'bob',
        roomId: 'room_ab',
      );
      expect(asBob.isMe, false);
    });
  });
}
