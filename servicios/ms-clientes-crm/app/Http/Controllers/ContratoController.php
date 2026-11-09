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
        $permitidos = ['cliente', 'estado', 'page', 'size'];
        if (array_diff(array_keys($request->query()), $permitidos)) {
            throw new \App\Excepciones\ErrorNegocio('parametro_invalido', 'Parametro de consulta desconocido', 422);
        }
        $datos = $request->validate([
            'cliente' => ['sometimes', 'required', 'uuid'],
            'estado' => ['sometimes', 'required', 'in:vigente,vencido,rescindido'],
            'page' => ['sometimes', 'required', 'integer', 'min:0'],
            'size' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ]);
        $page = (int) ($datos['page'] ?? 0);
        $size = (int) ($datos['size'] ?? 20);
        $cliente = $this->cliente_del_token($request) ?? ($datos['cliente'] ?? null);
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
