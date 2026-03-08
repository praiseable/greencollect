import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ChatScreen extends ConsumerStatefulWidget {
  final String roomId;
  const ChatScreen({super.key, required this.roomId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();

  final List<_ChatMessage> _messages = [
    _ChatMessage(
      text: 'Hi, I\'m interested in your Copper Wire Scrap listing.',
      isMe: false,
      senderName: 'Bilal Traders',
      time: '2:30 PM',
    ),
    _ChatMessage(
      text: 'Great! It\'s 200kg of 99% pure copper wire from a factory.',
      isMe: true,
      senderName: 'You',
      time: '2:31 PM',
    ),
    _ChatMessage(
      text: null,
      isMe: false,
      senderName: 'Bilal Traders',
      time: '2:33 PM',
      isOffer: true,
      offerPrice: 820,
      offerUnit: 'kg',
    ),
    _ChatMessage(
      text: 'Can you do ₨840/kg? That\'s a fair price for this quality.',
      isMe: true,
      senderName: 'You',
      time: '2:35 PM',
    ),
    _ChatMessage(
      text: 'Deal! ₨840/kg for 200kg. I\'ll arrange pickup tomorrow.',
      isMe: false,
      senderName: 'Bilal Traders',
      time: '2:37 PM',
    ),
  ];

  void _sendMessage() {
    if (_controller.text.trim().isEmpty) return;

    setState(() {
      _messages.add(_ChatMessage(
        text: _controller.text.trim(),
        isMe: true,
        senderName: 'You',
        time: _formatTime(DateTime.now()),
      ));
    });
    _controller.clear();

    // Simulate reply
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _messages.add(_ChatMessage(
            text: 'Thanks for the message! I\'ll get back to you shortly.',
            isMe: false,
            senderName: 'Bilal Traders',
            time: _formatTime(DateTime.now()),
          ));
        });
        _scrollToBottom();
      }
    });

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
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final ap = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ap';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Colors.blue[100],
              child: Text('B', style: TextStyle(color: Colors.blue[800], fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Bilal Traders', style: TextStyle(fontSize: 16)),
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.green),
                    ),
                    const SizedBox(width: 4),
                    Text('Online', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Calling Bilal Traders...')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Deal context card
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.green[50],
            child: Row(
              children: [
                const Icon(Icons.inventory_2, size: 20, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Copper Wire Scrap',
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('200 kg • ₨ 850/kg',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('NEGOTIATING',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange[800])),
                ),
              ],
            ),
          ),

          // Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final msg = _messages[i];
                if (msg.isOffer) {
                  return _OfferCard(msg: msg);
                }
                return _MessageBubble(msg: msg);
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
                        const SnackBar(content: Text('Image sharing coming soon')),
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
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFF16A34A),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.white, size: 20),
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

class _ChatMessage {
  final String? text;
  final bool isMe;
  final String senderName;
  final String time;
  final bool isOffer;
  final int? offerPrice;
  final String? offerUnit;

  const _ChatMessage({
    this.text,
    required this.isMe,
    required this.senderName,
    required this.time,
    this.isOffer = false,
    this.offerPrice,
    this.offerUnit,
  });
}

class _MessageBubble extends StatelessWidget {
  final _ChatMessage msg;
  const _MessageBubble({required this.msg});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: msg.isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: msg.isMe ? const Color(0xFF16A34A) : Colors.grey[200],
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: msg.isMe ? const Radius.circular(16) : Radius.zero,
            bottomRight: msg.isMe ? Radius.zero : const Radius.circular(16),
          ),
        ),
        child: Column(
          crossAxisAlignment: msg.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              msg.text!,
              style: TextStyle(
                color: msg.isMe ? Colors.white : Colors.black87,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              msg.time,
              style: TextStyle(
                fontSize: 10,
                color: msg.isMe ? Colors.white60 : Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OfferCard extends StatelessWidget {
  final _ChatMessage msg;
  const _OfferCard({required this.msg});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.orange[300]!),
        borderRadius: BorderRadius.circular(12),
        color: Colors.orange[50],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.local_offer, color: Colors.orange, size: 20),
              const SizedBox(width: 8),
              Text('${msg.senderName} made an offer',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '₨ ${msg.offerPrice}/${msg.offerUnit}',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.orange[800]),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Offer rejected'), backgroundColor: Colors.red),
                    );
                  },
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  child: const Text('Reject'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Offer accepted! 🤝'), backgroundColor: Colors.green),
                    );
                  },
                  child: const Text('Accept'),
                ),
              ),
            ],
          ),
          Text(msg.time, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
        ],
      ),
    );
  }
}
