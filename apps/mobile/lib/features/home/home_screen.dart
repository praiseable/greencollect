import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/listings.provider.dart';
import '../../core/providers/app_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/listing_card.dart';
import '../listings/listings_screen.dart';
import '../listings/listing_detail_screen.dart';
import '../listings/create_listing_screen.dart';

// ✅ FIX: Removed all MockData references.
//          Categories and listings now come from real API via ListingsProvider.

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final ApiService _api = ApiService();

  List<Map<String, dynamic>> _categories = [];
  bool _categoriesLoading = true;
  String _selectedCategoryId = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(listingsProvider).fetchListings(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchCategories() async {
    try {
      final response = await _api.get('categories');
      // Backend may return raw array or { categories/data: array }; List has no string index.
      final List<dynamic> raw = response is List
          ? response
          : (response['categories'] ?? response['data'] ?? response) as List<dynamic>;
      setState(() {
        _categories = raw.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).where((m) => m.isNotEmpty).toList();
        _categoriesLoading = false;
      });
    } catch (e) {
      setState(() => _categoriesLoading = false);
      debugPrint('fetchCategories error: $e');
    }
  }

  void _onCategoryTap(String categoryId) {
    setState(() {
      _selectedCategoryId = _selectedCategoryId == categoryId ? '' : categoryId;
    });
    ref.read(listingsProvider).fetchListings(
      refresh: true,
      categoryId: _selectedCategoryId.isEmpty ? null : _selectedCategoryId,
    );
  }

  void _onSearch(String value) {
    ref.read(listingsProvider).fetchListings(
      refresh: true,
      search: value.trim().isEmpty ? null : value.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authChangeNotifierProvider).user;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hello, ${user?.name ?? 'there'} 👋',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            const Text(
              'Find the best recycling deals',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.black87),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _fetchCategories();
          await ref.read(listingsProvider).fetchListings(refresh: true);
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  onSubmitted: _onSearch,
                  decoration: InputDecoration(
                    hintText: 'Search listings…',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _onSearch('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: SizedBox(
                height: 44,
                child: _categoriesLoading
                    ? const Center(child: SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2)))
                    : ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _categories.length,
                        itemBuilder: (ctx, i) {
                          final cat = _categories[i];
                          final id   = cat['id']   as String? ?? '';
                          final name = cat['name'] as String? ?? '';
                          final isSelected = _selectedCategoryId == id;
                          return GestureDetector(
                            onTap: () => _onCategoryTap(id),
                            child: Container(
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.green : Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected ? Colors.green : Colors.grey.shade300,
                                ),
                              ),
                              child: Text(
                                name,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : Colors.black87,
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            Consumer(
              builder: (ctx, ref, _) {
                final provider = ref.watch(listingsProvider);
                if (provider.loading && provider.listings.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                if (provider.error != null && provider.listings.isEmpty) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                          const SizedBox(height: 12),
                          Text(provider.error!,
                              style: const TextStyle(color: Colors.grey)),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () => provider.fetchListings(refresh: true),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                if (provider.listings.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text('No listings found.',
                          style: TextStyle(color: Colors.grey)),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverGrid(
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) {
                        if (i == provider.listings.length - 3) {
                          provider.fetchListings();
                        }
                        final listing = provider.listings[i];
                        return GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ListingDetailScreen(listingId: listing.id),
                            ),
                          ),
                          child: ListingCard(listing: listing),
                        );
                      },
                      childCount: provider.listings.length,
                    ),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                  ),
                );
              },
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const CreateListingScreen()),
        ),
        backgroundColor: Colors.green,
        icon: const Icon(Icons.add),
        label: const Text('List Item'),
      ),
    );
  }
}
