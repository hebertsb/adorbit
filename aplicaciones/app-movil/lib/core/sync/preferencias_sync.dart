/// Clave de SharedPreferences para "Solo sincronizar con Wi-Fi", compartida entre el
/// isolate principal (UI) y el isolate de workmanager (ver sincronizacion_background.dart
/// -- ese isolate no comparte el ProviderContainer de Riverpod del isolate principal).
const clavePrefsSoloWifi = 'adorbit_solo_wifi';

/// Marca de tiempo (ISO 8601) de la ultima vez que drenarPendientes() envio al menos
/// una pieza real al servidor -- usada por perfil_pagina.dart ("Ultima sincronizacion").
/// bandeja_salida_local no guarda un timestamp de sincronizado, solo de creado_en.
const clavePrefsUltimaSincronizacion = 'adorbit_ultima_sincronizacion';
