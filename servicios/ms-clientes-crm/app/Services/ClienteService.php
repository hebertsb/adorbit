<?php

declare(strict_types=1);

namespace App\Services;

use App\Excepciones\ErrorNegocio;
use App\Models\Cliente;
use App\Repositories\BandejaSalidaRepository;
use App\Repositories\ClienteRepository;
use App\Repositories\ContratoRepository;
use App\Support\Dinero;
use Illuminate\Support\Str;
use Throwable;

class ClienteService
{
    public function __construct(
        private readonly ClienteRepository $clientes,
        private readonly ContratoRepository $contratos,
        private readonly BandejaSalidaRepository $bandeja,
    ) {}

    /** @param  array<string, mixed>  $datos */
    public function crear(array $datos, string $correlacion): Cliente
    {
        $moneda = (string) ($datos['moneda'] ?? 'BOB');
        try {
            $cliente = $this->clientes->crear([
                'id' => (string) Str::uuid(),
                'razon_social' => $datos['razon_social'],
                'nit' => $datos['nit'] ?? null,
                'estado' => 'activo',
                'contactos' => [],
                'linea_credito' => [
                    'limite' => Dinero::a_decimal128((string) ($datos['limite_credito'] ?? '0')),
                    'usado' => Dinero::a_decimal128('0'),
                    'moneda' => $moneda,
                ],
                'version' => 1,
            ]);
        } catch (Throwable $e) {
            throw $this->traducir($e);
        }
        $this->publicar('ClienteCreado', $cliente, $correlacion);

        return $cliente;
    }

    public function obtener(string $id): Cliente
    {
        return $this->clientes->buscar_o_fallar($id);
    }

    /** @return array{0: list<Cliente>, 1: int} */
    public function listar(?string $estado, ?string $texto, ?string $solo_id, int $page, int $size): array
    {
        return $this->clientes->listar($estado, $texto, $solo_id, $page, $size);
    }

    /** @param  array<string, mixed>  $datos */
    public function actualizar(string $id, array $datos, string $correlacion): Cliente
    {
        $actual = $this->clientes->buscar_o_fallar($id);
        $cambios = [
            'razon_social' => $datos['razon_social'],
            'nit' => $datos['nit'] ?? null,
        ];
        if (isset($datos['estado'])) {
            // La misma regla que la baja: un cliente con contratos vigentes no puede quedar inactivo por ningun camino.
            if ($datos['estado'] === 'inactivo' && $actual->estado !== 'inactivo' && $this->contratos->cliente_tiene_vigentes($id)) {
                throw ErrorNegocio::conflicto('cliente_con_contratos_vigentes', 'El cliente tiene contratos vigentes');
            }
            $cambios['estado'] = $datos['estado'];
        }
        if (isset($datos['limite_credito'])) {
            $usado = Dinero::a_texto((string) $actual->linea_credito['usado']);
            if (bccomp((string) $datos['limite_credito'], $usado, 2) < 0) {
                throw ErrorNegocio::no_procesable('limite_menor_al_usado', "El limite no puede ser menor al credito usado ($usado)");
            }
            $cambios['linea_credito.limite'] = Dinero::a_decimal128((string) $datos['limite_credito']);
        }
        $this->aplicar_con_version($id, (int) $datos['version'], $cambios);
        $cliente = $this->clientes->buscar_o_fallar($id);
        $this->publicar('ClienteActualizado', $cliente, $correlacion);

        return $cliente;
    }

    /** Baja logica: no se borra; con contratos vigentes se rechaza. */
    public function dar_de_baja(string $id, string $correlacion): void
    {
        $cliente = $this->clientes->buscar_o_fallar($id);
        if ($this->contratos->cliente_tiene_vigentes($id)) {
            throw ErrorNegocio::conflicto('cliente_con_contratos_vigentes', 'El cliente tiene contratos vigentes');
        }
        if ($cliente->estado === 'inactivo') {
            return;
        }
        $this->aplicar_con_version($id, (int) $cliente->version, ['estado' => 'inactivo']);
        $this->publicar('ClienteActualizado', $this->clientes->buscar_o_fallar($id), $correlacion);
    }

    /** @param  array<string, mixed>  $cambios */
    public function aplicar_con_version(string $id, int $version, array $cambios): void
    {
        try {
            $ok = $this->clientes->actualizar_con_version($id, $version, $cambios);
        } catch (Throwable $e) {
            throw $this->traducir($e);
        }
        if (! $ok) {
            throw ErrorNegocio::conflicto('conflicto_version', 'El cliente cambio; vuelva a leerlo y reintente');
        }
    }

    private function traducir(Throwable $e): Throwable
    {
        return IdempotenciaService::es_clave_duplicada($e)
            ? ErrorNegocio::conflicto('nit_duplicado', 'Ya existe un cliente con ese NIT')
            : $e;
    }

    private function publicar(string $tipo, Cliente $cliente, string $correlacion): void
    {
        $linea = $cliente->linea_credito;
        $this->bandeja->encolar($tipo, (string) $cliente->id, $correlacion, [
            'cliente_id' => (string) $cliente->id,
            'razon_social' => (string) $cliente->razon_social,
            'nit' => (string) ($cliente->nit ?? ''),
            'estado' => (string) $cliente->estado,
            'linea_credito' => [
                'limite' => Dinero::a_texto($linea['limite']),
                'usado' => Dinero::a_texto($linea['usado']),
                'moneda' => (string) $linea['moneda'],
            ],
            'version' => (int) $cliente->version,
        ]);
    }
}
