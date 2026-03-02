import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _useEmail = false;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),

              // Logo
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Center(
                    child: Text('G', style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              const Text('GreenCollect', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('Pakistan\'s Recyclable Marketplace', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[600])),
              const SizedBox(height: 40),

              // Toggle login method
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _useEmail = false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(
                            color: !_useEmail ? Theme.of(context).primaryColor : Colors.transparent,
                            width: 2,
                          )),
                        ),
                        child: Text('📱 Phone Login', textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: !_useEmail ? FontWeight.w600 : FontWeight.normal,
                            color: !_useEmail ? Theme.of(context).primaryColor : Colors.grey,
                          )),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _useEmail = true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          border: Border(bottom: BorderSide(
                            color: _useEmail ? Theme.of(context).primaryColor : Colors.transparent,
                            width: 2,
                          )),
                        ),
                        child: Text('✉️ Email Login', textAlign: TextAlign.center,
                          style: TextStyle(
                            fontWeight: _useEmail ? FontWeight.w600 : FontWeight.normal,
                            color: _useEmail ? Theme.of(context).primaryColor : Colors.grey,
                          )),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Form(
                key: _formKey,
                child: _useEmail ? _buildEmailForm(auth) : _buildPhoneForm(auth),
              ),

              if (auth.error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(auth.error!, style: const TextStyle(color: Colors.red, fontSize: 13),
                    textAlign: TextAlign.center),
                ),

              const SizedBox(height: 24),

              // Register link
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Don\'t have an account? ', style: TextStyle(color: Colors.grey[600])),
                  GestureDetector(
                    onTap: () => context.go('/register'),
                    child: Text('Register', style: TextStyle(
                      color: Theme.of(context).primaryColor, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhoneForm(AuthProvider auth) {
    return Column(
      children: [
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'Phone Number',
            hintText: '3001234567',
            prefixText: '${ApiConfig.defaultCountryCode} ',
            prefixIcon: const Icon(Icons.phone),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Enter phone number' : null,
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: auth.isLoading ? null : () async {
              if (_formKey.currentState!.validate()) {
                final success = await auth.loginWithPhone(_phoneController.text);
                if (success && mounted) {
                  context.go('/otp', extra: _phoneController.text);
                }
              }
            },
            child: auth.isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Send OTP'),
          ),
        ),
      ],
    );
  }

  Widget _buildEmailForm(AuthProvider auth) {
    return Column(
      children: [
        TextFormField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'your@email.com',
            prefixIcon: Icon(Icons.email),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Enter email' : null,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Password',
            hintText: '••••••••',
            prefixIcon: Icon(Icons.lock),
          ),
          validator: (v) => (v == null || v.isEmpty) ? 'Enter password' : null,
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: auth.isLoading ? null : () async {
              if (_formKey.currentState!.validate()) {
                final success = await auth.loginWithEmail(
                  _emailController.text, _passwordController.text);
                if (success && mounted) context.go('/');
              }
            },
            child: auth.isLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Login'),
          ),
        ),
      ],
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
