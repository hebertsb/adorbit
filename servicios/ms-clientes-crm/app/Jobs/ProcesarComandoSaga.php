<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Excepciones\ComandoInvalido;
use App\Services\CreditoService;
use App\Support\Dinero;
use Illuminate\Support\Str;
use JsonException;

/** Interpreta un comando de la SAGA (sobre JSON) y lo ejecuta de forma idempotente. */
class ProcesarComandoSaga
{
    public function __construct(private readonly CreditoService $credito) {}

    public function procesar(string $cuerpo): void
    {
        try {
            $sobre = json_decode($cuerpo, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ComandoInvalido('El mensaje no es JSON valido');
        }
        if (! is_array($sobre) || ! is_array($sobre['carga'] ?? null)) {
            throw new ComandoInvalido('Falta la carga del comando');
        }
        $carga = $sobre['carga'];
        $tipo = (string) ($sobre['tipo_evento'] ?? '');

        $argumentos = [
            $this->texto($carga, 'clave_comando'),
            $this->uuid($carga, 'saga_id'),
            $this->uuid($carga, 'cliente_id'),
            $this->uuid($carga, 'campana_id'),
            $this->monto($carga),
            $this->moneda($carga),
        ];

        match ($tipo) {
            'ReservarCredito' => $this->credito->reservar(...$argumentos),
            'LiberarCredito' => $this->credito->liberar(...$argumentos),
            default => throw new ComandoInvalido("Comando desconocido: $tipo"),
        };
    }

    /** @param  array<string, mixed>  $carga */
    private function texto(array $carga, string $campo): string
    {
        $valor = $carga[$campo] ?? null;
        if (! is_string($valor) || $valor === '') {
            throw new ComandoInvalido("Falta el campo $campo");
        }

        return $valor;
    }

    /** @param  array<string, mixed>  $carga */
    private function uuid(array $carga, string $campo): string
    {
        $valor = $this->texto($carga, $campo);
        if (! Str::isUuid($valor)) {
            throw new ComandoInvalido("El campo $campo no es un UUID");
        }

        return $valor;
    }

    /** @param  array<string, mixed>  $carga */
    private function monto(array $carga): string
    {
        $valor = $this->texto($carga, 'monto');
        if (preg_match(Dinero::PATRON, $valor) !== 1) {
            throw new ComandoInvalido('El monto no es un decimal valido');
        }

        return $valor;
    }

    /** @param  array<string, mixed>  $carga */
    private function moneda(array $carga): string
    {
        $valor = $this->texto($carga, 'moneda');
        if (! in_array($valor, ['BOB', 'USD'], true)) {
            throw new ComandoInvalido('Moneda no admitida');
        }

        return $valor;
    }
}
