import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sidesa_app/theme.dart';

void main() {
  test('theme uses Material 3 and the Biru Arsip primary', () {
    final t = sidesaTheme();
    expect(t.useMaterial3, isTrue);
    expect(t.colorScheme.primary, const Color(0xFF0F5C6B));
  });
}
