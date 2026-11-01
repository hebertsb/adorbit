<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;

/**
 * @property string $id
 * @property string $razon_social
 * @property string|null $nit
 * @property string $estado
 * @property array<int, array<string, mixed>> $contactos
 * @property array{limite: mixed, usado: mixed, moneda: string} $linea_credito
 * @property int $version
 * @property CarbonInterface|null $creado_en
 * @property CarbonInterface|null $actualizado_en
 */
class Cliente extends ModeloMongo
{
    protected $table = 'clientes';
}
