<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mensajeria\SobreEvento;
use App\Repositories\BandejaSalidaRepository;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;

/**
 * Relevo de la bandeja de salida: publica los eventos pendientes con confirmacion del broker y recien
 * entonces los marca como publicados. Entrega AL MENOS UNA VEZ (si se cae entre publicar y marcar, se
 * republica): los consumidores deduplican por id_evento.
 */
class PublicarBandejaSalida
{
    public function __construct(private readonly BandejaSalidaRepository $bandeja) {}

    /** @return int cantidad de eventos publicados en esta vuelta */
    public function ejecutar_una_vuelta(AMQPChannel $canal): int
    {
        $exchange = (string) config('crm.mensajeria.exchange_eventos');
        $publicados = 0;
        foreach ($this->bandeja->pendientes() as $evento) {
            $sobre = SobreEvento::armar($evento);
            $mensaje = new AMQPMessage((string) json_encode($sobre, JSON_UNESCAPED_UNICODE), [
                'content_type' => 'application/json',
                'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
                'message_id' => $sobre['id_evento'],
                'type' => $sobre['tipo_evento'],
            ]);
            $canal->basic_publish($mensaje, $exchange, SobreEvento::clave_enrutamiento($sobre['tipo_evento']));
            $canal->wait_for_pending_acks(5.0);
            $this->bandeja->marcar_publicado((string) $evento->id);
            $publicados++;
        }

        return $publicados;
    }
}
