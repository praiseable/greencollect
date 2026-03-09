/// Chat state and sync. Used by both **Pro** (Kabariya Pro) and **Customer** (Kabariya) app builds;
/// no variant-specific logic — same code path for both.
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/chat_message.model.dart';
import '../mock/mock_data.dart';
import 'auth.provider.dart';
import '../../services/chat_db_service.dart';

const _uuid = Uuid();

/// Enable verbose chat module debug logs (provider, send, sync).
const bool kChatProviderDebug = true;

void _log(String msg, [Object? detail]) {
  if (kChatProviderDebug) {
    if (detail != null) {
      debugPrint('[ChatProvider] $msg $detail');
    } else {
      debugPrint('[ChatProvider] $msg');
    }
  }
}

/// State for a single chat room
class ChatRoomState {
  final String roomId;
  final List<ChatMessageModel> messages;
  final bool isLoading;
  final bool isSyncing;
  final String? error;

  const ChatRoomState({
    required this.roomId,
    this.messages = const [],
    this.isLoading = false,
    this.isSyncing = false,
    this.error,
  });

  ChatRoomState copyWith({
    List<ChatMessageModel>? messages,
    bool? isLoading,
    bool? isSyncing,
    String? error,
  }) {
    return ChatRoomState(
      roomId: roomId,
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isSyncing: isSyncing ?? this.isSyncing,
      error: error,
    );
  }
}

/// Provider family — one notifier per room
final chatRoomProvider = StateNotifierProvider.family<ChatRoomNotifier, ChatRoomState, String>(
  (ref, roomId) => ChatRoomNotifier(roomId, ref),
);

/// Chat sync service provider (singleton)
final chatSyncServiceProvider = Provider<ChatSyncService>((ref) {
  return ChatSyncService();
});

/// Helper to check connectivity safely
Future<bool> _checkOnline() async {
  try {
    final result = await Connectivity().checkConnectivity();
    // connectivity_plus 5.x can return List<ConnectivityResult> or ConnectivityResult
    if (result is List) {
      final list = result as List;
      return list.isNotEmpty && !list.contains(ConnectivityResult.none);
    }
    return result != ConnectivityResult.none;
  } catch (e) {
    debugPrint('[Chat] Connectivity check failed: $e');
    return false;
  }
}

/// Manages chat state for a single room, with local-first persistence
class ChatRoomNotifier extends StateNotifier<ChatRoomState> {
  final String roomId;
  final Ref _ref;
  final ChatDbService _chatDb = ChatDbService();
  bool _dbAvailable = true;

  ChatRoomNotifier(this.roomId, this._ref) : super(ChatRoomState(roomId: roomId)) {
    _log('ChatRoomNotifier created', 'roomId=$roomId');
    _loadFromLocal();
  }

  /// 1. Load messages from local SQLite
  Future<void> _loadFromLocal() async {
    _log('_loadFromLocal start', 'roomId=$roomId');
    state = state.copyWith(isLoading: true, error: null);
    try {
      List<ChatMessageModel> messages = await _chatDb.getMessages(roomId);
      _log('_loadFromLocal got messages', 'count=${messages.length}');

      // If no local messages, seed with mock data for this room (both participants so both see room in inbox)
      if (messages.isEmpty) {
        _log('_loadFromLocal seeding mock data');
        await _seedMockMessages();
        messages = await _chatDb.getMessages(roomId);
        _log('_loadFromLocal seeded', 'count=${messages.length}');
      }

      // Set isMe from current user so each user sees correct alignment (requires auth in ref)
      final currentUserId = _ref.read(authProvider)?.id;
      if (currentUserId != null && messages.isNotEmpty) {
        messages = messages.map((m) => m.copyWith(isMe: m.fromUserId == currentUserId)).toList();
      }

      if (mounted) {
        state = state.copyWith(messages: messages, isLoading: false);
      }

      _syncWithServer();
    } catch (e, st) {
      _log('_loadFromLocal ERROR', e);
      debugPrint('[Chat] Stack trace: $st');
      _dbAvailable = false;
      if (mounted) {
        state = state.copyWith(
          messages: _getInMemoryMockMessages(),
          isLoading: false,
          error: null,
        );
      }
    }
  }

  /// Get participant user ids for this room so both see it in their inbox.
  List<String> _getRoomParticipantIds() {
    if (!roomId.startsWith('chat_')) return ['u1', 'u2'];
    final digits = roomId.replaceFirst('chat_', '');
    final userId1 = MockData.getUserIdForPhoneDigits(digits);
    if (userId1 == null) return ['u1', 'u2'];
    final userId2 = userId1 == 'u1' ? 'u2' : 'u1';
    return [userId1, userId2];
  }

  /// Get in-memory mock messages (fallback when DB not available). Uses real user ids so both participants see room.
  List<ChatMessageModel> _getInMemoryMockMessages() {
    final ids = _getRoomParticipantIds();
    final a = ids[0], b = ids[1];
    return [
      ChatMessageModel(
        id: _uuid.v4(),
        roomId: roomId,
        fromUserId: b,
        toUserId: a,
        message: "Hi, I'm interested in your listing.",
        status: MessageStatus.sent,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 30)),
        syncedAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 30)),
        isMe: false,
      ),
      ChatMessageModel(
        id: _uuid.v4(),
        roomId: roomId,
        fromUserId: a,
        toUserId: b,
        message: "Great! I can share more details.",
        status: MessageStatus.sent,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 29)),
        syncedAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 29)),
        isMe: false,
      ),
      ChatMessageModel(
        id: _uuid.v4(),
        roomId: roomId,
        fromUserId: b,
        toUserId: a,
        message: "Can you do a better price?",
        status: MessageStatus.sent,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 27)),
        syncedAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 27)),
        isMe: false,
      ),
      ChatMessageModel(
        id: _uuid.v4(),
        roomId: roomId,
        fromUserId: a,
        toUserId: b,
        message: "Sure, we can negotiate.",
        status: MessageStatus.sent,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 25)),
        syncedAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 25)),
        isMe: false,
      ),
      ChatMessageModel(
        id: _uuid.v4(),
        roomId: roomId,
        fromUserId: b,
        toUserId: a,
        message: "Deal! I'll arrange pickup.",
        status: MessageStatus.sent,
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 23)),
        syncedAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 23)),
        isMe: false,
      ),
    ];
  }

  /// Seed the local DB with mock messages for the room (uses real u1/u2 so both users see room in inbox).
  Future<void> _seedMockMessages() async {
    final mockMessages = _getInMemoryMockMessages();
    await _chatDb.insertMessages(mockMessages);
  }

  /// 2. Send a new message — save locally first, then sync
  Future<void> sendMessage({
    required String text,
    required String fromUserId,
    required String toUserId,
  }) async {
    _log('sendMessage', 'from=$fromUserId to=$toUserId text=${text.length} chars');
    final msg = ChatMessageModel(
      id: _uuid.v4(),
      roomId: roomId,
      fromUserId: fromUserId,
      toUserId: toUserId,
      message: text,
      status: MessageStatus.pending,
      createdAt: DateTime.now(),
      isMe: true,
    );
    _log('sendMessage created msg', 'id=${msg.id}');

    try {
      if (_dbAvailable) {
        await _chatDb.insertMessage(msg);
        _log('sendMessage saved to DB');
      } else {
        _log('sendMessage DB not available, skip persist');
      }
    } catch (e) {
      _log('sendMessage FAILED to save locally', e);
    }

    state = state.copyWith(messages: [...state.messages, msg]);
    _log('sendMessage UI updated', 'total messages=${state.messages.length}');

    await _trySendToServer(msg);
  }

  /// 3. Try to send a single message to the server
  Future<void> _trySendToServer(ChatMessageModel msg) async {
    _log('_trySendToServer', 'msgId=${msg.id}');
    try {
      final isOnline = await _checkOnline();
      _log('_trySendToServer connectivity', 'isOnline=$isOnline');
      if (!isOnline) return;

      await Future.delayed(const Duration(milliseconds: 300));
      final now = DateTime.now();

      try {
        if (_dbAvailable) {
          await _chatDb.updateMessageStatus(msg.id, MessageStatus.sent, syncedAt: now);
          _log('_trySendToServer status updated to sent');
        }
      } catch (e) {
        _log('_trySendToServer FAILED update status', e);
      }

      if (mounted) {
        final updated = state.messages.map((m) {
          if (m.id == msg.id) return m.copyWith(status: MessageStatus.sent, syncedAt: now);
          return m;
        }).toList();
        state = state.copyWith(messages: updated);
        _log('_trySendToServer UI state updated to sent');
      }

      _log('_trySendToServer scheduling auto-reply in 2s');
      Future.delayed(const Duration(seconds: 2), () async {
        if (!mounted) return;
        final reply = ChatMessageModel(
          id: _uuid.v4(),
          roomId: roomId,
          fromUserId: msg.toUserId,
          toUserId: msg.fromUserId,
          message: "Thanks for the message! I'll get back to you shortly.",
          status: MessageStatus.sent,
          createdAt: DateTime.now(),
          syncedAt: DateTime.now(),
          isMe: false,
        );
        try {
          if (_dbAvailable) {
            await _chatDb.insertMessage(reply);
          }
        } catch (e) {
          debugPrint('[Chat] Failed to save reply in DB: $e');
        }
        if (mounted) {
          state = state.copyWith(messages: [...state.messages, reply]);
          _log('_trySendToServer auto-reply added to state');
        }
      });
    } catch (e) {
      _log('_trySendToServer FAILED', e);
      try {
        if (_dbAvailable) {
          await _chatDb.updateMessageStatus(msg.id, MessageStatus.failed);
        }
      } catch (_) {}
      if (mounted) {
        final updated = state.messages.map((m) {
          if (m.id == msg.id) return m.copyWith(status: MessageStatus.failed);
          return m;
        }).toList();
        state = state.copyWith(messages: updated);
      }
    }
  }

  /// 4. Background sync — send unsent messages and fetch new ones from server
  Future<void> _syncWithServer() async {
    _log('_syncWithServer start');
    try {
      final isOnline = await _checkOnline();
      if (!isOnline || !_dbAvailable) {
        _log('_syncWithServer skip', 'isOnline=$isOnline dbAvailable=$_dbAvailable');
        return;
      }

      if (mounted) state = state.copyWith(isSyncing: true);

      final unsent = await _chatDb.getUnsentMessages();
      _log('_syncWithServer unsent count', unsent.length);
      for (final msg in unsent) {
        if (msg.roomId == roomId) {
          await _trySendToServer(msg);
        }
      }

      if (mounted) state = state.copyWith(isSyncing: false);
      _log('_syncWithServer done');
    } catch (e) {
      _log('_syncWithServer ERROR', e);
      if (mounted) state = state.copyWith(isSyncing: false);
    }
  }

  /// 5. Retry a specific failed message
  Future<void> retryMessage(String messageId) async {
    final msg = state.messages.where((m) => m.id == messageId).firstOrNull;
    if (msg != null && msg.status == MessageStatus.failed) {
      try {
        if (_dbAvailable) {
          await _chatDb.updateMessageStatus(messageId, MessageStatus.pending);
        }
      } catch (_) {}
      final updated = state.messages.map((m) {
        if (m.id == messageId) return m.copyWith(status: MessageStatus.pending);
        return m;
      }).toList();
      state = state.copyWith(messages: updated);

      await _trySendToServer(msg.copyWith(status: MessageStatus.pending));
    }
  }

  /// 6. Manual refresh
  Future<void> refresh() async {
    await _loadFromLocal();
  }
}

/// Background sync service — retries unsent messages when connectivity changes
class ChatSyncService {
  StreamSubscription? _connectivitySub;
  final ChatDbService _chatDb = ChatDbService();
  bool _isRunning = false;

  /// Start listening for connectivity changes
  void startListening() {
    try {
      _connectivitySub?.cancel();
      _connectivitySub = Connectivity().onConnectivityChanged.listen((result) {
        bool isOnline = false;
        if (result is List) {
          final list = result as List;
          isOnline = list.isNotEmpty && !list.contains(ConnectivityResult.none);
        } else {
          isOnline = result != ConnectivityResult.none;
        }
        if (isOnline) {
          _syncUnsentMessages();
        }
      });
      debugPrint('[Chat] Sync service started listening');
    } catch (e) {
      debugPrint('[Chat] Failed to start sync service: $e');
    }
  }

  /// Stop listening
  void stopListening() {
    _connectivitySub?.cancel();
    _connectivitySub = null;
  }

  /// Sync all unsent messages across all rooms
  Future<void> _syncUnsentMessages() async {
    if (_isRunning) return;
    _isRunning = true;

    try {
      final unsent = await _chatDb.getUnsentMessages();
      for (final msg in unsent) {
        try {
          // In production, this would be an API call
          await Future.delayed(const Duration(milliseconds: 200));
          await _chatDb.updateMessageStatus(
            msg.id,
            MessageStatus.sent,
            syncedAt: DateTime.now(),
          );
          debugPrint('[Chat] Synced message ${msg.id}');
        } catch (e) {
          debugPrint('[Chat] Failed to sync message ${msg.id}: $e');
          try {
            await _chatDb.updateMessageStatus(msg.id, MessageStatus.failed);
          } catch (_) {}
        }
      }
    } catch (e) {
      debugPrint('[Chat] Sync error: $e');
    } finally {
      _isRunning = false;
    }
  }
}
