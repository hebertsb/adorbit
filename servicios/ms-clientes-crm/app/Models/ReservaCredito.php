<?php

declare(strict_types=1);

namespace App\Models;

/**
 * @property string $id
 * @property string $cliente_id
 * @property string $campana_id
 * @property string $saga_id
 * @property mixed $monto
 * @property string $moneda
 * @property string $estado
 */
class ReservaCredito extends ModeloMongo
{
    protected $table = 'reservas_credito';
}
