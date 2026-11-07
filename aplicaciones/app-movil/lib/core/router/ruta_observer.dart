import 'package:flutter/material.dart';

/// Observador compartido: permite que una pagina reaccione cuando la ruta que la
/// tapaba se cierra y vuelve a quedar visible (ver brief_detalle_pagina.dart --
/// evita datos obsoletos al volver desde camara/validacion-ia, ya que GoRouter
/// reutiliza esa misma instancia en vez de pasar de nuevo por initState).
final RouteObserver<PageRoute<dynamic>> rutaObserver =
    RouteObserver<PageRoute<dynamic>>();
