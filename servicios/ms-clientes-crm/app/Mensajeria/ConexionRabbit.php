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

        if (!empty($c['url'])) {
            $partes = parse_url($c['url']);
            $esSsl = ($partes['scheme'] ?? '') === 'amqps';
            $host = $partes['host'] ?? 'localhost';
            $puerto = $partes['port'] ?? ($esSsl ? 5671 : 5672);
            $usuario = isset($partes['user']) ? urldecode($partes['user']) : 'guest';
            $clave = isset($partes['pass']) ? urldecode($partes['pass']) : 'guest';
            $vhost = isset($partes['path']) && strlen($partes['path']) > 1
                ? ltrim(urldecode($partes['path']), '/')
                : '/';

            if ($esSsl) {
                return new AMQPSSLConnection($host, $puerto, $usuario, $clave, $vhost, ['verify_peer' => true]);
            }
            return new AMQPStreamConnection($host, $puerto, $usuario, $clave, $vhost);
        }

        if (!empty($c['ssl'])) {
            return new AMQPSSLConnection(
                $c['host'],
                $c['puerto'] ?: 5671,
                $c['usuario'],
                $c['clave'],
                $c['vhost'] ?? '/',
                ['verify_peer' => true]
            );
        }

        return new AMQPStreamConnection(
            $c['host'],
            $c['puerto'] ?: 5672,
            $c['usuario'],
            $c['clave'],
            $c['vhost'] ?? '/'
        );
    }

    public static function declarar_topologia(AMQPChannel $canal): void
    {
        $c = config('crm.mensajeria');
        $canal->exchange_declare($c['exchange_eventos'], 'topic', false, true, false);
        // D80/D57: adorbit.saga es direct en el broker central compartido
        $canal->exchange_declare($c['exchange_saga'], 'direct', false, true, false);
        // adorbit.dlx es fanout según plataforma/rabbitmq/definiciones.json
        $canal->exchange_declare($c['exchange_errores'], 'fanout', false, true, false);

        $canal->queue_declare($c['cola_comandos'], false, true, false, false, false, new AMQPTable([
            'x-dead-letter-exchange' => $c['exchange_errores'],
            'x-dead-letter-routing-key' => $c['routing_key_dlq'] ?? ($c['cola_comandos'] . '.dlq'),
        ]));
        // Conexión con routing key exacta de SAGA CRM
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], 'saga.crm');
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], 'reservar.credito');
        $canal->queue_bind($c['cola_comandos'], $c['exchange_saga'], 'liberar.credito');

        $canal->queue_declare($c['cola_comandos'].'.dlq', false, true, false, false);
        $canal->queue_bind($c['cola_comandos'].'.dlq', $c['exchange_errores'], $c['cola_comandos']);
    }
}
