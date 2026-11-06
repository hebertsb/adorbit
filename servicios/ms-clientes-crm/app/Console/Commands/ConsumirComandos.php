<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Excepciones\ComandoInvalido;
use App\Jobs\ProcesarComandoSaga;
use App\Mensajeria\ConexionRabbit;
use Illuminate\Console\Command;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;
use Throwable;

/**
 * Consume la cola saga.crm. Mensaje ilegible -> cola de errores sin reintentos. Falla transitoria ->
 * se reencola con espera exponencial; tras el maximo de intentos pasa a la cola de errores.
 */
class ConsumirComandos extends Command
{
    protected $signature = 'crm:consumir-comandos';

    protected $description = 'Consume los comandos de la SAGA (ReservarCredito, LiberarCredito)';

    public function handle(ProcesarComandoSaga $procesar): int
    {
        $c = config('crm.mensajeria');
        $conexion = ConexionRabbit::conectar();
        $canal = $conexion->channel();
        ConexionRabbit::declarar_topologia($canal);
        $canal->basic_qos(0, 1, false);

        $canal->basic_consume($c['cola_comandos'], '', false, false, false, false,
            function (AMQPMessage $mensaje) use ($procesar, $canal, $c): void {
                try {
                    $procesar->procesar($mensaje->getBody());
                    $mensaje->ack();
                } catch (ComandoInvalido $e) {
                    $this->warn('Comando invalido: '.$e->getMessage());
                    $mensaje->reject(false); // a la cola de errores
                } catch (Throwable $e) {
                    $this->reintentar_o_descartar($mensaje, $canal, $c, $e);
                }
            });

        $this->info('Esperando comandos en '.$c['cola_comandos']);
        while ($canal->is_consuming()) {
            $canal->wait();
        }

        return self::SUCCESS;
    }

    /** @param  array<string, mixed>  $c */
    private function reintentar_o_descartar(AMQPMessage $mensaje, AMQPChannel $canal, array $c, Throwable $e): void
    {
        $cabeceras = $mensaje->has('application_headers') ? $mensaje->get('application_headers')->getNativeData() : [];
        $intentos = (int) ($cabeceras['x-intentos'] ?? 0) + 1;
        report($e);

        if ($intentos >= $c['max_intentos']) {
            $mensaje->reject(false);

            return;
        }
        sleep((int) ($c['espera_inicial_segundos'] * (2 ** ($intentos - 1))));
        $cabeceras['x-intentos'] = $intentos;
        $copia = new AMQPMessage($mensaje->getBody(), [
            'content_type' => 'application/json',
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
            'application_headers' => new AMQPTable($cabeceras),
        ]);
        $canal->basic_publish($copia, '', $c['cola_comandos']);
        $mensaje->ack();
    }
}
