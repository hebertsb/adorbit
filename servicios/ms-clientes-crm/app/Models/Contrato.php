<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;

/**
 * @property string $id
 * @property string $cliente_id
 * @property string $estado
 * @property CarbonInterface|null $fecha_inicio
 * @property CarbonInterface|null $fecha_fin
 * @property mixed $monto
 * @property string $moneda
 * @property int $version
 */
class Contrato extends ModeloMongo
{
    protected $table = 'contratos';

    protected $casts = ['fecha_inicio' => 'datetime', 'fecha_fin' => 'datetime'];
}
