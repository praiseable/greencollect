import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/subscription.model.dart';
import '../../core/models/user.model.dart';

class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends ConsumerState<SubscriptionScreen> {
  String _selectedPayment = 'jazzcash';
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);
    final plans = MockData.subscriptionPlans;

    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current plan card
            if (user?.subscriptionStatus != null)
              Card(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF16A34A), Color(0xFF15803D)],
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.card_membership, color: Colors.white, size: 28),
                          const SizedBox(width: 8),
                          const Text('Current Plan',
                              style: TextStyle(color: Colors.white70, fontSize: 14)),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              user!.subscriptionStatus!.name.toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '${user.subscriptionDaysLeft ?? 0}',
                        style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold),
                      ),
                      const Text('days remaining / باقی دن',
                          style: TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: (user.subscriptionDaysLeft ?? 0) / 30,
                        backgroundColor: Colors.white.withOpacity(0.2),
                        valueColor: const AlwaysStoppedAnimation(Colors.white),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => _showPaymentDialog(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.green[800],
                          ),
                          child: const Text('Renew Now / ابھی تجدید کریں'),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Icon(Icons.card_membership, size: 48, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text('No Active Subscription',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text('Choose a plan below to get started',
                          style: TextStyle(color: Colors.grey[600])),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 24),

            // Plans
            const Text('Available Plans / دستیاب پلانز',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            ...plans.map((plan) => _PlanCard(
              plan: plan,
              onSelect: () => _showPaymentDialog(context, plan: plan),
            )),

            const SizedBox(height: 24),

            // Payment methods section
            const Text('Payment Methods / ادائیگی کے طریقے',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            _PaymentMethodTile(
              icon: Icons.phone_android,
              title: 'JazzCash',
              subtitle: 'Most popular in Pakistan',
              isSelected: _selectedPayment == 'jazzcash',
              badge: 'Popular',
              onTap: () => setState(() => _selectedPayment = 'jazzcash'),
            ),
            _PaymentMethodTile(
              icon: Icons.phone_android,
              title: 'Easypaisa',
              subtitle: 'Quick mobile payment',
              isSelected: _selectedPayment == 'easypaisa',
              onTap: () => setState(() => _selectedPayment = 'easypaisa'),
            ),
            _PaymentMethodTile(
              icon: Icons.credit_card,
              title: 'Credit/Debit Card',
              subtitle: 'Visa, Mastercard (Stripe)',
              isSelected: _selectedPayment == 'card',
              onTap: () => setState(() => _selectedPayment = 'card'),
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  void _showPaymentDialog(BuildContext context, {SubscriptionPlanModel? plan}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Icon(Icons.payment, size: 48, color: Color(0xFF16A34A)),
            const SizedBox(height: 12),
            Text(
              plan != null ? 'Pay for ${plan.name}' : 'Renew Subscription',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              plan != null ? '₨ ${plan.priceMonthly}/month' : '₨ 1,500/month',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green[700]),
            ),
            const SizedBox(height: 8),
            Text(
              'Payment: $_selectedPayment',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 20),
            if (_selectedPayment != 'card')
              TextField(
                decoration: InputDecoration(
                  labelText: 'Mobile Number',
                  prefixText: '+92 ',
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                keyboardType: TextInputType.phone,
              ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isProcessing
                    ? null
                    : () async {
                        setState(() => _isProcessing = true);
                        Navigator.pop(context);
                        await Future.delayed(const Duration(seconds: 2));
                        setState(() => _isProcessing = false);
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
                              content: const Text(
                                'Your subscription has been renewed for 30 days.\n\nآپ کی سبسکرپشن 30 دن کے لیے تجدید ہو گئی ہے۔'),
                              actions: [
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Great!'),
                                ),
                              ],
                            ),
                          );
                        }
                      },
                child: Text(
                  'Pay ₨ ${plan?.priceMonthly ?? 1500}',
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final SubscriptionPlanModel plan;
  final VoidCallback onSelect;

  const _PlanCard({required this.plan, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(plan.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(plan.nameUr,
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                          textDirection: TextDirection.rtl),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('₨ ${plan.priceWeekly}/wk',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    Text('₨ ${plan.priceMonthly}/mo',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.green[700])),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: plan.features
                  .map((f) => Chip(
                        label: Text(f, style: const TextStyle(fontSize: 11)),
                        backgroundColor: Colors.green[50],
                        side: BorderSide.none,
                        padding: EdgeInsets.zero,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ))
                  .toList(),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onSelect,
                child: const Text('Select Plan'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isSelected;
  final String? badge;
  final VoidCallback onTap;

  const _PaymentMethodTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isSelected,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: isSelected ? const Color(0xFF16A34A) : Colors.grey),
        title: Row(
          children: [
            Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
            if (badge != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(badge!, style: TextStyle(fontSize: 9, color: Colors.orange[800], fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: Radio<bool>(
          value: true,
          groupValue: isSelected,
          onChanged: (_) => onTap(),
          activeColor: const Color(0xFF16A34A),
        ),
        onTap: onTap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: isSelected ? const Color(0xFF16A34A) : Colors.transparent,
            width: 2,
          ),
        ),
      ),
    );
  }
}
