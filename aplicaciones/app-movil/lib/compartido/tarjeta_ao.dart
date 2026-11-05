import 'package:flutter/material.dart';

/// Tarjeta base: superficie + borde + radio-grande, consistente con --ao-superficie.
class TarjetaAo extends StatelessWidget {
  const TarjetaAo({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tarjeta = Card(
      margin: EdgeInsets.zero,
      child: Padding(padding: padding, child: child),
    );
    if (onTap == null) return tarjeta;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: tarjeta,
    );
  }
}
