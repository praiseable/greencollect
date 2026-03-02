import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/listing.dart';
import '../../providers/listing_provider.dart';

class ListingDetailScreen extends StatefulWidget {
  final String id;
  const ListingDetailScreen({super.key, required this.id});

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  Listing? _listing;
  bool _loading = true;
  int _selectedImage = 0;

  @override
  void initState() {
    super.initState();
    _loadListing();
  }

  Future<void> _loadListing() async {
    final listing = await context.read<ListingProvider>().fetchListingById(widget.id);
    if (mounted) setState(() { _listing = listing; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Loading...')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_listing == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Not Found')),
        body: const Center(child: Text('Listing not found')),
      );
    }

    final listing = _listing!;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Image gallery
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: listing.images.isNotEmpty
                  ? PageView.builder(
                      onPageChanged: (i) => setState(() => _selectedImage = i),
                      itemCount: listing.images.length,
                      itemBuilder: (_, i) => Image.network(
                        listing.images[i].url,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey[200],
                          child: const Icon(Icons.image_not_supported, size: 60, color: Colors.grey),
                        ),
                      ),
                    )
                  : Container(
                      color: Colors.grey[200],
                      child: const Icon(Icons.inventory_2, size: 80, color: Colors.grey),
                    ),
            ),
            actions: [
              IconButton(icon: const Icon(Icons.favorite_border), onPressed: () {}),
              IconButton(icon: const Icon(Icons.share), onPressed: () {}),
            ],
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image indicators
                  if (listing.images.length > 1)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(listing.images.length, (i) => Container(
                        width: 8, height: 8,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: i == _selectedImage ? Theme.of(context).primaryColor : Colors.grey[300],
                        ),
                      )),
                    ),

                  const SizedBox(height: 12),

                  // Category badge
                  if (listing.categoryName != null)
                    Chip(
                      label: Text(listing.categoryName!, style: const TextStyle(fontSize: 12)),
                      backgroundColor: Colors.green[50],
                      side: BorderSide.none,
                      padding: EdgeInsets.zero,
                    ),

                  const SizedBox(height: 8),

                  // Title
                  Text(listing.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),

                  const SizedBox(height: 12),

                  // Price box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Text(listing.priceFormatted,
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.green[800])),
                        if (listing.unitName != null) ...[
                          const SizedBox(width: 4),
                          Text('/ ${listing.unitName}', style: TextStyle(color: Colors.grey[600])),
                        ],
                        const Spacer(),
                        if (listing.priceNegotiable)
                          Chip(label: const Text('Negotiable', style: TextStyle(fontSize: 11)),
                            backgroundColor: Colors.orange[50]),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Info grid
                  Row(
                    children: [
                      _infoTile(Icons.scale, 'Quantity', '${listing.quantity ?? '-'} ${listing.unitName ?? ''}'),
                      _infoTile(Icons.category, 'Condition', listing.condition ?? 'Used'),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _infoTile(Icons.location_on, 'Location', listing.location),
                      _infoTile(Icons.access_time, 'Posted',
                        '${listing.createdAt.day}/${listing.createdAt.month}/${listing.createdAt.year}'),
                    ],
                  ),

                  if (listing.description != null) ...[
                    const SizedBox(height: 20),
                    const Text('Description', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Text(listing.description!, style: TextStyle(color: Colors.grey[700], height: 1.5)),
                  ],

                  // Attributes
                  if (listing.attributes?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 20),
                    const Text('Specifications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...listing.attributes!.map((attr) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(attr.name, style: TextStyle(color: Colors.grey[600])),
                          Text(attr.value, style: const TextStyle(fontWeight: FontWeight.w500)),
                        ],
                      ),
                    )),
                  ],

                  // Seller info
                  if (listing.sellerName != null) ...[
                    const SizedBox(height: 20),
                    const Text('Seller', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Colors.green[100],
                        child: Text(listing.sellerName![0], style: TextStyle(color: Colors.green[800])),
                      ),
                      title: Text(listing.sellerName!),
                      subtitle: const Text('Verified Seller'),
                    ),
                  ],

                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),

      // Bottom action buttons
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))],
        ),
        child: Row(
          children: [
            if (listing.sellerPhone != null)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => launchUrl(Uri.parse('tel:${listing.sellerPhone}')),
                  icon: const Icon(Icons.call),
                  label: const Text('Call'),
                ),
              ),
            if (listing.sellerPhone != null) const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Contact request sent to seller!')),
                  );
                },
                icon: const Icon(Icons.message),
                label: const Text('Contact Seller'),
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
            Row(children: [Icon(icon, size: 14, color: Colors.grey), const SizedBox(width: 4),
              Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600]))]),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
