import 'package:flutter/material.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.ratingForDealer and MockData.collectionsForDealer.
//          Ratings from GET /v1/users/:id/rating-summary, collections from GET /v1/collections.

class DealerRatingScreen extends StatefulWidget {
  final String dealerId;
  const DealerRatingScreen({super.key, required this.dealerId});

  @override
  State<DealerRatingScreen> createState() => _DealerRatingScreenState();
}

class _DealerRatingScreenState extends State<DealerRatingScreen> {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _ratingSummary;
  List<Map<String, dynamic>> _ratings = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        _api.get('users/${widget.dealerId}/rating-summary'),
        _api.get('users/${widget.dealerId}/ratings', queryParams: {'page': '1', 'limit': '20'}),
      ]);

      setState(() {
        _ratingSummary = results[0] as Map<String, dynamic>;
        final raw = (results[1]['ratings'] ?? results[1]['data'] ?? results[1]) as List<dynamic>;
        _ratings    = raw.cast<Map<String, dynamic>>();
        _loading    = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiException ? (e as ApiException).displayMessage : e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dealer Ratings'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.star_border, size: 64, color: Colors.grey),
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
                ]))
              : RefreshIndicator(
                  onRefresh: _fetchData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06),
                              blurRadius: 8, offset: const Offset(0, 2))],
                        ),
                        child: Column(children: [
                          Text(
                            '${_ratingSummary?['averageStars'] ?? 0}',
                            style: const TextStyle(fontSize: 48,
                                fontWeight: FontWeight.bold, color: Colors.amber),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(5, (i) {
                              final avg = (_ratingSummary?['averageStars'] ?? 0) as num;
                              return Icon(
                                i < avg.round() ? Icons.star : Icons.star_border,
                                color: Colors.amber, size: 24,
                              );
                            }),
                          ),
                          const SizedBox(height: 4),
                          Text('${_ratingSummary?['totalCount'] ?? 0} reviews',
                              style: const TextStyle(color: Colors.grey)),

                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 12),
                          ...[5, 4, 3, 2, 1].map((star) {
                            final dist = _ratingSummary?['distribution'] as Map<String, dynamic>?;
                            final count = (dist?[star.toString()] ?? 0) as num;
                            final total = (_ratingSummary?['totalCount'] ?? 1) as num;
                            final ratio = total > 0 ? count / total : 0.0;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(children: [
                                Text('$star ⭐',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: ratio.toDouble(),
                                      minHeight: 8,
                                      backgroundColor: Colors.grey.shade200,
                                      valueColor: const AlwaysStoppedAnimation(Colors.amber),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text('$count',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              ]),
                            );
                          }),
                        ]),
                      ),
                      const SizedBox(height: 20),

                      const Text('Reviews',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      if (_ratings.isEmpty)
                        const Center(child: Text('No reviews yet.',
                            style: TextStyle(color: Colors.grey)))
                      else
                        ..._ratings.map((r) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade100),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Row(children: List.generate(r['stars'] as int, (_) =>
                                    const Icon(Icons.star, size: 14, color: Colors.amber))),
                                const Spacer(),
                                Text(
                                  r['createdAt'] != null
                                      ? DateTime.parse(r['createdAt'] as String)
                                          .toLocal()
                                          .toString()
                                          .substring(0, 10)
                                      : '',
                                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                                ),
                              ]),
                              if (r['comment'] != null &&
                                  (r['comment'] as String).isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(r['comment'] as String,
                                    style: const TextStyle(fontSize: 13,
                                        color: Colors.black87, height: 1.4)),
                              ],
                            ],
                          ),
                        )),
                    ],
                  ),
                ),
    );
  }
}
