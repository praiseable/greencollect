import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import 'negotiation_screen.dart';

// ✅ FIX: Removed MockData.transactions. Now calls GET /v1/transactions from real backend.

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();

  late TabController _tabController;
  final List<String> _tabs = ['All', 'Active', 'Completed', 'Cancelled'];
  final List<String?> _statuses = [null, 'pending,negotiating,finalized', 'completed', 'cancelled'];

  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;
  String? _error;
  int _currentTab = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() => _currentTab = _tabController.index);
        _fetchTransactions();
      }
    });
    _fetchTransactions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchTransactions() async {
    setState(() { _loading = true; _error = null; });
    try {
      final params = <String, String>{'page': '1', 'limit': '30'};
      final status = _statuses[_currentTab];
      if (status != null) params['status'] = status;

      final response = await _api.get('transactions', queryParams: params);
      final List<dynamic> raw =
          (response['transactions'] ?? response['data'] ?? response) as List<dynamic>;
      setState(() {
        _transactions = raw.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().contains('Exception:')
            ? e.toString().split('Exception:').last.trim()
            : 'Failed to load transactions.';
        _loading = false;
      });
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending':      return Colors.orange;
      case 'negotiating':  return Colors.blue;
      case 'finalized':    return Colors.green;
      case 'completed':    return Colors.teal;
      case 'cancelled':    return Colors.red;
      case 'disputed':     return Colors.deepOrange;
      default:             return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.green,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.green,
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                      const SizedBox(height: 12),
                      Text(_error!, style: const TextStyle(color: Colors.grey)),
                      const SizedBox(height: 12),
                      ElevatedButton(
                          onPressed: _fetchTransactions, child: const Text('Retry')),
                    ],
                  ),
                )
              : _transactions.isEmpty
                  ? const Center(
                      child: Text('No transactions found.',
                          style: TextStyle(color: Colors.grey)))
                  : RefreshIndicator(
                      onRefresh: _fetchTransactions,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _transactions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final tx      = _transactions[i];
                          final listing = tx['listing'] as Map<String, dynamic>?;
                          final buyer   = tx['buyer']   as Map<String, dynamic>?;
                          final seller  = tx['seller']  as Map<String, dynamic>?;
                          final status  = tx['status']  as String? ?? 'pending';

                          final priceDisplay = tx['agreedPrice'] != null
                              ? 'PKR ${((tx['agreedPrice'] as int) / 100).toStringAsFixed(0)}'
                              : listing?['priceFormatted'] as String? ?? '—';

                          return GestureDetector(
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => NegotiationScreen(transactionId: tx['id'] as String),
                              ),
                            ),
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withOpacity(0.05),
                                      blurRadius: 8, offset: const Offset(0, 2)),
                                ],
                              ),
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      width: 60, height: 60,
                                      color: Colors.grey.shade200,
                                      child: listing?['images'] != null &&
                                              (listing!['images'] as List).isNotEmpty
                                          ? Image.network(
                                              (listing['images'] as List)[0]['url'] ?? '',
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  const Icon(Icons.image, color: Colors.grey),
                                            )
                                          : const Icon(Icons.inventory_2_outlined,
                                              color: Colors.grey),
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(listing?['title'] as String? ?? 'Listing',
                                            style: const TextStyle(fontWeight: FontWeight.w600),
                                            maxLines: 1, overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 2),
                                        Text(priceDisplay,
                                            style: const TextStyle(
                                                color: Colors.green,
                                                fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Row(children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: _statusColor(status).withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(status.toUpperCase(),
                                                style: TextStyle(
                                                    fontSize: 10,
                                                    color: _statusColor(status),
                                                    fontWeight: FontWeight.w600)),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            new DateTime.now().difference(
                                              DateTime.parse(tx['createdAt'] as String? ??
                                                  DateTime.now().toIso8601String())
                                            ).inDays == 0 ? 'Today'
                                              : '${DateTime.now().difference(DateTime.parse(tx['createdAt'] as String)).inDays}d ago',
                                            style: const TextStyle(
                                                fontSize: 11, color: Colors.grey),
                                          ),
                                        ]),
                                      ],
                                    ),
                                  ),
                                  const Icon(Icons.chevron_right, color: Colors.grey),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
