import 'package:geolocator/geolocator.dart';

/// Coordenadas GPS de una captura (auditoría de vallas en campo).
class UbicacionCaptura {
  const UbicacionCaptura({
    required this.latitud,
    required this.longitud,
    required this.precisionMetros,
  });

  final double latitud;
  final double longitud;
  final double precisionMetros;

  String get texto =>
      '${latitud.toStringAsFixed(5)}, ${longitud.toStringAsFixed(5)} (±${precisionMetros.round()} m)';

  Map<String, dynamic> aJson() => {
        'latitud': latitud,
        'longitud': longitud,
        'precision_m': precisionMetros,
      };
}

/// Lee el GPS del dispositivo. El GPS es hardware: funciona sin internet (no depende
/// de la red), así que la auditoría offline también queda georreferenciada.
/// Devuelve null si el usuario niega el permiso o el GPS está apagado: la auditoría
/// sigue igual, solo sin coordenadas.
class UbicacionService {
  static Future<UbicacionCaptura?> obtener() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permiso = await Geolocator.checkPermission();
      if (permiso == LocationPermission.denied) {
        permiso = await Geolocator.requestPermission();
      }
      if (permiso == LocationPermission.denied ||
          permiso == LocationPermission.deniedForever) {
        return null;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      return UbicacionCaptura(
        latitud: pos.latitude,
        longitud: pos.longitude,
        precisionMetros: pos.accuracy,
      );
    } catch (_) {
      final ultima = await Geolocator.getLastKnownPosition();
      if (ultima == null) return null;
      return UbicacionCaptura(
        latitud: ultima.latitude,
        longitud: ultima.longitude,
        precisionMetros: ultima.accuracy,
      );
    }
  }
}
