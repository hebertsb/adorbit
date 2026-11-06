<?php

declare(strict_types=1);

namespace App\Mongo;

use MongoDB\Laravel\Connection;

class ConexionCrm extends Connection
{
    protected function getDefaultQueryGrammar()
    {
        return new GramaticaCrm($this);
    }
}
