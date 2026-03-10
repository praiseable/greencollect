import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/config/app_variant.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _useEmailLogin = false;
  String? _loginError;
  String _selectedRole = AppVariant.isPro ? 'dealer' : 'customer';

  Map<String, String> get _roles => AppVariant.isPro
      ? {
          'dealer': '🏪 Local Dealer',
          'franchise': '🏢 City Franchise',
          'wholesale': '🏭 Wholesale',
        }
      : {
          'customer': '👤 Customer',
        };

  Widget _testRow(String role, String phone, String otp) {
    return Padding(
      padding: const EdgeInsets.only(left: 24, top: 2),
      child: Text(
        '$role: $phone → OTP $otp',
        style: TextStyle(fontSize: 11, color: Colors.blue[600]),
      ),
    );
  }

  Future<void> _sendOtp() async {
    if (_phoneController.text.isEmpty) return;
    setState(() { _isLoading = true; _loginError = null; });

    final success = await ref.read(authProvider.notifier).sendOtp(
      _phoneController.text,
      _selectedRole,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go('/auth/otp?phone=${Uri.encodeComponent(_phoneController.text)}');
    }
  }

  Future<void> _loginWithEmail() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      setState(() => _loginError = 'Enter email and password');
      return;
    }
    setState(() { _isLoading = true; _loginError = null; });

    final error = await ref.read(authProvider.notifier).loginWithEmailPassword(email, password);

    setState(() { _isLoading = false; _loginError = error; });

    if (error == null && mounted) context.go('/home');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              ClipRRect(
                borderRadius: BorderRadius.circular(50),
                child: Image.asset(
                  'assets/images/logo_icon.png',
                  width: 80,
                  height: 80,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16A34A).withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.eco, size: 48, color: Color(0xFF16A34A)),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                AppVariant.appName,
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                AppVariant.appNameUrdu,
                style: TextStyle(fontSize: 18, color: Colors.grey[600]),
              ),
              const SizedBox(height: 8),
              Text(
                AppVariant.tagline,
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              ),
              const SizedBox(height: 40),

              // Toggle: Phone OTP vs Email
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() { _useEmailLogin = false; _loginError = null; }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(
                            color: !_useEmailLogin ? const Color(0xFF16A34A) : Colors.transparent,
                            width: 2,
                          )),
                        ),
                        child: Text('📱 Phone', textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: !_useEmailLogin ? FontWeight.w600 : FontWeight.normal,
                              color: !_useEmailLogin ? const Color(0xFF16A34A) : Colors.grey,
                            )),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() { _useEmailLogin = true; _loginError = null; }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(
                            color: _useEmailLogin ? const Color(0xFF16A34A) : Colors.transparent,
                            width: 2,
                          )),
                        ),
                        child: Text('✉️ Email', textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: _useEmailLogin ? FontWeight.w600 : FontWeight.normal,
                              color: _useEmailLogin ? const Color(0xFF16A34A) : Colors.grey,
                            )),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              if (_useEmailLogin) ...[
                TextField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Email',
                    hintText: 'dealer@marketplace.pk',
                    prefixIcon: const Icon(Icons.email),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: '••••••••',
                    prefixIcon: const Icon(Icons.lock),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  obscureText: true,
                ),
                if (_loginError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(_loginError!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                  ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _loginWithEmail,
                    icon: _isLoading
                        ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.login),
                    label: Text(_isLoading ? 'Logging in...' : 'Login with email'),
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ] else ...[
                // Phone number
                TextField(
                  controller: _phoneController,
                  decoration: InputDecoration(
                    labelText: 'Phone Number',
                    hintText: '3001234567',
                    prefixText: '+92 ',
                    prefixIcon: const Icon(Icons.phone),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 16),

                // Role selector (Pro only — customer app has single role)
                if (AppVariant.showDealerRoles) ...[
                  DropdownButtonFormField<String>(
                    value: _selectedRole,
                    decoration: InputDecoration(
                      labelText: 'I am a...',
                      prefixIcon: const Icon(Icons.person),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: _roles.entries
                        .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedRole = v ?? 'dealer'),
                  ),
                  const SizedBox(height: 16),
                ],

                // Send OTP button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _sendOtp,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.sms),
                    label: Text(_isLoading ? 'Sending...' : 'Send OTP'),
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Register link — only Customer app allows self-registration
              // Pro accounts are created by admin only
              if (AppVariant.isCustomer)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Don't have an account? ",
                        style: TextStyle(color: Colors.grey[600])),
                    GestureDetector(
                      onTap: () => context.go('/auth/register'),
                      child: const Text('Register',
                          style: TextStyle(
                            color: Color(0xFF16A34A),
                            fontWeight: FontWeight.bold,
                          )),
                    ),
                  ],
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.verified_user, color: Colors.orange[700], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Pro accounts are created by admin only after document verification.',
                          style: TextStyle(color: Colors.orange[800], fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 16),

              // Test accounts hint
              Expanded(
                child: SingleChildScrollView(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppVariant.isPro ? Colors.amber[50] : Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline, size: 16,
                                color: AppVariant.isPro ? Colors.amber[800] : Colors.blue[700]),
                            const SizedBox(width: 8),
                            Text('Test Accounts:',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppVariant.isPro ? Colors.amber[800] : Colors.blue[700])),
                          ],
                        ),
                        const SizedBox(height: 6),
                        if (_useEmailLogin) ...[
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: Text('Pro: dealer@marketplace.pk / Dealer@123',
                                style: TextStyle(fontSize: 11, color: Colors.grey[700])),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: Text('Customer: customer@marketplace.pk / Customer@123',
                                style: TextStyle(fontSize: 11, color: Colors.grey[700])),
                          ),
                        ] else if (AppVariant.isCustomer) ...[
                          _testRow('Customer', '03001234567', '111111'),
                        ],
                        if (!_useEmailLogin && AppVariant.isPro) ...[
                          _testRow('Dealer (KHI)', '03219876543', '222222'),
                          _testRow('Franchise (KHI)', '03335551234', '333333'),
                          _testRow('Wholesale', '03451112233', '444444'),
                          const SizedBox(height: 4),
                          Padding(
                            padding: const EdgeInsets.only(left: 24),
                            child: Text(
                              '── Islamabad Area Dealers ──',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber[900]),
                            ),
                          ),
                          _testRow('Bara Kahu', '03001110001', '550001'),
                          _testRow('G-6', '03001110002', '660002'),
                          _testRow('G-8', '03001110003', '770003'),
                          _testRow('ISB Franchise', '03001110004', '880004'),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
