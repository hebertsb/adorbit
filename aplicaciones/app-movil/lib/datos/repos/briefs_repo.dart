import '../modelos/brief.dart';

/// Datos de demo para la app movil. Clientes inventados (ninguno coincide con marcas
/// reales — ver auditoria de mockups: "Banco Unión" y "Cervecería Boliviana" se
/// reemplazaron por nombres ficticios antes de llegar aqui).
///
/// TODO Hebert: reemplazar por GET /api/v1/briefs (ms-creatividades) + cache SQLite.
class BriefsRepo {
  static final List<Brief> _briefs = [
    Brief(
      id: 'b1',
      cliente: 'Telecom Altiplano',
      campana: 'Lanzamiento Fibra Óptica 500M',
      estado: EstadoBrief.activo,
      subEstado: 'Al 100%',
      piezas: const [
        Pieza(
          id: 'p1',
          titulo: 'Tótem entrada sucursal Centro',
          formato: 'JPG · 1080×1920',
          estado: EstadoPieza.aprobada,
          confianza: 0.98,
        ),
        Pieza(
          id: 'p2',
          titulo: 'Roll-up vertical punto de venta',
          formato: 'JPG · 1440×2560',
          estado: EstadoPieza.pendiente,
          confianza: 0.92,
        ),
        Pieza(
          id: 'p3',
          titulo: 'Spot video sucursal — pantalla LED',
          formato: 'MP4 · 1080p',
          estado: EstadoPieza.bloqueada,
          confianza: 0.96,
          notaBloqueo:
              'Bloqueada por contratación — no se puede editar ni re-aprobar en esta etapa.',
        ),
        Pieza(
          id: 'p4',
          titulo: 'Valla OOH 8×3m — Av. Monseñor Rivero',
          formato: 'PDF · Vectorial',
          estado: EstadoPieza.rechazada,
          confianza: 0.64,
          observacion:
              'Baja coincidencia de paleta corporativa. Reemplazar violeta secundario por el tono institucional reglamentario.',
        ),
      ],
    ),
    Brief(
      id: 'b2',
      cliente: 'Banco del Valle',
      campana: 'Campaña Institucional Créditos',
      estado: EstadoBrief.enRevision,
      subEstado: 'Pendiente VoBo',
      piezas: const [
        Pieza(
          id: 'p5',
          titulo: 'Banner institucional línea PYME',
          formato: 'JPG · 1080×1080',
          estado: EstadoPieza.aprobada,
          confianza: 0.95,
        ),
        Pieza(
          id: 'p6',
          titulo: 'Afiche sucursal — tasa preferencial',
          formato: 'JPG · 1080×1350',
          estado: EstadoPieza.pendiente,
          confianza: 0.88,
        ),
      ],
    ),
    Brief(
      id: 'b3',
      cliente: 'Cervecería del Sur',
      campana: 'Promo Carnaval & Verano 2026',
      estado: EstadoBrief.activo,
      subEstado: 'En cronograma',
      piezas: const [
        Pieza(
          id: 'p7',
          titulo: 'Valla carretera — ruta Santa Cruz',
          formato: 'PDF · Vectorial',
          estado: EstadoPieza.aprobada,
          confianza: 0.97,
        ),
        Pieza(
          id: 'p8',
          titulo: 'Tótem punto de venta refrigerado',
          formato: 'JPG · 1080×1920',
          estado: EstadoPieza.pendiente,
          confianza: 0.9,
        ),
        Pieza(
          id: 'p9',
          titulo: 'Banderola feria de verano',
          formato: 'JPG · 1200×1800',
          estado: EstadoPieza.aprobada,
          confianza: 0.99,
        ),
      ],
    ),
    Brief(
      id: 'b4',
      cliente: 'Hogar Sur Inmobiliaria',
      campana: 'Catálogo Primavera — Lotes',
      estado: EstadoBrief.completado,
      subEstado: 'Archivado',
      piezas: const [
        Pieza(
          id: 'p10',
          titulo: 'Valla acceso urbanización',
          formato: 'PDF · Vectorial',
          estado: EstadoPieza.aprobada,
          confianza: 0.99,
        ),
      ],
    ),
    Brief(
      id: 'b5',
      cliente: 'Tienda Andina',
      campana: 'Colección Verano Boutique',
      estado: EstadoBrief.enRevision,
      subEstado: 'Revisión final',
      piezas: const [
        Pieza(
          id: 'p11',
          titulo: 'Vitrina digital — tótem escaparate',
          formato: 'JPG · 1080×1920',
          estado: EstadoPieza.pendiente,
          confianza: 0.86,
        ),
      ],
    ),
  ];

  List<Brief> listar() => _briefs;

  Brief? buscarPorId(String id) {
    for (final b in _briefs) {
      if (b.id == id) return b;
    }
    return null;
  }
}
