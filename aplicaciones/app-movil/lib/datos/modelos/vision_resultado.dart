/// Forma real de la respuesta de POST /api/v1/vision/analizar en ms-ia
/// (ver servicios/ms-ia/app/api/vision.py:_a_dict). detecta_texto/manual_marca_ok
/// vienen null a proposito del servidor -- ningun modelo de ms-ia hace OCR todavia.
class VisionResultado {
  const VisionResultado({
    required this.id,
    required this.piezaId,
    this.campanaId,
    required this.detectaLogo,
    this.detectaTexto,
    this.manualMarcaOk,
    required this.confianza,
    this.duracionMs,
  });

  final String id;
  final String piezaId;
  final String? campanaId;
  final bool detectaLogo;
  final bool? detectaTexto;
  final bool? manualMarcaOk;
  final double confianza;
  final num? duracionMs;

  factory VisionResultado.desdeJson(Map<String, dynamic> j) => VisionResultado(
    id: j['id'] as String,
    piezaId: j['pieza_id'] as String,
    campanaId: j['campana_id'] as String?,
    detectaLogo: j['detecta_logo'] as bool? ?? false,
    detectaTexto: j['detecta_texto'] as bool?,
    manualMarcaOk: j['manual_marca_ok'] as bool?,
    confianza: (j['confianza'] as num?)?.toDouble() ?? 0.0,
    duracionMs: j['duracion_ms'] as num?,
  );
}
