<?php

declare(strict_types=1);

namespace App\Http\Requests;

class ContratoRequest extends SolicitudApi
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $reglas = [
            'fecha_inicio' => ['required', 'date_format:Y-m-d'],
            'fecha_fin' => ['required', 'date_format:Y-m-d'],
            'monto' => ['required', 'string', 'regex:/^\d{1,12}(\.\d{1,2})?$/'],
            'moneda' => ['required', 'in:BOB,USD'],
        ];
        if ($this->isMethod('POST')) {
            $reglas['cliente_id'] = ['required', 'uuid'];
        } else {
            $reglas['version'] = ['required', 'integer', 'min:1'];
            $reglas['estado'] = ['sometimes', 'in:vigente,vencido,rescindido'];
        }

        return $reglas;
    }
}
