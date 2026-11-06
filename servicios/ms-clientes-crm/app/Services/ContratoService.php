<?php

declare(strict_types=1);

namespace App\Services;

use App\Excepciones\ErrorNegocio;
use App\Models\Contrato;
use App\Repositories\ClienteRepository;
use App\Repositories\ContratoRepository;
use App\Support\Dinero;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use MongoDB\BSON\UTCDateTime;

class ContratoService
{
    /** Transiciones validas: vigente es el unico estado no final. */
    private const TRANSICIONES = ['vigente' => ['vencido', 'rescindido']];

    public function __construct(
        private readonly ContratoRepository $contratos,
        private readonly ClienteRepository $clientes,
    ) {}

    /** @param  array<string, mixed>  $datos */
    public function crear(array $datos): Contrato
    {
        $cliente = $this->clientes->buscar((string) $datos['cliente_id'])
            ?? throw ErrorNegocio::no_procesable('cliente_no_encontrado', 'No existe el cliente del contrato');
        if ($cliente->estado !== 'activo') {
            throw ErrorNegocio::no_procesable('cliente_inactivo', 'El cliente no esta activo');
        }
        $this->validar_fechas((string) $datos['fecha_inicio'], (string) $datos['fecha_fin']);

        return $this->contratos->crear([
            'id' => (string) Str::uuid(),
            'cliente_id' => $datos['cliente_id'],
            'estado' => 'vigente',
            'fecha_inicio' => $this->fecha((string) $datos['fecha_inicio']),
            'fecha_fin' => $this->fecha((string) $datos['fecha_fin']),
            'monto' => Dinero::a_decimal128((string) $datos['monto']),
            'moneda' => $datos['moneda'],
            'version' => 1,
        ]);
    }

    public function obtener(string $id): Contrato
    {
        return $this->contratos->buscar_o_fallar($id);
    }

    /** @return array{0: list<Contrato>, 1: int} */
    public function listar(?string $cliente_id, ?string $estado, int $page, int $size): array
    {
        return $this->contratos->listar($cliente_id, $estado, $page, $size);
    }

    /** @param  array<string, mixed>  $datos */
    public function actualizar(string $id, array $datos): Contrato
    {
        $actual = $this->contratos->buscar_o_fallar($id);
        if ($actual->estado !== 'vigente') {
            throw ErrorNegocio::conflicto('contrato_cerrado', 'El contrato ya no esta vigente y no se modifica');
        }
        $this->validar_fechas((string) $datos['fecha_inicio'], (string) $datos['fecha_fin']);
        $cambios = [
            'fecha_inicio' => $this->fecha((string) $datos['fecha_inicio']),
            'fecha_fin' => $this->fecha((string) $datos['fecha_fin']),
            'monto' => Dinero::a_decimal128((string) $datos['monto']),
            'moneda' => $datos['moneda'],
        ];
        if (isset($datos['estado']) && $datos['estado'] !== 'vigente') {
            if (! in_array($datos['estado'], self::TRANSICIONES['vigente'], true)) {
                throw ErrorNegocio::no_procesable('transicion_invalida', 'Transicion de estado no permitida');
            }
            $cambios['estado'] = $datos['estado'];
        }
        if (! $this->contratos->actualizar_con_version($id, (int) $datos['version'], $cambios)) {
            throw ErrorNegocio::conflicto('conflicto_version', 'El contrato cambio; vuelva a leerlo y reintente');
        }

        return $this->contratos->buscar_o_fallar($id);
    }

    private function validar_fechas(string $inicio, string $fin): void
    {
        if ($fin < $inicio) {
            throw ErrorNegocio::no_procesable('fecha_invalida', 'fecha_fin no puede ser anterior a fecha_inicio');
        }
    }

    private function fecha(string $iso): UTCDateTime
    {
        return new UTCDateTime(CarbonImmutable::parse($iso, 'UTC')->startOfDay()->getTimestamp() * 1000);
    }
}
