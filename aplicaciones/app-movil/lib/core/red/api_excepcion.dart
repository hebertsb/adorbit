/// Mismo cuerpo de error uniforme que usa todo el backend AdOrbit: {codigo, mensaje,
/// detalle} — ver manejadorErrores.ts / manejador_errores.py.
class ApiExcepcion implements Exception {
  const ApiExcepcion({
    required this.status,
    required this.codigo,
    required this.mensaje,
    this.detalle,
  });

  final int status;
  final String codigo;
  final String mensaje;
  final Object? detalle;

  @override
  String toString() => 'ApiExcepcion($status, $codigo): $mensaje';
}
