<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Excepciones\ComandoInvalido;
use App\Jobs\ProcesarComandoSaga;
use App\Mensajeria\SobreEvento;
use App\Models\ClaveIdempotencia;
use App\Models\EventoSalida;
use App\Models\ReservaCredito;
use App\Repositories\BandejaSalidaRepository;
use App\Services\CreditoService;
use Illuminate\Support\Str;
use MongoDB\BSON\Decimal128;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\PruebaCrm;

class CreditoSagaTest extends PruebaCrm
{
    private CreditoService $credito;

    protected function setUp(): void
    {
        parent::setUp();
        $this->credito = $this->app->make(CreditoService::class);
    }

    private function cliente(string $limite = '50000.00', string $moneda = 'BOB'): string
    {
        return $this->postJson('/api/v1/clientes', ['razon_social' => 'Sol SRL', 'nit' => (string) random_int(10000, 99999), 'limite_credito' => $limite, 'moneda' => $moneda],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->json('id');
    }

    private function usado(string $cliente): string
    {
        return (string) $this->getJson("/api/v1/clientes/$cliente/credito", $this->cabeceras())->json('linea_credito.usado');
    }

    private function eventos(string $tipo): array
    {
        return EventoSalida::where('tipo_evento', $tipo)->get()->all();
    }

    private function reservar(string $cliente, string $monto, ?string $saga = null, ?string $campana = null, string $moneda = 'BOB'): string
    {
        $saga ??= (string) Str::uuid();
        $this->credito->reservar("$saga:2:accion", $saga, $cliente, $campana ?? (string) Str::uuid(), $monto, $moneda);

        return $saga;
    }

    public function test_reserva_credito_atomicamente_y_publica_el_evento(): void
    {
        $cliente = $this->cliente();
        $saga = $this->reservar($cliente, '1500.50');

        $this->assertSame('1500.50', $this->usado($cliente));
        $reserva = ReservaCredito::where('saga_id', $saga)->first();
        $this->assertSame('reservado', $reserva->estado);
        $this->assertTrue(Str::isUuid((string) $reserva->id));
        $this->assertInstanceOf(Decimal128::class, $this->colecciones('reservas_credito')->findOne([])['monto']);

        $evento = $this->eventos('CreditoReservado');
        $this->assertCount(1, $evento);
        $this->assertCumpleContrato('CreditoReservado', SobreEvento::armar($evento[0]));
        $this->assertSame($saga, SobreEvento::armar($evento[0])['correlacion_id']);

        $this->getJson("/api/v1/clientes/$cliente/credito", $this->cabeceras())
            ->assertJsonPath('disponible', '48499.50')->assertJsonCount(1, 'reservas_activas');
    }

    public function test_reenviar_el_mismo_comando_no_duplica_nada(): void
    {
        $cliente = $this->cliente();
        $saga = (string) Str::uuid();
        $campana = (string) Str::uuid();
        $this->credito->reservar("$saga:2:accion", $saga, $cliente, $campana, '1000.00', 'BOB');
        $this->credito->reservar("$saga:2:accion", $saga, $cliente, $campana, '1000.00', 'BOB');

        $this->assertSame('1000.00', $this->usado($cliente));
        $this->assertSame(1, ReservaCredito::count());
        $this->assertCount(1, $this->eventos('CreditoReservado'));
    }

    public function test_credito_insuficiente_publica_rechazo_sin_tocar_el_saldo(): void
    {
        $cliente = $this->cliente('1000.00');
        $saga = $this->reservar($cliente, '1000.01');

        $this->assertSame('0.00', $this->usado($cliente));
        $this->assertSame(0, ReservaCredito::count());
        $rechazo = $this->eventos('CreditoRechazado');
        $this->assertCount(1, $rechazo);
        $this->assertCumpleContrato('CreditoRechazado', SobreEvento::armar($rechazo[0]));
        $this->assertSame('credito_insuficiente', $rechazo[0]->carga['motivo']);

        // el rechazo tambien es idempotente
        $this->credito->reservar("$saga:2:accion", $saga, $cliente, (string) Str::uuid(), '1000.01', 'BOB');
        $this->assertCount(1, $this->eventos('CreditoRechazado'));
    }

    public function test_se_puede_reservar_hasta_el_limite_exacto_y_no_mas(): void
    {
        $cliente = $this->cliente('100.00');
        $this->reservar($cliente, '60.00');
        $this->reservar($cliente, '40.00');
        $this->assertSame('100.00', $this->usado($cliente));
        $this->reservar($cliente, '0.01');
        $this->assertSame('100.00', $this->usado($cliente));
        $this->assertCount(1, $this->eventos('CreditoRechazado'));
    }

    public function test_una_sola_reserva_activa_por_campana(): void
    {
        $cliente = $this->cliente();
        $campana = (string) Str::uuid();
        $this->reservar($cliente, '100.00', null, $campana);
        $this->reservar($cliente, '100.00', null, $campana);

        $this->assertSame('100.00', $this->usado($cliente));
        $this->assertSame('reserva_activa_existente', $this->eventos('CreditoRechazado')[0]->carga['motivo']);
    }

    public function test_rechaza_cliente_inexistente_inactivo_o_con_otra_moneda(): void
    {
        $this->reservar((string) Str::uuid(), '10.00');
        $inactivo = $this->cliente();
        $this->colecciones('clientes')->updateOne(['id' => $inactivo], ['$set' => ['estado' => 'inactivo']]);
        $this->reservar($inactivo, '10.00');
        $this->reservar($this->cliente(moneda: 'USD'), '10.00', moneda: 'BOB');

        $motivos = array_map(fn ($e) => $e->carga['motivo'], $this->eventos('CreditoRechazado'));
        sort($motivos);
        $this->assertSame(['cliente_inactivo', 'cliente_no_encontrado', 'moneda_no_coincide'], $motivos);
        foreach ($this->eventos('CreditoRechazado') as $e) {
            $this->assertCumpleContrato('CreditoRechazado', SobreEvento::armar($e));
        }
    }

    public function test_liberar_devuelve_el_credito_una_sola_vez(): void
    {
        $cliente = $this->cliente();
        $campana = (string) Str::uuid();
        $saga = $this->reservar($cliente, '700.00', null, $campana);

        $this->credito->liberar("$saga:2:compensacion", $saga, $cliente, $campana, '700.00', 'BOB');
        $this->credito->liberar("$saga:2:compensacion", $saga, $cliente, $campana, '700.00', 'BOB');
        $this->credito->liberar("$saga:2:otra-clave", $saga, $cliente, $campana, '700.00', 'BOB');

        $this->assertSame('0.00', $this->usado($cliente));
        $this->assertSame('liberado', ReservaCredito::where('saga_id', $saga)->first()->estado);
        $liberado = $this->eventos('CreditoLiberado');
        $this->assertCount(1, $liberado);
        $this->assertCumpleContrato('CreditoLiberado', SobreEvento::armar($liberado[0]));
    }

    public function test_liberar_devuelve_el_credito_a_quien_lo_reservo_aunque_el_comando_traiga_otro_cliente(): void
    {
        $dueno = $this->cliente();
        $otro = $this->cliente();
        $campana = (string) Str::uuid();
        $saga = $this->reservar($dueno, '300.00', null, $campana);

        $this->credito->liberar("$saga:2:compensacion", $saga, $otro, (string) Str::uuid(), '300.00', 'BOB');

        $this->assertSame('0.00', $this->usado($dueno), 'el dueno recupera su credito');
        $this->assertSame('0.00', $this->usado($otro), 'el otro cliente no se toca');
        $liberado = $this->eventos('CreditoLiberado')[0];
        $this->assertSame($dueno, $liberado->carga['cliente_id']);
        $this->assertSame($campana, $liberado->carga['campana_id']);
        $this->assertCumpleContrato('CreditoLiberado', SobreEvento::armar($liberado));
    }

    public function test_liberar_sin_reserva_no_hace_nada(): void
    {
        $cliente = $this->cliente();
        $saga = (string) Str::uuid();
        $this->credito->liberar("$saga:2:compensacion", $saga, $cliente, (string) Str::uuid(), '10.00', 'BOB');
        $this->assertSame('0.00', $this->usado($cliente));
        $this->assertSame(0, EventoSalida::where('tipo_evento', 'CreditoLiberado')->count());
    }

    public function test_si_falla_cualquier_paso_la_transaccion_revierte_todo(): void
    {
        $cliente = $this->cliente();
        $this->app->bind(BandejaSalidaRepository::class, fn () => new class extends BandejaSalidaRepository
        {
            public function encolar(string $tipo_evento, string $agregado_id, string $correlacion_id, array $carga): void
            {
                throw new RuntimeException('falla simulada al encolar el evento');
            }
        });
        $credito = $this->app->make(CreditoService::class);
        $saga = (string) Str::uuid();

        try {
            $credito->reservar("$saga:2:accion", $saga, $cliente, (string) Str::uuid(), '500.00', 'BOB');
            $this->fail('debio fallar');
        } catch (RuntimeException) {
        }

        $this->assertSame('0.00', $this->usado($cliente), 'el saldo no se movio');
        $this->assertSame(0, ReservaCredito::count());
        $this->assertNull(ClaveIdempotencia::where('clave', "$saga:2:accion")->first(), 'la clave tambien se revirtio');
    }

    public function test_el_comando_de_la_saga_se_interpreta_y_ejecuta(): void
    {
        $cliente = $this->cliente();
        $saga = (string) Str::uuid();
        $comando = fn (string $tipo) => json_encode(['tipo_evento' => $tipo, 'carga' => [
            'saga_id' => $saga, 'clave_comando' => $tipo === 'ReservarCredito' ? "$saga:2:accion" : "$saga:2:compensacion", 'cliente_id' => $cliente,
            'campana_id' => (string) Str::uuid(), 'monto' => '250.00', 'moneda' => 'BOB',
        ]]);
        $procesar = $this->app->make(ProcesarComandoSaga::class);

        $procesar->procesar($comando('ReservarCredito'));
        $this->assertSame('250.00', $this->usado($cliente));
        $procesar->procesar($comando('LiberarCredito'));
        $this->assertSame('0.00', $this->usado($cliente));
    }

    #[DataProvider('comandos_invalidos')]
    public function test_los_comandos_ilegibles_se_rechazan_sin_reintento(string $cuerpo): void
    {
        $this->expectException(ComandoInvalido::class);
        $this->app->make(ProcesarComandoSaga::class)->procesar($cuerpo);
    }

    /** @return array<string, array{string}> */
    public static function comandos_invalidos(): array
    {
        $ok = ['saga_id' => '11111111-1111-1111-1111-111111111111', 'clave_comando' => 'k', 'cliente_id' => '11111111-1111-1111-1111-111111111111',
            'campana_id' => '11111111-1111-1111-1111-111111111111', 'monto' => '1.00', 'moneda' => 'BOB'];

        return [
            'no es json' => ['esto no es json'],
            'sin carga' => [json_encode(['tipo_evento' => 'ReservarCredito'])],
            'tipo desconocido' => [json_encode(['tipo_evento' => 'Inventado', 'carga' => $ok])],
            'uuid invalido' => [json_encode(['tipo_evento' => 'ReservarCredito', 'carga' => ['saga_id' => 'x'] + $ok])],
            'monto invalido' => [json_encode(['tipo_evento' => 'ReservarCredito', 'carga' => ['monto' => '-1'] + $ok])],
            'moneda invalida' => [json_encode(['tipo_evento' => 'ReservarCredito', 'carga' => ['moneda' => 'EUR'] + $ok])],
            'falta clave' => [json_encode(['tipo_evento' => 'ReservarCredito', 'carga' => array_diff_key($ok, ['clave_comando' => 1])])],
        ];
    }
}
