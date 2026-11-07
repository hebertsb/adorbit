import 'package:flutter/material.dart';

import 'colores_ao.dart';

/// Construye el ThemeData claro/oscuro de AdOrbit a partir de ColoresAo.
/// No definir colores sueltos en ningun widget: todo sale de context.aoColores.
class TemaAo {
  TemaAo._();

  static const double radioChico = 6;
  static const double radio = 10;
  static const double radioGrande = 14;
  static const double radioPastilla = 999;
  static const double objetivoTactil = 44;

  static const String familiaMono = 'monospace';

  static ThemeData claro() => _construir(ColoresAo.claro, Brightness.light);

  static ThemeData oscuro() => _construir(ColoresAo.oscuro, Brightness.dark);

  static ThemeData _construir(ColoresAoTema c, Brightness brillo) {
    final colorScheme = ColorScheme(
      brightness: brillo,
      primary: c.marca,
      onPrimary: Colors.white,
      secondary: c.marcaOscura,
      onSecondary: Colors.white,
      error: c.peligro,
      onError: Colors.white,
      surface: c.superficie,
      onSurface: c.texto,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brillo,
      scaffoldBackgroundColor: c.fondo,
      colorScheme: colorScheme,
      dividerColor: c.borde,
      cardColor: c.superficie,
      splashFactory: InkRipple.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: c.superficie,
        foregroundColor: c.texto,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: c.texto,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      textTheme: ThemeData(
        brightness: brillo,
      ).textTheme.apply(bodyColor: c.texto, displayColor: c.texto),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: c.marca,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(objetivoTactil),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radio),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.texto,
          side: BorderSide(color: c.borde),
          minimumSize: const Size.fromHeight(objetivoTactil),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radio),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.plano,
        hintStyle: TextStyle(color: c.textoTenue),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radio),
          borderSide: BorderSide(color: c.borde),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radio),
          borderSide: BorderSide(color: c.borde),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radio),
          borderSide: BorderSide(color: c.marca, width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: c.superficie,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radioGrande),
          side: BorderSide(color: c.borde),
        ),
      ),
      dividerTheme: DividerThemeData(color: c.borde, thickness: 1, space: 1),
      extensions: [AoThemeExtension(c)],
    );
  }
}
