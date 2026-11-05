import 'package:flutter/material.dart';

/// Paleta AdOrbit — valores identicos a documentacion/diseno/tokens.css
/// (unica fuente compartida con portal-gestion, portal-cliente y panel-inteligencia).
///
/// Para cambiar el color de marca de toda la app movil: solo estas dos lineas.
class ColoresAo {
  ColoresAo._();

  static const Color marcaClaro = Color(0xFF4F46E5);
  static const Color marcaOscuroTono = Color(0xFF8B92FF);

  static const ColoresAoTema claro = ColoresAoTema(
    fondo: Color(0xFFF6F7FB),
    plano: Color(0xFFF6F7FB),
    superficie: Color(0xFFFFFFFF),
    borde: Color(0xFFE3E6EE),
    texto: Color(0xFF1F2937),
    textoSuave: Color(0xFF5B6472),
    textoTenue: Color(0xFF898781),
    marca: marcaClaro,
    marcaOscura: Color(0xFF4338CA),
    marcaSuave: Color(0xFFEEF0FF),
    ok: Color(0xFF047857),
    okFondo: Color(0xFFD9F5E9),
    aviso: Color(0xFF92400E),
    avisoFondo: Color(0xFFFDECC8),
    peligro: Color(0xFFB91C1C),
    peligroFondo: Color(0xFFFDE2E2),
    info: Color(0xFF1D4ED8),
    infoFondo: Color(0xFFDCE8FF),
    neutro: Color(0xFF475569),
    neutroFondo: Color(0xFFE8EBF0),
  );

  static const ColoresAoTema oscuro = ColoresAoTema(
    fondo: Color(0xFF0F1220),
    plano: Color(0xFF0D0D0D),
    superficie: Color(0xFF181C2E),
    borde: Color(0xFF2A3049),
    texto: Color(0xFFE8EAF3),
    textoSuave: Color(0xFFA3ABC0),
    textoTenue: Color(0xFF898781),
    marca: marcaOscuroTono,
    marcaOscura: Color(0xFFA5ABFF),
    marcaSuave: Color(0xFF232852),
    ok: Color(0xFF4ADE80),
    okFondo: Color(0xFF12372A),
    aviso: Color(0xFFFBBF24),
    avisoFondo: Color(0xFF3D2F10),
    peligro: Color(0xFFF87171),
    peligroFondo: Color(0xFF44191D),
    info: Color(0xFF93B4FF),
    infoFondo: Color(0xFF1C2A52),
    neutro: Color(0xFFB6BDCC),
    neutroFondo: Color(0xFF262B40),
  );
}

/// Un token por cada --ao-* de tokens.css. Se accede via context.aoColores.
class ColoresAoTema {
  const ColoresAoTema({
    required this.fondo,
    required this.plano,
    required this.superficie,
    required this.borde,
    required this.texto,
    required this.textoSuave,
    required this.textoTenue,
    required this.marca,
    required this.marcaOscura,
    required this.marcaSuave,
    required this.ok,
    required this.okFondo,
    required this.aviso,
    required this.avisoFondo,
    required this.peligro,
    required this.peligroFondo,
    required this.info,
    required this.infoFondo,
    required this.neutro,
    required this.neutroFondo,
  });

  final Color fondo;
  final Color plano;
  final Color superficie;
  final Color borde;
  final Color texto;
  final Color textoSuave;
  final Color textoTenue;
  final Color marca;
  final Color marcaOscura;
  final Color marcaSuave;
  final Color ok;
  final Color okFondo;
  final Color aviso;
  final Color avisoFondo;
  final Color peligro;
  final Color peligroFondo;
  final Color info;
  final Color infoFondo;
  final Color neutro;
  final Color neutroFondo;
}

class AoThemeExtension extends ThemeExtension<AoThemeExtension> {
  const AoThemeExtension(this.colores);

  final ColoresAoTema colores;

  @override
  AoThemeExtension copyWith({ColoresAoTema? colores}) =>
      AoThemeExtension(colores ?? this.colores);

  @override
  AoThemeExtension lerp(ThemeExtension<AoThemeExtension>? other, double t) {
    if (other is! AoThemeExtension) return this;
    return t < 0.5 ? this : other;
  }
}

extension AoColoresContext on BuildContext {
  ColoresAoTema get aoColores => Theme.of(this).extension<AoThemeExtension>()!.colores;
}
