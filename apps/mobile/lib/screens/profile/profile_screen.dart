import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/listing_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ListingProvider>().fetchMyListings();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final listingProvider = context.watch<ListingProvider>();
    final user = auth.user;

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Profile')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.person_outline, size: 60, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('Please login to view your profile'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/login'),
                child: const Text('Login'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.logout();
              if (mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Profile card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: Colors.green[100],
                      child: Text(user!.initials,
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.green[800])),
                    ),
                    const SizedBox(height: 12),
                    Text(user.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    if (user.roleName != null)
                      Chip(label: Text(user.roleName!, style: const TextStyle(fontSize: 12)),
                        backgroundColor: Colors.green[50]),
                    const SizedBox(height: 8),
                    if (user.email != null)
                      _infoRow(Icons.email, user.email!),
                    if (user.phone != null)
                      _infoRow(Icons.phone, user.phone!),
                    if (user.cityName != null)
                      _infoRow(Icons.location_on, user.cityName!),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Stats
            Row(
              children: [
                _statCard('My Listings', '${listingProvider.myListings.length}', Icons.inventory_2),
                const SizedBox(width: 12),
                _statCard('Views', '${listingProvider.myListings.fold(0, (sum, l) => sum + l.viewCount)}', Icons.visibility),
              ],
            ),
            const SizedBox(height: 16),

            // My Listings
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('My Listings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => context.go('/create-listing'),
                  child: const Text('+ New'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (listingProvider.myListings.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const Icon(Icons.inventory_2_outlined, size: 48, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text('No listings yet'),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () => context.go('/create-listing'),
                        child: const Text('Create Listing'),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...listingProvider.myListings.map((listing) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    width: 50, height: 50,
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: listing.images.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(listing.images.first.url, fit: BoxFit.cover))
                        : const Icon(Icons.inventory_2, color: Colors.grey),
                  ),
                  title: Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${listing.priceFormatted} · ${listing.viewCount} views'),
                  trailing: Chip(
                    label: Text(listing.status, style: const TextStyle(fontSize: 10)),
                    backgroundColor: listing.status == 'ACTIVE' ? Colors.green[50] : Colors.grey[100],
                    side: BorderSide.none,
                    padding: EdgeInsets.zero,
                  ),
                  onTap: () => context.go('/listings/${listing.id}'),
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: Colors.grey),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: Colors.grey[700], fontSize: 13)),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(icon, color: Colors.green, size: 28),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}
