<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use MongoDB\Laravel\Connection;
use Throwable;

class EstadoController extends Controller
{
    public function salud(): JsonResponse
    {
        return response()->json(['estado' => 'vivo']);
    }

    public function listo(): JsonResponse
    {
        try {
            /** @var Connection $conexion */
            $conexion = DB::connection('mongodb');
            $conexion->getDatabase()->command(['ping' => 1]);

            return response()->json(['estado' => 'listo']);
        } catch (Throwable) {
            return response()->json(['estado' => 'no_listo'], 503);
        }
    }
}
