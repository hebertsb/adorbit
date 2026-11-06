import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_onnxruntime/flutter_onnxruntime.dart';
import 'package:image/image.dart' as img;

/// Resultado de una inferencia on-device sobre una foto capturada.
///
/// [confianza] es el mejor puntaje visto entre todas las celdas de la grilla aunque no
/// supere el umbral (asi la UI puede mostrar "42%" en vez de "0%" cuando el modelo duda).
/// [cajaFraccion] son las coordenadas xyxy de esa celda como fraccion 0..1 del ancho/alto
/// de la imagen original -- se puede ubicar directo sobre cualquier tamano de render sin
/// volver a escalar, porque el redimensionado a la entrada del modelo es independiente
/// por eje (no hay letterbox que desplace el origen).
class DeteccionLogo {
  const DeteccionLogo({
    required this.detectaLogo,
    required this.confianza,
    required this.anchoImagen,
    required this.altoImagen,
    this.cajaFraccion,
  });

  final bool detectaLogo;
  final double confianza;
  final int anchoImagen;
  final int altoImagen;
  final List<double>? cajaFraccion;
}

/// Deteccion del logo de AdOrbit 100% en el dispositivo, sin red ni backend: corre el
/// mismo YOLOv8n afinado que expone ms-ia en POST /vision/analizar (ver D21 en
/// documentacion/05-decisiones-y-pendientes.md), exportado a ONNX (ver D22) y
/// empaquetado como asset de la app. Igual que en el servidor, es un solo detector de
/// una sola clase ("logo_adorbit"): no hace falta Non-Max Suppression sobre varias cajas
/// porque solo nos interesa la celda con mejor puntaje para decidir si el logo aparece.
class DetectorLogoLocal {
  DetectorLogoLocal._();
  static final DetectorLogoLocal instancia = DetectorLogoLocal._();

  static const _rutaModeloAsset = 'assets/modelos/yolo_logo_adorbit.onnx';
  static const _tamanoEntrada = 320;
  static const umbralConfianza = 0.5;

  OrtSession? _sesion;
  Future<OrtSession>? _cargando;

  Future<OrtSession> _sesionCargada() {
    final sesion = _sesion;
    if (sesion != null) return Future.value(sesion);
    return _cargando ??= OnnxRuntime().createSessionFromAsset(_rutaModeloAsset).then((s) {
      _sesion = s;
      return s;
    });
  }

  /// Decodifica, redimensiona y normaliza [bytesImagen], corre la inferencia y decodifica
  /// la salida cruda (1, 5, N) del modelo -- 4 coordenadas de caja + 1 puntaje de clase,
  /// ya con sigmoid aplicado por el propio grafo exportado.
  Future<DeteccionLogo> detectar(Uint8List bytesImagen) async {
    final decodificada = img.decodeImage(bytesImagen);
    if (decodificada == null) {
      return const DeteccionLogo(detectaLogo: false, confianza: 0, anchoImagen: 0, altoImagen: 0);
    }

    final entrada = _aTensorEntrada(decodificada);
    final sesion = await _sesionCargada();
    final valorEntrada = await OrtValue.fromList(entrada, [1, 3, _tamanoEntrada, _tamanoEntrada]);
    try {
      final nombreEntrada = sesion.inputNames.first;
      final salidas = await sesion.run({nombreEntrada: valorEntrada});
      final nombreSalida = sesion.outputNames.first;
      final bruto = (await salidas[nombreSalida]!.asFlattenedList()).cast<num>();
      for (final v in salidas.values) {
        unawaited(v.dispose());
      }
      return _decodificar(bruto, decodificada.width, decodificada.height);
    } finally {
      unawaited(valorEntrada.dispose());
    }
  }

  Float32List _aTensorEntrada(img.Image imagen) {
    final redimensionada = img.copyResize(imagen, width: _tamanoEntrada, height: _tamanoEntrada);
    final total = _tamanoEntrada * _tamanoEntrada;
    final entrada = Float32List(3 * total);
    var i = 0;
    for (var y = 0; y < _tamanoEntrada; y++) {
      for (var x = 0; x < _tamanoEntrada; x++) {
        final pixel = redimensionada.getPixel(x, y);
        entrada[i] = pixel.r / 255.0;
        entrada[total + i] = pixel.g / 255.0;
        entrada[2 * total + i] = pixel.b / 255.0;
        i++;
      }
    }
    return entrada;
  }

  DeteccionLogo _decodificar(List<num> bruto, int anchoImagen, int altoImagen) {
    final anclas = bruto.length ~/ 5;
    var mejorIndice = 0;
    var mejorPuntaje = double.negativeInfinity;
    for (var i = 0; i < anclas; i++) {
      final puntaje = bruto[4 * anclas + i].toDouble();
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejorIndice = i;
      }
    }

    final detecta = mejorPuntaje > umbralConfianza;
    List<double>? cajaFraccion;
    if (detecta) {
      final cx = bruto[mejorIndice].toDouble();
      final cy = bruto[anclas + mejorIndice].toDouble();
      final w = bruto[2 * anclas + mejorIndice].toDouble();
      final h = bruto[3 * anclas + mejorIndice].toDouble();
      final tam = _tamanoEntrada.toDouble();
      cajaFraccion = [
        ((cx - w / 2) / tam).clamp(0.0, 1.0),
        ((cy - h / 2) / tam).clamp(0.0, 1.0),
        ((cx + w / 2) / tam).clamp(0.0, 1.0),
        ((cy + h / 2) / tam).clamp(0.0, 1.0),
      ];
    }

    return DeteccionLogo(
      detectaLogo: detecta,
      confianza: mejorPuntaje.clamp(0.0, 1.0),
      anchoImagen: anchoImagen,
      altoImagen: altoImagen,
      cajaFraccion: cajaFraccion,
    );
  }
}
