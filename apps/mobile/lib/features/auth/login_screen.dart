import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth.provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  String _selectedRole = 'customer';

  final _roles = {
    'customer': '👤 Customer',
    'dealer': '🏪 Local Dealer',
    'franchise': '🏢 City Franchise',
    'wholesale': '🏭 Wholesale',
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
    setState(() => _isLoading = true);

    final success = await ref.read(authProvider.notifier).sendOtp(
      _phoneController.text,
      _selectedRole,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go('/auth/otp?phone=${Uri.encodeComponent(_phoneController.text)}');
    }
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
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.eco, size: 48, color: Color(0xFF16A34A)),
              ),
              const SizedBox(height: 20),
              const Text(
                'GreenCollect',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'مارکیٹ پلیس',
                style: TextStyle(fontSize: 18, color: Colors.grey[600]),
              ),
              const SizedBox(height: 8),
              Text(
                'Trade recyclable materials in Pakistan',
                style: TextStyle(fontSize: 14, color: Colors.grey[500]),
              ),
              const SizedBox(height: 40),

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

              // Role selector
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
                onChanged: (v) => setState(() => _selectedRole = v ?? 'customer'),
              ),
              const SizedBox(height: 24),

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
              const SizedBox(height: 16),

              // Register link
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
              ),
              const SizedBox(height: 16),

              // Test accounts hint
              Expanded(
                child: SingleChildScrollView(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue[50],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info_outline, size: 16, color: Colors.blue[700]),
                            const SizedBox(width: 8),
                            Text('Test Accounts:',
                                style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue[700])),
                          ],
                        ),
                        const SizedBox(height: 6),
                        _testRow('Customer', '03001234567', '111111'),
                        _testRow('Dealer (KHI)', '03219876543', '222222'),
                        _testRow('Franchise (KHI)', '03335551234', '333333'),
                        _testRow('Wholesale', '03451112233', '444444'),
                        const SizedBox(height: 4),
                        Padding(
                          padding: const EdgeInsets.only(left: 24),
                          child: Text(
                            '── Islamabad Area Dealers ──',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue[800]),
                          ),
                        ),
                        _testRow('Bara Kahu', '03001110001', '550001'),
                        _testRow('G-6', '03001110002', '660002'),
                        _testRow('G-8', '03001110003', '770003'),
                        _testRow('ISB Franchise', '03001110004', '880004'),
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
}
