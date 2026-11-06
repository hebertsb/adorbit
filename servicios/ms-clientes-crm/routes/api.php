<?php

declare(strict_types=1);

use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ContactoController;
use App\Http\Controllers\ContratoController;
use App\Http\Controllers\CreditoController;
use App\Http\Controllers\EstadoController;
use Illuminate\Support\Facades\Route;

Route::get('/salud', [EstadoController::class, 'salud']);
Route::get('/listo', [EstadoController::class, 'listo']);

Route::prefix('v1')->middleware('jwt')->group(function (): void {
    $lectura = 'rol:ejecutivo,gerente,cliente';
    $escritura = 'rol:ejecutivo,gerente';

    Route::get('/clientes', [ClienteController::class, 'index'])->middleware($lectura);
    Route::get('/clientes/{id}', [ClienteController::class, 'show'])->whereUuid('id')->middleware($lectura);
    Route::get('/clientes/{id}/contactos', [ContactoController::class, 'index'])->whereUuid('id')->middleware($lectura);
    Route::get('/clientes/{id}/credito', [CreditoController::class, 'show'])->whereUuid('id')->middleware($lectura);
    Route::get('/contratos', [ContratoController::class, 'index'])->middleware($lectura);
    Route::get('/contratos/{id}', [ContratoController::class, 'show'])->whereUuid('id')->middleware($lectura);

    Route::middleware($escritura)->group(function (): void {
        Route::post('/clientes', [ClienteController::class, 'store']);
        Route::put('/clientes/{id}', [ClienteController::class, 'update'])->whereUuid('id');
        Route::delete('/clientes/{id}', [ClienteController::class, 'destroy'])->whereUuid('id');
        Route::post('/clientes/{id}/contactos', [ContactoController::class, 'store'])->whereUuid('id');
        Route::put('/clientes/{id}/contactos/{contacto_id}', [ContactoController::class, 'update'])->whereUuid(['id', 'contacto_id']);
        Route::delete('/clientes/{id}/contactos/{contacto_id}', [ContactoController::class, 'destroy'])->whereUuid(['id', 'contacto_id']);
        Route::post('/contratos', [ContratoController::class, 'store']);
        Route::put('/contratos/{id}', [ContratoController::class, 'update'])->whereUuid('id');
    });
});
