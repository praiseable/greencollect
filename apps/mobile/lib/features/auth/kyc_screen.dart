import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class KycScreen extends ConsumerStatefulWidget {
  const KycScreen({super.key});

  @override
  ConsumerState<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends ConsumerState<KycScreen> {
  bool _cnicFrontUploaded = false;
  bool _cnicBackUploaded = false;
  bool _selfieUploaded = false;
  bool _isSubmitting = false;
  final _cnicCtrl = TextEditingController();

  Future<void> _simulateUpload(String type) async {
    // Simulate picking + uploading
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      switch (type) {
        case 'front':
          _cnicFrontUploaded = true;
          break;
        case 'back':
          _cnicBackUploaded = true;
          break;
        case 'selfie':
          _selfieUploaded = true;
          break;
      }
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$type uploaded successfully ✓'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _submitKyc() async {
    if (_cnicCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your CNIC number'), backgroundColor: Colors.red),
      );
      return;
    }
    if (!_cnicFrontUploaded || !_cnicBackUploaded || !_selfieUploaded) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload all documents'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _isSubmitting = false);

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('KYC Submitted'),
            ],
          ),
          content: const Text(
            'Your documents are being reviewed. This usually takes 24-48 hours.\n\nآپ کی دستاویزات جانچ میں ہیں۔ عام طور پر 24-48 گھنٹے لگتے ہیں۔',
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.go('/home');
              },
              child: const Text('Continue'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KYC Verification'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Identity Verification',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[800])),
                        const SizedBox(height: 4),
                        Text(
                          'Required for dealers and franchises to create listings and finalize deals.',
                          style: TextStyle(fontSize: 12, color: Colors.blue[700]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Urdu info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'شناخت کی تصدیق — اپنا CNIC نمبر اور تصاویر فراہم کریں',
                style: TextStyle(fontSize: 14, color: Colors.grey),
                textDirection: TextDirection.rtl,
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),

            // CNIC Number
            TextFormField(
              controller: _cnicCtrl,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'CNIC Number *',
                hintText: 'XXXXX-XXXXXXX-X',
                prefixIcon: const Icon(Icons.credit_card),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 24),

            // Upload cards
            const Text('Upload Documents',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),

            _UploadCard(
              icon: Icons.credit_card,
              title: 'CNIC Front',
              subtitle: 'Clear photo of front side',
              isUploaded: _cnicFrontUploaded,
              onTap: () => _simulateUpload('front'),
            ),
            const SizedBox(height: 12),

            _UploadCard(
              icon: Icons.credit_card,
              title: 'CNIC Back',
              subtitle: 'Clear photo of back side',
              isUploaded: _cnicBackUploaded,
              onTap: () => _simulateUpload('back'),
            ),
            const SizedBox(height: 12),

            _UploadCard(
              icon: Icons.camera_alt,
              title: 'Selfie with CNIC',
              subtitle: 'Hold your CNIC next to your face',
              isUploaded: _selfieUploaded,
              onTap: () => _simulateUpload('selfie'),
            ),
            const SizedBox(height: 24),

            // Progress tracker
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Text('Verification Progress',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      const Spacer(),
                      Text(
                        '${[_cnicCtrl.text.isNotEmpty, _cnicFrontUploaded, _cnicBackUploaded, _selfieUploaded].where((e) => e).length}/4',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green[700]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                    value: [_cnicCtrl.text.isNotEmpty, _cnicFrontUploaded, _cnicBackUploaded, _selfieUploaded]
                            .where((e) => e)
                            .length /
                        4,
                    backgroundColor: Colors.grey[200],
                    valueColor: const AlwaysStoppedAnimation(Color(0xFF16A34A)),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Submit
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _submitKyc,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.verified_user),
                label: Text(_isSubmitting ? 'Submitting...' : 'Submit KYC',
                    style: const TextStyle(fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Skip
            TextButton(
              onPressed: () => context.go('/home'),
              child: const Text('Skip for now',
                  style: TextStyle(color: Colors.grey)),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _cnicCtrl.dispose();
    super.dispose();
  }
}

class _UploadCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isUploaded;
  final VoidCallback onTap;

  const _UploadCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.isUploaded,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: isUploaded ? null : onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isUploaded ? Colors.green : Colors.grey[300]!,
            width: isUploaded ? 2 : 1,
          ),
          color: isUploaded ? Colors.green[50] : null,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isUploaded
                    ? Colors.green[100]
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isUploaded ? Icons.check_circle : icon,
                color: isUploaded ? Colors.green : Colors.grey,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isUploaded ? Colors.green[800] : null,
                      )),
                  Text(subtitle,
                      style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ],
              ),
            ),
            if (!isUploaded)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text('Upload',
                    style: TextStyle(
                      color: Color(0xFF16A34A),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    )),
              )
            else
              const Text('✓ Uploaded',
                  style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
