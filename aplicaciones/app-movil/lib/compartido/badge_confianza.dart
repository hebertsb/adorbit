import 'package:flutter/material.dart';

import '../core/tema/colores_ao.dart';
import 'chip_estado.dart';

/// Umbral de demo tomado de los mockups (adorbit_m_vil_validacion_con_ia_local_*):
/// >=85% = alta confianza. No es un contrato de backend confirmado.
/// TODO Hebert/ms-ia: reemplazar por el umbral real una vez acordado.
const double umbralAltaConfianza = 0.85;

class BadgeConfianza extends StatelessWidget {
  const BadgeConfianza({
    super.key,
    required this.confianza,
    this.compacto = false,
  });

  final double confianza;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    final c = context.aoColores;
    final alta = confianza >= umbralAltaConfianza;
    final porcentaje = (confianza * 100).round();
    return ChipEstado(
      texto: alta ? '$porcentaje%' : '$porcentaje% BAJA',
      color: alta ? c.ok : c.aviso,
      fondo: alta ? c.okFondo : c.avisoFondo,
      compacto: compacto,
    );
  }
}
