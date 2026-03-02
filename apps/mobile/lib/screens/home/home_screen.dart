import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/listing_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/listing_card.dart';
import '../../widgets/category_chip.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    final provider = context.read<ListingProvider>();
    provider.fetchCategories();
    provider.fetchListings(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final listingProvider = context.watch<ListingProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.eco, size: 28),
            SizedBox(width: 8),
            Text('GreenCollect', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () => context.go('/listings')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => listingProvider.fetchListings(refresh: true),
        child: CustomScrollView(
          slivers: [
            // Welcome Banner
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF388E3C), Color(0xFF66BB6A)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      auth.isAuthenticated ? 'Welcome back, ${auth.user!.firstName}!' : 'Trade Recyclables in Pakistan',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Buy and sell scrap metals, plastics, paper & more. All prices in ₨ PKR.',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () => context.go('/create-listing'),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.green[800]),
                      child: const Text('Post a Listing'),
                    ),
                  ],
                ),
              ),
            ),

            // Categories
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Categories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    TextButton(
                      onPressed: () => context.go('/listings'),
                      child: const Text('See All'),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 100,
                child: listingProvider.categories.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: listingProvider.categories.length,
                        itemBuilder: (_, i) => CategoryChip(
                          category: listingProvider.categories[i],
                          onTap: () => context.go('/listings?category=${listingProvider.categories[i].name}'),
                        ),
                      ),
              ),
            ),

            // Recent Listings
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Latest Listings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    TextButton(onPressed: () => context.go('/listings'), child: const Text('View All')),
                  ],
                ),
              ),
            ),

            if (listingProvider.isLoading && listingProvider.listings.isEmpty)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (listingProvider.listings.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.inventory_2_outlined, size: 60, color: Colors.grey),
                      const SizedBox(height: 12),
                      const Text('No listings yet', style: TextStyle(fontSize: 16, color: Colors.grey)),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () => context.go('/create-listing'),
                        child: const Text('Be the first to post!'),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                    (_, i) => ListingCardWidget(
                      listing: listingProvider.listings[i],
                      onTap: () => context.go('/listings/${listingProvider.listings[i].id}'),
                    ),
                    childCount: listingProvider.listings.length.clamp(0, 10),
                  ),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.72,
                  ),
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }
}
