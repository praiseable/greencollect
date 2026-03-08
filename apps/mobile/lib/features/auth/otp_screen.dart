import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pinput/pinput.dart';
import '../../core/providers/auth.provider.dart';
import '../../core/config/app_variant.dart';
import '../../core/models/user.model.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;
  const OtpScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) return;
    setState(() => _isLoading = true);

    final success = await ref.read(authProvider.notifier).verifyOtp(
      _otpController.text,
    );

    setState(() => _isLoading = false);

    if (success && mounted) {
      // Pro app: If dealer/franchise role, redirect to KYC registration
      final user = ref.read(authProvider);
      if (AppVariant.isPro && user != null && user.role != UserRole.customer) {
        // Check if KYC is already completed
        if (user.kycStatus == KycStatus.approved) {
          context.go('/home');
        } else {
          context.go('/auth/kyc');
        }
      } else {
        // Customer: free registration, go directly to home
        context.go('/home');
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid OTP. Try 123456'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify OTP')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF16A34A).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.sms, size: 40, color: Color(0xFF16A34A)),
            ),
            const SizedBox(height: 24),
            const Text('Verification Code',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              'We sent a 6-digit code to\n${widget.phone}',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 32),
            Pinput(
              controller: _otpController,
              length: 6,
              onCompleted: (_) => _verifyOtp(),
              defaultPinTheme: PinTheme(
                width: 48,
                height: 56,
                textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
              ),
              focusedPinTheme: PinTheme(
                width: 48,
                height: 56,
                textStyle: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF16A34A), width: 2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _verifyOtp,
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Verify & Login', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('OTP resent!')),
                );
              },
              child: const Text('Resend OTP'),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.info_outline, size: 16, color: Colors.blue[700]),
                      const SizedBox(width: 8),
                      Text(
                        'OTP by account:',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue[700]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '03001234567 → 111111\n'
                    '03219876543 → 222222\n'
                    '03335551234 → 333333\n'
                    '03451112233 → 444444\n'
                    '── Islamabad ──\n'
                    '03001110001 (BaraKahu) → 550001\n'
                    '03001110002 (G-6) → 660002\n'
                    '03001110003 (G-8) → 770003\n'
                    '03001110004 (ISB Fran) → 880004',
                    style: TextStyle(fontSize: 11, color: Colors.blue[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
