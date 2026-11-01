<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Excepciones\ErrorNegocio;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarJwt
{
    public function __construct(private readonly JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if ($token === null) {
            throw new ErrorNegocio('no_autenticado', 'Falta el token Bearer', 401);
        }
        $claims = $this->jwt->verificar($token);
        $request->attributes->set('claims', $claims);
        $request->attributes->set('roles', $this->jwt->roles($claims));

        return $next($request);
    }
}
