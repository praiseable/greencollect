import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/listing.model.dart';

class ListingDetailScreen extends ConsumerWidget {
  final String listingId;
  const ListingDetailScreen({super.key, required this.listingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listing = MockData.listings.firstWhere(
      (l) => l.id == listingId,
      orElse: () => MockData.listings.first,
    );

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Image header
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: listing.images.isNotEmpty
                  ? Image.network(
                      listing.images.first,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Colors.grey[200],
                        child: const Icon(Icons.inventory_2, size: 80, color: Colors.grey),
                      ),
                    )
                  : Container(
                      color: Colors.grey[200],
                      child: const Icon(Icons.inventory_2, size: 80, color: Colors.grey),
                    ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.favorite_border),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Added to favorites ❤️')),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.share),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Share link copied! 📋')),
                  );
                },
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category badge
                  Chip(
                    label: Text(listing.categoryName,
                        style: const TextStyle(fontSize: 12)),
                    backgroundColor: Colors.green[50],
                    side: BorderSide.none,
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 8),

                  // Title
                  Text(listing.title,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  if (listing.titleUrdu.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(listing.titleUrdu,
                        style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                  ],

                  const SizedBox(height: 16),

                  // Price box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Text('₨ ${listing.pricePkr}',
                            style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.green[800])),
                        const SizedBox(width: 4),
                        Text('/ ${listing.unit}',
                            style: TextStyle(color: Colors.grey[600])),
                        const Spacer(),
                        Chip(
                          label: const Text('Negotiable', style: TextStyle(fontSize: 11)),
                          backgroundColor: Colors.orange[50],
                          side: BorderSide.none,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Info tiles
                  Row(
                    children: [
                      _infoTile(Icons.scale, 'Quantity',
                          '${listing.quantity} ${listing.unit}'),
                      _infoTile(Icons.category, 'Category', listing.categoryName),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _infoTile(Icons.location_on, 'Location',
                          '${listing.area ?? listing.city}, ${listing.city}'),
                      _infoTile(Icons.access_time, 'Posted',
                          '${listing.daysAgo} day(s) ago'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _infoTile(Icons.visibility, 'Visibility',
                          listing.visibilityLevel.name.toUpperCase()),
                      _infoTile(Icons.people, 'Interested',
                          '${listing.interestedCount} buyers'),
                    ],
                  ),

                  // Description
                  const SizedBox(height: 20),
                  const Text('Description',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(listing.description,
                      style: TextStyle(color: Colors.grey[700], height: 1.5)),
                  if (listing.descUrdu != null) ...[
                    const SizedBox(height: 8),
                    Text(listing.descUrdu!,
                        style: TextStyle(color: Colors.grey[600], height: 1.5),
                        textDirection: TextDirection.rtl),
                  ],

                  // Location placeholder
                  const SizedBox(height: 24),
                  const Text('📍 Pickup Location',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Container(
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: Stack(
                      children: [
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.map, size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 8),
                              Text('${listing.area ?? listing.city}, ${listing.city}',
                                  style: TextStyle(fontWeight: FontWeight.w500, color: Colors.grey[700])),
                              const SizedBox(height: 4),
                              Text(
                                '${listing.latitude.toStringAsFixed(4)}°N, ${listing.longitude.toStringAsFixed(4)}°E',
                                style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: SizedBox(
                            width: 140,
                            child: ElevatedButton.icon(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Opening Google Maps...')),
                                );
                              },
                              icon: const Icon(Icons.directions, size: 16),
                              label: const Text('Directions', style: TextStyle(fontSize: 12)),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Seller info
                  const SizedBox(height: 20),
                  const Text('Seller',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: Colors.green[100],
                      child: Text(listing.sellerName[0],
                          style: TextStyle(color: Colors.green[800], fontWeight: FontWeight.bold)),
                    ),
                    title: Text(listing.sellerName),
                    subtitle: Text(listing.sellerPhone),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(Icons.call, color: Colors.green[700]),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Calling ${listing.sellerPhone}...')),
                            );
                          },
                        ),
                        IconButton(
                          icon: Icon(Icons.message, color: Colors.blue[700]),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Opening chat...')),
                            );
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),

      // Bottom action bar
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Calling ${listing.sellerPhone}...')),
                  );
                },
                icon: const Icon(Icons.call),
                label: const Text('Call'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Make an Offer'),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Current price: ₨ ${listing.pricePkr}/${listing.unit}'),
                          const SizedBox(height: 16),
                          TextField(
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Your offer (₨ per unit)',
                              prefixText: '₨ ',
                            ),
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Offer sent to seller! 🤝'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          },
                          child: const Text('Send Offer'),
                        ),
                      ],
                    ),
                  );
                },
                icon: const Icon(Icons.handshake),
                label: const Text('Make Offer'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(icon, size: 14, color: Colors.grey),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
            ]),
            const SizedBox(height: 4),
            Text(value,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
