import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_service.dart';

// ✅ FIX: Removed MockData.transactions. Bond URL fetched from GET /v1/transactions/:id/bond.

class BondViewerScreen extends StatefulWidget {
  final String transactionId;
  const BondViewerScreen({super.key, required this.transactionId});

  @override
  State<BondViewerScreen> createState() => _BondViewerScreenState();
}

class _BondViewerScreenState extends State<BondViewerScreen> {
  final ApiService _api = ApiService();
  String? _bondUrl;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchBond();
  }

  Future<void> _fetchBond() async {
    setState(() { _loading = true; _error = null; });
    try {
      final response = await _api.get('transactions/${widget.transactionId}/bond');
      final url = response['pdfUrl'] ?? response['url'] ?? response['bond']?['pdfUrl'];
      setState(() {
        _bondUrl = url as String?;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e is ApiException ? (e as ApiException).displayMessage : e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openBond() async {
    if (_bondUrl == null) return;
    final uri = Uri.parse(_bondUrl!);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot open bond PDF.'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bond Document'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.description_outlined, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    Text(_error!, style: const TextStyle(color: Colors.grey)),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: _fetchBond, child: const Text('Retry')),
                  ]))
              : _bondUrl == null
                  ? const Center(
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Icon(Icons.hourglass_empty, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text('Bond not generated yet.\nComplete the transaction first.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey)),
                      ]))
                  : Center(
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.picture_as_pdf, size: 80, color: Colors.red),
                        const SizedBox(height: 20),
                        const Text('Bond Document Ready',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        const Text('Tap below to open or download the PDF.',
                            style: TextStyle(color: Colors.grey)),
                        const SizedBox(height: 32),
                        ElevatedButton.icon(
                          onPressed: _openBond,
                          icon: const Icon(Icons.open_in_new),
                          label: const Text('Open Bond PDF'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ]),
                    ),
    );
  }
}
