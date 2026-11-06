<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;

/**
 * @property string $id
 * @property string $tipo_evento
 * @property string $agregado_id
 * @property string $correlacion_id
 * @property array<string, mixed> $carga
 * @property bool $publicado
 * @property CarbonInterface $creado_en
 */
class EventoSalida extends ModeloMongo
{
    protected $table = 'bandeja_salida_eventos';
}
