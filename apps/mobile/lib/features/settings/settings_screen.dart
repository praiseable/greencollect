import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../core/providers/auth.provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _notifListings = true;
  bool _notifOffers = true;
  bool _notifMessages = true;
  bool _notifSubscription = true;

  @override
  Widget build(BuildContext context) {
    final isUrdu = context.locale.languageCode == 'ur';

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Language section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.language, color: Color(0xFF16A34A)),
                      SizedBox(width: 8),
                      Text('Language / زبان',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _LanguageButton(
                          label: 'English',
                          isSelected: !isUrdu,
                          onTap: () {
                            context.setLocale(const Locale('en'));
                            setState(() {});
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _LanguageButton(
                          label: 'اردو',
                          isSelected: isUrdu,
                          onTap: () {
                            context.setLocale(const Locale('ur'));
                            setState(() {});
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Notifications section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.notifications, color: Color(0xFF16A34A)),
                      SizedBox(width: 8),
                      Text('Notifications',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SwitchListTile(
                    title: const Text('New Listings'),
                    subtitle: const Text('Notify when new listings appear in your zone'),
                    value: _notifListings,
                    onChanged: (v) => setState(() => _notifListings = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                  SwitchListTile(
                    title: const Text('Offers & Deals'),
                    subtitle: const Text('Notify when you receive offers'),
                    value: _notifOffers,
                    onChanged: (v) => setState(() => _notifOffers = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                  SwitchListTile(
                    title: const Text('Messages'),
                    subtitle: const Text('Chat message notifications'),
                    value: _notifMessages,
                    onChanged: (v) => setState(() => _notifMessages = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                  SwitchListTile(
                    title: const Text('Subscription'),
                    subtitle: const Text('Renewal and expiry reminders'),
                    value: _notifSubscription,
                    onChanged: (v) => setState(() => _notifSubscription = v),
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // About section
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline, color: Color(0xFF16A34A)),
                  title: const Text('App Version'),
                  trailing: Text('1.0.0', style: TextStyle(color: Colors.grey[600])),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, color: Color(0xFF16A34A)),
                  title: const Text('Privacy Policy'),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening privacy policy...')),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.description_outlined, color: Color(0xFF16A34A)),
                  title: const Text('Terms of Service'),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening terms of service...')),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.support_agent, color: Color(0xFF16A34A)),
                  title: const Text('Contact Support'),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('support@greencollect.pk')),
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Danger zone
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Sign Out', style: TextStyle(color: Colors.red)),
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Text('Sign Out'),
                        content: const Text('Are you sure you want to sign out?'),
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
                            child: const Text('Sign Out'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.delete_forever, color: Colors.red),
                  title: const Text('Delete Account',
                      style: TextStyle(color: Colors.red)),
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (_) => AlertDialog(
                        title: const Row(
                          children: [
                            Icon(Icons.warning, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Delete Account'),
                          ],
                        ),
                        content: const Text(
                          'This action is irreversible. All your data, listings, and transactions will be permanently deleted.\n\nیہ عمل واپس نہیں ہو سکتا۔'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancel'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Account deletion request submitted'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 100),
        ],
      ),
    );
  }
}

class _LanguageButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _LanguageButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: isSelected ? const Color(0xFF16A34A) : Colors.grey[100],
          border: Border.all(
            color: isSelected ? const Color(0xFF16A34A) : Colors.grey[300]!,
            width: 2,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey[700],
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
