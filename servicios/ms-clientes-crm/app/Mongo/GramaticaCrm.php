<?php

declare(strict_types=1);

namespace App\Mongo;

use DateTimeInterface;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Laravel\Query\Grammar;

/**
 * El paquete trata "id" como alias de "_id". En este servicio "id" es un campo propio (UUID de negocio,
 * ver base_de_datos/ms-clientes-crm.mongo.js) y el _id (ObjectId) es solo interno: no se debe renombrar.
 */
class GramaticaCrm extends Grammar
{
    /** {@inheritdoc} */
    public function prepareFieldsForQuery(array $values, bool $root = true): array
    {
        $preparado = [];
        foreach ($values as $clave => $valor) {
            if (is_string($clave) && str_contains($clave, '->')) {
                $clave = str_replace('->', '.', $clave);
            }
            if (is_array($valor)) {
                $valor = $this->prepareFieldsForQuery($valor, false);
            } elseif ($valor instanceof DateTimeInterface) {
                $valor = new UTCDateTime($valor);
            }
            $preparado[$clave] = $valor;
        }

        return $preparado;
    }
}
