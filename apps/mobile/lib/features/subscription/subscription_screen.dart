import 'package:flutter/material.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.subscriptionPlans. Plans from GET /v1/subscriptions/plans.

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final ApiService _api = ApiService();
  List<Map<String, dynamic>> _plans = [];
  Map<String, dynamic>? _currentSubscription;
  bool _loading    = true;
  bool _purchasing = false;
  String? _error;
  String? _purchasingPlanId;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        _api.get('subscriptions/plans'),
        _api.get('subscriptions/mine'),
      ]);

      final plansRaw = (results[0]['plans'] ?? results[0]['data'] ?? results[0]) as List<dynamic>;
      setState(() {
        _plans = plansRaw.cast<Map<String, dynamic>>();
        _currentSubscription =
            results[1]['subscription'] as Map<String, dynamic>? ??
            (results[1] is Map<String, dynamic> &&
                    results[1].containsKey('id')
                ? results[1] as Map<String, dynamic>
                : null);
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error   = e.toString().split('Exception:').last.trim();
        _loading = false;
      });
    }
  }

  Future<void> _subscribe(String planId, int price) async {
    if (price > 0) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Confirm Purchase'),
          content: Text('PKR ${(price / 100).toStringAsFixed(0)} will be deducted from your wallet.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              child: const Text('Confirm'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    setState(() { _purchasing = true; _purchasingPlanId = planId; });
    try {
      await _api.post('subscriptions/purchase', {'planId': planId});
      await _fetchData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Subscription activated!'),
              backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().split('Exception:').last.trim()),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() { _purchasing = false; _purchasingPlanId = null; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription Plans'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: _fetchData, child: const Text('Retry')),
                ]))
              : RefreshIndicator(
                  onRefresh: _fetchData,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_currentSubscription != null) ...[
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              const Icon(Icons.check_circle, color: Colors.green),
                              const SizedBox(width: 8),
                              Text(
                                _currentSubscription!['plan']?['name'] as String? ?? 'Active Plan',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ]),
                            const SizedBox(height: 8),
                            if (_currentSubscription!['expiresAt'] != null)
                              Text(
                                'Expires: ${_currentSubscription!['expiresAt'].toString().substring(0, 10)}',
                                style: const TextStyle(color: Colors.green, fontSize: 13),
                              ),
                          ]),
                        ),
                        const SizedBox(height: 20),
                      ],

                      const Text('Choose a Plan',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),

                      ..._plans.map((plan) {
                        final price      = plan['price'] as int? ?? 0;
                        final isCurrent  = _currentSubscription?['planId'] == plan['id'];
                        final features   = plan['features'] as Map<String, dynamic>? ?? {};
                        final isPurchasing = _purchasingPlanId == plan['id'];

                        return Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: isCurrent
                                ? Border.all(color: Colors.green, width: 2)
                                : Border.all(color: Colors.grey.shade200),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05),
                                blurRadius: 8, offset: const Offset(0, 2))],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Expanded(
                                    child: Text(plan['name'] as String? ?? '',
                                        style: const TextStyle(fontSize: 18,
                                            fontWeight: FontWeight.bold)),
                                  ),
                                  if (isCurrent)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.green.shade100,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Text('Current',
                                          style: TextStyle(color: Colors.green,
                                              fontWeight: FontWeight.w600, fontSize: 12)),
                                    ),
                                ]),
                                const SizedBox(height: 8),
                                Text(
                                  price == 0
                                      ? 'Free'
                                      : 'PKR ${(price / 100).toStringAsFixed(0)} / ${plan['durationDays'] ?? 30} days',
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.bold,
                                    color: price == 0 ? Colors.grey : Colors.green,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _FeatureRow('Up to ${plan['maxListings'] ?? 5} listings'),
                                if (features['advanced_analytics'] == true)
                                  const _FeatureRow('Advanced analytics'),
                                if (features['priority_territory'] == true)
                                  const _FeatureRow('Priority territory assignments'),
                                const SizedBox(height: 16),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed: isCurrent || (_purchasing && !isPurchasing)
                                        ? null
                                        : () => _subscribe(plan['id'] as String, price),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isCurrent ? Colors.grey : Colors.green,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10)),
                                    ),
                                    child: isPurchasing
                                        ? const SizedBox(width: 20, height: 20,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2, color: Colors.white))
                                        : Text(
                                            isCurrent ? 'Current Plan'
                                                : price == 0 ? 'Activate Free'
                                                : 'Subscribe — PKR ${(price / 100).toStringAsFixed(0)}',
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final String text;
  const _FeatureRow(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(children: [
        const Icon(Icons.check, color: Colors.green, size: 16),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 13, color: Colors.black87)),
      ]),
    );
  }
}
