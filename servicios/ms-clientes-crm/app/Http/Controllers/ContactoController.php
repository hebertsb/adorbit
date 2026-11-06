<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ContactoRequest;
use App\Services\ContactoService;
use App\Services\IdempotenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactoController extends Controller
{
    public function __construct(IdempotenciaService $idempotencia, private readonly ContactoService $contactos)
    {
        parent::__construct($idempotencia);
    }

    public function index(Request $request, string $id): JsonResponse
    {
        $this->exigir_propio($request, $id);

        return response()->json($this->contactos->listar($id));
    }

    public function store(ContactoRequest $request, string $id): JsonResponse
    {
        return $this->idempotente($request, fn () => [201, $this->contactos->agregar($id, $request->validated())]);
    }

    public function update(ContactoRequest $request, string $id, string $contacto_id): JsonResponse
    {
        return $this->idempotente($request, fn () => [200, $this->contactos->actualizar($id, $contacto_id, $request->validated())]);
    }

    public function destroy(Request $request, string $id, string $contacto_id): JsonResponse
    {
        return $this->idempotente($request, function () use ($id, $contacto_id) {
            $this->contactos->eliminar($id, $contacto_id);

            return [204, null];
        });
    }
}
