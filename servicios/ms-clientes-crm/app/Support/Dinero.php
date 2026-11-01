<?php

declare(strict_types=1);

namespace App\Support;

use MongoDB\BSON\Decimal128;

/** Conversion entre texto decimal (API) y Decimal128 (Mongo). Nunca se usa float. */
final class Dinero
{
    public const PATRON = '/^\d{1,12}(\.\d{1,2})?$/';

    public static function a_decimal128(string $monto): Decimal128
    {
        return new Decimal128(self::normalizar($monto));
    }

    /** Siempre 2 decimales: "50" -> "50.00". */
    public static function normalizar(string $monto): string
    {
        [$entero, $decimales] = array_pad(explode('.', $monto, 2), 2, '');

        return $entero.'.'.str_pad(substr($decimales, 0, 2), 2, '0');
    }

    public static function a_texto(mixed $valor): string
    {
        return self::normalizar((string) $valor);
    }

    /** a - b con bcmath (2 decimales). */
    public static function restar(string $a, string $b): string
    {
        return bcsub($a, $b, 2);
    }
}
