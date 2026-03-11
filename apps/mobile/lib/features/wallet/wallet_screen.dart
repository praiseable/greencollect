import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet / والیٹ')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Balance card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.green[800]!, Colors.green[500]!],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.green.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Available Balance',
                          style: TextStyle(color: Colors.white70, fontSize: 14)),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('PKR',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '₨ ${user?.balancePkr.toStringAsFixed(0) ?? "0"}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.name ?? 'User',
                    style: const TextStyle(color: Colors.white60, fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _actionBtn(Icons.add, 'Add Money', () {
                        context.push('/wallet/recharge');
                      }),
                      const SizedBox(width: 12),
                      _actionBtn(Icons.send, 'Send', () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Send money coming soon')),
                        );
                      }),
                      const SizedBox(width: 12),
                      _actionBtn(Icons.history, 'History', () {
                        // Scroll to transaction history below
                      }),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Quick actions
            const Text('Payment Methods / ادائیگی کے طریقے',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _paymentMethodTile(
              'JazzCash',
              'Connected • 03XX-XXXX567',
              Icons.phone_android,
              Colors.red,
              true,
            ),
            _paymentMethodTile(
              'Easypaisa',
              'Not connected',
              Icons.phone_android,
              Colors.green[700]!,
              false,
            ),
            _paymentMethodTile(
              'Bank Account',
              'Not connected',
              Icons.account_balance,
              Colors.blue,
              false,
            ),
            const SizedBox(height: 20),

            // Transaction history
            const Text('Recent Transactions / حالیہ لین دین',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _transactionTile(
              'Subscription Payment',
              'Local Dealer Weekly',
              '-₨ 1,500',
              '2 days ago',
              Colors.red,
              Icons.payment,
            ),
            _transactionTile(
              'Deal Payment Received',
              'Copper Wire Scrap',
              '+₨ 168,000',
              '3 days ago',
              Colors.green,
              Icons.arrow_downward,
            ),
            _transactionTile(
              'Wallet Recharge',
              'JazzCash',
              '+₨ 5,000',
              '5 days ago',
              Colors.green,
              Icons.add_circle,
            ),
            _transactionTile(
              'Deal Payment',
              'Iron Scrap - Partial',
              '-₨ 60,000',
              '1 week ago',
              Colors.red,
              Icons.arrow_upward,
            ),
            _transactionTile(
              'Wallet Recharge',
              'Easypaisa',
              '+₨ 10,000',
              '2 weeks ago',
              Colors.green,
              Icons.add_circle,
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(height: 4),
              Text(label,
                  style: const TextStyle(color: Colors.white, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _paymentMethodTile(
      String name, String subtitle, IconData icon, Color color, bool connected) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: connected
            ? const Chip(
                label: Text('Active',
                    style: TextStyle(color: Colors.green, fontSize: 11)),
                backgroundColor: Color(0xFFDCFCE7),
                side: BorderSide.none,
                padding: EdgeInsets.zero,
              )
            : TextButton(
                onPressed: () {},
                child: const Text('Connect', style: TextStyle(fontSize: 12)),
              ),
      ),
    );
  }

  Widget _transactionTile(String title, String subtitle, String amount,
      String time, Color amountColor, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: amountColor.withOpacity(0.1),
          child: Icon(icon, color: amountColor, size: 20),
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        subtitle: Text('$subtitle · $time',
            style: const TextStyle(fontSize: 12)),
        trailing: Text(amount,
            style: TextStyle(
                color: amountColor,
                fontWeight: FontWeight.bold,
                fontSize: 14)),
      ),
    );
  }
}

class RechargeScreen extends ConsumerStatefulWidget {
  const RechargeScreen({super.key});

  @override
  ConsumerState<RechargeScreen> createState() => _RechargeScreenState();
}

class _RechargeScreenState extends ConsumerState<RechargeScreen> {
  String _selectedMethod = 'jazzcash';
  final _amountCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  final _quickAmounts = [500, 1000, 2000, 5000, 10000];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Money / رقم شامل کریں')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Amount input
            const Text('Enter Amount / رقم درج کریں',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                prefixText: '₨ ',
                prefixStyle: const TextStyle(
                    fontSize: 28, fontWeight: FontWeight.bold, color: Colors.green),
                hintText: '0',
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              ),
            ),
            const SizedBox(height: 12),

            // Quick amounts
            Wrap(
              spacing: 8,
              children: _quickAmounts
                  .map((a) => ActionChip(
                        label: Text('₨ $a'),
                        onPressed: () => setState(() {
                          _amountCtrl.text = a.toString();
                        }),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 20),

            // Payment method
            const Text('Payment Method / ادائیگی کا طریقہ',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _methodTile('jazzcash', 'JazzCash', 'Most Popular',
                Icons.phone_android, Colors.red),
            _methodTile('easypaisa', 'Easypaisa', 'Microfinance',
                Icons.phone_android, Colors.green[700]!),
            _methodTile('card', 'Credit/Debit Card', 'Visa, Mastercard',
                Icons.credit_card, Colors.blue),
            const SizedBox(height: 16),

            // Phone number for mobile wallets
            if (_selectedMethod != 'card')
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Mobile Number',
                  prefixText: '+92 ',
                  prefixIcon: const Icon(Icons.phone),
                  hintText: '3XX XXXXXXX',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            const SizedBox(height: 24),

            // Pay button
            ElevatedButton.icon(
              onPressed: _loading ? null : _handlePay,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF16A34A),
              ),
              icon: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.payment),
              label: Text(
                _loading
                    ? 'Processing...'
                    : 'Pay ₨ ${_amountCtrl.text.isEmpty ? "0" : _amountCtrl.text}',
                style: const TextStyle(fontSize: 16),
              ),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _methodTile(
      String id, String name, String subtitle, IconData icon, Color color) {
    final selected = _selectedMethod == id;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: selected ? color.withOpacity(0.05) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? color : Colors.grey[200]!,
          width: selected ? 2 : 1,
        ),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: selected
            ? const Icon(Icons.check_circle, color: Colors.green)
            : const Icon(Icons.circle_outlined, color: Colors.grey),
        onTap: () => setState(() => _selectedMethod = id),
      ),
    );
  }

  Future<void> _handlePay() async {
    if (_amountCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Enter an amount'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _loading = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _loading = false);
    if (mounted) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('Payment Successful!'),
            ],
          ),
          content: Text(
              '₨ ${_amountCtrl.text} has been added to your wallet via ${_selectedMethod == "jazzcash" ? "JazzCash" : _selectedMethod == "easypaisa" ? "Easypaisa" : "Card"}.'),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.pop();
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }
}
