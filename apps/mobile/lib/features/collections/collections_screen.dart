import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_variant.dart';
import '../../core/models/collection.model.dart';
import '../../core/mock/mock_data.dart';
import '../../core/providers/auth.provider.dart';

class CollectionsScreen extends ConsumerStatefulWidget {
  const CollectionsScreen({super.key});

  @override
  ConsumerState<CollectionsScreen> createState() => _CollectionsScreenState();
}

class _CollectionsScreenState extends ConsumerState<CollectionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final allCollections = MockData.collectionsForDealer(user?.id);

    final active = allCollections
        .where((c) =>
            c.status == CollectionStatus.assigned ||
            c.status == CollectionStatus.accepted ||
            c.status == CollectionStatus.enRoute)
        .toList();
    final inProgress = allCollections
        .where((c) =>
            c.status == CollectionStatus.arrived ||
            c.status == CollectionStatus.collected)
        .toList();
    final completed = allCollections
        .where((c) => c.status == CollectionStatus.deliveredToCenter)
        .toList();
    final overdue = allCollections.where((c) => c.isOverdue).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Collections'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: [
            Tab(text: 'Active (${active.length})'),
            Tab(text: 'In Progress (${inProgress.length})'),
            Tab(text: 'Completed (${completed.length})'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (overdue.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${overdue.length}',
                        style: const TextStyle(
                            color: Colors.white, fontSize: 10),
                      ),
                    ),
                  if (overdue.isNotEmpty) const SizedBox(width: 4),
                  Text('Overdue (${overdue.length})'),
                ],
              ),
            ),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCollectionList(active, 'No active collections'),
          _buildCollectionList(inProgress, 'No collections in progress'),
          _buildCollectionList(completed, 'No completed collections'),
          _buildCollectionList(overdue, 'No overdue collections — great job!'),
        ],
      ),
    );
  }

  Widget _buildCollectionList(List<CollectionModel> items, String emptyMsg) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_shipping_outlined, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(emptyMsg, style: TextStyle(color: Colors.grey[500], fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final col = items[index];
        return _CollectionCard(
          collection: col,
          onTap: () => context.push('/collections/${col.id}'),
        );
      },
    );
  }
}

class _CollectionCard extends StatelessWidget {
  final CollectionModel collection;
  final VoidCallback onTap;

  const _CollectionCard({required this.collection, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isOverdue = collection.isOverdue;
    final progress = collection.deadlineProgress;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isOverdue
            ? const BorderSide(color: Colors.red, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Status badge + time
              Row(
                children: [
                  _StatusBadge(status: collection.status, isOverdue: isOverdue),
                  const Spacer(),
                  if (isOverdue)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.warning_amber, size: 14, color: Colors.red[700]),
                          const SizedBox(width: 4),
                          Text(
                            'OVERDUE',
                            style: TextStyle(
                              color: Colors.red[700],
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Text(
                      '${collection.minutesToDeadline}m left',
                      style: TextStyle(
                        color: collection.minutesToDeadline < 60
                            ? Colors.orange[700]
                            : Colors.grey[600],
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Title + Category
              Text(
                collection.listingTitle,
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                '${collection.categoryName} • ${collection.area}, ${collection.city}',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 4),
              Text(
                'From: ${collection.customerName}',
                style: TextStyle(color: Colors.grey[500], fontSize: 12),
              ),

              const SizedBox(height: 12),

              // Deadline progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation(
                    isOverdue
                        ? Colors.red
                        : progress > 0.75
                            ? Colors.orange
                            : const Color(0xFF16A34A),
                  ),
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 8),

              // Address
              Row(
                children: [
                  const Icon(Icons.location_on_outlined,
                      size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      collection.address,
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),

              // Quick action button
              if (collection.status == CollectionStatus.assigned) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text('Accept & View Details'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final CollectionStatus status;
  final bool isOverdue;

  const _StatusBadge({required this.status, required this.isOverdue});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;

    switch (status) {
      case CollectionStatus.assigned:
        bg = Colors.blue[50]!;
        fg = Colors.blue[700]!;
        icon = Icons.assignment;
        break;
      case CollectionStatus.accepted:
        bg = Colors.green[50]!;
        fg = Colors.green[700]!;
        icon = Icons.thumb_up;
        break;
      case CollectionStatus.enRoute:
        bg = Colors.orange[50]!;
        fg = Colors.orange[700]!;
        icon = Icons.directions_car;
        break;
      case CollectionStatus.arrived:
        bg = Colors.purple[50]!;
        fg = Colors.purple[700]!;
        icon = Icons.place;
        break;
      case CollectionStatus.collected:
        bg = Colors.teal[50]!;
        fg = Colors.teal[700]!;
        icon = Icons.inventory;
        break;
      case CollectionStatus.deliveredToCenter:
        bg = Colors.green[50]!;
        fg = Colors.green[800]!;
        icon = Icons.verified;
        break;
      default:
        bg = Colors.grey[50]!;
        fg = Colors.grey[700]!;
        icon = Icons.help_outline;
    }

    if (isOverdue) {
      bg = Colors.red[50]!;
      fg = Colors.red[700]!;
      icon = Icons.timer_off;
    }

    final label = isOverdue ? 'OVERDUE' : status.name.toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  color: fg, fontWeight: FontWeight.bold, fontSize: 11)),
        ],
      ),
    );
  }
}
