<?php

declare(strict_types=1);

namespace App\Http\Requests;

class ClienteRequest extends SolicitudApi
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $reglas = [
            'razon_social' => ['required', 'string', 'min:1', 'max:200'],
            'nit' => ['required', 'string', 'max:20', 'regex:/^[0-9A-Za-z-]+$/'],
            'limite_credito' => ['sometimes', 'string', 'regex:/^\d{1,12}(\.\d{1,2})?$/'],
        ];
        if ($this->isMethod('POST')) {
            $reglas['moneda'] = ['sometimes', 'in:BOB,USD'];
        } else {
            $reglas['version'] = ['required', 'integer', 'min:1'];
            $reglas['estado'] = ['sometimes', 'in:activo,inactivo,moroso'];
        }

        return $reglas;
    }
}
