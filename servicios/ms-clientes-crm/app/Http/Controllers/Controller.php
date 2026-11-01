<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Excepciones\ErrorNegocio;
use App\Services\IdempotenciaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    public function __construct(protected readonly IdempotenciaService $idempotencia) {}

    /**
     * Ejecuta una escritura de forma idempotente. $operacion devuelve [estado_http, cuerpo].
     *
     * @param  callable(): array{0: int, 1: array<string, mixed>|null}  $operacion
     */
    protected function idempotente(Request $request, callable $operacion): JsonResponse
    {
        $huella = hash('sha256', $request->method().'|'.$request->path().'|'.$request->getContent());
        $r = $this->idempotencia->ejecutar($request->header('Idempotency-Key'), $huella, $operacion);

        return response()->json($r['cuerpo'], $r['estado']);
    }

    /** Si el token tiene rol "cliente" devuelve su cliente_id (del token, nunca del request); si no, null. */
    protected function cliente_del_token(Request $request): ?string
    {
        if (! in_array('cliente', (array) $request->attributes->get('roles', []), true)) {
            return null;
        }
        $id = ((array) $request->attributes->get('claims', []))['cliente_id'] ?? null;
        if (! is_string($id) || $id === '') {
            throw new ErrorNegocio('sin_permiso', 'El token no identifica a un cliente', 403);
        }

        return $id;
    }

    /** Un cliente solo puede acceder a lo suyo; para lo ajeno responde 404 (no revela existencia). */
    protected function exigir_propio(Request $request, string $cliente_id): void
    {
        $propio = $this->cliente_del_token($request);
        if ($propio !== null && $propio !== $cliente_id) {
            throw ErrorNegocio::no_encontrado('No existe el recurso');
        }
    }

    /** @return array{0: int, 1: int} [page, size] acotados */
    protected function paginacion(Request $request): array
    {
        $page = max(0, (int) $request->query('page', 0));
        $size = min(100, max(1, (int) $request->query('size', 20)));

        return [$page, $size];
    }
}
