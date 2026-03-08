import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/transaction.model.dart';

class NegotiationScreen extends ConsumerStatefulWidget {
  final String transactionId;
  const NegotiationScreen({super.key, required this.transactionId});

  @override
  ConsumerState<NegotiationScreen> createState() => _NegotiationScreenState();
}

class _NegotiationScreenState extends ConsumerState<NegotiationScreen> {
  final _offerCtrl = TextEditingController();
  bool _loading = false;
  late TransactionModel _transaction;
  final List<_OfferEntry> _offerHistory = [];
  bool _dealFinalized = false;

  @override
  void initState() {
    super.initState();
    _transaction = MockData.transactions.firstWhere(
      (t) => t.id == widget.transactionId,
      orElse: () => MockData.transactions.first,
    );
    // Seed offer history
    _offerHistory.addAll([
      _OfferEntry(
        who: 'Buyer',
        price: _transaction.offeredPricePkr,
        time: _transaction.createdAt,
        status: _OfferStatus.countered,
      ),
      if (_transaction.status == TransactionStatus.finalized &&
          _transaction.finalPricePkr != null)
        _OfferEntry(
          who: 'Seller',
          price: _transaction.finalPricePkr!,
          time: _transaction.createdAt.add(const Duration(hours: 1)),
          status: _OfferStatus.accepted,
        ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final listing = MockData.listings.firstWhere(
      (l) => l.id == _transaction.listingId,
      orElse: () => MockData.listings.first,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Negotiation')),
      body: Column(
        children: [
          // Listing summary card
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.green[200]!),
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: listing.images.isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(listing.images.first,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) =>
                                  const Icon(Icons.inventory_2, color: Colors.grey)))
                      : const Icon(Icons.inventory_2, color: Colors.grey),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(listing.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 4),
                      Text(
                          '${listing.quantity} ${listing.unit} · ₨ ${listing.pricePkr}/${listing.unit}',
                          style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                      const SizedBox(height: 2),
                      Text('Seller: ${listing.sellerName}',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Current offer display
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: _dealFinalized
                    ? [Colors.green[600]!, Colors.green[400]!]
                    : [Colors.orange[600]!, Colors.amber[400]!],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(
                  _dealFinalized ? 'DEAL FINALIZED' : 'CURRENT OFFER',
                  style: const TextStyle(
                      color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  '₨ ${_offerHistory.last.price}/${_transaction.unit}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Total: ₨ ${(_offerHistory.last.price * _transaction.quantity).toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}',
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Offer history
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                const SizedBox(height: 8),
                const Text('Offer History',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                ..._offerHistory.map((entry) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: entry.status == _OfferStatus.accepted
                            ? Colors.green[50]
                            : entry.status == _OfferStatus.rejected
                                ? Colors.red[50]
                                : Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: entry.status == _OfferStatus.accepted
                              ? Colors.green[200]!
                              : entry.status == _OfferStatus.rejected
                                  ? Colors.red[200]!
                                  : Colors.grey[200]!,
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: entry.who == 'Buyer'
                                ? Colors.blue[100]
                                : Colors.orange[100],
                            child: Text(entry.who[0],
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: entry.who == 'Buyer'
                                        ? Colors.blue[800]
                                        : Colors.orange[800])),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(entry.who,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600, fontSize: 13)),
                                Text(
                                    '₨ ${entry.price}/${_transaction.unit}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                          ),
                          _offerStatusChip(entry.status),
                        ],
                      ),
                    )),

                // Chat section (mini)
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Quick Chat',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    TextButton.icon(
                      onPressed: () =>
                          context.push('/chat/${_transaction.buyerName.toLowerCase().replaceAll(' ', '-')}'),
                      icon: const Icon(Icons.open_in_new, size: 16),
                      label: const Text('Full Chat'),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      _chatBubble('I can do ₨${_transaction.offeredPricePkr}/kg', false),
                      _chatBubble('What about ₨${(_transaction.offeredPricePkr + 20)}/kg?', true),
                      if (_transaction.finalPricePkr != null)
                        _chatBubble('Deal at ₨${_transaction.finalPricePkr}/kg! 🤝', false),
                    ],
                  ),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _dealFinalized
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: ElevatedButton.icon(
                  onPressed: () => context.push(
                      '/transactions/${_transaction.id}/bond'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  icon: const Icon(Icons.description),
                  label: const Text('View Digital Bond',
                      style: TextStyle(fontSize: 16)),
                ),
              ),
            )
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Counter offer input
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _offerCtrl,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: 'Your price per ${_transaction.unit}',
                              prefixText: '₨ ',
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12)),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 12),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _loading ? null : _makeOffer,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 14),
                          ),
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.white))
                              : const Text('Offer'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Accept / Reject / Finalize
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _rejectOffer,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.close, size: 18),
                            label: const Text('Reject'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _acceptOffer,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.check, size: 18),
                            label: const Text('Accept'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _finalizeDeal,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.deepPurple,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.handshake, size: 18),
                            label: const Text('Finalize'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Future<void> _makeOffer() async {
    final price = int.tryParse(_offerCtrl.text.trim());
    if (price == null || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid price'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _loading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _offerHistory.add(_OfferEntry(
        who: 'You',
        price: price,
        time: DateTime.now(),
        status: _OfferStatus.pending,
      ));
      _offerCtrl.clear();
      _loading = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Offer of ₨$price/${_transaction.unit} sent!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  void _acceptOffer() {
    setState(() {
      if (_offerHistory.isNotEmpty) {
        _offerHistory.last = _OfferEntry(
          who: _offerHistory.last.who,
          price: _offerHistory.last.price,
          time: _offerHistory.last.time,
          status: _OfferStatus.accepted,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Offer accepted! ✅'), backgroundColor: Colors.green),
    );
  }

  void _rejectOffer() {
    setState(() {
      if (_offerHistory.isNotEmpty) {
        _offerHistory.last = _OfferEntry(
          who: _offerHistory.last.who,
          price: _offerHistory.last.price,
          time: _offerHistory.last.time,
          status: _OfferStatus.rejected,
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content: Text('Offer rejected'), backgroundColor: Colors.red),
    );
  }

  void _finalizeDeal() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.handshake, color: Colors.green),
            SizedBox(width: 8),
            Text('Finalize Deal'),
          ],
        ),
        content: Text(
            'Finalize at ₨${_offerHistory.last.price}/${_transaction.unit} for ${_transaction.quantity} ${_transaction.unit}?\n\nTotal: ₨${(_offerHistory.last.price * _transaction.quantity).toInt()}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() => _dealFinalized = true);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Deal finalized! 🎉 Digital bond generated.'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Confirm & Finalize'),
          ),
        ],
      ),
    );
  }

  Widget _chatBubble(String text, bool isMe) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isMe ? Colors.green[100] : Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(text, style: const TextStyle(fontSize: 13)),
      ),
    );
  }

  Widget _offerStatusChip(_OfferStatus status) {
    Color color;
    String label;
    switch (status) {
      case _OfferStatus.pending:
        color = Colors.orange;
        label = 'PENDING';
        break;
      case _OfferStatus.accepted:
        color = Colors.green;
        label = 'ACCEPTED';
        break;
      case _OfferStatus.rejected:
        color = Colors.red;
        label = 'REJECTED';
        break;
      case _OfferStatus.countered:
        color = Colors.blue;
        label = 'COUNTERED';
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  @override
  void dispose() {
    _offerCtrl.dispose();
    super.dispose();
  }
}

enum _OfferStatus { pending, accepted, rejected, countered }

class _OfferEntry {
  final String who;
  final int price;
  final DateTime time;
  final _OfferStatus status;

  _OfferEntry({
    required this.who,
    required this.price,
    required this.time,
    required this.status,
  });
}
