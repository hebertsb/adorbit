<?php

declare(strict_types=1);

namespace App\Providers;

use App\Mongo\ConexionCrm;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Reemplaza la conexion del paquete por la del CRM (sin el alias id -> _id).
        $this->app['db']->extend('mongodb', fn (array $config) => new ConexionCrm($config));
    }
}
