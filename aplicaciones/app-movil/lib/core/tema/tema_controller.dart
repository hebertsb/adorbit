import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Controla el ThemeMode global. Equivalente movil del TemaService (signal) de portal-gestion:
/// claro/oscuro/sistema en un solo lugar, sin persistencia (alcance UI de esta pasada).
final temaControllerProvider = NotifierProvider<TemaController, ThemeMode>(TemaController.new);

class TemaController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.system;

  void alternar() {
    final esOscuro = state == ThemeMode.dark;
    state = esOscuro ? ThemeMode.light : ThemeMode.dark;
  }

  void establecer(ThemeMode modo) => state = modo;
}
