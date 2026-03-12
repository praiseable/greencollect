import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/chat.provider.dart';
import '../../core/providers/app_providers.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.getUserIdForPhoneDigits and MockData.getDisplayNameForPhoneDigits.
//          User names and IDs come from the conversation data returned by the real API.

class ChatScreen extends ConsumerStatefulWidget {
  final String otherUserId;
  const ChatScreen({super.key, required this.otherUserId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _msgCtrl     = TextEditingController();
  final _scrollCtrl  = ScrollController();
  final ApiService   _api = ApiService();

  Map<String, dynamic>? _otherUser;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final myId = ref.read(authChangeNotifierProvider).user?.id;
      ref.read(chatProvider).setCurrentUserId(myId);
      if (widget.otherUserId.isNotEmpty) {
        _loadOtherUser();
        ref.read(chatProvider).openChat(widget.otherUserId);
      }
    });
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOtherUser() async {
    try {
      final response = await _api.get('users/${widget.otherUserId}');
      setState(() {
        _otherUser = (response['user'] ?? response) as Map<String, dynamic>;
      });
    } catch (e) {
      debugPrint('loadOtherUser error: $e');
    }
  }

  String get _otherUserName {
    if (_otherUser == null) return 'User';
    final first = _otherUser!['firstName'] as String? ?? '';
    final last  = _otherUser!['lastName']  as String? ?? '';
    final name  = '$first $last'.trim();
    return name.isEmpty
        ? _otherUser!['displayName'] as String? ?? 'User'
        : name;
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _msgCtrl.clear();
    ref.read(chatProvider).sendMessage(widget.otherUserId, text);
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.otherUserId.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chat'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.person_off_outlined, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text(
                  'Unable to start chat. Seller information is missing.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 16),
                ),
                const SizedBox(height: 24),
                TextButton.icon(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Go back'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final myId = ref.watch(authChangeNotifierProvider).user?.id ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(_otherUserName),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer(
              builder: (ctx, ref, _) {
                final chat = ref.watch(chatProvider);
                final messages = chat.currentMessages;

                if (chat.loading && messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (messages.isEmpty) {
                  return const Center(
                    child: Text('No messages yet. Say hello! 👋',
                        style: TextStyle(color: Colors.grey)),
                  );
                }

                return ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(12),
                  itemCount: messages.length,
                  itemBuilder: (ctx, i) {
                    final msg  = messages[i];
                    final isMe = msg.fromUserId == myId;

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 3),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.72,
                        ),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.green : Colors.white,
                          borderRadius: BorderRadius.only(
                            topLeft:     const Radius.circular(16),
                            topRight:    const Radius.circular(16),
                            bottomLeft:  Radius.circular(isMe ? 16 : 4),
                            bottomRight: Radius.circular(isMe ? 4 : 16),
                          ),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06),
                              blurRadius: 4, offset: const Offset(0, 1))],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(msg.message,
                                style: TextStyle(
                                    color: isMe ? Colors.white : Colors.black87,
                                    fontSize: 14)),
                            const SizedBox(height: 3),
                            Text(
                              _formatTime(msg.createdAt),
                              style: TextStyle(
                                  fontSize: 10,
                                  color: isMe
                                      ? Colors.white.withOpacity(0.7)
                                      : Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),

          Container(
            color: Colors.white,
            padding: EdgeInsets.only(
              left: 12, right: 12, top: 8,
              bottom: MediaQuery.of(context).viewInsets.bottom + 8,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgCtrl,
                    textCapitalization: TextCapitalization.sentences,
                    onSubmitted: (_) => _sendMessage(),
                    decoration: InputDecoration(
                      hintText: 'Type a message…',
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: _sendMessage,
                  child: Container(
                    width: 44, height: 44,
                    decoration: const BoxDecoration(
                      color: Colors.green, shape: BoxShape.circle),
                    child: const Icon(Icons.send, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}
