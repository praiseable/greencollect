/// Chat conversation UI. Runs for both **Pro** and **Customer** app types; no variant gating.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/chat.provider.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/models/chat_message.model.dart';
import '../../core/mock/mock_data.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String roomId;
  const ChatScreen({super.key, required this.roomId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  static const bool _kChatScreenDebug = true;

  @override
  void initState() {
    super.initState();
    if (_kChatScreenDebug) {
      debugPrint('[ChatScreen] initState roomId=${widget.roomId}');
    }
  }

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) {
      if (_kChatScreenDebug) debugPrint('[ChatScreen] _sendMessage skipped: empty text');
      return;
    }

    final user = ref.read(authProvider);
    if (user == null) {
      if (_kChatScreenDebug) debugPrint('[ChatScreen] _sendMessage skipped: no user');
      return;
    }

    final phoneDigits = widget.roomId.startsWith('chat_')
        ? widget.roomId.replaceFirst('chat_', '')
        : '';
    final toUserId = phoneDigits.isNotEmpty
        ? (MockData.getUserIdForPhoneDigits(phoneDigits) ?? 'unknown')
        : 'unknown';
    if (_kChatScreenDebug) {
      debugPrint('[ChatScreen] _sendMessage from=${user.id} to=$toUserId room=${widget.roomId}');
    }
    ref.read(chatRoomProvider(widget.roomId).notifier).sendMessage(
      text: _controller.text.trim(),
      fromUserId: user.id,
      toUserId: toUserId,
    );

    _controller.clear();
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final m = dt.minute.toString().padLeft(2, '0');
    final ap = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ap';
  }

  @override
  Widget build(BuildContext context) {
    if (_kChatScreenDebug) {
      debugPrint('[ChatScreen] build() roomId=${widget.roomId}');
    }

    // Validate roomId
    if (widget.roomId.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chat')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Invalid chat room ID'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    final ChatRoomState chatState;
    try {
      chatState = ref.watch(chatRoomProvider(widget.roomId));
    } catch (e, stackTrace) {
      debugPrint('[ChatScreen] ERROR watching provider: $e');
      debugPrint('[ChatScreen] Stack trace: $stackTrace');
      return Scaffold(
        appBar: AppBar(title: const Text('Chat')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Failed to load chat: $e'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      );
    }

    final messages = chatState.messages;

    // Auto-scroll when messages change
    if (messages.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
    }

    final otherPartyPhone = widget.roomId.startsWith('chat_')
        ? widget.roomId.replaceFirst('chat_', '')
        : '';
    final otherPartyName = otherPartyPhone.isNotEmpty
        ? MockData.getDisplayNameForPhoneDigits(otherPartyPhone)
        : 'Chat';
    final otherInitial = otherPartyName.isNotEmpty
        ? otherPartyName.substring(0, 1).toUpperCase()
        : '?';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Colors.blue[100],
              child: Text(otherInitial,
                  style: TextStyle(
                      color: Colors.blue[800], fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(otherPartyName, style: const TextStyle(fontSize: 16)),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                          shape: BoxShape.circle, color: Colors.green),
                    ),
                    const SizedBox(width: 4),
                    Text('Online',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey[600])),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (chatState.isSyncing)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.call),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Calling $otherPartyName...')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Deal context card (listing inquiry with this contact)
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.green[50],
            child: Row(
              children: [
                const Icon(Icons.inventory_2,
                    size: 20, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Chat with $otherPartyName',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('Listing inquiry',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Error message
          if (chatState.error != null)
            Container(
              padding: const EdgeInsets.all(8),
              color: Colors.red[50],
              child: Row(
                children: [
                  Icon(Icons.warning, color: Colors.red[400], size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      chatState.error!,
                      style: TextStyle(fontSize: 12, color: Colors.red[700]),
                    ),
                  ),
                  TextButton(
                    onPressed: () => ref.read(chatRoomProvider(widget.roomId).notifier).refresh(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),

          // Loading indicator
          if (chatState.isLoading)
            const LinearProgressIndicator(minHeight: 2),

          // Messages
          Expanded(
            child: chatState.isLoading && messages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat_bubble_outline,
                                size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 8),
                            Text('No messages yet',
                                style: TextStyle(color: Colors.grey[500])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (_, i) {
                          final msg = messages[i];
                          return _MessageBubble(
                            msg: msg,
                            onRetry: msg.status == MessageStatus.failed
                                ? () => ref
                                    .read(chatRoomProvider(widget.roomId).notifier)
                                    .retryMessage(msg.id)
                                : null,
                          );
                        },
                      ),
          ),

          // Input bar
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('Image sharing coming soon')),
                      );
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        filled: true,
                        fillColor: Colors.grey[100],
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF16A34A),
                    child: IconButton(
                      icon: const Icon(Icons.send,
                          color: Colors.white, size: 20),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessageModel msg;
  final VoidCallback? onRetry;
  const _MessageBubble({required this.msg, this.onRetry});

  Widget _statusIcon(MessageStatus status) {
    switch (status) {
      case MessageStatus.pending:
        return const Icon(Icons.schedule, size: 12, color: Colors.white60);
      case MessageStatus.sent:
        return const Icon(Icons.done, size: 12, color: Colors.white70);
      case MessageStatus.delivered:
        return const Icon(Icons.done_all, size: 12, color: Colors.white70);
      case MessageStatus.read:
        return Icon(Icons.done_all, size: 12, color: Colors.blue[200]);
      case MessageStatus.failed:
        return const Icon(Icons.error_outline, size: 12, color: Colors.red);
    }
  }

  Widget _statusIconGrey(MessageStatus status) {
    switch (status) {
      case MessageStatus.pending:
        return Icon(Icons.schedule, size: 12, color: Colors.grey[400]);
      case MessageStatus.sent:
        return Icon(Icons.done, size: 12, color: Colors.grey[400]);
      case MessageStatus.delivered:
        return Icon(Icons.done_all, size: 12, color: Colors.grey[400]);
      case MessageStatus.read:
        return Icon(Icons.done_all, size: 12, color: Colors.blue[400]);
      case MessageStatus.failed:
        return const Icon(Icons.error_outline, size: 12, color: Colors.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMe = msg.isMe;
    final h = msg.createdAt.hour > 12
        ? msg.createdAt.hour - 12
        : (msg.createdAt.hour == 0 ? 12 : msg.createdAt.hour);
    final m = msg.createdAt.minute.toString().padLeft(2, '0');
    final ap = msg.createdAt.hour >= 12 ? 'PM' : 'AM';
    final timeStr = '$h:$m $ap';

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onTap: msg.status == MessageStatus.failed ? onRetry : null,
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75),
          decoration: BoxDecoration(
            color: msg.status == MessageStatus.failed
                ? Colors.red[50]
                : (isMe ? const Color(0xFF16A34A) : Colors.grey[200]),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft:
                  isMe ? const Radius.circular(16) : Radius.zero,
              bottomRight:
                  isMe ? Radius.zero : const Radius.circular(16),
            ),
            border: msg.status == MessageStatus.failed
                ? Border.all(color: Colors.red[200]!)
                : null,
          ),
          child: Column(
            crossAxisAlignment:
                isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              Text(
                msg.message,
                style: TextStyle(
                  color: msg.status == MessageStatus.failed
                      ? Colors.red[900]
                      : (isMe ? Colors.white : Colors.black87),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    timeStr,
                    style: TextStyle(
                      fontSize: 10,
                      color: msg.status == MessageStatus.failed
                          ? Colors.red[300]
                          : (isMe ? Colors.white60 : Colors.grey[500]),
                    ),
                  ),
                  if (isMe) ...[
                    const SizedBox(width: 4),
                    isMe && msg.status != MessageStatus.failed
                        ? _statusIcon(msg.status)
                        : _statusIconGrey(msg.status),
                  ],
                  if (msg.status == MessageStatus.failed) ...[
                    const SizedBox(width: 6),
                    Text(
                      'Tap to retry',
                      style: TextStyle(fontSize: 10, color: Colors.red[400]),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
