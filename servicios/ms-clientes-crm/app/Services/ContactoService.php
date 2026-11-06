<?php

declare(strict_types=1);

namespace App\Services;

use App\Excepciones\ErrorNegocio;
use App\Models\Cliente;
use App\Repositories\ClienteRepository;
use Illuminate\Support\Str;

/** Contactos embebidos en el documento del cliente (read-modify-write con control de version). */
class ContactoService
{
    public function __construct(private readonly ClienteRepository $clientes, private readonly ClienteService $servicio) {}

    /** @return list<array<string, mixed>> */
    public function listar(string $cliente_id): array
    {
        return $this->contactos_de($this->clientes->buscar_o_fallar($cliente_id));
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function agregar(string $cliente_id, array $datos): array
    {
        $cliente = $this->clientes->buscar_o_fallar($cliente_id);
        $contactos = $this->contactos_de($cliente);
        $contacto = $this->armar((string) Str::uuid(), $datos);
        $contactos[] = $contacto;
        $this->servicio->aplicar_con_version($cliente_id, (int) $cliente->version, ['contactos' => $contactos]);

        return $contacto;
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    public function actualizar(string $cliente_id, string $contacto_id, array $datos): array
    {
        $cliente = $this->clientes->buscar_o_fallar($cliente_id);
        $contactos = $this->contactos_de($cliente);
        $nuevo = null;
        foreach ($contactos as $i => $existente) {
            if ($existente['id'] === $contacto_id) {
                $nuevo = $contactos[$i] = $this->armar($contacto_id, $datos);
            }
        }
        if ($nuevo === null) {
            throw ErrorNegocio::no_encontrado('No existe el contacto');
        }
        $this->servicio->aplicar_con_version($cliente_id, (int) $cliente->version, ['contactos' => $contactos]);

        return $nuevo;
    }

    public function eliminar(string $cliente_id, string $contacto_id): void
    {
        $cliente = $this->clientes->buscar_o_fallar($cliente_id);
        $contactos = $this->contactos_de($cliente);
        $restantes = array_values(array_filter($contactos, fn (array $c) => $c['id'] !== $contacto_id));
        if (count($restantes) === count($contactos)) {
            throw ErrorNegocio::no_encontrado('No existe el contacto');
        }
        $this->servicio->aplicar_con_version($cliente_id, (int) $cliente->version, ['contactos' => $restantes]);
    }

    /** @return list<array<string, mixed>> */
    private function contactos_de(Cliente $cliente): array
    {
        return array_map(fn ($c) => (array) $c, (array) ($cliente->contactos ?? []));
    }

    /**
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private function armar(string $id, array $datos): array
    {
        return array_filter([
            'id' => $id,
            'nombre' => $datos['nombre'],
            'email' => $datos['email'] ?? null,
            'telefono' => $datos['telefono'] ?? null,
            'rol' => $datos['rol'] ?? null,
        ], fn ($v) => $v !== null);
    }
}
