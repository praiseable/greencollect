import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../core/providers/app_providers.dart';

// ✅ FIX: Removed MockData. Now fetches listing from real API: GET /v1/listings/:id

class ListingDetailScreen extends ConsumerStatefulWidget {
  final String listingId;
  const ListingDetailScreen({super.key, required this.listingId});

  @override
  ConsumerState<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends ConsumerState<ListingDetailScreen> {
  final ApiService _api = ApiService();

  Map<String, dynamic>? _listing;
  bool _loading = true;
  String? _error;
  bool _isFavorite = false;

  @override
  void initState() {
    super.initState();
    _fetchListing();
  }

  Future<void> _fetchListing() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await _api.get('listings/${widget.listingId}');
      setState(() {
        _listing = (response['listing'] ?? response) as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiException ? (e as ApiException).displayMessage : 'Failed to load listing.\n$e';
        _loading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    try {
      await _api.post('listings/${widget.listingId}/favorite', {});
      setState(() => _isFavorite = !_isFavorite);
    } catch (e) {
      debugPrint('toggleFavorite error: $e');
    }
  }

  Future<void> _startTransaction() async {
    final user = ref.read(authChangeNotifierProvider).user;
    if (user == null) {
      Navigator.pushNamed(context, '/login');
      return;
    }
    try {
      await _api.post('transactions', {'listingId': widget.listingId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Interest sent! Chat with the seller.'),
              backgroundColor: Colors.green),
        );
        Navigator.pushNamed(context, '/transactions');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().split('Exception:').last.trim()),
              backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: _fetchListing, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final listing  = _listing!;
    final images   = (listing['images'] as List<dynamic>?) ?? [];
    final category = listing['category'] as Map<String, dynamic>?;
    final seller   = listing['seller']   as Map<String, dynamic>?;
    final unit     = listing['unit']     as Map<String, dynamic>?;

    final priceDisplay = listing['priceFormatted'] as String? ??
        (listing['pricePaisa'] != null
            ? 'PKR ${((listing['pricePaisa'] as int) / 100).toStringAsFixed(0)}'
            : '—');

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: Colors.white,
            actions: [
              IconButton(
                icon: Icon(
                  _isFavorite ? Icons.favorite : Icons.favorite_border,
                  color: _isFavorite ? Colors.red : Colors.white,
                ),
                onPressed: _toggleFavorite,
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: images.isEmpty
                  ? Container(
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.image_not_supported,
                          size: 64, color: Colors.grey),
                    )
                  : PageView.builder(
                      itemCount: images.length,
                      itemBuilder: (ctx, i) {
                        final url = images[i]['url'] ?? images[i]['imageUrl'] ?? '';
                        return Image.network(
                          url.toString(),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.broken_image,
                                size: 48, color: Colors.grey),
                          ),
                        );
                      },
                    ),
            ),
          ),

          SliverToBoxAdapter(
            child: Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(priceDisplay,
                          style: const TextStyle(
                              fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green)),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: listing['status'] == 'active'
                              ? Colors.green.shade50
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          (listing['status'] as String? ?? 'active').toUpperCase(),
                          style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: listing['status'] == 'active'
                                  ? Colors.green.shade700
                                  : Colors.grey),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(listing['title'] as String? ?? '',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),

                  Wrap(
                    spacing: 8,
                    children: [
                      if (category != null)
                        _Tag(label: category['name'] as String? ?? '', color: Colors.blue),
                      if (listing['quantity'] != null)
                        _Tag(
                          label: '${listing['quantity']} ${unit?['symbol'] ?? ''}',
                          color: Colors.orange,
                        ),
                      if (listing['cityName'] != null || listing['city'] != null)
                        _Tag(
                          label: '📍 ${listing['cityName'] ?? listing['city']}',
                          color: Colors.purple,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (listing['description'] != null &&
                      (listing['description'] as String).isNotEmpty) ...[
                    const Text('Description',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 4),
                    Text(listing['description'] as String,
                        style: const TextStyle(color: Colors.black54, height: 1.5)),
                  ],
                ],
              ),
            ),
          ),

          if (seller != null)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.only(top: 8),
                color: Colors.white,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Seller',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.green.shade100,
                          child: Text(
                            ((seller['firstName'] ?? seller['displayName'] ?? 'S')
                                as String)
                                .characters.first.toUpperCase(),
                            style: TextStyle(color: Colors.green.shade700,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${seller['firstName'] ?? ''} ${seller['lastName'] ?? ''}'.trim().isEmpty
                                    ? seller['displayName'] as String? ?? 'Seller'
                                    : '${seller['firstName']} ${seller['lastName']}',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              if (seller['avgRating'] != null)
                                Row(children: [
                                  const Icon(Icons.star, size: 14, color: Colors.amber),
                                  Text(' ${seller['avgRating']}',
                                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ]),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),

      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    if (seller?['id'] != null) {
                      Navigator.pushNamed(context, '/chat/${seller!['id']}');
                    }
                  },
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Chat'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Colors.green),
                    foregroundColor: Colors.green,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: listing['status'] == 'active' ? _startTransaction : null,
                  icon: const Icon(Icons.handshake_outlined),
                  label: const Text('Make Offer'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12,
          fontWeight: FontWeight.w500)),
    );
  }
}
