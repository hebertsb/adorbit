<?php

declare(strict_types=1);

namespace App\Mensajeria;

use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Wire\AMQPTable;

/** Conexion a RabbitMQ y topologia propia del CRM (exchanges, cola de comandos y cola de errores). */
final class ConexionRabbit
{
    public static function conectar(): AMQPStreamConnection
    {
        $c = config('crm.mensajeria');

        return new AMQPStreamConnection($c['host'], $c['puerto'], $c['usuario'], $c['clave']);
    }

    public static function declarar_topologia(AMQPChannel $canal): void
    {
        $c = config('crm.mensajeria');
        $canal->exchange_declare($c['exchange_eventos'], 'topic', false, true, false);
        $canal->exchange_declare($c['exchange_saga'], 'topic', false, true, false);
        $canal->exchange_declare($c['exchange_errores'], 'direct', false, true, false);

        $canal->queue_declare($c['cola_comandos'], false, true, false, false, false, new AMQPTable([
            'x-dead-letter-exchange' => $c['exchange_errores'],
            'x-dead-letter-routing-key' => $c['cola_comandos'],
        ]));
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], 'reservar.credito');
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], 'liberar.credito');

        $canal->queue_declare($c['cola_comandos'].'.dlq', false, true, false, false);
        $canal->queue_bind($c['cola_comandos'].'.dlq', $c['exchange_errores'], $c['cola_comandos']);
    }
}
