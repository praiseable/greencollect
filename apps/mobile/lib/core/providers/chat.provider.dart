import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';
import '../models/chat_message.model.dart';

// ✅ FIX: Chat now uses:
//   - Real backend REST API for message history (GET /v1/chat/:userId)
//   - Socket.io for real-time message delivery (send-message / new-message events)
//   - Local SQLite (chat_db_service) is kept as a read-through CACHE only.

class ChatProvider extends ChangeNotifier {
  final ApiService     _api     = ApiService();
  final StorageService _storage = StorageService();

  io.Socket? _socket;

  // conversations list
  List<Map<String, dynamic>> _conversations = [];
  // messages keyed by otherUserId
  final Map<String, List<ChatMessageModel>> _messages = {};
  String? _currentChatUserId;
  String? _myUserId;
  bool _loading = false;
  String? _error;

  List<Map<String, dynamic>>    get conversations    => _conversations;
  List<ChatMessageModel>        get currentMessages  =>
      _messages[_currentChatUserId] ?? [];
  bool    get loading => _loading;
  String? get error   => _error;

  // ── Initialise socket connection ─────────────────────────────────────────
  Future<void> initSocket() async {
    final token = await _storage.getAccessToken();
    if (token == null) return;

    // Read the userId from stored user profile (don't overwrite if already set e.g. by setCurrentUserId)
    final user = await _storage.getUser();
    final storedId = user?['id']?.toString();
    if (storedId != null && storedId.isNotEmpty) _myUserId = storedId;

    // ✅ Connect to backend Socket.io server
    _socket = io.io(
      ApiConfig.effectiveSocketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );

    _socket!.connect();

    _socket!.on('connect', (_) {
      debugPrint('[ChatProvider] Socket connected');
      // Join personal room for notifications
      if (_myUserId != null) {
        _socket!.emit('join-room', _myUserId);
      }
    });

    // ✅ Receive new messages from backend
    _socket!.on('new-message', (data) {
      final msg = ChatMessageModel.fromJson(
        data as Map<String, dynamic>,
        currentUserId: _myUserId ?? '',
      );
      final otherId = msg.fromUserId == _myUserId ? msg.toUserId : msg.fromUserId;

      _messages[otherId] = [...(_messages[otherId] ?? []), msg];

      // Update conversation preview
      _updateConversationPreview(otherId, msg);

      notifyListeners();
    });

    _socket!.on('disconnect', (_) => debugPrint('[ChatProvider] Socket disconnected'));
    _socket!.on('error',      (e) => debugPrint('[ChatProvider] Socket error: $e'));
  }

  /// Ensure socket is connected (call once after login).
  Future<void> ensureSocket() async {
    if (_socket != null && _socket!.connected) return;
    await initSocket();
  }

  /// Set current user id when available from auth (e.g. admin from auth/me); fixes chat when storage user shape differs.
  void setCurrentUserId(String? userId) {
    if (userId != null && userId.isNotEmpty && _myUserId != userId) {
      _myUserId = userId;
      notifyListeners();
    }
  }

  // ── Fetch conversations list ─────────────────────────────────────────────
  Future<void> fetchConversations() async {
    await ensureSocket();
    _loading = true;
    _error   = null;
    notifyListeners();
    try {
      // ✅ Calls GET /v1/chat/conversations
      final response = await _api.get('chat/conversations');
      final List<dynamic> raw =
          (response['conversations'] ?? response['data'] ?? response) as List<dynamic>;
      _conversations = raw.cast<Map<String, dynamic>>();
    } catch (e) {
      _error = _parseError(e, 'Failed to load conversations');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Open a chat with a specific user ─────────────────────────────────────
  Future<void> openChat(String otherUserId) async {
    await ensureSocket();
    _currentChatUserId = otherUserId;

    // Join the chat room
    if (_myUserId != null) {
      _socket?.emit('join-chat', {
        'userId':      _myUserId,
        'otherUserId': otherUserId,
      });
    }

    if (_messages[otherUserId] == null) {
      await fetchMessages(otherUserId);
    }
    notifyListeners();
  }

  // ── Fetch message history ────────────────────────────────────────────────
  Future<void> fetchMessages(String otherUserId) async {
    _loading = true;
    notifyListeners();
    try {
      // ✅ Calls GET /v1/chat/:userId
      final response = await _api.get('chat/$otherUserId');
      final List<dynamic> raw =
          (response['messages'] ?? response['data'] ?? response) as List<dynamic>;
      _messages[otherUserId] =
          raw.map((e) => ChatMessageModel.fromJson(
                e as Map<String, dynamic>,
                currentUserId: _myUserId ?? '',
                roomId: otherUserId,
              )).toList();
    } catch (e) {
      _error = _parseError(e, 'Failed to load messages');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Send a message ───────────────────────────────────────────────────────
  Future<bool> sendMessage(String toUserId, String message) async {
    if (_myUserId == null) return false;

    // Optimistic UI — add message locally immediately
    final tempMsg = ChatMessageModel(
      id:         'temp_${DateTime.now().millisecondsSinceEpoch}',
      roomId:     toUserId,
      fromUserId: _myUserId!,
      toUserId:   toUserId,
      message:    message,
      createdAt:  DateTime.now(),
      isTemp:     true,
    );
    _messages[toUserId] = [...(_messages[toUserId] ?? []), tempMsg];
    notifyListeners();

    try {
      // ✅ Calls POST /v1/chat/:userId  { message }
      final response = await _api.post('chat/$toUserId', {'message': message});

      // Emit via socket for real-time delivery to recipient
      _socket?.emit('send-message', {
        'fromUserId': _myUserId,
        'toUserId':   toUserId,
        'message':    message,
      });

      // Replace temp message with real one from server (POST returns full message object at root)
      final msgMap = response is Map<String, dynamic> ? response : null;
      if (msgMap == null || msgMap['id'] == null) {
        notifyListeners();
        return true;
      }
      final savedMsg = ChatMessageModel.fromJson(
        msgMap,
        currentUserId: _myUserId!,
        roomId: toUserId,
      );
      _messages[toUserId] = (_messages[toUserId] ?? [])
          .where((m) => m.id != tempMsg.id)
          .toList()
        ..add(savedMsg);

      _updateConversationPreview(toUserId, savedMsg);
      notifyListeners();
      return true;
    } catch (e) {
      // Remove failed temp message
      _messages[toUserId] =
          (_messages[toUserId] ?? []).where((m) => m.id != tempMsg.id).toList();
      _error = _parseError(e, 'Failed to send message');
      notifyListeners();
      return false;
    }
  }

  void _updateConversationPreview(String otherId, ChatMessageModel msg) {
    final idx = _conversations.indexWhere(
      (c) => c['userId'] == otherId || c['otherUserId'] == otherId,
    );
    final preview = {'lastMessage': msg.message, 'updatedAt': msg.createdAt.toIso8601String()};
    if (idx >= 0) {
      _conversations[idx] = {..._conversations[idx], ...preview};
    }
  }

  void closeChat() {
    _currentChatUserId = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _socket?.disconnect();
    _socket?.dispose();
    super.dispose();
  }

  String _parseError(dynamic e, String fallback) {
    if (e is Map) return e['error']?['message'] ?? e['message'] ?? fallback;
    return e.toString().contains('Exception:')
        ? e.toString().split('Exception:').last.trim()
        : fallback;
  }
}
