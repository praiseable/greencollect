import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/transaction.model.dart';

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Transactions'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Active'),
              Tab(text: 'Completed'),
              Tab(text: 'Cancelled'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _TransactionList(
              transactions: MockData.transactions
                  .where((t) =>
                      t.status == TransactionStatus.negotiating ||
                      t.status == TransactionStatus.finalized)
                  .toList(),
              emptyMessage: 'No active transactions',
            ),
            _TransactionList(
              transactions: MockData.transactions
                  .where((t) => t.status == TransactionStatus.completed)
                  .toList(),
              emptyMessage: 'No completed transactions yet',
            ),
            _TransactionList(
              transactions: MockData.transactions
                  .where((t) => t.status == TransactionStatus.cancelled)
                  .toList(),
              emptyMessage: 'No cancelled transactions',
            ),
          ],
        ),
      ),
    );
  }
}

class _TransactionList extends StatelessWidget {
  final List<TransactionModel> transactions;
  final String emptyMessage;

  const _TransactionList({
    required this.transactions,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    if (transactions.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long_outlined, size: 60, color: Colors.grey[300]),
            const SizedBox(height: 12),
            Text(emptyMessage, style: TextStyle(color: Colors.grey[500], fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: transactions.length,
      itemBuilder: (_, i) => _TransactionCard(transaction: transactions[i]),
    );
  }
}

class _TransactionCard extends StatelessWidget {
  final TransactionModel transaction;
  const _TransactionCard({required this.transaction});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                Expanded(
                  child: Text(
                    transaction.listingTitle,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _statusChip(transaction.status),
              ],
            ),
            const SizedBox(height: 12),

            // Buyer / Seller
            Row(
              children: [
                Icon(Icons.person_outline, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text('Buyer: ${transaction.buyerName}',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600])),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.store, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text('Seller: ${transaction.sellerName}',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600])),
              ],
            ),
            const SizedBox(height: 12),

            // Price info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Offered', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                      Text('₨ ${transaction.offeredPricePkr}/${transaction.unit}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  if (transaction.finalPricePkr != null) ...[
                    const Icon(Icons.arrow_forward, size: 16, color: Colors.grey),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Final', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                        Text('₨ ${transaction.finalPricePkr}/${transaction.unit}',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green[700])),
                      ],
                    ),
                  ],
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Total', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                      Text('₨ ${_formatAmount(transaction.totalPkr)}',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.green[800])),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Quantity + Date
            Row(
              children: [
                Icon(Icons.scale, size: 14, color: Colors.grey[400]),
                const SizedBox(width: 4),
                Text('${transaction.quantity} ${transaction.unit}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                const Spacer(),
                Icon(Icons.access_time, size: 14, color: Colors.grey[400]),
                const SizedBox(width: 4),
                Text(_timeAgo(transaction.createdAt),
                    style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              ],
            ),
            const SizedBox(height: 12),

            // Action buttons
            Row(
              children: [
                if (transaction.status == TransactionStatus.negotiating) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.push('/chat/${transaction.id}');
                      },
                      icon: const Icon(Icons.message, size: 16),
                      label: const Text('Chat'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        context.push('/transactions/${transaction.id}/negotiate');
                      },
                      icon: const Icon(Icons.handshake, size: 16),
                      label: const Text('Negotiate'),
                    ),
                  ),
                ],
                if (transaction.status == TransactionStatus.finalized) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        context.push('/transactions/${transaction.id}/negotiate');
                      },
                      icon: const Icon(Icons.history, size: 16),
                      label: const Text('Details'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        context.push('/transactions/${transaction.id}/bond');
                      },
                      icon: const Icon(Icons.description, size: 16),
                      label: const Text('View Bond'),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusChip(TransactionStatus status) {
    Color bg;
    Color fg;
    String label;
    switch (status) {
      case TransactionStatus.negotiating:
        bg = Colors.orange[50]!;
        fg = Colors.orange[800]!;
        label = 'NEGOTIATING';
      case TransactionStatus.finalized:
        bg = Colors.green[50]!;
        fg = Colors.green[800]!;
        label = 'FINALIZED';
      case TransactionStatus.completed:
        bg = Colors.blue[50]!;
        fg = Colors.blue[800]!;
        label = 'COMPLETED';
      case TransactionStatus.cancelled:
        bg = Colors.red[50]!;
        fg = Colors.red[800]!;
        label = 'CANCELLED';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg)),
    );
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  String _formatAmount(int amount) {
    if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(amount % 1000 == 0 ? 0 : 1)}K';
    }
    return amount.toString();
  }
}
