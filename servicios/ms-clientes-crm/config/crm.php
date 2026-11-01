<?php

declare(strict_types=1);

return [
    'seguridad' => [
        'jwks_uri' => env('ADORBIT_CRM_JWKS_URI'),
        'emisor' => env('ADORBIT_CRM_JWT_EMISOR'),
        'audiencia' => env('ADORBIT_CRM_JWT_AUDIENCIA', 'ms-clientes-crm'),
        'holgura_segundos' => 30,
        'cache_jwks_segundos' => 300,
    ],

    'mensajeria' => [
        'host' => env('ADORBIT_CRM_RABBITMQ_HOST', 'localhost'),
        'puerto' => (int) env('ADORBIT_CRM_RABBITMQ_PUERTO', 5672),
        'usuario' => env('ADORBIT_CRM_RABBITMQ_USUARIO', 'guest'),
        'clave' => env('ADORBIT_CRM_RABBITMQ_CLAVE', 'guest'),
        'exchange_eventos' => 'adorbit.eventos',
        'exchange_saga' => 'adorbit.saga',
        'exchange_errores' => 'adorbit.saga.dlx',
        'cola_comandos' => 'saga.crm',
        'max_intentos' => 5,
        'espera_inicial_segundos' => (int) env('ADORBIT_CRM_REINTENTO_INICIAL', 1),
        'intervalo_bandeja_segundos' => (int) env('ADORBIT_CRM_INTERVALO_BANDEJA', 1),
    ],

    'idempotencia' => [
        'vigencia_dias' => 7,
    ],
];
