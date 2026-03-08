import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/config/app_variant.dart';

/// Comprehensive 6-step KYC registration for Dealer / Franchise users.
///
/// STEPS:
///   1. CNIC — Original front & back photos of ID card
///   2. SIM Verification — OTP sent only to SIM registered in dealer's name
///   3. Selfie — Photo must match CNIC photo
///   4. Warehouse — Address + 3 photos (inside, street, front door)
///   5. Criminal Record — Police verification + character certificate
///   6. Review & Submit
///
/// If criminal activity → ID blocked permanently.
/// After approval → deposit required to use app.
/// Customers → free registration, no KYC needed.
class KycScreen extends ConsumerStatefulWidget {
  const KycScreen({super.key});

  @override
  ConsumerState<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends ConsumerState<KycScreen> {
  int _currentStep = 0;
  bool _isLoading = false;
  final _pageController = PageController();

  // Step 1: CNIC
  final _cnicCtrl = TextEditingController();
  final _fullNameCtrl = TextEditingController();
  bool _cnicFrontUploaded = false;
  bool _cnicBackUploaded = false;

  // Step 2: SIM Verification
  final _simOwnerCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _simVerified = false;

  // Step 3: Selfie
  bool _selfieUploaded = false;

  // Step 4: Warehouse
  final _warehouseAddressCtrl = TextEditingController();
  final _businessNameCtrl = TextEditingController();
  bool _warehouseInsideUploaded = false;
  bool _warehouseStreetUploaded = false;
  bool _warehouseFrontDoorUploaded = false;

  // Step 5: Criminal Record
  bool _policeVerificationUploaded = false;
  bool _characterCertUploaded = false;
  bool _declareCriminalFree = true;

  static const _stepTitles = [
    'CNIC Verification',
    'SIM Ownership',
    'Face Verification',
    'Warehouse Details',
    'Criminal Record',
    'Review & Submit',
  ];

  static const _stepIcons = [
    Icons.credit_card,
    Icons.sim_card,
    Icons.camera_alt,
    Icons.warehouse,
    Icons.shield,
    Icons.check_circle_outline,
  ];

  Future<void> _simulateUpload(String type) async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _isLoading = false;
      switch (type) {
        case 'cnicFront': _cnicFrontUploaded = true; break;
        case 'cnicBack': _cnicBackUploaded = true; break;
        case 'selfie': _selfieUploaded = true; break;
        case 'warehouseInside': _warehouseInsideUploaded = true; break;
        case 'warehouseStreet': _warehouseStreetUploaded = true; break;
        case 'warehouseFrontDoor': _warehouseFrontDoorUploaded = true; break;
        case 'policeVerification': _policeVerificationUploaded = true; break;
        case 'characterCert': _characterCertUploaded = true; break;
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

  bool _canProceed() {
    switch (_currentStep) {
      case 0: // CNIC
        return _cnicCtrl.text.isNotEmpty &&
            _fullNameCtrl.text.isNotEmpty &&
            _cnicFrontUploaded &&
            _cnicBackUploaded;
      case 1: // SIM
        return _simVerified;
      case 2: // Selfie
        return _selfieUploaded;
      case 3: // Warehouse
        return _warehouseAddressCtrl.text.isNotEmpty &&
            _businessNameCtrl.text.isNotEmpty &&
            _warehouseInsideUploaded &&
            _warehouseStreetUploaded &&
            _warehouseFrontDoorUploaded;
      case 4: // Criminal
        return _declareCriminalFree;
      case 5: // Review
        return true;
      default:
        return false;
    }
  }

  void _goToStep(int step) {
    setState(() => _currentStep = step);
    _pageController.animateToPage(step,
        duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
  }

  Future<void> _sendOtp() async {
    if (_simOwnerCtrl.text.isEmpty || _phoneCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill SIM owner name and phone number'),
            backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      _isLoading = false;
      _otpSent = true;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('OTP sent to ${_phoneCtrl.text}'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter 6-digit OTP'), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    // Mock: accept 123456
    if (_otpCtrl.text == '123456') {
      setState(() {
        _isLoading = false;
        _simVerified = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('SIM ownership verified ✓'), backgroundColor: Colors.green),
        );
      }
    } else {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid OTP. Try: 123456'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _submitKyc() async {
    if (!_declareCriminalFree) {
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.block, color: Colors.red[700], size: 28),
                const SizedBox(width: 8),
                const Text('Registration Blocked'),
              ],
            ),
            content: const Text(
              'Your registration cannot proceed due to criminal activity declaration. '
              'Your ID will not be generated.\n\n'
              'آپ کی رجسٹریشن مجرمانہ سرگرمی کے اعلان کی وجہ سے آگے نہیں بڑھ سکتی۔',
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () {
                  Navigator.pop(context);
                  context.go('/auth/login');
                },
                child: const Text('OK', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
      return;
    }

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _isLoading = false);

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('KYC Submitted!'),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Your documents have been submitted for review. '
                'This typically takes 24-48 hours.',
                style: TextStyle(height: 1.5),
              ),
              SizedBox(height: 12),
              Text(
                'آپ کی دستاویزات جانچ کے لیے جمع کر دی گئی ہیں۔ عام طور پر 24-48 گھنٹے لگتے ہیں۔',
                style: TextStyle(color: Colors.grey, fontSize: 13),
                textDirection: TextDirection.rtl,
              ),
              SizedBox(height: 16),
              Text(
                'After approval, you will need to deposit the required amount to activate your account.',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('${AppVariant.appName} — KYC'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: Column(
        children: [
          // ── Step Progress Bar ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: theme.primaryColor.withOpacity(0.05),
              border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
            ),
            child: Column(
              children: [
                // Step indicator dots
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (i) {
                    final isActive = i == _currentStep;
                    final isDone = i < _currentStep;
                    return Expanded(
                      child: GestureDetector(
                        onTap: isDone ? () => _goToStep(i) : null,
                        child: Column(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: isDone
                                    ? Colors.green
                                    : isActive
                                        ? theme.primaryColor
                                        : Colors.grey[300],
                              ),
                              child: Icon(
                                isDone ? Icons.check : _stepIcons[i],
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${i + 1}',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                                color: isActive ? theme.primaryColor : Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 8),
                // Step title
                Text(
                  'Step ${_currentStep + 1}: ${_stepTitles[_currentStep]}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: (_currentStep + 1) / 6,
                  backgroundColor: Colors.grey[200],
                  valueColor: const AlwaysStoppedAnimation(Color(0xFF16A34A)),
                  minHeight: 4,
                  borderRadius: BorderRadius.circular(2),
                ),
              ],
            ),
          ),

          // ── Step Pages ──
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _buildStep1Cnic(),
                _buildStep2Sim(),
                _buildStep3Selfie(),
                _buildStep4Warehouse(),
                _buildStep5Criminal(),
                _buildStep6Review(),
              ],
            ),
          ),

          // ── Bottom Navigation ──
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: const Offset(0, -2))],
            ),
            child: Row(
              children: [
                if (_currentStep > 0)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _goToStep(_currentStep - 1),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Back'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                if (_currentStep > 0) const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading
                        ? null
                        : _currentStep == 5
                            ? _submitKyc
                            : _canProceed()
                                ? () => _goToStep(_currentStep + 1)
                                : null,
                    icon: _isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Icon(_currentStep == 5 ? Icons.send : Icons.arrow_forward),
                    label: Text(
                      _isLoading
                          ? 'Processing...'
                          : _currentStep == 5
                              ? 'Submit KYC Application'
                              : 'Next',
                      style: const TextStyle(fontSize: 15),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 1: CNIC — Front & Back Photos
  // ═══════════════════════════════════════
  Widget _buildStep1Cnic() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.credit_card,
            title: 'CNIC Verification / شناختی کارڈ',
            subtitle: 'Upload original front and back photos of your National ID card (CNIC).',
            urdu: 'اپنے شناختی کارڈ کے اصل سامنے اور پیچھے کی تصاویر اپ لوڈ کریں۔',
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _fullNameCtrl,
            decoration: InputDecoration(
              labelText: 'Full Name (as on CNIC) *',
              hintText: 'e.g. Muhammad Bilal Ahmed',
              prefixIcon: const Icon(Icons.person),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
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
          const Text('Upload CNIC Photos (Original)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Take clear photos of the original physical CNIC card.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.credit_card,
            title: 'CNIC Front Side',
            subtitle: 'Clear photo of front — name, photo, CNIC number must be visible',
            isUploaded: _cnicFrontUploaded,
            onTap: () => _simulateUpload('cnicFront'),
          ),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.credit_card_outlined,
            title: 'CNIC Back Side',
            subtitle: 'Clear photo of back — address and barcode must be visible',
            isUploaded: _cnicBackUploaded,
            onTap: () => _simulateUpload('cnicBack'),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 2: SIM Ownership Verification
  // ═══════════════════════════════════════
  Widget _buildStep2Sim() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.sim_card,
            title: 'SIM Ownership / سم کی تصدیق',
            subtitle: 'The SIM card must be registered in your own name. OTP will be sent to verify ownership.',
            urdu: 'سم کارڈ آپ کے اپنے نام پر رجسٹرڈ ہونا چاہیے۔ تصدیق کے لیے OTP بھیجا جائے گا۔',
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _simOwnerCtrl,
            decoration: InputDecoration(
              labelText: 'SIM Registered Owner Name *',
              hintText: 'Name as registered with mobile operator',
              prefixIcon: const Icon(Icons.person_outline),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              helperText: 'Must match your CNIC name',
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: 'Phone Number *',
              hintText: '03XX-XXXXXXX',
              prefixIcon: const Icon(Icons.phone),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              helperText: 'SIM must be in your name',
            ),
          ),
          const SizedBox(height: 20),

          if (!_otpSent) ...[
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _sendOtp,
                icon: _isLoading
                    ? const SizedBox(width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.sms),
                label: Text(_isLoading ? 'Sending...' : 'Send OTP'),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],

          if (_otpSent && !_simVerified) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Column(
                children: [
                  Icon(Icons.sms, color: Colors.blue[700], size: 36),
                  const SizedBox(height: 8),
                  Text('OTP sent to ${_phoneCtrl.text}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue[800])),
                  const SizedBox(height: 4),
                  Text('Test OTP: 123456',
                      style: TextStyle(fontSize: 12, color: Colors.blue[600])),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: InputDecoration(
                labelText: 'Enter 6-digit OTP',
                prefixIcon: const Icon(Icons.lock),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _verifyOtp,
                icon: const Icon(Icons.verified),
                label: Text(_isLoading ? 'Verifying...' : 'Verify OTP'),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],

          if (_simVerified) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green[300]!),
              ),
              child: Column(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 48),
                  const SizedBox(height: 12),
                  const Text('SIM Ownership Verified ✓',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.green)),
                  const SizedBox(height: 4),
                  Text('سم کی ملکیت کی تصدیق ہو گئی ✓',
                      style: TextStyle(color: Colors.green[700], fontSize: 14),
                      textDirection: TextDirection.rtl),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 3: Selfie (Face Match with CNIC)
  // ═══════════════════════════════════════
  Widget _buildStep3Selfie() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.camera_alt,
            title: 'Face Verification / چہرے کی تصدیق',
            subtitle: 'Take a clear selfie. Your photo must match the photo on your CNIC card.',
            urdu: 'واضح سیلفی لیں۔ آپ کی تصویر شناختی کارڈ پر موجود تصویر سے مماثل ہونی چاہیے۔',
          ),
          const SizedBox(height: 24),

          // Visual guide
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: Column(
              children: [
                Icon(Icons.face, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 12),
                const Text('Photo Requirements:',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _buildRequirement('Face clearly visible, no sunglasses'),
                _buildRequirement('Good lighting, plain background'),
                _buildRequirement('Must match your CNIC photo'),
                _buildRequirement('No filters or editing'),
              ],
            ),
          ),
          const SizedBox(height: 24),

          _UploadCard(
            icon: Icons.camera_alt,
            title: 'Your Photo / Selfie',
            subtitle: 'Take a clear photo — admin will compare with CNIC photo',
            isUploaded: _selfieUploaded,
            onTap: () => _simulateUpload('selfie'),
          ),

          if (_selfieUploaded) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber[800], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Admin will verify your selfie matches the CNIC photo during review.',
                      style: TextStyle(fontSize: 12, color: Colors.amber[900]),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 4: Warehouse Verification
  // ═══════════════════════════════════════
  Widget _buildStep4Warehouse() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.warehouse,
            title: 'Warehouse Verification / گودام کی تصدیق',
            subtitle: 'Provide details and photos of your existing warehouse/storage premises.',
            urdu: 'اپنے موجودہ گودام/ذخیرہ کی جگہ کی تفصیلات اور تصاویر فراہم کریں۔',
          ),
          const SizedBox(height: 20),
          TextFormField(
            controller: _businessNameCtrl,
            decoration: InputDecoration(
              labelText: 'Business / Warehouse Name *',
              hintText: 'e.g. Bilal Traders & Recycling',
              prefixIcon: const Icon(Icons.business),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _warehouseAddressCtrl,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Complete Warehouse Address *',
              hintText: 'Street, area, city — full address of existing warehouse',
              prefixIcon: const Padding(
                padding: EdgeInsets.only(bottom: 40),
                child: Icon(Icons.location_on),
              ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 24),
          const Text('Warehouse Photos (All 3 Required)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Take photos of the actual warehouse premises.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.photo_library,
            title: '📦 Inside the Warehouse',
            subtitle: 'Interior photo showing storage capacity and setup',
            isUploaded: _warehouseInsideUploaded,
            onTap: () => _simulateUpload('warehouseInside'),
          ),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.streetview,
            title: '🛣️ Street Outside Warehouse',
            subtitle: 'Photo of the street/road in front of warehouse',
            isUploaded: _warehouseStreetUploaded,
            onTap: () => _simulateUpload('warehouseStreet'),
          ),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.door_front_door,
            title: '🚪 Front Door / Entrance',
            subtitle: 'Photo of warehouse entrance/main gate with signboard',
            isUploaded: _warehouseFrontDoorUploaded,
            onTap: () => _simulateUpload('warehouseFrontDoor'),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 5: Criminal Record Declaration
  // ═══════════════════════════════════════
  Widget _buildStep5Criminal() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.shield,
            title: 'Criminal Record Check / مجرمانہ ریکارڈ',
            subtitle: 'Upload police verification and character certificate. '
                'If involved in any criminal activity, your ID will NOT be generated.',
            urdu: 'پولیس تصدیق اور کردار سرٹیفکیٹ اپ لوڈ کریں۔ اگر کسی مجرمانہ سرگرمی میں ملوث ہیں تو آپ کا ID نہیں بنایا جائے گا۔',
            color: Colors.red,
          ),
          const SizedBox(height: 20),

          // Criminal declaration
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.red[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.gavel, color: Colors.red[700]),
                    const SizedBox(width: 8),
                    Text('Criminal Activity Declaration',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red[800])),
                  ],
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('I declare that I am NOT involved in any criminal activity',
                      style: TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                  subtitle: const Text(
                    'میں اعلان کرتا ہوں کہ میں کسی بھی مجرمانہ سرگرمی میں ملوث نہیں ہوں',
                    textDirection: TextDirection.rtl,
                    style: TextStyle(fontSize: 12),
                  ),
                  value: _declareCriminalFree,
                  onChanged: (v) => setState(() => _declareCriminalFree = v),
                  activeColor: Colors.green,
                  contentPadding: EdgeInsets.zero,
                ),
                if (!_declareCriminalFree) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.block, color: Colors.red[800]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '⚠️ Registration will be BLOCKED. ID will not be generated.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red[900], fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text('Verification Documents (Optional but Recommended)',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.local_police,
            title: 'Police Verification Certificate',
            subtitle: 'Certificate from local police station',
            isUploaded: _policeVerificationUploaded,
            onTap: () => _simulateUpload('policeVerification'),
          ),
          const SizedBox(height: 12),
          _UploadCard(
            icon: Icons.verified_user,
            title: 'Character Certificate',
            subtitle: 'Character certificate from authority / reference',
            isUploaded: _characterCertUploaded,
            onTap: () => _simulateUpload('characterCert'),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // STEP 6: Review & Submit
  // ═══════════════════════════════════════
  Widget _buildStep6Review() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildInfoBanner(
            icon: Icons.check_circle_outline,
            title: 'Review & Submit / جائزہ اور جمع',
            subtitle: 'Review all your details before submitting. Admin will verify within 24-48 hours.',
            urdu: 'جمع کرانے سے پہلے اپنی تمام تفصیلات کا جائزہ لیں۔',
          ),
          const SizedBox(height: 20),

          // Summary cards
          _buildReviewItem('CNIC Number', _cnicCtrl.text, _cnicCtrl.text.isNotEmpty),
          _buildReviewItem('Full Name', _fullNameCtrl.text, _fullNameCtrl.text.isNotEmpty),
          _buildReviewItem('CNIC Photos', 'Front & Back', _cnicFrontUploaded && _cnicBackUploaded),
          _buildReviewItem('SIM Verified', _simOwnerCtrl.text, _simVerified),
          _buildReviewItem('Selfie Photo', 'Uploaded', _selfieUploaded),
          _buildReviewItem('Business Name', _businessNameCtrl.text, _businessNameCtrl.text.isNotEmpty),
          _buildReviewItem('Warehouse Address', _warehouseAddressCtrl.text, _warehouseAddressCtrl.text.isNotEmpty),
          _buildReviewItem('Warehouse Photos', '3 photos', _warehouseInsideUploaded && _warehouseStreetUploaded && _warehouseFrontDoorUploaded),
          _buildReviewItem('Criminal Declaration', 'Clear', _declareCriminalFree),
          _buildReviewItem('Police Verification', _policeVerificationUploaded ? 'Uploaded' : 'Not uploaded', _policeVerificationUploaded),
          _buildReviewItem('Character Certificate', _characterCertUploaded ? 'Uploaded' : 'Not uploaded', _characterCertUploaded),

          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber[200]!),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.amber[800]),
                    const SizedBox(width: 8),
                    const Text('Important',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  '• Admin will verify your selfie matches CNIC photo\n'
                  '• Criminal background will be checked\n'
                  '• After approval, a deposit is required to activate your account\n'
                  '• Customers can create ID free of cost',
                  style: TextStyle(fontSize: 13, height: 1.6),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ═══════════════════════════════════════
  // Helper Widgets
  // ═══════════════════════════════════════

  Widget _buildInfoBanner({
    required IconData icon,
    required String title,
    required String subtitle,
    String? urdu,
    Color? color,
  }) {
    final c = color ?? Colors.blue;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: c.withOpacity(0.8), size: 24),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title,
                    style: TextStyle(fontWeight: FontWeight.bold, color: c.withOpacity(0.9), fontSize: 15)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey[700], height: 1.4)),
          if (urdu != null) ...[
            const SizedBox(height: 6),
            Text(urdu,
                style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                textDirection: TextDirection.rtl),
          ],
        ],
      ),
    );
  }

  Widget _buildRequirement(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildReviewItem(String label, String value, bool isComplete) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isComplete ? Colors.green[300]! : Colors.red[200]!),
        color: isComplete ? Colors.green[50] : Colors.red[50],
      ),
      child: Row(
        children: [
          Icon(
            isComplete ? Icons.check_circle : Icons.cancel,
            color: isComplete ? Colors.green : Colors.red[300],
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Text(value.isEmpty ? '—' : value,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _cnicCtrl.dispose();
    _fullNameCtrl.dispose();
    _simOwnerCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    _warehouseAddressCtrl.dispose();
    _businessNameCtrl.dispose();
    super.dispose();
  }
}

// ═══════════════════════════════════════
// Reusable Upload Card Widget
// ═══════════════════════════════════════
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
                color: isUploaded ? Colors.green[100] : Colors.grey[100],
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
              const Text('✓ Done',
                  style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.w600,
                      fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
