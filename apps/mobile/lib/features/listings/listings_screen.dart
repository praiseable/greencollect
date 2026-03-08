import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/listing.model.dart';
import '../../core/models/category.model.dart';

class ListingsScreen extends ConsumerStatefulWidget {
  const ListingsScreen({super.key});

  @override
  ConsumerState<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends ConsumerState<ListingsScreen> {
  String? _selectedCategory;
  String _searchQuery = '';
  String _sortBy = 'latest'; // latest, price_low, price_high, quantity
  String _visibilityFilter = 'all'; // all, local, neighbor, city, wholesale
  final _searchController = TextEditingController();

  List<ListingModel> get _filteredListings {
    var listings = MockData.listings.where((l) {
      final matchesCategory = _selectedCategory == null || l.categoryId == _selectedCategory;
      final matchesSearch = _searchQuery.isEmpty ||
          l.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          l.description.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesVisibility = _visibilityFilter == 'all' ||
          l.visibilityLevel.name.toLowerCase() == _visibilityFilter;
      return matchesCategory && matchesSearch && matchesVisibility;
    }).toList();

    // Sort
    switch (_sortBy) {
      case 'price_low':
        listings.sort((a, b) => a.pricePkr.compareTo(b.pricePkr));
        break;
      case 'price_high':
        listings.sort((a, b) => b.pricePkr.compareTo(a.pricePkr));
        break;
      case 'quantity':
        listings.sort((a, b) => b.quantity.compareTo(a.quantity));
        break;
      case 'latest':
      default:
        listings.sort((a, b) => a.daysAgo.compareTo(b.daysAgo));
        break;
    }
    return listings;
  }

  @override
  Widget build(BuildContext context) {
    final listings = _filteredListings;
    final categories = MockData.categories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Listings'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _searchQuery = v),
              decoration: InputDecoration(
                hintText: 'Search: copper, iron, plastics...',
                filled: true,
                fillColor: Colors.white,
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Category chips
          SizedBox(
            height: 52,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: categories.length + 1,
              itemBuilder: (_, i) {
                if (i == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('All'),
                      selected: _selectedCategory == null,
                      onSelected: (_) => setState(() => _selectedCategory = null),
                    ),
                  );
                }
                final cat = categories[i - 1];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(cat.nameEn),
                    selected: _selectedCategory == cat.id,
                    onSelected: (_) => setState(() =>
                        _selectedCategory = _selectedCategory == cat.id ? null : cat.id),
                  ),
                );
              },
            ),
          ),

          // Sort + Visibility filter row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                Text('${listings.length} listings',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                const Spacer(),
                // Sort
                PopupMenuButton<String>(
                  onSelected: (v) => setState(() => _sortBy = v),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'latest', child: Text('Latest')),
                    const PopupMenuItem(value: 'price_low', child: Text('Price: Low → High')),
                    const PopupMenuItem(value: 'price_high', child: Text('Price: High → Low')),
                    const PopupMenuItem(value: 'quantity', child: Text('Quantity')),
                  ],
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.sort, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(_sortLabel(), style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                // Visibility
                PopupMenuButton<String>(
                  onSelected: (v) => setState(() => _visibilityFilter = v),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'all', child: Text('All Visibility')),
                    const PopupMenuItem(value: 'local', child: Text('🟢 Local')),
                    const PopupMenuItem(value: 'neighbor', child: Text('🔵 Neighbor')),
                    const PopupMenuItem(value: 'city', child: Text('🟡 City')),
                    const PopupMenuItem(value: 'wholesale', child: Text('🟣 Wholesale')),
                  ],
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: _visibilityFilter != 'all' ? Colors.green : Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                      color: _visibilityFilter != 'all' ? Colors.green[50] : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.visibility, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(_visibilityFilter == 'all' ? 'Zone' : _visibilityFilter.toUpperCase(),
                            style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Listings grid
          Expanded(
            child: listings.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.search_off, size: 60, color: Colors.grey[300]),
                        const SizedBox(height: 12),
                        const Text('No listings found',
                            style: TextStyle(fontSize: 16, color: Colors.grey)),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () {
                            _searchController.clear();
                            setState(() {
                              _selectedCategory = null;
                              _searchQuery = '';
                            });
                          },
                          child: const Text('Clear filters'),
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.72,
                    ),
                    itemCount: listings.length,
                    itemBuilder: (_, i) => _BrowseListingCard(
                      listing: listings[i],
                      onTap: () => context.go('/listing/${listings[i].id}'),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  String _sortLabel() {
    switch (_sortBy) {
      case 'price_low': return 'Price ↑';
      case 'price_high': return 'Price ↓';
      case 'quantity': return 'Qty';
      default: return 'Latest';
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }
}

class _BrowseListingCard extends StatelessWidget {
  final ListingModel listing;
  final VoidCallback onTap;
  const _BrowseListingCard({required this.listing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: Colors.grey[100],
                    child: listing.images.isNotEmpty
                        ? Image.network(listing.images.first, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Center(
                                child: Icon(Icons.inventory_2, size: 40, color: Colors.grey[300])))
                        : Center(child: Icon(Icons.inventory_2, size: 40, color: Colors.grey[300])),
                  ),
                  // Visibility badge
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _visibilityColor(listing.visibilityLevel).withOpacity(0.9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        listing.visibilityLevel.name.toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 3,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text('₨ ${listing.pricePkr}/${listing.unit}',
                        style: const TextStyle(
                            color: Color(0xFF16A34A), fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text('${listing.quantity} ${listing.unit} • ${listing.city}',
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(Icons.access_time, size: 12, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text('${listing.daysAgo}d ago',
                            style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                        const Spacer(),
                        Icon(Icons.people_outline, size: 12, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text('${listing.interestedCount}',
                            style: TextStyle(fontSize: 10, color: Colors.grey[500])),
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

  Color _visibilityColor(VisibilityLevel level) {
    switch (level) {
      case VisibilityLevel.local:
        return const Color(0xFF16A34A);
      case VisibilityLevel.neighbor:
        return const Color(0xFF2563EB);
      case VisibilityLevel.city:
        return const Color(0xFF8B5CF6);
      case VisibilityLevel.province:
        return const Color(0xFFF59E0B);
      case VisibilityLevel.national:
        return const Color(0xFFEF4444);
      case VisibilityLevel.wholesale:
        return const Color(0xFF7C3AED);
      case VisibilityLevel.public:
        return const Color(0xFF6B7280);
    }
  }
}
