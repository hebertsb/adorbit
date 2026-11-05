import '../modelos/cola_sync.dart';

/// TODO Hebert: respaldar con BandejaSalidaDao (core/datos_locales) en vez de datos fijos,
/// una vez que haya escrituras offline reales que encolar.
class ColaSyncRepo {
  static const List<ElementoColaSync> _items = [
    ElementoColaSync(
      titulo: 'Tótem entrada sucursal Centro',
      subtitulo: 'Telecom Altiplano · Lanzamiento Fibra Óptica 500M',
      estado: EstadoSincronizacion.sincronizado,
    ),
    ElementoColaSync(
      titulo: 'Spot video sucursal — pantalla LED',
      subtitulo: 'Telecom Altiplano · 1.6 MB de 2.4 MB transferidos',
      estado: EstadoSincronizacion.enviando,
      progreso: 0.68,
      detalle: '142 KB/s',
    ),
    ElementoColaSync(
      titulo: 'Campaña Institucional Créditos',
      subtitulo: 'Banco del Valle',
      estado: EstadoSincronizacion.conflicto,
      detalle:
          'El servidor ya tiene una versión más nueva de este registro guardada por otro auditor (11:15). Tu versión local se mantiene segura para evitar pérdida de datos.',
    ),
    ElementoColaSync(
      titulo: 'Valla carretera — ruta Santa Cruz',
      subtitulo: 'Promo Carnaval & Verano · Cervecería del Sur',
      estado: EstadoSincronizacion.error,
      intentos: 3,
      detalle: 'Tiempo de espera agotado al enviar archivo pesado. Reintento automático en 5 min.',
    ),
    ElementoColaSync(
      titulo: 'Vitrina digital — tótem escaparate',
      subtitulo: 'Tienda Andina · Colección Verano Boutique',
      estado: EstadoSincronizacion.pendiente,
      detalle: 'En cola para procesar al finalizar subidas actuales.',
    ),
  ];

  List<ElementoColaSync> listar() => _items;

  int get pendientes => _items
      .where((e) =>
          e.estado != EstadoSincronizacion.sincronizado && e.estado != EstadoSincronizacion.error)
      .length;

  int get resueltos =>
      _items.where((e) => e.estado == EstadoSincronizacion.sincronizado).length;

  int get errores => _items.where((e) => e.estado == EstadoSincronizacion.error).length;
}
