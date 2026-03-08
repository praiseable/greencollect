import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/config/app_variant.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePass = true;
  bool _obscureConfirm = true;
  bool _agreeTerms = false;
  bool _isLoading = false;
  String _selectedRole = AppVariant.isPro ? 'dealer' : 'customer';
  String _selectedCity = 'Karachi';

  List<Map<String, dynamic>> get _roles => AppVariant.isPro
      ? [
          {'key': 'dealer', 'label': '🏪 Local Dealer', 'desc': 'Zone-based trading (paid)', 'color': Colors.blue},
          {'key': 'franchise', 'label': '🏢 City Franchise', 'desc': 'Multi-zone access (paid)', 'color': Colors.purple},
          {'key': 'wholesale', 'label': '🏭 Wholesale', 'desc': 'Bulk buying nationwide (paid)', 'color': Colors.red},
        ]
      : [
          {'key': 'customer', 'label': '👤 Customer', 'desc': 'Buy & sell scrap (free)', 'color': Colors.grey},
        ];

  final _cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot',
    'Gujranwala', 'Sargodha', 'Bahawalpur', 'Sukkur', 'Mardan',
  ];

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please agree to Terms & Conditions'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    // Simulate registration delay
    await Future.delayed(const Duration(seconds: 1));

    final success = await ref.read(authProvider.notifier).sendOtp(
      _phoneCtrl.text,
      _selectedRole,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go('/auth/otp?phone=${Uri.encodeComponent(_phoneCtrl.text)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/auth/login'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              const Text(
                'رجسٹر کریں',
                style: TextStyle(fontSize: 16, color: Colors.grey),
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),

              // Customer vs Dealer info
              if (AppVariant.isPro)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.amber[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Icon(Icons.info_outline, color: Colors.amber[800], size: 18),
                        const SizedBox(width: 8),
                        Text('Dealer / Franchise Registration',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber[900], fontSize: 13)),
                      ]),
                      const SizedBox(height: 6),
                      Text(
                        '• Original CNIC front & back photos required\n'
                        '• SIM must be registered in your own name\n'
                        '• Warehouse address + 3 photos required\n'
                        '• Your photo must match CNIC photo\n'
                        '• Criminal activity = ID blocked\n'
                        '• Deposit required after approval',
                        style: TextStyle(fontSize: 11, color: Colors.amber[800], height: 1.5),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green[200]!),
                  ),
                  child: Row(children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Customer registration is FREE — no documents needed!',
                        style: TextStyle(fontSize: 12, color: Colors.green[800]),
                      ),
                    ),
                  ]),
                ),
              const SizedBox(height: 16),

              // Full Name
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  hintText: 'Ali Hassan',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),

              // Phone Number
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone Number *',
                  hintText: '3XX XXXXXXX',
                  prefixText: '+92 ',
                  prefixIcon: const Icon(Icons.phone),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Phone is required' : null,
              ),
              const SizedBox(height: 16),

              // Password
              TextFormField(
                controller: _passwordCtrl,
                obscureText: _obscurePass,
                decoration: InputDecoration(
                  labelText: 'Password *',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscurePass = !_obscurePass),
                  ),
                ),
                validator: (v) =>
                    (v?.length ?? 0) < 6 ? 'Password must be at least 6 characters' : null,
              ),
              const SizedBox(height: 16),

              // Confirm Password
              TextFormField(
                controller: _confirmCtrl,
                obscureText: _obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirm Password *',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                  ),
                ),
                validator: (v) => v != _passwordCtrl.text ? 'Passwords do not match' : null,
              ),
              const SizedBox(height: 24),

              // Role Selector
              const Text('I am a... / میں ہوں...',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              ...(_roles.map((role) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => setState(() => _selectedRole = role['key'] as String),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _selectedRole == role['key']
                            ? const Color(0xFF16A34A)
                            : Colors.grey[300]!,
                        width: _selectedRole == role['key'] ? 2 : 1,
                      ),
                      color: _selectedRole == role['key']
                          ? const Color(0xFF16A34A).withOpacity(0.05)
                          : null,
                    ),
                    child: Row(
                      children: [
                        Text(role['label'] as String,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: _selectedRole == role['key']
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            )),
                        const Spacer(),
                        Text(role['desc'] as String,
                            style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                        if (_selectedRole == role['key']) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 20),
                        ],
                      ],
                    ),
                  ),
                ),
              ))),
              const SizedBox(height: 16),

              // City Dropdown
              DropdownButtonFormField<String>(
                value: _selectedCity,
                decoration: const InputDecoration(
                  labelText: 'City *',
                  prefixIcon: Icon(Icons.location_city),
                ),
                items: _cities
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedCity = v ?? 'Karachi'),
              ),
              const SizedBox(height: 20),

              // Terms
              Row(
                children: [
                  Checkbox(
                    value: _agreeTerms,
                    onChanged: (v) => setState(() => _agreeTerms = v ?? false),
                    activeColor: const Color(0xFF16A34A),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _agreeTerms = !_agreeTerms),
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                          children: const [
                            TextSpan(text: 'I agree to the '),
                            TextSpan(
                              text: 'Terms & Conditions',
                              style: TextStyle(
                                color: Color(0xFF16A34A),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextSpan(text: ' and '),
                            TextSpan(
                              text: 'Privacy Policy',
                              style: TextStyle(
                                color: Color(0xFF16A34A),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Create Account Button
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _register,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.person_add),
                  label: Text(_isLoading ? 'Creating...' : 'Create Account',
                      style: const TextStyle(fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Already have account
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Already have an account? ',
                      style: TextStyle(color: Colors.grey[600])),
                  GestureDetector(
                    onTap: () => context.go('/auth/login'),
                    child: const Text('Login',
                        style: TextStyle(
                          color: Color(0xFF16A34A),
                          fontWeight: FontWeight.bold,
                        )),
                  ),
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }
}
