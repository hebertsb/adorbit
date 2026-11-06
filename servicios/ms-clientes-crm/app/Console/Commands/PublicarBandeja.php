<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\PublicarBandejaSalida;
use App\Mensajeria\ConexionRabbit;
use Illuminate\Console\Command;

class PublicarBandeja extends Command
{
    protected $signature = 'crm:publicar-bandeja {--una-vez : Hace una sola vuelta y termina}';

    protected $description = 'Publica en RabbitMQ los eventos pendientes de la bandeja de salida';

    public function handle(PublicarBandejaSalida $relevo): int
    {
        $conexion = ConexionRabbit::conectar();
        $canal = $conexion->channel();
        ConexionRabbit::declarar_topologia($canal);
        $canal->confirm_select();

        do {
            $n = $relevo->ejecutar_una_vuelta($canal);
            if ($n > 0) {
                $this->info("Publicados: $n");
            }
            if ($this->option('una-vez')) {
                break;
            }
            sleep((int) config('crm.mensajeria.intervalo_bandeja_segundos'));
        } while (true);

        $canal->close();
        $conexion->close();

        return self::SUCCESS;
    }
}
