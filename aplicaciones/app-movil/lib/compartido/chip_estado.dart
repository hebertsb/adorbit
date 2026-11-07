import 'package:flutter/material.dart';

/// Pastilla de estado generica: usada para EstadoBrief, EstadoPieza, EstadoSincronizacion,
/// EstadoFisicoValla — siempre color (texto) + fondo tenue, nunca color plano a secas.
class ChipEstado extends StatelessWidget {
  const ChipEstado({
    super.key,
    required this.texto,
    required this.color,
    required this.fondo,
    this.compacto = false,
  });

  final String texto;
  final Color color;
  final Color fondo;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compacto ? 8 : 10,
        vertical: compacto ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: fondo,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        texto,
        style: TextStyle(
          color: color,
          fontSize: compacto ? 11 : 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
