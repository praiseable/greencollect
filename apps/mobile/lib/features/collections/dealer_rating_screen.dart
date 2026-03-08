import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/collection.model.dart';
import '../../core/mock/mock_data.dart';
import '../../core/providers/auth.provider.dart';

class DealerRatingScreen extends ConsumerWidget {
  const DealerRatingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    final rating = MockData.ratingForDealer(user?.id);
    final collections = MockData.collectionsForDealer(user?.id);

    if (rating == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Rating')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.star_outline, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text('No rating data yet',
                  style: TextStyle(fontSize: 16, color: Colors.grey)),
              SizedBox(height: 8),
              Text('Complete collections to build your rating.',
                  style: TextStyle(fontSize: 13, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('My Performance')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Overall Score Card ──
            Card(
              color: _badgeColor(rating.overallScore).withOpacity(0.08),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(rating.ratingBadge,
                        style: const TextStyle(fontSize: 24)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ...List.generate(5, (i) {
                          final star = i + 1;
                          if (star <= rating.overallScore.floor()) {
                            return const Icon(Icons.star,
                                color: Colors.amber, size: 28);
                          } else if (star - 0.5 <= rating.overallScore) {
                            return const Icon(Icons.star_half,
                                color: Colors.amber, size: 28);
                          } else {
                            return Icon(Icons.star_border,
                                color: Colors.grey[300], size: 28);
                          }
                        }),
                        const SizedBox(width: 8),
                        Text(
                          rating.overallScore.toStringAsFixed(1),
                          style: const TextStyle(
                              fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Period: ${rating.period}',
                        style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Score Breakdown ──
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Score Breakdown',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    _scoreBar('Response Time', rating.responseScore, Colors.blue),
                    _scoreBar('Collection Speed', rating.collectionScore,
                        Colors.orange),
                    _scoreBar(
                        'Status Compliance', rating.complianceScore, Colors.purple),
                    if (rating.customerScore != null)
                      _scoreBar('Customer Feedback', rating.customerScore!,
                          Colors.green),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Collection Stats ──
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Collection Statistics',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _statBox('${rating.totalCollections}', 'Total',
                            Colors.blue),
                        const SizedBox(width: 8),
                        _statBox('${rating.onTimeCollections}', 'On Time',
                            Colors.green),
                        const SizedBox(width: 8),
                        _statBox(
                            '${rating.lateCollections}', 'Late', Colors.orange),
                        const SizedBox(width: 8),
                        _statBox('${rating.escalatedCollections}', 'Escalated',
                            Colors.red),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _metricRow('On-Time Rate',
                        '${rating.onTimeRate.toStringAsFixed(0)}%'),
                    _metricRow('Avg Response Time',
                        '${rating.avgResponseTimeMin.toStringAsFixed(0)} min'),
                    _metricRow('Avg Collection Time',
                        '${rating.avgCollectionTimeMin.toStringAsFixed(0)} min'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Recent Collections ──
            if (collections.isNotEmpty) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Recent Collections',
                          style: TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      ...collections.take(5).map((col) => _recentRow(col)),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _scoreBar(String label, double score, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 13)),
              Text(score.toStringAsFixed(1),
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: score / 5.0,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }

  Widget _statBox(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                    color: color)),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    color: Colors.grey[600], fontSize: 11),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _metricRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Text(value,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _recentRow(CollectionModel col) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: col.isOverdue ? Colors.red : const Color(0xFF16A34A),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(col.listingTitle,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 13)),
                Text('${col.area}, ${col.city} • ${col.statusLabel}',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11)),
              ],
            ),
          ),
          if (col.qualityRating != null)
            Row(
              children: [
                const Icon(Icons.star, size: 14, color: Colors.amber),
                Text('${col.qualityRating}',
                    style: const TextStyle(fontSize: 12)),
              ],
            ),
        ],
      ),
    );
  }

  Color _badgeColor(double score) {
    if (score >= 4.5) return Colors.purple;
    if (score >= 4.0) return Colors.amber;
    if (score >= 3.0) return Colors.blue;
    if (score >= 2.0) return Colors.orange;
    return Colors.red;
  }
}
