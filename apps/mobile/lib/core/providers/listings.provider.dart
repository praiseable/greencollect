import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../models/listing.model.dart';

// ✅ FIX: Removed all MockService/MockData usage.
//          Now fetches listings from real backend via ApiService.

class ListingsProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<ListingModel> _listings = [];
  List<ListingModel> _myListings = [];
  ListingModel? _selectedListing;
  bool _loading = false;
  String? _error;
  int _page = 1;
  bool _hasMore = true;

  List<ListingModel> get listings    => _listings;
  List<ListingModel> get myListings  => _myListings;
  ListingModel?      get selectedListing => _selectedListing;
  bool               get loading     => _loading;
  String?            get error       => _error;
  bool               get hasMore     => _hasMore;

  // ── Fetch public listings (home / search) ───────────────────────────────
  Future<void> fetchListings({
    String? categoryId,
    String? city,
    String? search,
    String sort = 'latest',
    bool refresh = false,
  }) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
      _listings = [];
    }
    if (!_hasMore || _loading) return;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final queryParams = {
        'page': _page.toString(),
        'limit': '20',
        'sort': sort,
        if (categoryId != null) 'categoryId': categoryId,
        if (city != null && city.isNotEmpty) 'city': city,
        if (search != null && search.isNotEmpty) 'search': search,
      };

      // ✅ Calls GET /v1/listings?page=&limit=&sort=&categoryId=&city=&search=
      final response = await _api.get('listings', queryParams: queryParams);

      final List<dynamic> raw =
          (response['listings'] ?? response['data'] ?? response) as List<dynamic>;

      final fetched = raw.map((e) => ListingModel.fromJson(e)).toList();

      _listings = refresh ? fetched : [..._listings, ...fetched];
      _page++;
      _hasMore = fetched.length == 20;
    } catch (e) {
      _error = _parseError(e, 'Failed to load listings');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Fetch current user's own listings ───────────────────────────────────
  Future<void> fetchMyListings() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      // ✅ Calls GET /v1/listings/my
      final response = await _api.get('listings/my');
      final List<dynamic> raw =
          (response['listings'] ?? response['data'] ?? response) as List<dynamic>;
      _myListings = raw.map((e) => ListingModel.fromJson(e)).toList();
    } catch (e) {
      _error = _parseError(e, 'Failed to load your listings');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Fetch single listing detail ──────────────────────────────────────────
  Future<void> fetchListing(String id) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      // ✅ Calls GET /v1/listings/:id
      final response = await _api.get('listings/$id');
      _selectedListing = ListingModel.fromJson(
        response['listing'] ?? response,
      );
    } catch (e) {
      _error = _parseError(e, 'Failed to load listing details');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // ── Create a new listing ─────────────────────────────────────────────────
  Future<ListingModel?> createListing(Map<String, dynamic> body) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      // ✅ Calls POST /v1/listings
      final response = await _api.post('listings', body);
      final newListing = ListingModel.fromJson(
        response['listing'] ?? response,
      );
      _myListings = [newListing, ..._myListings];
      notifyListeners();
      return newListing;
    } catch (e) {
      _error = _parseError(e, 'Failed to create listing');
      notifyListeners();
      return null;
    } finally {
      _loading = false;
    }
  }

  // ── Delete a listing ─────────────────────────────────────────────────────
  Future<bool> deleteListing(String id) async {
    try {
      // ✅ Calls DELETE /v1/listings/:id
      await _api.delete('listings/$id');
      _myListings.removeWhere((l) => l.id == id);
      _listings.removeWhere((l) => l.id == id);
      notifyListeners();
      return true;
    } catch (e) {
      _error = _parseError(e, 'Failed to delete listing');
      notifyListeners();
      return false;
    }
  }

  // ── Toggle favorite ──────────────────────────────────────────────────────
  Future<void> toggleFavorite(String listingId) async {
    try {
      // ✅ Calls POST /v1/listings/:id/favorite
      await _api.post('listings/$listingId/favorite', {});
    } catch (e) {
      debugPrint('toggleFavorite error: $e');
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  String _parseError(dynamic e, String fallback) {
    if (e is Map) {
      return e['error']?['message'] ?? e['message'] ?? fallback;
    }
    return e.toString().contains('Exception:')
        ? e.toString().split('Exception:').last.trim()
        : fallback;
  }
}

// In-memory list of listings posted in this session (Riverpod) — kept for compatibility
final userPostedListingsProvider =
    StateNotifierProvider<UserPostedListingsNotifier, List<ListingModel>>((ref) {
  return UserPostedListingsNotifier();
});

class UserPostedListingsNotifier extends StateNotifier<List<ListingModel>> {
  UserPostedListingsNotifier() : super([]);

  void addListing(ListingModel listing) {
    state = [...state, listing];
  }
}
