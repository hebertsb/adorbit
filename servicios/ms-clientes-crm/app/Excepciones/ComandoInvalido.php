<?php

declare(strict_types=1);

namespace App\Excepciones;

use RuntimeException;

/** El mensaje no se puede interpretar: no tiene sentido reintentarlo (va a la cola de errores). */
class ComandoInvalido extends RuntimeException {}
