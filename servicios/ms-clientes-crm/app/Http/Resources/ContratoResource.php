<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Contrato;
use App\Support\Dinero;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Contrato */
class ContratoResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'cliente_id' => (string) $this->cliente_id,
            'estado' => (string) $this->estado,
            'fecha_inicio' => $this->fecha_inicio?->format('Y-m-d'),
            'fecha_fin' => $this->fecha_fin?->format('Y-m-d'),
            'monto' => Dinero::a_texto($this->monto),
            'moneda' => (string) $this->moneda,
            'version' => (int) $this->version,
        ];
    }
}
