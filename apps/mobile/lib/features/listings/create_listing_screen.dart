import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock/mock_data.dart';
import '../../core/models/category.model.dart';

class CreateListingScreen extends ConsumerStatefulWidget {
  const CreateListingScreen({super.key});

  @override
  ConsumerState<CreateListingScreen> createState() =>
      _CreateListingScreenState();
}

class _CreateListingScreenState extends ConsumerState<CreateListingScreen> {
  int _currentStep = 0;
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();

  String? _selectedCategory;
  String? _selectedSubCategory;
  String _selectedUnit = 'kg';
  bool _negotiable = true;
  bool _loading = false;
  String _selectedCity = 'Karachi';
  final List<String> _mockPhotos = [];

  final _units = ['kg', 'ton', 'piece', 'meter', 'liter', 'bag'];
  final _cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
    'Hyderabad', 'Bahawalpur',
  ];

  final _stepLabels = [
    'Category',
    'Photos',
    'Details',
    'Location',
    'Preview',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Step ${_currentStep + 1}: ${_stepLabels[_currentStep]}'),
        leading: _currentStep > 0
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _currentStep--),
              )
            : null,
      ),
      body: Column(
        children: [
          // Step indicator
          _buildStepIndicator(),
          // Step content
          Expanded(child: _buildStepContent()),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: _currentStep == 4
              ? ElevatedButton.icon(
                  onPressed: _loading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  icon: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_circle),
                  label: Text(_loading ? 'Posting...' : 'Submit Listing',
                      style: const TextStyle(fontSize: 16)),
                )
              : Row(
                  children: [
                    if (_currentStep > 0)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () =>
                              setState(() => _currentStep--),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: const Text('Back'),
                        ),
                      ),
                    if (_currentStep > 0) const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _canProceed() ? _nextStep : null,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: Text(
                            _currentStep == 3 ? 'Preview' : 'Next →',
                            style: const TextStyle(fontSize: 16)),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.grey.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        children: List.generate(5, (i) {
          final isActive = i == _currentStep;
          final isCompleted = i < _currentStep;
          return Expanded(
            child: Row(
              children: [
                if (i > 0)
                  Expanded(
                    child: Container(
                      height: 2,
                      color: isCompleted
                          ? const Color(0xFF16A34A)
                          : Colors.grey[300],
                    ),
                  ),
                CircleAvatar(
                  radius: 14,
                  backgroundColor: isActive
                      ? const Color(0xFF16A34A)
                      : isCompleted
                          ? const Color(0xFF16A34A)
                          : Colors.grey[300],
                  child: isCompleted
                      ? const Icon(Icons.check, size: 14, color: Colors.white)
                      : Text('${i + 1}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color:
                                isActive ? Colors.white : Colors.grey[600],
                          )),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildStep1Category();
      case 1:
        return _buildStep2Photos();
      case 2:
        return _buildStep3Details();
      case 3:
        return _buildStep4Location();
      case 4:
        return _buildStep5Preview();
      default:
        return const SizedBox.shrink();
    }
  }

  // ── STEP 1: Category ──
  Widget _buildStep1Category() {
    final categories = MockData.categories;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Select Category',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Text('زمرہ منتخب کریں',
              style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
            ),
            itemCount: categories.length,
            itemBuilder: (_, i) {
              final cat = categories[i];
              final selected = _selectedCategory == cat.id;
              return GestureDetector(
                onTap: () => setState(() {
                  _selectedCategory = cat.id;
                  _selectedSubCategory = null;
                }),
                child: Container(
                  decoration: BoxDecoration(
                    color: selected
                        ? Color(int.parse(
                                cat.colorHex.replaceFirst('#', '0xFF')))
                            .withOpacity(0.15)
                        : Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected
                          ? Color(int.parse(
                              cat.colorHex.replaceFirst('#', '0xFF')))
                          : Colors.grey[200]!,
                      width: selected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(cat.icon, style: const TextStyle(fontSize: 28)),
                      const SizedBox(height: 6),
                      Text(cat.nameEn,
                          style: TextStyle(
                            fontWeight:
                                selected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 13,
                          )),
                      Text(cat.nameUr,
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey[600])),
                    ],
                  ),
                ),
              );
            },
          ),
          // Sub-categories
          if (_selectedCategory != null) ...[
            const SizedBox(height: 16),
            Builder(builder: (_) {
              final cat = categories.firstWhere(
                  (c) => c.id == _selectedCategory,
                  orElse: () => categories.first);
              if (cat.subCategories == null || cat.subCategories!.isEmpty) {
                return const SizedBox.shrink();
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Sub-Category (Optional)',
                      style: TextStyle(
                          fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: cat.subCategories!.map((sc) {
                      final selected = _selectedSubCategory == sc.id;
                      return ChoiceChip(
                        label: Text('${sc.nameEn} / ${sc.nameUr}'),
                        selected: selected,
                        onSelected: (_) => setState(() =>
                            _selectedSubCategory =
                                selected ? null : sc.id),
                      );
                    }).toList(),
                  ),
                ],
              );
            }),
          ],
        ],
      ),
    );
  }

  // ── STEP 2: Photos ──
  Widget _buildStep2Photos() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Add Photos (up to 5)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Text('تصاویر شامل کریں',
              style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
            ),
            itemCount: _mockPhotos.length + (_mockPhotos.length < 5 ? 1 : 0),
            itemBuilder: (_, i) {
              if (i == _mockPhotos.length) {
                // Add button
                return GestureDetector(
                  onTap: _addMockPhoto,
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                          color: Colors.grey[300]!, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.grey[50],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo,
                            size: 28, color: Colors.grey[400]),
                        const SizedBox(height: 4),
                        Text('Add',
                            style: TextStyle(
                                color: Colors.grey[500], fontSize: 12)),
                      ],
                    ),
                  ),
                );
              }
              // Photo thumbnail
              return Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(_mockPhotos[i],
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
                        errorBuilder: (_, __, ___) => Container(
                              color: Colors.grey[200],
                              child: const Icon(Icons.image, color: Colors.grey),
                            )),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () =>
                          setState(() => _mockPhotos.removeAt(i)),
                      child: const CircleAvatar(
                        radius: 12,
                        backgroundColor: Colors.red,
                        child:
                            Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                  if (i == 0)
                    Positioned(
                      bottom: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('Cover',
                            style: TextStyle(
                                color: Colors.white, fontSize: 10)),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          Text(
            '${_mockPhotos.length}/5 photos · At least 1 required',
            style: TextStyle(
              color: _mockPhotos.isEmpty ? Colors.red : Colors.grey[600],
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  void _addMockPhoto() {
    if (_mockPhotos.length >= 5) return;
    final seeds = ['copper', 'iron', 'electronics', 'paper', 'plastic'];
    final seed = seeds[_mockPhotos.length % seeds.length];
    setState(() {
      _mockPhotos.add('https://picsum.photos/seed/$seed${_mockPhotos.length}/400/300');
    });
  }

  // ── STEP 3: Details ──
  Widget _buildStep3Details() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Listing Details',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Text('فہرست کی تفصیلات',
                style: TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                labelText: 'Title *',
                hintText: 'e.g. 500kg Copper Wire — Grade A',
                prefixIcon: Icon(Icons.title),
              ),
              validator: (v) =>
                  (v?.isEmpty ?? true) ? 'Title is required' : null,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _quantityCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Quantity *',
                      hintText: '500',
                      prefixIcon: Icon(Icons.scale),
                    ),
                    validator: (v) =>
                        (v?.isEmpty ?? true) ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedUnit,
                    decoration: const InputDecoration(labelText: 'Unit'),
                    items: _units
                        .map((u) =>
                            DropdownMenuItem(value: u, child: Text(u)))
                        .toList(),
                    onChanged: (v) =>
                        setState(() => _selectedUnit = v ?? 'kg'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Price (₨ PKR per unit) *',
                hintText: '5000',
                prefixText: '₨ ',
                prefixIcon: Icon(Icons.monetization_on),
              ),
              validator: (v) =>
                  (v?.isEmpty ?? true) ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('Price Negotiable'),
              subtitle: const Text('Allow buyers to send offers'),
              value: _negotiable,
              onChanged: (v) => setState(() => _negotiable = v),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Description *',
                hintText:
                    'Describe material quality, pickup availability, etc.',
                alignLabelWithHint: true,
                prefixIcon: Padding(
                  padding: EdgeInsets.only(bottom: 60),
                  child: Icon(Icons.description),
                ),
              ),
              validator: (v) =>
                  (v?.isEmpty ?? true) ? 'Description required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _contactCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Contact Number',
                hintText: '03XX-XXXXXXX',
                prefixText: '+92 ',
                prefixIcon: Icon(Icons.phone),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── STEP 4: Location ──
  Widget _buildStep4Location() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Pickup Location',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Text('پک اپ مقام',
              style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),

          // Map placeholder
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.green[200]!),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.map, size: 48, color: Colors.green[300]),
                  const SizedBox(height: 8),
                  Text('📍 $_selectedCity, Pakistan',
                      style: TextStyle(
                          color: Colors.green[700],
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                            content: Text('📍 GPS location mock — using selected city')),
                      );
                    },
                    icon: const Icon(Icons.my_location, size: 16),
                    label: const Text('Use Current Location'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // City
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
          const SizedBox(height: 16),

          // Area
          TextFormField(
            controller: _addressCtrl,
            decoration: const InputDecoration(
              labelText: 'Area / Neighborhood',
              hintText: 'e.g. Korangi Industrial Area',
              prefixIcon: Icon(Icons.near_me),
            ),
          ),
        ],
      ),
    );
  }

  // ── STEP 5: Preview ──
  Widget _buildStep5Preview() {
    final cat = MockData.categories.firstWhere(
      (c) => c.id == _selectedCategory,
      orElse: () => MockData.categories.first,
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Preview Your Listing',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Text('اپنی فہرست کا جائزہ لیں',
              style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),

          // Mock image
          if (_mockPhotos.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(_mockPhotos.first,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                        height: 200,
                        color: Colors.grey[200],
                        child: const Center(
                            child: Icon(Icons.image, size: 48, color: Colors.grey)),
                      )),
            )
          else
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                  child:
                      Icon(Icons.image, size: 48, color: Colors.grey)),
            ),
          const SizedBox(height: 16),

          // Category badge
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Color(int.parse(
                      cat.colorHex.replaceFirst('#', '0xFF')))
                  .withOpacity(0.1),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text('${cat.icon} ${cat.nameEn}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(int.parse(
                      cat.colorHex.replaceFirst('#', '0xFF'))),
                )),
          ),
          const SizedBox(height: 8),

          // Title
          Text(
            _titleCtrl.text.isEmpty ? 'Untitled Listing' : _titleCtrl.text,
            style: const TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          // Price
          Row(
            children: [
              Text(
                '₨ ${_priceCtrl.text.isEmpty ? "0" : _priceCtrl.text} / $_selectedUnit',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF16A34A),
                ),
              ),
              if (_negotiable)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('Negotiable',
                      style: TextStyle(
                          color: Colors.orange, fontSize: 11)),
                ),
            ],
          ),
          const SizedBox(height: 12),

          // Details grid
          _previewRow(Icons.scale, 'Quantity',
              '${_quantityCtrl.text.isEmpty ? "—" : _quantityCtrl.text} $_selectedUnit'),
          _previewRow(Icons.location_on, 'Location',
              '${_addressCtrl.text.isNotEmpty ? "${_addressCtrl.text}, " : ""}$_selectedCity'),
          _previewRow(Icons.phone, 'Contact',
              _contactCtrl.text.isEmpty ? 'Not provided' : '+92 ${_contactCtrl.text}'),
          _previewRow(Icons.photo, 'Photos', '${_mockPhotos.length} photos'),
          const SizedBox(height: 12),

          // Description
          if (_descCtrl.text.isNotEmpty) ...[
            const Text('Description',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(_descCtrl.text,
                style: TextStyle(color: Colors.grey[700])),
          ],
          const SizedBox(height: 16),

          // Edit button
          OutlinedButton.icon(
            onPressed: () => setState(() => _currentStep = 0),
            icon: const Icon(Icons.edit, size: 18),
            label: const Text('Edit Listing'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _previewRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey[500]),
          const SizedBox(width: 8),
          Text('$label: ', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  bool _canProceed() {
    switch (_currentStep) {
      case 0:
        return _selectedCategory != null;
      case 1:
        return _mockPhotos.isNotEmpty;
      case 2:
        return _titleCtrl.text.isNotEmpty &&
            _quantityCtrl.text.isNotEmpty &&
            _priceCtrl.text.isNotEmpty &&
            _descCtrl.text.isNotEmpty;
      case 3:
        return true;
      default:
        return true;
    }
  }

  void _nextStep() {
    if (_currentStep == 2 && _formKey.currentState != null) {
      if (!_formKey.currentState!.validate()) return;
    }
    setState(() {
      if (_currentStep < 4) _currentStep++;
    });
  }

  Future<void> _handleSubmit() async {
    setState(() => _loading = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() => _loading = false);

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 8),
              Text('Listing Posted!'),
            ],
          ),
          content: const Text(
              'Your listing has been successfully posted! 🎉\n\nBuyers in your zone will be notified.'),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.go('/home');
              },
              child: const Text('Go to Home'),
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _quantityCtrl.dispose();
    _priceCtrl.dispose();
    _contactCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }
}
