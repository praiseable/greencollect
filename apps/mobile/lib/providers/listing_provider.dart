import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../models/category.dart';
import '../services/api_service.dart';

class ListingProvider extends ChangeNotifier {
  List<Listing> _listings = [];
  List<Listing> _myListings = [];
  List<Category> _categories = [];
  bool _isLoading = false;
  String? _error;
  int _currentPage = 1;
  bool _hasMore = true;

  List<Listing> get listings => _listings;
  List<Listing> get myListings => _myListings;
  List<Category> get categories => _categories;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasMore => _hasMore;

  Future<void> fetchCategories() async {
    try {
      final response = await ApiService().get('/categories');
      final data = response['data'] ?? response;
      if (data is List) {
        _categories = data.map((c) => Category.fromJson(c)).toList();
        notifyListeners();
      }
    } catch (e) {
      print('Error fetching categories: $e');
    }
  }

  Future<void> fetchListings({
    String? category,
    String? search,
    String? city,
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
      _listings = [];
    }

    if (!_hasMore || _isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final params = <String, String>{
        'page': '$_currentPage',
        'limit': '20',
      };
      if (category != null) params['category'] = category;
      if (search != null) params['search'] = search;
      if (city != null) params['city'] = city;

      final query = params.entries.map((e) => '${e.key}=${e.value}').join('&');
      final response = await ApiService().get('/listings?$query');

      final data = response['data'] ?? response;
      if (data is List) {
        final newListings = data.map((l) => Listing.fromJson(l)).toList();
        _listings.addAll(newListings);
        _hasMore = newListings.length >= 20;
        _currentPage++;
      }
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<Listing?> fetchListingById(String id) async {
    try {
      final response = await ApiService().get('/listings/$id');
      final data = response['data'] ?? response;
      return Listing.fromJson(data);
    } catch (e) {
      print('Error fetching listing: $e');
      return null;
    }
  }

  Future<void> fetchMyListings() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService().get('/listings/my');
      final data = response['data'] ?? response;
      if (data is List) {
        _myListings = data.map((l) => Listing.fromJson(l)).toList();
      }
    } catch (e) {
      print('Error fetching my listings: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> createListing(Map<String, dynamic> data) async {
    try {
      await ApiService().post('/listings', body: data);
      await fetchMyListings();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteListing(String id) async {
    try {
      await ApiService().delete('/listings/$id');
      _myListings.removeWhere((l) => l.id == id);
      _listings.removeWhere((l) => l.id == id);
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    }
  }
}
