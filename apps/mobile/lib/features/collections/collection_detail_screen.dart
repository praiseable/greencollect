import 'package:flutter/material.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.collections. Now calls GET /v1/collections/:id from real backend.

class CollectionDetailScreen extends StatefulWidget {
  final String collectionId;
  const CollectionDetailScreen({super.key, required this.collectionId});

  @override
  State<CollectionDetailScreen> createState() => _CollectionDetailScreenState();
}

class _CollectionDetailScreenState extends State<CollectionDetailScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _collection;
  bool _loading    = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchCollection();
  }

  Future<void> _fetchCollection() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await _api.get('collections/${widget.collectionId}');
      setState(() {
        _collection = (response['collection'] ?? response) as Map<String, dynamic>;
        _loading    = false;
      });
    } catch (e) {
      setState(() {
        _error   = e.toString().split('Exception:').last.trim();
        _loading = false;
      });
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _submitting = true);
    try {
      await _api.patch('collections/${widget.collectionId}/status',
          {'status': newStatus});
      await _fetchCollection();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status updated to $newStatus'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().split('Exception:').last.trim()),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  String? _nextStatus(String? current) {
    const flow = ['accepted', 'en_route', 'arrived', 'collected', 'delivered'];
    final idx = flow.indexOf(current ?? '');
    if (idx < 0 || idx >= flow.length - 1) return null;
    return flow[idx + 1];
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Collection Detail')),
        body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: _fetchCollection, child: const Text('Retry')),
        ])),
      );
    }

    final job     = _collection!;
    final tx      = job['transaction'] as Map<String, dynamic>?;
    final listing = tx?['listing']    as Map<String, dynamic>?;
    final seller  = tx?['seller']     as Map<String, dynamic>?;
    final status  = job['status']     as String? ?? '';
    final next    = _nextStatus(status);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Collection Detail'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05),
                  blurRadius: 6, offset: const Offset(0, 2))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  const Text('Status', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(status.toUpperCase(),
                        style: TextStyle(color: Colors.green.shade700,
                            fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ]),
                if (job['slaDeadline'] != null) ...[
                  const SizedBox(height: 8),
                  Text('⏰ SLA Deadline: ${job['slaDeadline']}',
                      style: const TextStyle(color: Colors.orange, fontSize: 13)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),

          if (listing != null)
            _InfoCard('Listing', [
              _InfoRow('Title', listing['title'] as String? ?? '—'),
              _InfoRow('Category', listing['category']?['name'] as String? ?? '—'),
              _InfoRow('Quantity',
                  '${listing['quantity'] ?? '—'} ${listing['unit']?['symbol'] ?? ''}'),
              _InfoRow('Location',
                  '${listing['cityName'] ?? ''} ${listing['address'] ?? ''}'),
            ]),
          const SizedBox(height: 12),

          if (seller != null)
            _InfoCard('Seller', [
              _InfoRow('Name',
                  '${seller['firstName'] ?? ''} ${seller['lastName'] ?? ''}'.trim().isEmpty
                      ? seller['displayName'] as String? ?? '—'
                      : '${seller['firstName']} ${seller['lastName']}'),
              if (seller['phone'] != null) _InfoRow('Phone', seller['phone'] as String),
            ]),
          const SizedBox(height: 12),

          _InfoCard('Weight', [
            _InfoRow('Listed', '${job['listedWeight'] ?? '—'} kg'),
            _InfoRow('Actual', '${job['actualWeight'] ?? 'Not recorded'} kg'),
            if (job['weightDiscrepancyFlagged'] == true)
              const _InfoRow('⚠️ Weight discrepancy flagged', '', isWarning: true),
          ]),
          const SizedBox(height: 24),

          if (next != null)
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _submitting ? null : () => _updateStatus(next),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _submitting
                    ? const SizedBox(width: 22, height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text('Mark as ${next.replaceAll('_', ' ').toUpperCase()}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> rows;
  const _InfoCard(this.title, this.rows);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05),
            blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 10),
        ...rows,
      ]),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isWarning;
  const _InfoRow(this.label, this.value, {this.isWarning = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: isWarning ? Colors.orange : Colors.grey,
                  fontSize: 13)),
          if (value.isNotEmpty)
            Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.w500,
                    color: isWarning ? Colors.orange : Colors.black87,
                    fontSize: 13)),
        ],
      ),
    );
  }
}
