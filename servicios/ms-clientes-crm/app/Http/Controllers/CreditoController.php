<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\CreditoService;
use App\Services\IdempotenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditoController extends Controller
{
    public function __construct(IdempotenciaService $idempotencia, private readonly CreditoService $credito)
    {
        parent::__construct($idempotencia);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->exigir_propio($request, $id);

        return response()->json(['cliente_id' => $id] + $this->credito->consultar($id));
    }
}
