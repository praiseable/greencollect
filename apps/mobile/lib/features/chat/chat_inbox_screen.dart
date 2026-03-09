/// Inbox listing conversations for the **current user**.
/// Only rooms where the logged-in user has sent or received a message are shown.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth.provider.dart';
import '../../services/chat_db_service.dart';
import '../../core/models/chat_message.model.dart';
import '../../core/mock/mock_data.dart';

class ChatInboxScreen extends ConsumerStatefulWidget {
  const ChatInboxScreen({super.key});

  @override
  ConsumerState<ChatInboxScreen> createState() => _ChatInboxScreenState();
}

class _ChatInboxScreenState extends ConsumerState<ChatInboxScreen> {
  final ChatDbService _chatDb = ChatDbService();
  List<String> _roomIds = [];
  Map<String, ChatMessageModel?> _latestByRoom = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInbox();
  }

  Future<void> _loadInbox() async {
    final user = ref.read(authProvider);
    if (user == null) {
      setState(() {
        _loading = false;
        _error = 'Please log in to see your chats';
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final roomIds = await _chatDb.getRoomIdsForUser(user.id);
      final latestByRoom = <String, ChatMessageModel?>{};
      for (final roomId in roomIds) {
        latestByRoom[roomId] = await _chatDb.getLatestMessage(roomId);
      }
      if (mounted) {
        setState(() {
          _roomIds = roomIds;
          _latestByRoom = latestByRoom;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = e.toString();
        });
      }
    }
  }

  /// Display name for the other party in this room (so each user sees the correct name).
  String _otherPartyDisplayName(String roomId) {
    if (roomId.startsWith('chat_')) {
      final digits = roomId.replaceFirst('chat_', '');
      return MockData.getDisplayNameForPhoneDigits(digits);
    }
    return roomId;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat Inbox'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _loadInbox,
          ),
        ],
      ),
      body: _buildBody(user),
    );
  }

  Widget _buildBody(dynamic user) {
    if (user == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.login, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Log in to see your conversations'),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/auth/login'),
              child: const Text('Log in'),
            ),
          ],
        ),
      );
    }

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: _loadInbox,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_roomIds.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No conversations yet',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Open a listing and tap Message to start a chat.\nIt will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadInbox,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _roomIds.length,
        itemBuilder: (context, index) {
          final roomId = _roomIds[index];
          final latest = _latestByRoom[roomId];
          final otherName = _otherPartyDisplayName(roomId);
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: Colors.green[100],
              child: Text(
                otherName.isNotEmpty ? otherName.substring(0, 1).toUpperCase() : '?',
                style: TextStyle(color: Colors.green[800]),
              ),
            ),
            title: Text(otherName),
            subtitle: latest != null
                ? Text(
                    latest.message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[600],
                      fontStyle: latest.isMe ? FontStyle.italic : null,
                    ),
                  )
                : null,
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/chat/$roomId'),
          );
        },
      ),
    );
  }
}
