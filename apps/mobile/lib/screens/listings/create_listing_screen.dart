import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/listing_provider.dart';
import 'map_picker_screen.dart';

class CreateListingScreen extends StatefulWidget {
  const CreateListingScreen({super.key});

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _quantityCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  String? _selectedCategory;
  String _condition = 'USED';
  bool _negotiable = true;
  bool _loading = false;

  // Location data
  double? _latitude;
  double? _longitude;
  String _locationAddress = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ListingProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Post a Listing')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title
              TextFormField(
                controller: _titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Title *',
                  hintText: 'e.g. 500kg Copper Wire — Grade A',
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Title is required' : null,
              ),
              const SizedBox(height: 16),

              // Category
              DropdownButtonFormField<String>(
                value: _selectedCategory,
                decoration: const InputDecoration(labelText: 'Category *'),
                items: provider.categories.map((c) =>
                  DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: (v) => setState(() => _selectedCategory = v),
                validator: (v) => v == null ? 'Select a category' : null,
              ),
              const SizedBox(height: 16),

              // Quantity & Price
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _quantityCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity *', hintText: '500'),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _priceCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Price (₨ PKR) *', hintText: '5000', prefixText: '₨ '),
                      validator: (v) => (v?.isEmpty ?? true) ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Negotiable
              SwitchListTile(
                title: const Text('Price Negotiable'),
                value: _negotiable,
                onChanged: (v) => setState(() => _negotiable = v),
                contentPadding: EdgeInsets.zero,
              ),

              // Condition
              const Text('Condition', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['NEW', 'USED', 'REFURBISHED', 'SCRAP'].map((c) =>
                  ChoiceChip(
                    label: Text(c[0] + c.substring(1).toLowerCase()),
                    selected: _condition == c,
                    onSelected: (_) => setState(() => _condition = c),
                  )).toList(),
              ),
              const SizedBox(height: 16),

              // Contact Number
              TextFormField(
                controller: _contactCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Contact Number',
                  hintText: '03XX-XXXXXXX',
                  prefixText: '+92 ',
                ),
              ),
              const SizedBox(height: 20),

              // ═══════════════════════════════════════════
              // LOCATION PICKER — Google Maps
              // ═══════════════════════════════════════════
              const Text('📍 Pickup Location *',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text('Tap to select the material pickup location on the map',
                style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              const SizedBox(height: 8),

              // Location display / picker button
              InkWell(
                onTap: _openMapPicker,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _latitude != null ? Colors.green : Colors.grey[300]!,
                      width: _latitude != null ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    color: _latitude != null ? Colors.green[50] : Colors.grey[50],
                  ),
                  child: _latitude != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.location_on, color: Colors.green[700], size: 20),
                                const SizedBox(width: 8),
                                const Text('Location Selected ✓',
                                  style: TextStyle(fontWeight: FontWeight.w600, color: Colors.green)),
                                const Spacer(),
                                Text('Change',
                                  style: TextStyle(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w500)),
                                const SizedBox(width: 2),
                                Icon(Icons.edit, size: 14, color: Colors.green[700]),
                              ],
                            ),
                            if (_locationAddress.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(_locationAddress,
                                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                                maxLines: 2, overflow: TextOverflow.ellipsis),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              '${_latitude!.toStringAsFixed(4)}°N, ${_longitude!.toStringAsFixed(4)}°E',
                              style: TextStyle(fontSize: 11, color: Colors.grey[500], fontFamily: 'monospace'),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_location_alt, color: Colors.grey[600], size: 28),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Tap to select location',
                                  style: TextStyle(fontWeight: FontWeight.w500, color: Colors.grey[700])),
                                Text('Mark the material pickup point on Google Maps',
                                  style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                              ],
                            ),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 16),

              // Description
              TextFormField(
                controller: _descCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  hintText: 'Describe material quality, pickup location, etc.',
                  alignLabelWithHint: true,
                ),
                validator: (v) => (v?.isEmpty ?? true) ? 'Description is required' : null,
              ),
              const SizedBox(height: 24),

              // Submit
              ElevatedButton(
                onPressed: _loading ? null : _handleSubmit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: _loading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Post Listing', style: TextStyle(fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openMapPicker() async {
    final result = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (_) => MapPickerScreen(
          initialLatitude: _latitude,
          initialLongitude: _longitude,
        ),
      ),
    );

    if (result != null) {
      setState(() {
        _latitude = result['latitude'] as double?;
        _longitude = result['longitude'] as double?;
        _locationAddress = result['address'] as String? ?? '';
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_latitude == null || _longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a pickup location on the map'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _loading = true);

    final success = await context.read<ListingProvider>().createListing({
      'title': _titleCtrl.text,
      'description': _descCtrl.text,
      'categoryId': _selectedCategory,
      'quantity': double.tryParse(_quantityCtrl.text) ?? 0,
      'pricePaisa': int.tryParse(_priceCtrl.text) ?? 0,
      'priceNegotiable': _negotiable,
      'condition': _condition,
      'latitude': _latitude,
      'longitude': _longitude,
      'address': _locationAddress,
      'contactNumber': _contactCtrl.text.isNotEmpty ? _contactCtrl.text : null,
    });

    setState(() => _loading = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Listing posted! 🎉'), backgroundColor: Colors.green),
      );
      context.go('/');
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to post listing'), backgroundColor: Colors.red),
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
    super.dispose();
  }
}
