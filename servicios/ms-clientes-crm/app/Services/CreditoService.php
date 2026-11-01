<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cliente;
use App\Repositories\BandejaSalidaRepository;
use App\Repositories\ClaveIdempotenciaRepository;
use App\Repositories\ClienteRepository;
use App\Repositories\ReservaCreditoRepository;
use App\Support\Dinero;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Pasos de la SAGA que tocan el credito. Cada comando se ejecuta en UNA transaccion de Mongo:
 * clave del comando (idempotencia) + cambio de saldo + reserva + evento de la bandeja.
 * Reenviar el mismo comando no hace nada (la clave ya existe).
 */
class CreditoService
{
    public function __construct(
        private readonly ClienteRepository $clientes,
        private readonly ReservaCreditoRepository $reservas,
        private readonly ClaveIdempotenciaRepository $claves,
        private readonly BandejaSalidaRepository $bandeja,
    ) {}

    /** Paso 2 de la SAGA. Credito insuficiente NO es un error tecnico: se responde CreditoRechazado. */
    public function reservar(string $clave, string $saga_id, string $cliente_id, string $campana_id, string $monto, string $moneda): void
    {
        $monto = Dinero::normalizar($monto);
        $this->una_vez($clave, 'reservar', function () use ($saga_id, $cliente_id, $campana_id, $monto, $moneda): void {
            $motivo = $this->motivo_de_rechazo_previo($cliente_id, $campana_id, $moneda);
            if ($motivo === null && ! $this->clientes->reservar_credito($cliente_id, $monto, $moneda)) {
                $motivo = 'credito_insuficiente';
            }
            if ($motivo !== null) {
                $this->bandeja->encolar('CreditoRechazado', $campana_id, $saga_id, [
                    'saga_id' => $saga_id, 'cliente_id' => $cliente_id, 'campana_id' => $campana_id,
                    'monto' => $monto, 'motivo' => $motivo,
                ]);

                return;
            }
            $reserva_id = (string) Str::uuid();
            $this->reservas->crear([
                'id' => $reserva_id, 'cliente_id' => $cliente_id, 'campana_id' => $campana_id, 'saga_id' => $saga_id,
                'monto' => Dinero::a_decimal128($monto), 'moneda' => $moneda, 'estado' => 'reservado',
            ]);
            $this->bandeja->encolar('CreditoReservado', $campana_id, $saga_id, [
                'saga_id' => $saga_id, 'reserva_id' => $reserva_id, 'cliente_id' => $cliente_id,
                'campana_id' => $campana_id, 'monto' => $monto, 'moneda' => $moneda,
            ]);
        });
    }

    /** Compensacion del paso 2. Idempotente: si no hay reserva activa de esa SAGA, no hace nada. */
    public function liberar(string $clave, string $saga_id, string $cliente_id, string $campana_id, string $monto, string $moneda): void
    {
        $this->una_vez($clave, 'liberar', function () use ($saga_id, $cliente_id, $campana_id, $moneda): void {
            $reserva = $this->reservas->de_saga($saga_id);
            if ($reserva === null || $reserva->estado !== 'reservado') {
                return;
            }
            $monto_reservado = Dinero::a_texto($reserva->monto);
            if (! $this->reservas->liberar($saga_id)) {
                return;
            }
            $this->clientes->devolver_credito($cliente_id, $monto_reservado);
            $this->bandeja->encolar('CreditoLiberado', $campana_id, $saga_id, [
                'saga_id' => $saga_id, 'cliente_id' => $cliente_id, 'campana_id' => $campana_id,
                'monto' => $monto_reservado, 'moneda' => $moneda, 'reserva_id' => (string) $reserva->id,
            ]);
        });
    }

    /** @return array{linea_credito: array<string, string>, disponible: string, reservas_activas: list<array<string, string>>} */
    public function consultar(string $cliente_id): array
    {
        $cliente = $this->clientes->buscar_o_fallar($cliente_id);

        return [
            'linea_credito' => self::linea($cliente),
            'disponible' => Dinero::restar(Dinero::a_texto($cliente->linea_credito['limite']), Dinero::a_texto($cliente->linea_credito['usado'])),
            'reservas_activas' => array_map(fn ($r) => [
                'reserva_id' => (string) $r->id,
                'campana_id' => (string) $r->campana_id,
                'monto' => Dinero::a_texto($r->monto),
                'estado' => (string) $r->estado,
            ], $this->reservas->activas_de_cliente($cliente_id)),
        ];
    }

    /** @return array<string, string> */
    public static function linea(Cliente $cliente): array
    {
        return [
            'limite' => Dinero::a_texto($cliente->linea_credito['limite']),
            'usado' => Dinero::a_texto($cliente->linea_credito['usado']),
            'moneda' => (string) $cliente->linea_credito['moneda'],
        ];
    }

    private function motivo_de_rechazo_previo(string $cliente_id, string $campana_id, string $moneda): ?string
    {
        $cliente = $this->clientes->buscar($cliente_id);
        if ($cliente === null) {
            return 'cliente_no_encontrado';
        }
        if ($cliente->estado !== 'activo') {
            return 'cliente_inactivo';
        }
        if ($cliente->linea_credito['moneda'] !== $moneda) {
            return 'moneda_no_coincide';
        }

        return $this->reservas->activa_de_campana($campana_id) !== null ? 'reserva_activa_existente' : null;
    }

    /** Ejecuta $operacion en una transaccion junto con el registro de la clave; si la clave ya existe, no hace nada. */
    private function una_vez(string $clave, string $tipo, callable $operacion): void
    {
        if ($this->claves->buscar($clave) !== null) {
            return;
        }
        try {
            DB::connection('mongodb')->transaction(function () use ($clave, $tipo, $operacion): void {
                $this->claves->crear($clave, $tipo, (int) config('crm.idempotencia.vigencia_dias'));
                $operacion();
                $this->claves->guardar_respuesta($clave, 200, null);
            });
        } catch (Throwable $e) {
            if (IdempotenciaService::es_clave_duplicada($e) && $this->claves->buscar($clave) !== null) {
                return; // otra entrega del mismo comando ya lo proceso
            }
            throw $e;
        }
    }
}
