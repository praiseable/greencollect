import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/providers/auth.provider.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.listings. My listings from GET /v1/listings/my (real API).

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _myListings = [];
  bool _listingsLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProfileData();
  }

  Future<void> _fetchProfileData() async {
    try {
      final results = await Future.wait([
        _api.get('listings/my'),
        _api.get('auth/me'),
      ]);

      final raw = (results[0]['listings'] ?? results[0]['data'] ?? results[0]) as List<dynamic>;

      if (mounted) {
        setState(() {
          _myListings = raw.cast<Map<String, dynamic>>().take(3).toList();
          _listingsLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _listingsLoading = false);
      debugPrint('fetchProfileData error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('Profile'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.pushNamed(context, '/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<AuthProvider>().fetchProfile();
          await _fetchProfileData();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.green.shade100,
                  child: Text(
                    user != null && user.name.isNotEmpty
                        ? user.name[0].toUpperCase()
                        : 'U',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold,
                        color: Colors.green.shade700),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.name ?? 'User',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                if (user?.phone != null && (user!.phone).isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(user.phone, style: const TextStyle(color: Colors.grey)),
                ],
                if (user?.email != null && (user!.email).isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(user.email, style: const TextStyle(color: Colors.grey, fontSize: 13)),
                ],
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    user?.role.name.toUpperCase().replaceAll('_', ' ') ?? 'CUSTOMER',
                    style: TextStyle(color: Colors.green.shade700,
                        fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 16),

            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('My Listings',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              TextButton(
                onPressed: () => Navigator.pushNamed(context, '/my-listings'),
                child: const Text('View all', style: TextStyle(color: Colors.green)),
              ),
            ]),
            const SizedBox(height: 8),

            if (_listingsLoading)
              const Center(child: CircularProgressIndicator())
            else if (_myListings.isEmpty)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200, style: BorderStyle.solid),
                ),
                child: const Center(
                  child: Text('No listings yet', style: TextStyle(color: Colors.grey)),
                ),
              )
            else
              ..._myListings.map((listing) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  title: Text(listing['title'] as String? ?? '',
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    listing['priceFormatted'] as String? ??
                        (listing['pricePaisa'] != null
                            ? 'PKR ${((listing['pricePaisa'] as int) / 100).toStringAsFixed(0)}'
                            : '—'),
                    style: const TextStyle(color: Colors.green),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: listing['status'] == 'active'
                          ? Colors.green.shade50 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      listing['status'] as String? ?? '',
                      style: TextStyle(
                        fontSize: 11,
                        color: listing['status'] == 'active' ? Colors.green : Colors.grey,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  onTap: () => Navigator.pushNamed(
                      context, '/listings/${listing['id']}'),
                ),
              )),
            const SizedBox(height: 16),

            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(children: [
                _ActionTile(Icons.wallet_outlined, 'Wallet',
                    () => Navigator.pushNamed(context, '/wallet')),
                const Divider(height: 1, indent: 56),
                _ActionTile(Icons.receipt_long_outlined, 'Transactions',
                    () => Navigator.pushNamed(context, '/transactions')),
                const Divider(height: 1, indent: 56),
                _ActionTile(Icons.notifications_outlined, 'Notifications',
                    () => Navigator.pushNamed(context, '/notifications')),
                const Divider(height: 1, indent: 56),
                _ActionTile(Icons.card_membership_outlined, 'Subscription',
                    () => Navigator.pushNamed(context, '/subscription')),
                const Divider(height: 1, indent: 56),
                _ActionTile(Icons.logout, 'Logout', () async {
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) Navigator.pushReplacementNamed(context, '/login');
                }, color: Colors.red),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  const _ActionTile(this.icon, this.label, this.onTap, {this.color});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color ?? Colors.grey.shade700),
      title: Text(label, style: TextStyle(color: color)),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }
}
