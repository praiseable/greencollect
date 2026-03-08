import 'package:flutter/material.dart';

class AppTypography {
  static TextStyle get h1 => TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  );

  static TextStyle get h2 => TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
  );

  static TextStyle get h3 => TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
  );

  static TextStyle get body => TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
  );

  static TextStyle get bodySmall => TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.normal,
  );

  static TextStyle get caption => TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.normal,
  );

  static TextStyle get button => TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
  );
}
