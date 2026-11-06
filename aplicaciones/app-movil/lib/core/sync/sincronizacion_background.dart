import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

import '../auth/sesion_controller.dart' show clavePrefsToken;
import 'sincronizador_service.dart';

const String tareaSincronizacionPeriodica = 'adorbit-sincronizacion-periodica';
const String tareaSincronizacionInmediata = 'adorbit-sincronizacion-inmediata';

/// Punto de entrada que Android/iOS invocan en un isolate aparte cuando el
/// background task programado se dispara. Debe quedar a nivel de archivo (no dentro
/// de una clase) y marcado @pragma('vm:entry-point') — lo exige workmanager. Este
/// isolate NO comparte el ProviderContainer de Riverpod del isolate principal, asi
/// que el token se lee directo de SharedPreferences (misma clave que sesion_controller.dart).
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(clavePrefsToken);
    if (token == null) return true; // sin sesion -- nada que sincronizar todavia
    await SincronizadorService(token: token).drenarPendientes();
    return true;
  });
}

/// Registro real de WorkManager (Android) / BGTaskScheduler (iOS) para drenar
/// bandeja_salida_local en segundo plano. En web no hay equivalente de SO — ahi
/// el boton manual "Sincronizar ahora" sigue siendo el unico disparador.
class SincronizacionBackground {
  SincronizacionBackground._();

  static Future<void> inicializar() async {
    await Workmanager().initialize(callbackDispatcher);
    await Workmanager().registerPeriodicTask(
      tareaSincronizacionPeriodica,
      tareaSincronizacionPeriodica,
      // Minimo permitido por Android WorkManager; iOS ignora frequency y decide
      // el momento real segun el patron de uso de la app (ver docs de workmanager).
      frequency: const Duration(minutes: 15),
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
    );
  }

  /// Dispara un intento inmediato — ej. cuando ConectividadService detecta que
  /// se recupero la red — sin esperar los 15 min de la tarea periodica.
  static Future<void> sincronizarAhora() async {
    await Workmanager().registerOneOffTask(
      '$tareaSincronizacionInmediata-${DateTime.now().millisecondsSinceEpoch}',
      tareaSincronizacionInmediata,
      constraints: Constraints(networkType: NetworkType.connected),
      existingWorkPolicy: ExistingWorkPolicy.append,
    );
  }
}
