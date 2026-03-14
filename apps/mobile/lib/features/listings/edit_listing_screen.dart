import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../core/providers/app_providers.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';

class EditListingScreen extends ConsumerStatefulWidget {
  final String listingId;
  const EditListingScreen({super.key, required this.listingId});

  @override
  ConsumerState<EditListingScreen> createState() => _EditListingScreenState();
}

class _EditListingScreenState extends ConsumerState<EditListingScreen> {
  final ApiService _api = ApiService();
  final _formKey = GlobalKey<FormState>();

  final _titleCtrl       = TextEditingController();
  final _descCtrl        = TextEditingController();
  final _priceCtrl       = TextEditingController();
  final _quantityCtrl    = TextEditingController();
  final _addressCtrl     = TextEditingController();
  final _contactCtrl     = TextEditingController();

  List<Map<String, dynamic>> _categories    = [];
  List<Map<String, dynamic>> _productTypes  = [];
  List<Map<String, dynamic>> _units         = [];
  List<Map<String, dynamic>> _zones         = [];

  String? _selectedCategoryId;
  String? _selectedProductTypeId;
  String? _selectedUnitId;
  String? _selectedZoneId;

  final List<XFile> _newImages = []; // New images to upload
  final List<Map<String, dynamic>> _existingImages = []; // Existing images from server
  static const int _maxImages = 5;
  final ImagePicker _picker = ImagePicker();

  bool _loading    = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadListingAndFormData();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _quantityCtrl.dispose();
    _addressCtrl.dispose();
    _contactCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadListingAndFormData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.get('categories'),
        _api.get('units'),
        _api.get('geo-zones/available'),
        _api.get('listings/${widget.listingId}'),
      ]);

      final cats   = _asList(results[0], 'categories');
      final units  = _asList(results[1], 'units');
      final zones  = _asList(results[2], 'zones');
      final listing = (results[3] as Map<String, dynamic>)['listing'] ?? results[3] as Map<String, dynamic>;

      setState(() {
        _categories = cats.map((c) => c is Map<String, dynamic> ? c : <String, dynamic>{}).where((c) => c.isNotEmpty).toList();
        _units      = units.map((u) => u is Map<String, dynamic> ? u : <String, dynamic>{}).where((u) => u.isNotEmpty).toList();
        _zones      = zones.map((z) => z is Map<String, dynamic> ? z : <String, dynamic>{}).where((z) => z.isNotEmpty).toList();
        
        // Pre-fill form with existing listing data
        _titleCtrl.text = listing['title'] as String? ?? '';
        _descCtrl.text = listing['description'] as String? ?? '';
        _priceCtrl.text = listing['pricePaisa'] != null 
            ? ((listing['pricePaisa'] is int ? listing['pricePaisa'] : int.tryParse(listing['pricePaisa'].toString()) ?? 0) / 100).toStringAsFixed(0)
            : '';
        _quantityCtrl.text = (listing['quantity'] ?? 0).toString();
        _addressCtrl.text = listing['address'] as String? ?? '';
        _contactCtrl.text = listing['contactNumber'] as String? ?? '';
        
        _selectedCategoryId = listing['categoryId']?.toString();
        _selectedProductTypeId = listing['productTypeId']?.toString();
        _selectedUnitId = listing['unitId']?.toString();
        _selectedZoneId = listing['geoZoneId']?.toString();
        
        // Load existing images
        final images = listing['images'] as List<dynamic>? ?? [];
        _existingImages.addAll(images.map((img) => img is Map<String, dynamic> 
            ? img as Map<String, dynamic>
            : <String, dynamic>{'url': img.toString(), 'id': img.toString()}));
        
        _loading = false;
      });
      
      // Load product types if category is selected
      if (_selectedCategoryId != null) {
        _loadProductTypes(_selectedCategoryId!);
      }
    } catch (e) {
      setState(() { 
        _error = 'Failed to load listing data. Please retry.'; 
        _loading = false; 
      });
    }
  }

  /// Backend may return raw array or { data/categories/units/zones: array }.
  static List<dynamic> _asList(dynamic response, String key) {
    if (response is List) return response;
    if (response is Map) {
      final list = response[key] ?? response['data'] ?? response;
      if (list is List) return list;
    }
    return [];
  }

  Future<void> _loadProductTypes(String categoryId) async {
    try {
      final response = await _api.get('product-types', queryParams: {'categoryId': categoryId});
      final pts = (response['productTypes'] ?? response['data'] ?? response) as List<dynamic>;
      setState(() => _productTypes = pts.cast<Map<String, dynamic>>());
    } catch (e) {
      debugPrint('loadProductTypes error: $e');
    }
  }

  Future<void> _pickImages() async {
    final totalImages = _existingImages.length + _newImages.length;
    if (totalImages >= _maxImages) return;
    try {
      final List<XFile> picked = await _picker.pickMultiImage();
      if (picked.isEmpty) return;
      setState(() {
        for (final x in picked) {
          if (totalImages + _newImages.length >= _maxImages) break;
          _newImages.add(x);
        }
      });
    } catch (e) {
      if (kDebugMode) debugPrint('[EditListing] pickImages: $e');
      setState(() => _error = 'Could not pick images. Try again.');
    }
  }

  void _removeExistingImage(int index) {
    setState(() => _existingImages.removeAt(index));
  }

  void _removeNewImage(int index) {
    setState(() => _newImages.removeAt(index));
  }

  Future<void> _onCategoryChange(String? categoryId) async {
    setState(() {
      _selectedCategoryId    = categoryId;
      _selectedProductTypeId = null;
      _productTypes          = [];
    });
    if (categoryId == null) return;
    await _loadProductTypes(categoryId);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategoryId == null) {
      setState(() => _error = 'Please select a category.');
      return;
    }

    final auth = ref.read(authChangeNotifierProvider);
    if (auth == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please log in to edit listing.'),
            backgroundColor: Colors.orange,
          ),
        );
        context.push('/auth/login');
      }
      return;
    }

    setState(() { _submitting = true; _error = null; });
    try {
      final priceRaw = double.tryParse(_priceCtrl.text.trim()) ?? 0;
      final pricePaisa = (priceRaw * 100).round();

      final quantity = double.tryParse(_quantityCtrl.text.trim());
      if (quantity == null || quantity <= 0) {
        setState(() => _error = 'Please enter a valid quantity.');
        setState(() => _submitting = false);
        return;
      }
      if (_selectedUnitId == null) {
        setState(() => _error = 'Please select a unit.');
        setState(() => _submitting = false);
        return;
      }

      // Update listing via PUT
      final body = {
        'title':       _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'pricePaisa':  pricePaisa,
        'quantity':    quantity,
        'unitId':      _selectedUnitId,
        if (_selectedProductTypeId != null) 'productTypeId': _selectedProductTypeId,
        if (_selectedZoneId != null) 'geoZoneId': _selectedZoneId,
        if (_addressCtrl.text.isNotEmpty) 'address': _addressCtrl.text.trim(),
        if (_contactCtrl.text.isNotEmpty) 'contactNumber': _contactCtrl.text.trim(),
      };

      if (kDebugMode) {
        debugPrint('[EditListing] PUT listings/${widget.listingId} body: $body');
      }
      await _api.put('listings/${widget.listingId}', body);

      // Upload new images if any
      if (_newImages.isNotEmpty) {
        final files = <http.MultipartFile>[];
        for (var i = 0; i < _newImages.length; i++) {
          final x = _newImages[i];
          final bytes = await x.readAsBytes();
          final name = x.name.isNotEmpty ? x.name : 'image_$i.jpg';
          files.add(http.MultipartFile.fromBytes('images', bytes, filename: name));
        }
        try {
          await _api.multipartPost(
            'listings/${widget.listingId}/images',
            fields: {},
            files: files,
          );
        } catch (e) {
          if (kDebugMode) debugPrint('[EditListing] Image upload error: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Listing updated but some photos could not be uploaded: $e'),
                  backgroundColor: Colors.orange),
            );
          }
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Listing updated successfully!'),
              backgroundColor: Colors.green),
        );
        ref.read(listingsProvider).fetchListings(refresh: true);
        if (context.mounted) context.pop(true);
      }
    } catch (e, stack) {
      if (kDebugMode) {
        debugPrint('[EditListing] Error: $e');
        debugPrint('[EditListing] StackTrace: $stack');
        if (e is ApiException) debugPrint('[EditListing] API statusCode: ${e.statusCode}');
      }
      if (e is ApiException && (e as ApiException).statusCode == 401) {
        await ref.read(authChangeNotifierProvider).logout();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Session expired. Please log in again.'),
              backgroundColor: Colors.orange,
            ),
          );
          context.go('/auth/login');
        }
        setState(() => _error = 'Please log in to edit listing.');
      } else {
        setState(() {
          _error = e is ApiException
              ? (e as ApiException).displayMessage
              : 'Failed to update listing.\n$e';
        });
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Listing'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        border: Border.all(color: Colors.red.shade200),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 18),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_error!,
                              style: const TextStyle(color: Colors.red, fontSize: 13))),
                        ],
                      ),
                    ),

                  _SectionLabel('Basic Info'),
                  _field(_titleCtrl, 'Title *', validator: (v) =>
                      v!.isEmpty ? 'Title is required' : null),
                  const SizedBox(height: 12),
                  _field(_descCtrl, 'Description', maxLines: 3),
                  const SizedBox(height: 20),

                  _SectionLabel('Photos (up to $_maxImages)'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      // Existing images
                      ...List.generate(_existingImages.length, (i) {
                        final img = _existingImages[i];
                        final url = img['url'] as String? ?? '';
                        final fullUrl = url.startsWith('http') 
                            ? url 
                            : '${ApiConfig.effectiveBaseUrl.replaceFirst(RegExp(r'/$'), '')}$url';
                        return Stack(
                          clipBehavior: Clip.none,
                          children: [
                            SizedBox(
                              width: 72,
                              height: 72,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  fullUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 48, color: Colors.grey),
                                ),
                              ),
                            ),
                            Positioned(
                              top: -6,
                              right: -6,
                              child: IconButton(
                                icon: const Icon(Icons.close, size: 18, color: Colors.white),
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  padding: const EdgeInsets.all(4),
                                  minimumSize: Size.zero,
                                ),
                                onPressed: () => _removeExistingImage(i),
                              ),
                            ),
                          ],
                        );
                      }),
                      // New images
                      ...List.generate(_newImages.length, (i) {
                        return Stack(
                          clipBehavior: Clip.none,
                          children: [
                            SizedBox(
                              width: 72,
                              height: 72,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(File(_newImages[i].path), fit: BoxFit.cover),
                              ),
                            ),
                            Positioned(
                              top: -6,
                              right: -6,
                              child: IconButton(
                                icon: const Icon(Icons.close, size: 18, color: Colors.white),
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.red,
                                  padding: const EdgeInsets.all(4),
                                  minimumSize: Size.zero,
                                ),
                                onPressed: () => _removeNewImage(i),
                              ),
                            ),
                          ],
                        );
                      }),
                      // Add button
                      if (_existingImages.length + _newImages.length < _maxImages)
                        InkWell(
                          onTap: _submitting ? null : _pickImages,
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.add_photo_alternate_outlined, size: 32, color: Colors.grey),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  _SectionLabel('Category *'),
                  DropdownButtonFormField<String>(
                    value: _selectedCategoryId,
                    hint: const Text('Select category'),
                    onChanged: _onCategoryChange,
                    validator: (v) => v == null ? 'Please select a category' : null,
                    items: _categories.map((c) => DropdownMenuItem(
                      value: c['id'] as String,
                      child: Text(c['name'] as String? ?? ''),
                    )).toList(),
                    decoration: _dropdownDecoration(),
                  ),

                  if (_productTypes.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _SectionLabel('Product Type'),
                    DropdownButtonFormField<String>(
                      value: _selectedProductTypeId,
                      hint: const Text('Select product type'),
                      onChanged: (v) => setState(() => _selectedProductTypeId = v),
                      items: _productTypes.map((pt) => DropdownMenuItem(
                        value: pt['id'] as String,
                        child: Text(pt['name'] as String? ?? ''),
                      )).toList(),
                      decoration: _dropdownDecoration(),
                    ),
                  ],

                  const SizedBox(height: 20),
                  _SectionLabel('Pricing & Quantity'),
                  Row(
                    children: [
                      Expanded(
                        child: _field(_priceCtrl, 'Price (PKR) *',
                            keyboardType: TextInputType.number,
                            validator: (v) {
                              if (v!.isEmpty) return 'Required';
                              if (double.tryParse(v) == null) return 'Invalid';
                              return null;
                            }),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _field(_quantityCtrl, 'Quantity *',
                            keyboardType: TextInputType.number,
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Required';
                              final n = double.tryParse(v);
                              if (n == null || n <= 0) return 'Enter a valid quantity';
                              return null;
                            }),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedUnitId,
                    hint: const Text('Select unit *'),
                    onChanged: (v) => setState(() => _selectedUnitId = v),
                    validator: (v) => v == null ? 'Please select a unit' : null,
                    items: _units.map((u) => DropdownMenuItem(
                      value: u['id'] as String? ?? '',
                      child: Text('${u['name'] ?? u['slug']} (${u['symbol'] ?? u['abbreviation'] ?? ''})'),
                    )).toList(),
                    decoration: _dropdownDecoration('Unit *'),
                  ),

                  const SizedBox(height: 20),
                  _SectionLabel('Location'),
                  DropdownButtonFormField<String>(
                    value: _selectedZoneId,
                    hint: const Text('Select zone'),
                    onChanged: (v) => setState(() => _selectedZoneId = v),
                    validator: (v) => v == null ? 'Please select a zone' : null,
                    items: _zones.map((z) {
                      final zoneName = z['name'] as String? ?? '';
                      final parentName = z['parent']?['name'] as String?;
                      final displayName = parentName != null ? '$zoneName, $parentName' : zoneName;
                      return DropdownMenuItem(
                        value: z['id'] as String? ?? '',
                        child: Text(displayName),
                      );
                    }).toList(),
                    decoration: _dropdownDecoration('Zone *'),
                  ),
                  const SizedBox(height: 12),
                  _field(_addressCtrl, 'Address / Area'),

                  const SizedBox(height: 20),
                  _SectionLabel('Contact'),
                  _field(_contactCtrl, 'Contact Number',
                      keyboardType: TextInputType.phone,
                      hint: '03XXXXXXXXX'),

                  const SizedBox(height: 32),
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _submitting
                          ? const SizedBox(width: 22, height: 22,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('Update Listing',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _field(TextEditingController ctrl, String label,
      {int maxLines = 1,
      TextInputType keyboardType = TextInputType.text,
      String? Function(String?)? validator,
      String? hint}) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }

  InputDecoration _dropdownDecoration([String? label]) {
    return InputDecoration(
      labelText: label,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
  );
}
