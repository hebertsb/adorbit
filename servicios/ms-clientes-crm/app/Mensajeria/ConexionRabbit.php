<?php

declare(strict_types=1);

namespace App\Mensajeria;

use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPSSLConnection;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Wire\AMQPTable;

/** Conexion a RabbitMQ y topologia propia del CRM (exchanges, cola de comandos y cola de errores). */
final class ConexionRabbit
{
    public static function conectar(): AMQPStreamConnection
    {
        $c = config('crm.mensajeria');

        if (!empty($c['ssl'])) {
            return new AMQPSSLConnection(
                $c['host'],
                $c['puerto'],
                $c['usuario'],
                $c['clave'],
                $c['vhost'] ?? '/',
                ['verify_peer' => true]
            );
        }

        return new AMQPStreamConnection(
            $c['host'],
            $c['puerto'],
            $c['usuario'],
            $c['clave'],
            $c['vhost'] ?? '/'
        );
    }

    public static function declarar_topologia(AMQPChannel $canal): void
    {
        $c = config('crm.mensajeria');
        $canal->exchange_declare($c['exchange_eventos'], 'topic', false, true, false);
        $canal->exchange_declare($c['exchange_saga'], 'direct', false, true, false);
        $canal->exchange_declare($c['exchange_errores'], 'fanout', false, true, false);

        $canal->queue_declare($c['cola_comandos'], false, true, false, false, false, new AMQPTable([
            'x-dead-letter-exchange' => $c['exchange_errores'],
            'x-dead-letter-routing-key' => $c['cola_comandos'].'.dlq',
        ]));
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], $c['cola_comandos']);
        $canal->queue_declare('cola.muerta', false, true, false, false);
        $canal->queue_bind('cola.muerta', $c['exchange_errores']);
    }
}
