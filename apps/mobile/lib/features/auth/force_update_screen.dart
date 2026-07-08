import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_variant.dart';

class ForceUpdateScreen extends StatelessWidget {
  const ForceUpdateScreen({super.key});

  Future<void> _openStore(BuildContext context) async {
    // Store URLs are placeholders until the real app-store listings exist.
    final uri = Uri.parse(AppVariant.isPro
        ? 'https://gc.directconnect.services/pro'
        : 'https://gc.directconnect.services/');
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open update link')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.system_update, size: 72, color: Color(0xFF16A34A)),
                const SizedBox(height: 24),
                Text(
                  'Update ${AppVariant.appName}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'This version is no longer supported. Please update to continue using Kabariya safely.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => _openStore(context),
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Update now'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
