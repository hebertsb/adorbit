<?php

declare(strict_types=1);

namespace App\Services;

use App\Excepciones\ErrorNegocio;
use App\Models\ClaveIdempotencia;
use App\Repositories\ClaveIdempotenciaRepository;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Idempotencia en la MISMA transaccion que la operacion: la clave, la operacion, el evento de la bandeja
 * y la respuesta guardada se confirman juntos o no se confirma nada.
 */
class IdempotenciaService
{
    public function __construct(private readonly ClaveIdempotenciaRepository $claves) {}

    /**
     * @param  callable(): array{0: int, 1: array<string, mixed>|null}  $operacion  devuelve [estado_http, cuerpo]
     * @return array{estado: int, cuerpo: array<string, mixed>|null, repetida: bool}
     */
    public function ejecutar(?string $clave, string $huella, callable $operacion): array
    {
        $this->validar_clave($clave);
        /** @var string $clave */
        $previa = $this->claves->buscar($clave);
        if ($previa !== null) {
            return $this->repetir($previa, $huella);
        }

        try {
            return DB::connection('mongodb')->transaction(function () use ($clave, $huella, $operacion): array {
                $this->claves->crear($clave, $huella, (int) config('crm.idempotencia.vigencia_dias'));
                [$estado, $cuerpo] = $operacion();
                $this->claves->guardar_respuesta($clave, $estado, $cuerpo);

                return ['estado' => $estado, 'cuerpo' => $cuerpo, 'repetida' => false];
            });
        } catch (Throwable $e) {
            if (self::es_clave_duplicada($e) && ($previa = $this->claves->buscar($clave)) !== null) {
                return $this->repetir($previa, $huella);
            }
            throw $e;
        }
    }

    public function validar_clave(?string $clave): void
    {
        if ($clave === null || strlen($clave) < 8 || strlen($clave) > 120) {
            throw new ErrorNegocio('clave_idempotencia_invalida', 'La cabecera Idempotency-Key debe tener 8 a 120 caracteres', 400);
        }
    }

    /** @return array{estado: int, cuerpo: array<string, mixed>|null, repetida: bool} */
    private function repetir(ClaveIdempotencia $previa, string $huella): array
    {
        if ($previa->huella_solicitud !== $huella) {
            throw ErrorNegocio::no_procesable('idempotencia_conflicto', 'La clave de idempotencia ya se uso con una solicitud distinta');
        }
        $estado = (int) ($previa->estado_http ?? 200);
        $cuerpo = $previa->respuesta === null ? null : json_decode((string) $previa->respuesta, true);

        return ['estado' => $estado === 201 ? 200 : $estado, 'cuerpo' => $cuerpo, 'repetida' => true];
    }

    public static function es_clave_duplicada(Throwable $e): bool
    {
        for ($actual = $e; $actual !== null; $actual = $actual->getPrevious()) {
            if ($actual->getCode() === 11000 || str_contains($actual->getMessage(), 'E11000')) {
                return true;
            }
        }

        return false;
    }
}
