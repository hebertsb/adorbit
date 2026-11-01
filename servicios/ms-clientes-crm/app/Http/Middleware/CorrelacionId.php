<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/** Propaga X-Correlation-Id a los logs y a la respuesta; lo genera si no viene. */
class CorrelacionId
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) $request->header('X-Correlation-Id', '');
        if ($id === '' || strlen($id) > 100) {
            $id = (string) Str::uuid();
        }
        Log::shareContext(['correlacion_id' => $id]);

        $respuesta = $next($request);
        $respuesta->headers->set('X-Correlation-Id', $id);

        return $respuesta;
    }
}
