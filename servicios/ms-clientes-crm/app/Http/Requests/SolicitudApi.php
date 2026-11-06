<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/** Base: la autorizacion la hacen los middleware; aqui se rechazan los campos desconocidos. */
abstract class SolicitudApi extends FormRequest
{
    /** @return array<string, mixed> */
    abstract public function rules(): array;

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<int, callable> */
    public function after(): array
    {
        return [function (Validator $validador): void {
            $desconocidos = array_diff(array_keys($this->json()->all()), array_keys($this->rules()));
            foreach ($desconocidos as $campo) {
                $validador->errors()->add((string) $campo, 'Campo no permitido');
            }
        }];
    }
}
