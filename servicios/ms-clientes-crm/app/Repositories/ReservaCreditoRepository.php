<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\ReservaCredito;
use MongoDB\BSON\UTCDateTime;

class ReservaCreditoRepository
{
    /** @param  array<string, mixed>  $datos */
    public function crear(array $datos): ReservaCredito
    {
        return ReservaCredito::create($datos);
    }

    public function activa_de_campana(string $campana_id): ?ReservaCredito
    {
        return ReservaCredito::where('campana_id', $campana_id)->where('estado', 'reservado')->first();
    }

    public function de_saga(string $saga_id): ?ReservaCredito
    {
        return ReservaCredito::where('saga_id', $saga_id)->first();
    }

    /** @return list<ReservaCredito> */
    public function activas_de_cliente(string $cliente_id): array
    {
        return ReservaCredito::where('cliente_id', $cliente_id)->where('estado', 'reservado')->get()->all();
    }

    /** Pasa de "reservado" a "liberado" solo una vez. @return bool true si cambio. */
    public function liberar(string $saga_id): bool
    {
        return ReservaCredito::where('saga_id', $saga_id)->where('estado', 'reservado')
            ->update(['estado' => 'liberado', 'actualizado_en' => new UTCDateTime]) === 1;
    }
}
