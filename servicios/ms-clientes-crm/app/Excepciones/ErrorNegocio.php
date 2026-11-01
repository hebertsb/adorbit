<?php

declare(strict_types=1);

namespace App\Excepciones;

use RuntimeException;

/** Violacion de una regla de negocio o error esperado de la API. */
class ErrorNegocio extends RuntimeException
{
    public function __construct(
        public readonly string $codigo,
        string $mensaje,
        public readonly int $estado_http = 400,
        public readonly mixed $detalle = null,
    ) {
        parent::__construct($mensaje);
    }

    public static function no_encontrado(string $mensaje): self
    {
        return new self('no_encontrado', $mensaje, 404);
    }

    public static function conflicto(string $codigo, string $mensaje): self
    {
        return new self($codigo, $mensaje, 409);
    }

    public static function no_procesable(string $codigo, string $mensaje): self
    {
        return new self($codigo, $mensaje, 422);
    }
}
