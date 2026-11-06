<?php

declare(strict_types=1);

/*
 * CORS con lista blanca: solo los portales web configurados pueden llamar a la API desde el navegador.
 * ADORBIT_CRM_CORS_ORIGENES = origenes separados por coma (vacio = ninguno).
 */
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('ADORBIT_CRM_CORS_ORIGENES', ''))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Correlation-Id', 'Accept'],
    'exposed_headers' => ['X-Correlation-Id'],
    'max_age' => 3600,
    'supports_credentials' => false,
];
