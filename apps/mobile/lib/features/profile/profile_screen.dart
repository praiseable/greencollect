import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/listing.model.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    final myListings = MockData.listings.take(3).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to logout?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        // logout() notifies authChangeNotifier → GoRouter
                        // re-evaluates redirect → sends user to /auth/login
                        ref.read(authProvider.notifier).logout();
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                      child: const Text('Logout'),
                    ),
                  ],
                ),
              );
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
                      child: Text(
                        user?.name.isNotEmpty == true ? user!.name[0] : 'U',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.green[800],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(user?.name ?? 'User',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    if (user?.nameUrdu.isNotEmpty == true)
                      Text(user!.nameUrdu, style: TextStyle(fontSize: 16, color: Colors.grey[600])),
                    const SizedBox(height: 8),
                    Chip(
                      label: Text(
                        _roleLabel(user?.role),
                        style: const TextStyle(fontSize: 12),
                      ),
                      backgroundColor: _roleColor(user?.role).withOpacity(0.1),
                    ),
                    const SizedBox(height: 12),
                    _infoRow(Icons.phone, user?.phone ?? 'N/A'),
                    _infoRow(Icons.email, user?.email ?? 'N/A'),
                    _infoRow(Icons.location_on, '${user?.city ?? "N/A"}, Pakistan'),
                    _infoRow(Icons.verified_user,
                        'KYC: ${user?.kycStatus.name.toUpperCase() ?? "PENDING"}'),
                    if (user?.subscriptionStatus != null)
                      _infoRow(Icons.card_membership,
                          'Subscription: ${user!.subscriptionStatus!.name.toUpperCase()} (${user.subscriptionDaysLeft ?? 0} days left)'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Quick stats
            Row(
              children: [
                _statCard('Listings', '${myListings.length}', Icons.inventory_2, Colors.green),
                const SizedBox(width: 12),
                _statCard('Views', '156', Icons.visibility, Colors.blue),
                const SizedBox(width: 12),
                _statCard('Offers', '8', Icons.handshake, Colors.orange),
              ],
            ),
            const SizedBox(height: 20),

            // My Listings
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('My Listings',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: () => context.go('/create'),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('New'),
                ),
              ],
            ),
            const SizedBox(height: 8),

            ...myListings.map((listing) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.inventory_2, color: Colors.grey),
                ),
                title: Text(listing.title,
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text('₨ ${listing.pricePkr}/${listing.unit} · ${listing.interestedCount} interested'),
                trailing: Chip(
                  label: Text(listing.status.name.toUpperCase(),
                      style: const TextStyle(fontSize: 10)),
                  backgroundColor: listing.status == ListingStatus.active
                      ? Colors.green[50]
                      : Colors.grey[100],
                  side: BorderSide.none,
                  padding: EdgeInsets.zero,
                ),
                onTap: () => context.go('/listing/${listing.id}'),
              ),
            )),

            const SizedBox(height: 16),

            // Menu items
            Card(
              child: Column(
                children: [
                  _menuItem(Icons.edit, 'Edit Profile / پروفائل ترمیم', () {
                    context.push('/edit-profile');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.account_balance_wallet, 'Wallet / والیٹ', () {
                    context.push('/wallet');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.receipt_long, 'Transactions / لین دین', () {
                    context.push('/transactions');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.card_membership, 'Subscription / سبسکرپشن', () {
                    context.push('/subscription');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.bar_chart, 'Analytics / تجزیات', () {
                    context.push('/analytics');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.chat, 'Chat / چیٹ', () {
                    context.push('/chat/demo-room');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.settings, 'Settings / ترتیبات', () {
                    context.push('/settings');
                  }),
                  const Divider(height: 1),
                  _menuItem(Icons.help_outline, 'Help & Support', () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('support@greencollect.pk')),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: 100),
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

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 4),
              Text(value,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Text(label,
                  style: TextStyle(fontSize: 11, color: Colors.grey[600])),
            ],
          ),
        ),
      ),
    );
  }

  Widget _menuItem(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF16A34A)),
      title: Text(label),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }

  String _roleLabel(dynamic role) {
    if (role == null) return 'Customer';
    switch (role.toString()) {
      case 'UserRole.customer':
        return '👤 Customer';
      case 'UserRole.localDealer':
        return '🏪 Local Dealer';
      case 'UserRole.cityFranchise':
        return '🏢 City Franchise';
      case 'UserRole.wholesale':
        return '🏭 Wholesale';
      default:
        return 'Customer';
    }
  }

  Color _roleColor(dynamic role) {
    if (role == null) return Colors.grey;
    switch (role.toString()) {
      case 'UserRole.customer':
        return Colors.grey;
      case 'UserRole.localDealer':
        return Colors.blue;
      case 'UserRole.cityFranchise':
        return Colors.purple;
      case 'UserRole.wholesale':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
