import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _nameUrduCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _cityCtrl;
  late TextEditingController _zoneCtrl;
  bool _saving = false;

  final _cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
    'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana',
  ];

  @override
  void initState() {
    super.initState();
    final user = ref.read(authProvider);
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _nameUrduCtrl = TextEditingController(text: user?.nameUrdu ?? '');
    _emailCtrl = TextEditingController(text: user?.email ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _cityCtrl = TextEditingController(text: user?.city ?? 'Karachi');
    _zoneCtrl = TextEditingController(text: user?.zone ?? '');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Avatar
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.green[100],
                      child: Text(
                        user?.name.isNotEmpty == true ? user!.name[0] : 'U',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Colors.green[800],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: CircleAvatar(
                        radius: 18,
                        backgroundColor: const Color(0xFF16A34A),
                        child: IconButton(
                          icon: const Icon(Icons.camera_alt,
                              color: Colors.white, size: 18),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('📸 Photo upload coming soon'),
                                backgroundColor: Colors.blue,
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Full Name
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Full Name *',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) =>
                    (v?.isEmpty ?? true) ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),

              // Name in Urdu
              TextFormField(
                controller: _nameUrduCtrl,
                textDirection: TextDirection.rtl,
                decoration: const InputDecoration(
                  labelText: 'نام اردو میں',
                  prefixIcon: Icon(Icons.translate),
                  hintText: 'علی حسن',
                ),
              ),
              const SizedBox(height: 16),

              // Phone (read-only)
              TextFormField(
                controller: _phoneCtrl,
                readOnly: true,
                decoration: InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: const Icon(Icons.phone),
                  suffixIcon: const Icon(Icons.lock_outline, size: 18),
                  helperText: 'Phone cannot be changed',
                  helperStyle: TextStyle(color: Colors.grey[500]),
                ),
              ),
              const SizedBox(height: 16),

              // Email
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              const SizedBox(height: 16),

              // City
              DropdownButtonFormField<String>(
                value: _cities.contains(_cityCtrl.text)
                    ? _cityCtrl.text
                    : 'Karachi',
                decoration: const InputDecoration(
                  labelText: 'City *',
                  prefixIcon: Icon(Icons.location_city),
                ),
                items: _cities
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => _cityCtrl.text = v ?? 'Karachi',
              ),
              const SizedBox(height: 16),

              // Zone (for dealers)
              if (user?.role != null &&
                  user!.role.toString().contains('Dealer'))
                TextFormField(
                  controller: _zoneCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Zone / Area',
                    prefixIcon: Icon(Icons.map),
                    hintText: 'e.g. Korangi Industrial Area',
                  ),
                ),
              const SizedBox(height: 16),

              // Role (read-only)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.badge, color: Colors.grey),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Role',
                            style: TextStyle(
                                color: Colors.grey[600], fontSize: 12)),
                        Text(
                          _roleLabel(user?.role),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const Spacer(),
                    const Icon(Icons.lock_outline, size: 16, color: Colors.grey),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // KYC status
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: user?.kycStatus.name == 'approved'
                      ? Colors.green[50]
                      : Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: user?.kycStatus.name == 'approved'
                        ? Colors.green[200]!
                        : Colors.orange[200]!,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      user?.kycStatus.name == 'approved'
                          ? Icons.verified_user
                          : Icons.pending,
                      color: user?.kycStatus.name == 'approved'
                          ? Colors.green
                          : Colors.orange,
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('KYC Status',
                            style: TextStyle(
                                color: Colors.grey[600], fontSize: 12)),
                        Text(
                          user?.kycStatus.name.toUpperCase() ?? 'PENDING',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: user?.kycStatus.name == 'approved'
                                ? Colors.green
                                : Colors.orange,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    if (user?.kycStatus.name != 'approved')
                      TextButton(
                        onPressed: () => context.push('/auth/kyc'),
                        child: const Text('Update KYC'),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Save button
              ElevatedButton.icon(
                onPressed: _saving ? null : _handleSave,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save),
                label: Text(_saving ? 'Saving...' : 'Save Changes',
                    style: const TextStyle(fontSize: 16)),
              ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _saving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully! ✓'),
          backgroundColor: Colors.green,
        ),
      );
      context.pop();
    }
  }

  String _roleLabel(dynamic role) {
    if (role == null) return 'Customer';
    switch (role.toString()) {
      case 'UserRole.customer':
        return '👤 Customer';
      case 'UserRole.localDealer':
        return '🏪 Local Dealer';
      case 'UserRole.cityFranchise':
        return '🏢 City Franchise';
      case 'UserRole.wholesale':
        return '🏭 Wholesale';
      default:
        return 'Customer';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _nameUrduCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    _zoneCtrl.dispose();
    super.dispose();
  }
}
