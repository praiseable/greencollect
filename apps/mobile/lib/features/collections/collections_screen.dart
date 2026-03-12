import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';
import 'collection_detail_screen.dart';

/// Collections list: GET /v1/collections. Accept job = PATCH status to ACCEPTED.

class CollectionsScreen extends StatefulWidget {
  const CollectionsScreen({super.key});

  @override
  State<CollectionsScreen> createState() => _CollectionsScreenState();
}

class _CollectionsScreenState extends State<CollectionsScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _collections = [];
  bool _loading = true;
  String? _error;
  String? _statusFilter;

  final _statusOptions = ['All', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COLLECTED', 'DELIVERED_TO_CENTER'];

  @override
  void initState() {
    super.initState();
    _fetchCollections();
  }

  Future<void> _fetchCollections() async {
    setState(() { _loading = true; _error = null; });
    try {
      final params = <String, String>{'page': '1', 'limit': '30'};
      if (_statusFilter != null && _statusFilter != 'All') params['status'] = _statusFilter!;

      final response = await _api.get('collections', queryParams: params);
      final List<dynamic> raw =
          (response['collections'] ?? response['data'] ?? response) as List<dynamic>;
      setState(() {
        _collections = raw.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiException ? (e as ApiException).displayMessage : e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _acceptJob(String jobId) async {
    try {
      await _api.patch('collections/$jobId/status', {'status': 'ACCEPTED'});
      await _fetchCollections();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Job accepted'), backgroundColor: Colors.green));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? (e as ApiException).displayMessage : e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  Color _statusColor(String? s) {
    if (s == null) return Colors.grey;
    final u = s.toUpperCase();
    switch (u) {
      case 'ASSIGNED': return Colors.orange;
      case 'ACCEPTED': return Colors.blue;
      case 'EN_ROUTE': return Colors.indigo;
      case 'ARRIVED': return Colors.teal;
      case 'COLLECTED': return Colors.green;
      case 'DELIVERED_TO_CENTER': return Colors.green.shade800;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collections'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 44,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              itemCount: _statusOptions.length,
              itemBuilder: (ctx, i) {
                final s = _statusOptions[i];
                final isSelected = (_statusFilter ?? 'All') == s;
                return GestureDetector(
                  onTap: () {
                    setState(() => _statusFilter = s == 'All' ? null : s);
                    _fetchCollections();
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.green : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    alignment: Alignment.center,
                    child: Text(s,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontSize: 12, fontWeight: FontWeight.w500,
                        )),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                        const SizedBox(height: 12),
                        Text(_error!, style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 12),
                        ElevatedButton(onPressed: _fetchCollections, child: const Text('Retry')),
                      ]))
                    : _collections.isEmpty
                        ? const Center(child: Text('No collection jobs.',
                            style: TextStyle(color: Colors.grey)))
                        : RefreshIndicator(
                            onRefresh: _fetchCollections,
                            child: ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _collections.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (ctx, i) {
                                final job = _collections[i];
                                final listing = job['listing'] as Map<String, dynamic>?;
                                final status = job['status'] as String? ?? '';
                                final deadlineAt = job['deadlineAt'];
                                final isOverdue = deadlineAt != null && DateTime.now().isAfter(DateTime.tryParse(deadlineAt.toString()) ?? DateTime.now()) && !['COLLECTED', 'DELIVERED_TO_CENTER', 'CANCELLED'].contains(status);

                                return GestureDetector(
                                  onTap: () => context.push('/collections/${job['id']}'),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: isOverdue ? Border.all(color: Colors.red.shade300) : null,
                                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 6, offset: const Offset(0, 2))],
                                    ),
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                listing?['title'] as String? ?? job['listingId']?.toString() ?? 'Collection',
                                                style: const TextStyle(fontWeight: FontWeight.w600),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: _statusColor(status).withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                              child: Text(status.replaceAll('_', ' '),
                                                  style: TextStyle(fontSize: 10, color: _statusColor(status), fontWeight: FontWeight.w600)),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        if (job['cityName'] != null || listing?['cityName'] != null)
                                          Text('📍 ${job['cityName'] ?? listing?['cityName'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                                        if (deadlineAt != null) ...[
                                          const SizedBox(height: 4),
                                          Text('⏰ Deadline: ${_formatDate(deadlineAt)}', style: TextStyle(color: isOverdue ? Colors.red : Colors.orange, fontSize: 12)),
                                        ],
                                        if (status == 'ASSIGNED') ...[
                                          const SizedBox(height: 10),
                                          SizedBox(
                                            width: double.infinity,
                                            child: ElevatedButton(
                                              onPressed: () => _acceptJob(job['id'] as String),
                                              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                              child: const Text('Accept Job'),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  String _formatDate(dynamic dateStr) {
    try {
      final dt = DateTime.parse(dateStr.toString());
      return '${dt.day}/${dt.month} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) { return dateStr.toString(); }
  }
}
