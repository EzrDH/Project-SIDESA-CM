import 'package:flutter/material.dart';

// Simple, friendly palette: one brand color + neutral surfaces + status colors.
const kPrimary = Color(0xFF0F5C6B); // Biru Arsip
const kBackground = Color(0xFFF6F7F5); // warm off-white
const kSurface = Color(0xFFFFFFFF);
const kSuccess = Color(0xFF2E7D32); // Sah / selesai
const kProgress = Color(0xFFC98A2B); // sedang diproses
const kTextPrimary = Color(0xFF1A1C1D);
const kTextSecondary = Color(0xFF5A6167);

ThemeData sidesaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: kPrimary,
    primary: kPrimary,
    surface: kSurface,
    brightness: Brightness.light,
  );
  const radius = 20.0;
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: kBackground,
    textTheme: const TextTheme(
      headlineMedium: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: kTextPrimary),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: kTextPrimary),
      titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: kTextPrimary),
      bodyLarge: TextStyle(fontSize: 16, color: kTextPrimary, height: 1.4),
      bodyMedium: TextStyle(fontSize: 15, color: kTextSecondary, height: 1.4),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: kBackground,
      surfaceTintColor: Colors.transparent,
      foregroundColor: kTextPrimary,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: kTextPrimary),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56), // large, easy tap target
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    cardTheme: CardThemeData(
      color: kSurface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
        side: const BorderSide(color: Color(0xFFE6E8E6)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kSurface,
      indicatorColor: kPrimary.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
