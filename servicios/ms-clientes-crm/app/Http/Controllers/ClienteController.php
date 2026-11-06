<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ClienteRequest;
use App\Http\Resources\ClienteResource;
use App\Models\Cliente;
use App\Services\ClienteService;
use App\Services\IdempotenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClienteController extends Controller
{
    public function __construct(IdempotenciaService $idempotencia, private readonly ClienteService $clientes)
    {
        parent::__construct($idempotencia);
    }

    public function store(ClienteRequest $request): JsonResponse
    {
        return $this->idempotente($request, fn () => [201, $this->recurso(
            $this->clientes->crear($request->validated(), $this->correlacion($request)),
        )]);
    }

    public function index(Request $request): JsonResponse
    {
        [$page, $size] = $this->paginacion($request);
        $propio = $this->cliente_del_token($request);
        [$items, $total] = $this->clientes->listar(
            $request->query('estado') ? (string) $request->query('estado') : null,
            $request->query('q') ? (string) $request->query('q') : null,
            $propio,
            $page,
            $size,
        );

        return response()->json([
            'contenido' => array_map(fn ($c) => $this->recurso($c), $items),
            'page' => $page, 'size' => $size, 'total_elementos' => $total,
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->exigir_propio($request, $id);

        return response()->json($this->recurso($this->clientes->obtener($id)));
    }

    public function update(ClienteRequest $request, string $id): JsonResponse
    {
        return $this->idempotente($request, fn () => [200, $this->recurso(
            $this->clientes->actualizar($id, $request->validated(), $this->correlacion($request)),
        )]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        return $this->idempotente($request, function () use ($request, $id) {
            $this->clientes->dar_de_baja($id, $this->correlacion($request));

            return [204, null];
        });
    }

    /** @return array<string, mixed> */
    private function recurso(Cliente $cliente): array
    {
        return (new ClienteResource($cliente))->resolve();
    }

    private function correlacion(Request $request): string
    {
        return (string) ($request->header('X-Correlation-Id') ?: $request->header('Idempotency-Key'));
    }
}
