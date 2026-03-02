import 'package:flutter/material.dart';

class PriceDisplay extends StatelessWidget {
  final int pricePaisa;
  final String? unitName;
  final bool negotiable;
  final double fontSize;

  const PriceDisplay({
    super.key,
    required this.pricePaisa,
    this.unitName,
    this.negotiable = false,
    this.fontSize = 18,
  });

  String get formatted {
    return '₨ ${pricePaisa.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Text(formatted,
          style: TextStyle(fontSize: fontSize, fontWeight: FontWeight.bold, color: Colors.green[800])),
        if (unitName != null) ...[
          const SizedBox(width: 2),
          Text('/ $unitName',
            style: TextStyle(fontSize: fontSize * 0.65, color: Colors.grey[600])),
        ],
        if (negotiable) ...[
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.orange[50],
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text('Negotiable',
              style: TextStyle(fontSize: fontSize * 0.55, color: Colors.orange[700], fontWeight: FontWeight.w500)),
          ),
        ],
      ],
    );
  }
}
