<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Excepciones\ErrorNegocio;
use App\Models\Contrato;
use MongoDB\BSON\UTCDateTime;

class ContratoRepository
{
    /** @param  array<string, mixed>  $datos */
    public function crear(array $datos): Contrato
    {
        return Contrato::create($datos);
    }

    public function buscar_o_fallar(string $id): Contrato
    {
        return Contrato::where('id', $id)->first() ?? throw ErrorNegocio::no_encontrado('No existe el contrato');
    }

    /** @param  array<string, mixed>  $cambios */
    public function actualizar_con_version(string $id, int $version, array $cambios): bool
    {
        $cambios['version'] = $version + 1;
        $cambios['actualizado_en'] = new UTCDateTime;

        return Contrato::where('id', $id)->where('version', $version)->update($cambios) === 1;
    }

    public function cliente_tiene_vigentes(string $cliente_id): bool
    {
        return Contrato::where('cliente_id', $cliente_id)->where('estado', 'vigente')->exists();
    }

    /** @return array{0: list<Contrato>, 1: int} */
    public function listar(?string $cliente_id, ?string $estado, int $page, int $size): array
    {
        $consulta = Contrato::query();
        if ($cliente_id !== null) {
            $consulta->where('cliente_id', $cliente_id);
        }
        if ($estado !== null) {
            $consulta->where('estado', $estado);
        }
        $total = (clone $consulta)->count();
        $items = $consulta->orderBy('creado_en', 'desc')->skip($page * $size)->take($size)->get()->all();

        return [$items, $total];
    }
}
