import 'package:flutter/material.dart';

import '../core/tema/tema_ao.dart';

/// Texto monoespaciado para datos: IDs, horas, porcentajes, coordenadas GPS.
/// Equivalente movil de la clase .dato-mono del portal web.
class TextoMono extends StatelessWidget {
  const TextoMono(
    this.texto, {
    super.key,
    this.tamano = 13,
    this.color,
    this.peso = FontWeight.w600,
  });

  final String texto;
  final double tamano;
  final Color? color;
  final FontWeight peso;

  @override
  Widget build(BuildContext context) {
    return Text(
      texto,
      style: TextStyle(
        fontFamily: TemaAo.familiaMono,
        fontSize: tamano,
        fontWeight: peso,
        color: color ?? Theme.of(context).colorScheme.onSurface,
      ),
    );
  }
}
