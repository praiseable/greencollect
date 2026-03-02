import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/api_config.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  String _role = 'CUSTOMER';

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Account'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/login')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Join Pakistan\'s largest recyclable marketplace',
                style: TextStyle(color: Colors.grey[600], fontSize: 14)),
              const SizedBox(height: 24),

              // Name
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameCtrl,
                      decoration: const InputDecoration(labelText: 'First Name', hintText: 'Ali'),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameCtrl,
                      decoration: const InputDecoration(labelText: 'Last Name', hintText: 'Khan'),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Phone
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '3001234567',
                  prefixText: '${ApiConfig.defaultCountryCode} ',
                  prefixIcon: const Icon(Icons.phone),
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
              ),
              const SizedBox(height: 16),

              // Email (optional)
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email (Optional)',
                  hintText: 'your@email.com',
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              const SizedBox(height: 16),

              // Role
              DropdownButtonFormField<String>(
                value: _role,
                decoration: const InputDecoration(labelText: 'I am a', prefixIcon: Icon(Icons.person)),
                items: const [
                  DropdownMenuItem(value: 'CUSTOMER', child: Text('Home / Shop Owner')),
                  DropdownMenuItem(value: 'DEALER', child: Text('Scrap Dealer')),
                  DropdownMenuItem(value: 'FRANCHISE_DEALER', child: Text('Franchise Dealer')),
                ],
                onChanged: (v) => setState(() => _role = v!),
              ),
              const SizedBox(height: 24),

              if (auth.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(auth.error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),

              ElevatedButton(
                onPressed: auth.isLoading ? null : _handleRegister,
                child: auth.isLoading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Register & Send OTP'),
              ),

              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Already have an account? ', style: TextStyle(color: Colors.grey[600])),
                  GestureDetector(
                    onTap: () => context.go('/login'),
                    child: Text('Login', style: TextStyle(
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

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();

    final success = await auth.register(
      firstName: _firstNameCtrl.text,
      lastName: _lastNameCtrl.text,
      phone: _phoneCtrl.text,
      email: _emailCtrl.text.isNotEmpty ? _emailCtrl.text : null,
      role: _role,
    );

    if (success && mounted) {
      context.go('/otp', extra: _phoneCtrl.text);
    }
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }
}
