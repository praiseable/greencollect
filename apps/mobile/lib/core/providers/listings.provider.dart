import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/listing.model.dart';

/// In-memory list of listings posted by the current app session.
/// Merged with MockData on Home and Listings so new posts appear immediately
/// and to all users (Customer and Pro / all area users).
/// Backend: to persist to server, call ApiService().post('/listings', body: data)
/// from create_listing_screen after building the payload, then refetch or merge
/// server-returned listing so both apps see it across devices.
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
