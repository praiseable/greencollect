import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';
import '../../services/api_service.dart';
import '../../widgets/listing_card.dart';

class ListingsScreen extends ConsumerStatefulWidget {
  const ListingsScreen({super.key});

  @override
  ConsumerState<ListingsScreen> createState() => _ListingsScreenState();
}

class _ListingsScreenState extends ConsumerState<ListingsScreen> {
  final ApiService _api = ApiService();

  List<Map<String, dynamic>> _categories = [];
  List<String> _cities = [];
  String? _selectedCategoryId;
  String? _selectedCity;
  String _sortBy = 'latest';
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadFilters();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(listingsProvider).fetchListings(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFilters() async {
    try {
      final catRes = await _api.get('categories');
      final cityRes = await _api.get('geo-zones/cities');

      final cats = _asList(catRes, 'categories');
      final citiesRaw = _asList(cityRes, 'cities');
      final cities = citiesRaw.map((c) => c is Map ? (c['name'] ?? c['id'] ?? c.toString()).toString() : c.toString()).toList();

      setState(() {
        _categories = cats.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).where((e) => e.isNotEmpty).toList();
        _cities = cities;
      });
    } catch (e) {
      debugPrint('_loadFilters error: $e');
    }
  }

  static List<dynamic> _asList(dynamic response, String key) {
    if (response is List) return response;
    if (response is Map) {
      final list = response[key] ?? response['data'] ?? response;
      if (list is List) return list;
    }
    return [];
  }

  void _applyFilters() {
    ref.read(listingsProvider).fetchListings(
      refresh:    true,
      categoryId: _selectedCategoryId,
      city:       _selectedCity,
      search:     _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
      sort:       _sortBy,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Listings'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _searchCtrl,
              onSubmitted: (_) => _applyFilters(),
              decoration: InputDecoration(
                hintText: 'Search listings…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () { _searchCtrl.clear(); _applyFilters(); },
                      )
                    : null,
                filled: true,
                fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),

          if (_selectedCategoryId != null || _selectedCity != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  if (_selectedCategoryId != null)
                    _FilterChip(
                      label: _categories.firstWhere(
                        (c) => c['id'] == _selectedCategoryId,
                        orElse: () => {'name': 'Category'},
                      )['name'] as String,
                      onRemove: () {
                        setState(() => _selectedCategoryId = null);
                        _applyFilters();
                      },
                    ),
                  if (_selectedCity != null)
                    _FilterChip(
                      label: _selectedCity!,
                      onRemove: () {
                        setState(() => _selectedCity = null);
                        _applyFilters();
                      },
                    ),
                ],
              ),
            ),

          Expanded(
            child: Builder(
              builder: (ctx) {
                final provider = ref.watch(listingsProvider);
                if (provider.loading && provider.listings.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.error != null && provider.listings.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                        const SizedBox(height: 12),
                        Text(provider.error!, style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _applyFilters,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (provider.listings.isEmpty) {
                  return const Center(
                    child: Text('No listings found.', style: TextStyle(color: Colors.grey)),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => _applyFilters(),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.listings.length + (provider.hasMore ? 1 : 0),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemBuilder: (ctx, i) {
                      if (i >= provider.listings.length) {
                        ref.read(listingsProvider).fetchListings();
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      final listing = provider.listings[i];
                      return GestureDetector(
                        onTap: () => context.push('/listing/${listing.id}'),
                        child: ListingCard(listing: listing),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filter & Sort',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),

              const Text('Sort by', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['latest', 'price_asc', 'price_desc'].map((s) {
                  final labels = {'latest': 'Latest', 'price_asc': 'Price ↑', 'price_desc': 'Price ↓'};
                  return ChoiceChip(
                    label: Text(labels[s]!),
                    selected: _sortBy == s,
                    onSelected: (_) => setSheetState(() => _sortBy = s),
                    selectedColor: Colors.green,
                    labelStyle: TextStyle(
                      color: _sortBy == s ? Colors.white : Colors.black87,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              const Text('Category', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedCategoryId,
                hint: const Text('All categories'),
                onChanged: (v) => setSheetState(() => _selectedCategoryId = v),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All categories')),
                  ..._categories.map((c) => DropdownMenuItem(
                    value: c['id'] as String,
                    child: Text(c['name'] as String? ?? ''),
                  )),
                ],
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              const SizedBox(height: 12),

              const Text('City', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedCity,
                hint: const Text('All cities'),
                onChanged: (v) => setSheetState(() => _selectedCity = v),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All cities')),
                  ..._cities.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                ],
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    setState(() {});
                    _applyFilters();
                    Navigator.pop(ctx);
                  },
                  child: const Text('Apply Filters'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;
  const _FilterChip({required this.label, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        border: Border.all(color: Colors.green.shade200),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: TextStyle(color: Colors.green.shade700, fontSize: 12)),
          const SizedBox(width: 4),
          GestureDetector(onTap: onRemove,
            child: Icon(Icons.close, size: 14, color: Colors.green.shade700)),
        ],
      ),
    );
  }
}
