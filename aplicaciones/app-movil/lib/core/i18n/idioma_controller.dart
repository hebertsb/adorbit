import 'package:flutter_riverpod/flutter_riverpod.dart';

enum Idioma { es, en }

/// Idioma de la interfaz propia de la app. Los datos que vienen del servidor (titulo
/// de un brief, descripcion, etc.) y las etiquetas de los enums de dominio (EstadoBrief,
/// EstadoPieza...) no se traducen en esta pasada -- solo el texto fijo de pantallas.
/// Sin persistencia, igual que TemaController (alcance UI de esta pasada).
final idiomaControllerProvider = NotifierProvider<IdiomaController, Idioma>(
  IdiomaController.new,
);

class IdiomaController extends Notifier<Idioma> {
  @override
  Idioma build() => Idioma.es;

  void alternar() => state = state == Idioma.es ? Idioma.en : Idioma.es;

  void establecer(Idioma idioma) => state = idioma;
}
