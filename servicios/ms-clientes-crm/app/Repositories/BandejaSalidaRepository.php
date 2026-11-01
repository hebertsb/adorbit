<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\EventoSalida;
use Illuminate\Support\Str;
use MongoDB\BSON\UTCDateTime;

class BandejaSalidaRepository
{
    /** @param  array<string, mixed>  $carga */
    public function encolar(string $tipo_evento, string $agregado_id, string $correlacion_id, array $carga): void
    {
        EventoSalida::create([
            'id' => (string) Str::uuid(),
            'tipo_evento' => $tipo_evento,
            'agregado_id' => $agregado_id,
            'correlacion_id' => $correlacion_id,
            'carga' => $carga,
            'publicado' => false,
        ]);
    }

    /** @return list<EventoSalida> */
    public function pendientes(int $limite = 50): array
    {
        return EventoSalida::where('publicado', false)->orderBy('creado_en')->take($limite)->get()->all();
    }

    public function marcar_publicado(string $id): void
    {
        EventoSalida::where('id', $id)->update(['publicado' => true, 'publicado_en' => new UTCDateTime]);
    }
}
