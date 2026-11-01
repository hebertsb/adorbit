<?php

declare(strict_types=1);

use App\Excepciones\ErrorNegocio;
use App\Http\Middleware\CorrelacionId;
use App\Http\Middleware\ExigirRol;
use App\Http\Middleware\VerificarJwt;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [CorrelacionId::class]);
        $middleware->alias([
            'jwt' => VerificarJwt::class,
            'rol' => ExigirRol::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);

        // Un error de negocio (401, 404, 409, 422...) es una respuesta esperada, no un fallo del servicio: no se registra
        // como ERROR con traza.
        $exceptions->dontReport(ErrorNegocio::class);

        $exceptions->render(fn (ErrorNegocio $e) => response()->json([
            'codigo' => $e->codigo,
            'mensaje' => $e->getMessage(),
            'detalle' => $e->detalle,
        ], $e->estado_http));

        $exceptions->render(fn (ValidationException $e) => response()->json([
            'codigo' => 'solicitud_invalida',
            'mensaje' => 'Hay campos invalidos',
            'detalle' => $e->errors(),
        ], 400));

        $exceptions->render(function (NotFoundHttpException $e) {
            return response()->json(['codigo' => 'no_encontrado', 'mensaje' => 'Recurso no encontrado', 'detalle' => null], 404);
        });

        $exceptions->render(function (HttpExceptionInterface $e) {
            return response()->json([
                'codigo' => 'solicitud_invalida',
                'mensaje' => $e->getMessage() ?: 'Solicitud invalida',
                'detalle' => null,
            ], $e->getStatusCode());
        });

        $exceptions->render(function (Throwable $e) {
            report($e);

            return response()->json(['codigo' => 'error_interno', 'mensaje' => 'Ocurrio un error inesperado', 'detalle' => null], 500);
        });
    })->create();
