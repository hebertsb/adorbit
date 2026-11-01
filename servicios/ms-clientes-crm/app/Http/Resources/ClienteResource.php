<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Cliente;
use App\Services\CreditoService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Cliente */
class ClienteResource extends JsonResource
{
    public static $wrap = null;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'razon_social' => (string) $this->razon_social,
            'nit' => $this->nit,
            'estado' => (string) $this->estado,
            'contactos' => array_values(array_map(fn ($c) => (array) $c, (array) ($this->contactos ?? []))),
            'linea_credito' => CreditoService::linea($this->resource),
            'version' => (int) $this->version,
            'creado_en' => $this->creado_en?->toIso8601String(),
            'actualizado_en' => $this->actualizado_en?->toIso8601String(),
        ];
    }
}
