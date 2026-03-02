import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class OtpScreen extends StatefulWidget {
  final String phone;
  const OtpScreen({super.key, required this.phone});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  String get otp => _controllers.map((c) => c.text).join();

  void _onChanged(int index, String value) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    if (otp.length == 6) {
      _verifyOtp();
    }
  }

  Future<void> _verifyOtp() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.verifyOtp(widget.phone, otp);
    if (success && mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            const Icon(Icons.sms, size: 60, color: Colors.green),
            const SizedBox(height: 16),
            const Text('Enter Verification Code', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('We sent a 6-digit code to +92 ${widget.phone}',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 32),

            // OTP Fields
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(6, (i) => Container(
                width: 48,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                child: TextFormField(
                  controller: _controllers[i],
                  focusNode: _focusNodes[i],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 1,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(counterText: ''),
                  onChanged: (v) => _onChanged(i, v),
                ),
              )),
            ),

            if (auth.error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(auth.error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
              ),

            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: auth.isLoading ? null : _verifyOtp,
              child: auth.isLoading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Verify'),
            ),

            const SizedBox(height: 16),
            TextButton(
              onPressed: () async {
                await context.read<AuthProvider>().loginWithPhone(widget.phone);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('OTP resent!')),
                  );
                }
              },
              child: const Text('Resend OTP'),
            ),

            // Dev hint
            Container(
              margin: const EdgeInsets.only(top: 24),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text('Dev: Use OTP 123456 for testing',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    for (var c in _controllers) { c.dispose(); }
    for (var f in _focusNodes) { f.dispose(); }
    super.dispose();
  }
}
