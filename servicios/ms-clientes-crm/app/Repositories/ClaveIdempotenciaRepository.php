<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\ClaveIdempotencia;
use MongoDB\BSON\UTCDateTime;

class ClaveIdempotenciaRepository
{
    public function buscar(string $clave): ?ClaveIdempotencia
    {
        return ClaveIdempotencia::where('clave', $clave)->first();
    }

    /** Falla con clave duplicada (indice unico) si ya existia. */
    public function crear(string $clave, string $huella, int $vigencia_dias): void
    {
        ClaveIdempotencia::create([
            'clave' => $clave,
            'huella_solicitud' => $huella,
            'estado' => 'en_proceso',
            'vence_en' => new UTCDateTime((time() + $vigencia_dias * 86400) * 1000),
        ]);
    }

    /** @param  array<string, mixed>|null  $cuerpo */
    public function guardar_respuesta(string $clave, int $estado_http, ?array $cuerpo): void
    {
        ClaveIdempotencia::where('clave', $clave)->update([
            'estado' => 'completado',
            'estado_http' => $estado_http,
            'respuesta' => $cuerpo === null ? null : json_encode($cuerpo, JSON_UNESCAPED_UNICODE),
        ]);
    }
}
