import 'package:flutter/material.dart';
import '../theme.dart';

/// A rounded, tinted icon in a soft circle — friendly and easy to recognize.
class TintedIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  const TintedIcon(this.icon, {super.key, this.color = kPrimary, this.size = 48});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

/// Colored status pill with an icon + word.
class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  const StatusChip({super.key, required this.label, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    );
  }
}

/// Reassuring privacy note (the ZKP story, in plain words).
class PrivacyBanner extends StatelessWidget {
  const PrivacyBanner({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: kPrimary.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(16)),
      child: Row(children: const [
        Icon(Icons.shield_outlined, color: kPrimary),
        SizedBox(width: 12),
        Expanded(
          child: Text('Data pribadi Anda dibuktikan tanpa dibuka — privasi tetap terlindungi.',
              style: TextStyle(color: kTextPrimary, fontSize: 14, height: 1.3)),
        ),
      ]),
    );
  }
}

/// Big, obvious primary action card (e.g. "Ajukan Surat").
class BigActionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  const BigActionCard({super.key, required this.title, required this.subtitle, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: kPrimary,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14)),
              ]),
            ),
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), shape: BoxShape.circle),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
          ]),
        ),
      ),
    );
  }
}

/// A tappable card with a tinted icon, title, and description.
class MenuCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String? subtitle;
  final String? trailing;
  final VoidCallback? onTap;
  const MenuCard({super.key, required this.icon, required this.title, this.subtitle, this.trailing, this.iconColor = kPrimary, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            TintedIcon(icon, color: iconColor),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
                ],
                if (trailing != null) ...[
                  const SizedBox(height: 8),
                  Row(children: [
                    const Icon(Icons.schedule, size: 15, color: kProgress),
                    const SizedBox(width: 4),
                    Text(trailing!, style: const TextStyle(color: kProgress, fontSize: 13, fontWeight: FontWeight.w600)),
                  ]),
                ],
              ]),
            ),
            if (onTap != null) const Icon(Icons.chevron_right, color: kTextSecondary),
          ]),
        ),
      ),
    );
  }
}

/// The "Cap Digital" verification seal shown on a valid letter.
class CapDigital extends StatelessWidget {
  const CapDigital({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 108, height: 108,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: kSurface,
        border: Border.all(color: kSuccess, width: 2.5, style: BorderStyle.solid),
      ),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: const [
        Icon(Icons.verified, color: kSuccess, size: 30),
        SizedBox(height: 2),
        Text('TERVERIFIKASI', style: TextStyle(color: kSuccess, fontSize: 8.5, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        SizedBox(height: 2),
        Icon(Icons.qr_code_2, color: kPrimary, size: 22),
      ]),
    );
  }
}
