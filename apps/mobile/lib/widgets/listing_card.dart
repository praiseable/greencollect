import 'package:flutter/material.dart';
import '../models/listing.dart';

class ListingCardWidget extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onTap;

  const ListingCardWidget({super.key, required this.listing, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  listing.images.isNotEmpty
                      ? Image.network(
                          listing.images.first.url,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _placeholder(),
                        )
                      : _placeholder(),
                  // Category badge
                  if (listing.categoryName != null)
                    Positioned(
                      top: 8, left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.green[600],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(listing.categoryName!,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  if (listing.priceNegotiable)
                    Positioned(
                      top: 8, right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('Negotiable',
                          style: TextStyle(color: Colors.white, fontSize: 9)),
                      ),
                    ),
                ],
              ),
            ),
            // Content
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title,
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const Spacer(),
                    Text(listing.priceFormatted,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.green[800])),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(Icons.location_on, size: 11, color: Colors.grey[400]),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(listing.location, maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: Colors.grey[200],
      child: const Center(child: Icon(Icons.inventory_2, size: 40, color: Colors.grey)),
    );
  }
}
