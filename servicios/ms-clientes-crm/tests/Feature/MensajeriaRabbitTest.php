<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mensajeria\ConexionRabbit;
use App\Models\EventoSalida;
use App\Models\ReservaCredito;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Symfony\Component\Process\Process;
use Tests\PruebaCrm;
use Throwable;

/** Requiere RabbitMQ local (docker compose -f docker-compose.local.yml up -d). Se omite si no responde. */
class MensajeriaRabbitTest extends PruebaCrm
{
    private ?AMQPStreamConnection $conexion = null;

    private AMQPChannel $canal;

    protected function setUp(): void
    {
        parent::setUp();
        try {
            $this->conexion = ConexionRabbit::conectar();
        } catch (Throwable) {
            $this->markTestSkipped('RabbitMQ no esta disponible');
        }
        $this->canal = $this->conexion->channel();
        ConexionRabbit::declarar_topologia($this->canal);
        $this->canal->queue_purge('saga.crm');
        $this->canal->queue_purge('saga.crm.dlq');
    }

    protected function tearDown(): void
    {
        $this->conexion?->close();
        parent::tearDown();
    }

    private function crear_cliente(string $limite = '5000.00'): string
    {
        return $this->postJson('/api/v1/clientes', ['razon_social' => 'Sol SRL', 'nit' => (string) random_int(10000, 99999), 'limite_credito' => $limite],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->json('id');
    }

    private function esperar(callable $condicion, int $segundos = 20): bool
    {
        $limite = microtime(true) + $segundos;
        while (microtime(true) < $limite) {
            if ($condicion()) {
                return true;
            }
            usleep(200_000);
        }

        return false;
    }

    public function test_el_relevo_publica_los_eventos_pendientes_una_sola_vez(): void
    {
        $cola = 'test.eventos.'.Str::random(8);
        $this->canal->queue_declare($cola, false, false, false, true);
        $this->canal->queue_bind($cola, 'adorbit.eventos', '#');
        $cliente = $this->crear_cliente();

        Artisan::call('crm:publicar-bandeja', ['--una-vez' => true]);

        $mensaje = null;
        $this->assertTrue($this->esperar(function () use (&$mensaje, $cola) {
            $mensaje = $this->canal->basic_get($cola, true);

            return $mensaje !== null;
        }), 'llego un mensaje a la cola');
        $this->assertSame('cliente.creado', $mensaje->getRoutingKey());
        $sobre = json_decode($mensaje->getBody(), true);
        $this->assertSame($cliente, $sobre['agregado_id']);
        $this->assertCumpleContrato('ClienteCreado', $sobre);
        $this->assertSame(0, EventoSalida::where('publicado', false)->count());

        Artisan::call('crm:publicar-bandeja', ['--una-vez' => true]);
        $this->assertNull($this->canal->basic_get($cola, true), 'no se republica lo ya publicado');
    }

    private function consumidor(): Process
    {
        $proceso = new Process([PHP_BINARY, 'artisan', 'crm:consumir-comandos'], base_path(), [
            'ADORBIT_CRM_MONGO_BD' => 'adorbit_crm_test',
            'ADORBIT_CRM_REINTENTO_INICIAL' => '0',
            'LOG_CHANNEL' => 'stderr',
            'CACHE_STORE' => 'array',
        ]);
        $proceso->start();

        return $proceso;
    }

    private function comando(string $tipo, string $saga, string $cliente, string $monto): AMQPMessage
    {
        return new AMQPMessage((string) json_encode(['tipo_evento' => $tipo, 'carga' => [
            'saga_id' => $saga, 'clave_comando' => $saga.($tipo === 'ReservarCredito' ? ':2:accion' : ':2:compensacion'),
            'cliente_id' => $cliente, 'campana_id' => (string) Str::uuid(), 'monto' => $monto, 'moneda' => 'BOB',
        ]]), ['content_type' => 'application/json', 'delivery_mode' => 2]);
    }

    public function test_el_consumidor_ejecuta_reservar_y_liberar_de_punta_a_punta(): void
    {
        $cliente = $this->crear_cliente('5000.00');
        $saga = (string) Str::uuid();
        $proceso = $this->consumidor();
        try {
            $this->canal->basic_publish($this->comando('ReservarCredito', $saga, $cliente, '1200.00'), 'adorbit.saga', 'reservar.credito');
            $this->assertTrue($this->esperar(fn () => ReservaCredito::where('saga_id', $saga)->exists()), 'se creo la reserva');
            $this->assertSame('1200.00', (string) $this->getJson("/api/v1/clientes/$cliente/credito", $this->cabeceras())->json('linea_credito.usado'));

            // reenvio del mismo comando: no duplica
            $this->canal->basic_publish($this->comando('ReservarCredito', $saga, $cliente, '1200.00'), 'adorbit.saga', 'reservar.credito');
            $this->canal->basic_publish($this->comando('LiberarCredito', $saga, $cliente, '1200.00'), 'adorbit.saga', 'liberar.credito');
            $this->assertTrue($this->esperar(fn () => ReservaCredito::where('saga_id', $saga)->first()?->estado === 'liberado'), 'se libero');

            $this->assertSame('0.00', (string) $this->getJson("/api/v1/clientes/$cliente/credito", $this->cabeceras())->json('linea_credito.usado'));
            $this->assertSame(1, ReservaCredito::count());
            $this->assertSame(1, EventoSalida::where('tipo_evento', 'CreditoReservado')->count());
        } finally {
            $proceso->stop();
        }
    }

    public function test_un_mensaje_ilegible_va_a_la_cola_de_errores(): void
    {
        $proceso = $this->consumidor();
        try {
            $this->canal->basic_publish(new AMQPMessage('esto no es json'), 'adorbit.saga', 'reservar.credito');
            $enDlq = null;
            $this->assertTrue($this->esperar(function () use (&$enDlq) {
                $enDlq = $this->canal->basic_get('saga.crm.dlq', true);

                return $enDlq !== null;
            }), 'el mensaje llego a saga.crm.dlq');
            $this->assertSame('esto no es json', $enDlq->getBody());
        } finally {
            $proceso->stop();
        }
    }
}
