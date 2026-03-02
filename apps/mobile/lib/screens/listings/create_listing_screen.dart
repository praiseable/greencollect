import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../providers/listing_provider.dart';

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
  String? _selectedCategory;
  String _condition = 'USED';
  bool _negotiable = false;
  bool _loading = false;

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

              // Description
              TextFormField(
                controller: _descCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Describe material quality, pickup location, etc.',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 24),

              // Submit
              ElevatedButton(
                onPressed: _loading ? null : _handleSubmit,
                child: _loading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Post Listing'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _loading = true);

    final success = await context.read<ListingProvider>().createListing({
      'title': _titleCtrl.text,
      'description': _descCtrl.text,
      'categoryId': _selectedCategory,
      'quantity': double.tryParse(_quantityCtrl.text) ?? 0,
      'pricePaisa': int.tryParse(_priceCtrl.text) ?? 0,
      'priceNegotiable': _negotiable,
      'condition': _condition,
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
    super.dispose();
  }
}
