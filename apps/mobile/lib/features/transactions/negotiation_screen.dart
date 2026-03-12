import 'package:flutter/material.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData. All data from GET /v1/transactions/:id. Offers via POST /v1/transactions/:id/offers.

class NegotiationScreen extends StatefulWidget {
  final String transactionId;
  const NegotiationScreen({super.key, required this.transactionId});

  @override
  State<NegotiationScreen> createState() => _NegotiationScreenState();
}

class _NegotiationScreenState extends State<NegotiationScreen> {
  final ApiService _api = ApiService();
  final _offerCtrl = TextEditingController();
  final _msgCtrl   = TextEditingController();

  Map<String, dynamic>? _transaction;
  List<Map<String, dynamic>> _offers = [];
  bool _loading    = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchTransaction();
  }

  @override
  void dispose() {
    _offerCtrl.dispose();
    _msgCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchTransaction() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await _api.get('transactions/${widget.transactionId}');
      final tx = (response['transaction'] ?? response) as Map<String, dynamic>;
      setState(() {
        _transaction = tx;
        _offers = ((tx['offers'] ?? []) as List<dynamic>).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiException ? (e as ApiException).displayMessage : e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _makeOffer() async {
    final priceText = _offerCtrl.text.trim();
    if (priceText.isEmpty) return;
    final price = double.tryParse(priceText);
    if (price == null || price <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid price'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await _api.post('transactions/${widget.transactionId}/offers', {
        'price':   (price * 100).round(),
        'message': _msgCtrl.text.trim(),
      });
      _offerCtrl.clear();
      _msgCtrl.clear();
      await _fetchTransaction();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? (e as ApiException).displayMessage : e.toString()),
            backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _respondToOffer(String offerId, String action) async {
    try {
      await _api.patch(
        'transactions/${widget.transactionId}/offers/$offerId/$action', {});
      await _fetchTransaction();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? (e as ApiException).displayMessage : e.toString()),
            backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Negotiation')),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _fetchTransaction, child: const Text('Retry')),
        ])),
      );
    }

    final tx      = _transaction!;
    final listing = tx['listing'] as Map<String, dynamic>?;
    final status  = tx['status']  as String? ?? 'pending';

    final canMakeOffer = status == 'pending' || status == 'negotiating';

    return Scaffold(
      appBar: AppBar(
        title: Text(listing?['title'] as String? ?? 'Negotiation'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Status', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(status.toUpperCase(),
                          style: TextStyle(color: Colors.green.shade700,
                              fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ]),
                ),
                if (tx['agreedPrice'] != null)
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('Agreed Price',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    Text(
                      'PKR ${((tx['agreedPrice'] as int) / 100).toStringAsFixed(0)}',
                      style: const TextStyle(color: Colors.green,
                          fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ]),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _offers.isEmpty
                ? const Center(
                    child: Text('No offers yet. Make the first offer below.',
                        style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _offers.length,
                    itemBuilder: (ctx, i) {
                      final offer  = _offers[i];
                      final price  = offer['price'] as int? ?? 0;
                      final oStatus = offer['status'] as String? ?? 'pending';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('PKR ${(price / 100).toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 18,
                                        fontWeight: FontWeight.bold, color: Colors.green)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: _offerStatusColor(oStatus).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(oStatus.toUpperCase(),
                                      style: TextStyle(fontSize: 10,
                                          color: _offerStatusColor(oStatus),
                                          fontWeight: FontWeight.w600)),
                                ),
                              ],
                            ),
                            if (offer['message'] != null &&
                                (offer['message'] as String).isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(offer['message'] as String,
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                            ],
                            if (oStatus == 'pending' && offer['canRespond'] == true) ...[
                              const SizedBox(height: 10),
                              Row(children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: () => _respondToOffer(offer['id'], 'reject'),
                                    style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Colors.red),
                                        foregroundColor: Colors.red),
                                    child: const Text('Reject'),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: () => _respondToOffer(offer['id'], 'accept'),
                                    style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.green),
                                    child: const Text('Accept'),
                                  ),
                                ),
                              ]),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
          ),

          if (canMakeOffer)
            Container(
              color: Colors.white,
              padding: EdgeInsets.only(
                left: 16, right: 16, top: 12,
                bottom: MediaQuery.of(context).viewInsets.bottom + 12,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(children: [
                    Expanded(
                      child: TextField(
                        controller: _offerCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: 'Your price (PKR)',
                          prefixText: 'PKR ',
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _submitting ? null : _makeOffer,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _submitting
                          ? const SizedBox(width: 18, height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Offer'),
                    ),
                  ]),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _msgCtrl,
                    decoration: InputDecoration(
                      hintText: 'Message (optional)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _offerStatusColor(String status) {
    switch (status) {
      case 'accepted': return Colors.green;
      case 'rejected': return Colors.red;
      case 'countered': return Colors.orange;
      case 'expired': return Colors.grey;
      default: return Colors.blue;
    }
  }
}
