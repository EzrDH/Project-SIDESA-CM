import 'package:flutter/material.dart';

const _seed = Color(0xFF0F5C6B); // Biru Arsip (DESIGN.md §4)

ThemeData sidesaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: _seed,
    primary: _seed,
    secondary: const Color(0xFF4F7A3A), // Hijau Padi
    tertiary: const Color(0xFFB7791F), // Ochre Cap
    brightness: Brightness.light,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFFF4F6F7),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52), // large tap target for elderly users
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    cardTheme: CardThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
  );
}
