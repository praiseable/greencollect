import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/chat.provider.dart';
import '../../core/providers/app_providers.dart';
import 'chat_screen.dart';

// ✅ FIX: Uses Riverpod (ref.watch(chatProvider)) and go_router for navigation.
//          Conversation data (name, last message, updatedAt) from GET /v1/chat/conversations.

class ChatInboxScreen extends ConsumerStatefulWidget {
  const ChatInboxScreen({super.key});

  @override
  ConsumerState<ChatInboxScreen> createState() => _ChatInboxScreenState();
}

class _ChatInboxScreenState extends ConsumerState<ChatInboxScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final myId = ref.read(authChangeNotifierProvider).user?.id;
      ref.read(chatProvider).setCurrentUserId(myId);
      ref.read(chatProvider).fetchConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _buildBody(chat),
    );
  }

  Widget _buildBody(ChatProvider chat) {
    if (chat.loading && chat.conversations.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (chat.error != null && chat.conversations.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(chat.error!, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => ref.read(chatProvider).fetchConversations(),
            child: const Text('Retry'),
          ),
        ]),
      );
    }

    if (chat.conversations.isEmpty) {
      return const Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text('No conversations yet',
              style: TextStyle(fontSize: 16, color: Colors.grey)),
          SizedBox(height: 8),
          Text('Browse listings and tap "Chat" to start a conversation',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 13)),
        ]),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(chatProvider).fetchConversations(),
      child: ListView.separated(
        itemCount: chat.conversations.length,
        separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
        itemBuilder: (ctx, i) {
          final conv = chat.conversations[i];

          final otherUserId   = conv['userId'] as String? ??
                                conv['otherUserId'] as String? ?? '';
          final otherUserName = conv['name']        as String? ??
                                conv['displayName']  as String? ??
                                conv['userName']     as String? ?? 'User';
          final lastMessage   = conv['lastMessage']  as String? ?? '';
          final updatedAt     = conv['updatedAt']    as String?;
          final unread        = conv['unreadCount']  as int? ?? 0;

          return ListTile(
            onTap: () => context.push('/chat/$otherUserId'),
            leading: CircleAvatar(
              backgroundColor: Colors.green.shade100,
              radius: 26,
              child: Text(
                otherUserName.isNotEmpty
                    ? otherUserName[0].toUpperCase()
                    : 'U',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade700,
                  fontSize: 18,
                ),
              ),
            ),
            title: Text(
              otherUserName,
              style: TextStyle(
                fontWeight: unread > 0 ? FontWeight.bold : FontWeight.normal,
              ),
            ),
            subtitle: Text(
              lastMessage,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: unread > 0 ? Colors.black87 : Colors.grey,
                fontWeight: unread > 0 ? FontWeight.w500 : FontWeight.normal,
              ),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (updatedAt != null)
                  Text(
                    _formatDate(updatedAt is String ? updatedAt : updatedAt.toString()),
                    style: TextStyle(
                        fontSize: 11,
                        color: unread > 0 ? Colors.green : Colors.grey),
                  ),
                if (unread > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: const BoxDecoration(
                      color: Colors.green, shape: BoxShape.circle),
                    child: Text('$unread',
                        style: const TextStyle(color: Colors.white, fontSize: 11)),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final dt  = DateTime.parse(isoDate).toLocal();
      final now = DateTime.now();
      if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
        return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      }
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }
}
