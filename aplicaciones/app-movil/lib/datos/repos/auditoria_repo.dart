import '../modelos/auditoria.dart';

/// TODO Hebert: reemplazar por GET /api/v1/auditorias/{vallaId} (ms-creatividades).
class AuditoriaRepo {
  static const ActivoOoh _vallaDemo = ActivoOoh(
    codigo: 'SCZ-OOH-882',
    cliente: 'Telecom Altiplano',
    campana: 'Lanzamiento Fibra Óptica 500M',
    descripcion: 'Valla OOH #V-104 (Monopolar)',
    direccion: 'Av. Monseñor Rivero y 2do Anillo, Santa Cruz de la Sierra',
    precisionGps: '±4m',
    coincidenciaVisual: 0.96,
    historial: [
      RegistroAuditoria(
        resumen: 'Conforme',
        estado: EstadoFisicoValla.bueno,
        fecha: '14 feb 2026',
        auditor: 'Carlos Méndez · GPS verificado',
      ),
      RegistroAuditoria(
        resumen: 'Deterioro leve en esquina',
        estado: EstadoFisicoValla.deterioro,
        fecha: '28 ene 2026',
        auditor: 'Andrea Roca',
        nota: 'Subsanado',
      ),
    ],
  );

  ActivoOoh obtenerVallaActual() => _vallaDemo;
}
