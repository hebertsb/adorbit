<?php

declare(strict_types=1);

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

/**
 * Base de los documentos del CRM. La clave de negocio es el campo "id" (UUID texto);
 * el _id (ObjectId) es solo interno y no se expone.
 */
abstract class ModeloMongo extends Model
{
    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    protected $connection = 'mongodb';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = ['_id'];
}
