import 'package:flutter/material.dart';
import '../models/category.dart';

class CategoryChip extends StatelessWidget {
  final Category category;
  final VoidCallback? onTap;

  const CategoryChip({super.key, required this.category, this.onTap});

  static const _icons = {
    'plastic': '♻️',
    'metals': '🔩',
    'paper': '📦',
    'electronics': '📱',
    'glass': '🪟',
    'rubber': '🏗️',
    'textiles': '🧵',
    'wood': '🪵',
    'batteries': '🔋',
  };

  @override
  Widget build(BuildContext context) {
    final icon = _icons[category.name.toLowerCase()] ?? '📦';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(child: Text(icon, style: const TextStyle(fontSize: 24))),
            ),
            const SizedBox(height: 6),
            Text(category.name, textAlign: TextAlign.center,
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }
}
