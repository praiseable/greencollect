import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/transaction.model.dart';

class BondViewerScreen extends ConsumerWidget {
  final String transactionId;
  const BondViewerScreen({super.key, required this.transactionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transaction = MockData.transactions.firstWhere(
      (t) => t.id == transactionId,
      orElse: () => MockData.transactions.first,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Bond'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Sharing bond PDF...')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Bond PDF downloaded ✓'),
                  backgroundColor: Colors.green,
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Bond header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.green[800]!, Colors.green[600]!],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Icon(Icons.verified, color: Colors.white, size: 48),
                  const SizedBox(height: 12),
                  const Text(
                    'DIGITAL TRADE BOND',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'ڈیجیٹل تجارتی بانڈ',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Bond #${transaction.id.toUpperCase()}-${DateTime.now().year}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Transaction details
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Transaction Details',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const Text('لین دین کی تفصیلات',
                        style: TextStyle(fontSize: 13, color: Colors.grey)),
                    const SizedBox(height: 16),
                    _bondRow('Item / آئٹم', transaction.listingTitle),
                    _bondRow('Quantity / مقدار',
                        '${transaction.quantity} ${transaction.unit}'),
                    _bondRow('Final Price / حتمی قیمت',
                        '₨ ${transaction.finalPricePkr ?? transaction.offeredPricePkr}/${transaction.unit}'),
                    _bondRow('Total Amount / کل رقم',
                        '₨ ${_formatCurrency(transaction.totalPkr)}'),
                    const Divider(height: 24),
                    _bondRow('Status / حالت', 'FINALIZED ✓'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Parties
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Parties / فریقین',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    _partyCard('Seller / بیچنے والا', transaction.sellerName,
                        Icons.store, Colors.orange),
                    const SizedBox(height: 8),
                    _partyCard('Buyer / خریدار', transaction.buyerName,
                        Icons.person, Colors.blue),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Terms
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Terms & Conditions',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const Text('شرائط و ضوابط',
                        style: TextStyle(fontSize: 13, color: Colors.grey)),
                    const SizedBox(height: 12),
                    _termItem('1. Payment to be made within 48 hours of deal finalization.'),
                    _termItem('2. Material pickup/delivery within 7 working days.'),
                    _termItem('3. Quality must match listing description and photos.'),
                    _termItem('4. Disputes to be resolved via Kabariya mediation.'),
                    _termItem('5. Both parties agree to the final negotiated price.'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Signatures
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Digital Signatures',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            children: [
                              const Icon(Icons.draw,
                                  color: Colors.green, size: 32),
                              const SizedBox(height: 4),
                              Text(transaction.sellerName,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600),
                                  textAlign: TextAlign.center),
                              const Text('Seller',
                                  style: TextStyle(
                                      color: Colors.grey, fontSize: 12)),
                              const SizedBox(height: 4),
                              const Icon(Icons.check_circle,
                                  color: Colors.green, size: 18),
                            ],
                          ),
                        ),
                        Container(
                            width: 1, height: 60, color: Colors.grey[300]),
                        Expanded(
                          child: Column(
                            children: [
                              const Icon(Icons.draw,
                                  color: Colors.green, size: 32),
                              const SizedBox(height: 4),
                              Text(transaction.buyerName,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600),
                                  textAlign: TextAlign.center),
                              const Text('Buyer',
                                  style: TextStyle(
                                      color: Colors.grey, fontSize: 12)),
                              const SizedBox(height: 4),
                              const Icon(Icons.check_circle,
                                  color: Colors.green, size: 18),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Footer
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    'Generated by Kabariya',
                    style: TextStyle(
                        color: Colors.grey[600], fontWeight: FontWeight.w600),
                  ),
                  Text(
                    'Date: ${DateTime.now().toString().substring(0, 10)}',
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This is a legally binding digital trade bond.',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _bondRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Text(value,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _partyCard(String role, String name, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withOpacity(0.1),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(role,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12)),
              Text(name,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 15)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _termItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline,
              size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }

  String _formatCurrency(int amount) {
    return amount.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
  }
}
