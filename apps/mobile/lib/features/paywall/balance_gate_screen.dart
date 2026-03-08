import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/models/user.model.dart';

/// Full-screen overlay shown when a Pro user has zero balance.
/// Blocks access to all main features until balance is recharged
/// (which can only be done via admin portal / backend).
class BalanceGateScreen extends ConsumerWidget {
  const BalanceGateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.red[900]!, Colors.red[700]!, Colors.red[500]!],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Lock icon
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_outline,
                    size: 72,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 32),

                const Text(
                  'Account Locked',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'اکاؤنٹ مقفل ہے',
                  style: TextStyle(
                    fontSize: 20,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 24),

                // Balance info card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.account_balance_wallet,
                          color: Colors.white54, size: 36),
                      const SizedBox(height: 12),
                      Text(
                        '₨ ${user?.balancePkr.toStringAsFixed(0) ?? "0"}',
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Current Balance',
                        style: TextStyle(color: Colors.white60, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Reason text
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'Insufficient Balance',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _getBlockReason(user),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Contact admin button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          title: const Text('Contact Admin'),
                          content: const Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('To recharge your account, contact:'),
                              SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.phone, size: 16, color: Colors.green),
                                  SizedBox(width: 8),
                                  Text('+92 300-1234567',
                                      style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.email, size: 16, color: Colors.blue),
                                  SizedBox(width: 8),
                                  Text('admin@kabariya.pk',
                                      style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.chat, size: 16, color: Colors.green),
                                  SizedBox(width: 8),
                                  Text('WhatsApp: +92 300-1234567',
                                      style: TextStyle(fontWeight: FontWeight.bold)),
                                ],
                              ),
                              SizedBox(height: 16),
                              Text(
                                'Payment Methods: JazzCash, Easypaisa, Bank Transfer',
                                style: TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: const Text('Close'),
                            ),
                          ],
                        ),
                      );
                    },
                    icon: const Icon(Icons.support_agent),
                    label: const Text('Contact Admin to Recharge',
                        style: TextStyle(fontSize: 16)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.red[800],
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Profile only — can view profile but nothing else
                TextButton.icon(
                  onPressed: () => context.go('/profile'),
                  icon: const Icon(Icons.person_outline, color: Colors.white70),
                  label: const Text('View My Profile',
                      style: TextStyle(color: Colors.white70)),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () {
                    ref.read(authProvider.notifier).logout();
                    context.go('/auth/login');
                  },
                  icon: const Icon(Icons.logout, color: Colors.white54, size: 18),
                  label: const Text('Sign Out',
                      style: TextStyle(color: Colors.white54, fontSize: 13)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getBlockReason(UserModel? user) {
    if (user == null) return '';

    if (user.accountStatus == AccountStatus.suspended) {
      return 'Your account has been suspended by the administrator. '
          'Please contact admin for more information.';
    }
    if (user.accountStatus == AccountStatus.pendingVerification) {
      return 'Your account is pending document verification. '
          'Please wait for admin approval.';
    }
    if (user.accountStatus == AccountStatus.rejected) {
      return 'Your verification documents were rejected. '
          'Please contact admin to resubmit.';
    }
    if (!user.hasBalance) {
      return 'Your wallet balance is ₨ 0. You need to recharge '
          'your account to access listings, deals, and other features. '
          'Only admin can add balance to your account.';
    }
    return 'Your account access is restricted. Contact admin.';
  }
}
