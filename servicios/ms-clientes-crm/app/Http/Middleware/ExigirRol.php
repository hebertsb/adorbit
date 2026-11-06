<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Excepciones\ErrorNegocio;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Uso: ->middleware('rol:ejecutivo,gerente'). */
class ExigirRol
{
    public function handle(Request $request, Closure $next, string ...$permitidos): Response
    {
        $roles = (array) $request->attributes->get('roles', []);
        if (array_intersect($permitidos, $roles) === []) {
            throw new ErrorNegocio('sin_permiso', 'No tiene permiso para esta operacion', 403);
        }

        return $next($request);
    }
}
