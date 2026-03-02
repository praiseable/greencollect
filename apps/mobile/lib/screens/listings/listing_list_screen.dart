import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/listing_provider.dart';
import '../../widgets/listing_card.dart';

class ListingListScreen extends StatefulWidget {
  const ListingListScreen({super.key});

  @override
  State<ListingListScreen> createState() => _ListingListScreenState();
}

class _ListingListScreenState extends State<ListingListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    context.read<ListingProvider>().fetchListings(refresh: true);
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      context.read<ListingProvider>().fetchListings(
        search: _searchController.text.isNotEmpty ? _searchController.text : null,
        category: _selectedCategory,
      );
    }
  }

  void _search() {
    context.read<ListingProvider>().fetchListings(
      refresh: true,
      search: _searchController.text.isNotEmpty ? _searchController.text : null,
      category: _selectedCategory,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ListingProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Listings'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              controller: _searchController,
              onSubmitted: (_) => _search(),
              decoration: InputDecoration(
                hintText: 'Search: copper, plastic, iron...',
                filled: true,
                fillColor: Colors.white,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    _search();
                  },
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Category chips
          if (provider.categories.isNotEmpty)
            SizedBox(
              height: 48,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: provider.categories.length + 1,
                itemBuilder: (_, i) {
                  if (i == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: const Text('All'),
                        selected: _selectedCategory == null,
                        onSelected: (_) {
                          setState(() => _selectedCategory = null);
                          _search();
                        },
                      ),
                    );
                  }
                  final cat = provider.categories[i - 1];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(cat.name),
                      selected: _selectedCategory == cat.name,
                      onSelected: (_) {
                        setState(() => _selectedCategory = cat.name);
                        _search();
                      },
                    ),
                  );
                },
              ),
            ),

          // Listings grid
          Expanded(
            child: provider.listings.isEmpty && provider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : provider.listings.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.search_off, size: 60, color: Colors.grey),
                            const SizedBox(height: 12),
                            const Text('No listings found', style: TextStyle(fontSize: 16, color: Colors.grey)),
                            TextButton(
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _selectedCategory = null);
                                _search();
                              },
                              child: const Text('Clear filters'),
                            ),
                          ],
                        ),
                      )
                    : GridView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(12),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 0.72,
                        ),
                        itemCount: provider.listings.length + (provider.hasMore ? 1 : 0),
                        itemBuilder: (_, i) {
                          if (i >= provider.listings.length) {
                            return const Center(child: CircularProgressIndicator());
                          }
                          return ListingCardWidget(
                            listing: provider.listings[i],
                            onTap: () => context.go('/listings/${provider.listings[i].id}'),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
