<?php

declare(strict_types=1);

namespace App\Models;

/**
 * @property string $clave
 * @property string $huella_solicitud
 * @property int|null $estado_http
 * @property string|null $respuesta
 */
class ClaveIdempotencia extends ModeloMongo
{
    protected $table = 'claves_idempotencia';

    protected $primaryKey = 'clave';

    public $timestamps = false;
}
