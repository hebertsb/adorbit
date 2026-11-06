<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ContratoRequest;
use App\Http\Resources\ContratoResource;
use App\Models\Contrato;
use App\Services\ContratoService;
use App\Services\IdempotenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContratoController extends Controller
{
    public function __construct(IdempotenciaService $idempotencia, private readonly ContratoService $contratos)
    {
        parent::__construct($idempotencia);
    }

    public function store(ContratoRequest $request): JsonResponse
    {
        return $this->idempotente($request, fn () => [201, $this->recurso($this->contratos->crear($request->validated()))]);
    }

    public function index(Request $request): JsonResponse
    {
        [$page, $size] = $this->paginacion($request);
        $cliente = $this->cliente_del_token($request) ?? ($request->query('cliente') ? (string) $request->query('cliente') : null);
        [$items, $total] = $this->contratos->listar(
            $cliente,
            $request->query('estado') ? (string) $request->query('estado') : null,
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
        $contrato = $this->contratos->obtener($id);
        $this->exigir_propio($request, (string) $contrato->cliente_id);

        return response()->json($this->recurso($contrato));
    }

    public function update(ContratoRequest $request, string $id): JsonResponse
    {
        return $this->idempotente($request, fn () => [200, $this->recurso($this->contratos->actualizar($id, $request->validated()))]);
    }

    /** @return array<string, mixed> */
    private function recurso(Contrato $contrato): array
    {
        return (new ContratoResource($contrato))->resolve();
    }
}
