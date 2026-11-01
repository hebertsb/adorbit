<?php

declare(strict_types=1);

namespace App\Http\Requests;

class ContactoRequest extends SolicitudApi
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'min:1', 'max:200'],
            'email' => ['sometimes', 'email', 'max:200'],
            'telefono' => ['sometimes', 'string', 'max:30'],
            'rol' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
