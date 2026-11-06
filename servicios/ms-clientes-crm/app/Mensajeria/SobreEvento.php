<?php

declare(strict_types=1);

namespace App\Mensajeria;

use App\Models\EventoSalida;

/** Sobre estandar de eventos (documentacion/03-contratos.md). */
final class SobreEvento
{
    /** @return array<string, mixed> */
    public static function armar(EventoSalida $evento): array
    {
        return [
            'id_evento' => (string) $evento->id,
            'tipo_evento' => (string) $evento->tipo_evento,
            'version_esquema' => 1,
            'ocurrido_en' => $evento->creado_en->utc()->format('Y-m-d\TH:i:s.v\Z'),
            'agregado_id' => (string) $evento->agregado_id,
            'correlacion_id' => (string) $evento->correlacion_id,
            'carga' => json_decode((string) json_encode($evento->carga), true),
        ];
    }

    /** FacturaEmitida -> factura.emitida */
    public static function clave_enrutamiento(string $tipo_evento): string
    {
        return strtolower((string) preg_replace('/([a-z0-9])([A-Z])/', '$1.$2', $tipo_evento));
    }
}
