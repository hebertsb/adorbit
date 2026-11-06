<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mensajeria\SobreEvento;
use App\Models\ClaveIdempotencia;
use App\Models\EventoSalida;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use MongoDB\BSON\Decimal128;
use MongoDB\BSON\UTCDateTime;
use Tests\PruebaCrm;

class ClienteApiTest extends PruebaCrm
{
    private function crear(array $extra = [], ?string $clave = null): TestResponse
    {
        return $this->postJson('/api/v1/clientes', $extra + [
            'razon_social' => 'Agencia Sol SRL', 'nit' => '1020304050', 'limite_credito' => '50000.00', 'moneda' => 'BOB',
        ], $this->cabeceras() + ['Idempotency-Key' => $clave ?? $this->clave()]);
    }

    public function test_crea_un_cliente_y_encola_el_evento_en_la_misma_transaccion(): void
    {
        $r = $this->crear()->assertCreated()
            ->assertJsonPath('estado', 'activo')
            ->assertJsonPath('linea_credito.limite', '50000.00')
            ->assertJsonPath('linea_credito.usado', '0.00')
            ->assertJsonPath('version', 1);

        $this->assertSame(1, EventoSalida::where('tipo_evento', 'ClienteCreado')->count());
        $evento = EventoSalida::where('tipo_evento', 'ClienteCreado')->first();
        $this->assertSame($r->json('id'), $evento->agregado_id);
        $this->assertCumpleContrato('ClienteCreado', SobreEvento::armar($evento));
    }

    public function test_el_documento_cumple_el_validador_de_mongo(): void
    {
        $this->crear()->assertCreated();
        $doc = $this->colecciones('clientes')->findOne([]);
        $this->assertInstanceOf(Decimal128::class, $doc['linea_credito']['limite']);
        $this->assertInstanceOf(UTCDateTime::class, $doc['creado_en']);
    }

    public function test_repetir_la_misma_clave_no_duplica_cliente_ni_evento(): void
    {
        $clave = $this->clave();
        $primero = $this->crear([], $clave)->assertCreated();
        $segundo = $this->crear([], $clave)->assertOk();

        $this->assertSame($primero->json('id'), $segundo->json('id'));
        $this->assertSame(1, $this->colecciones('clientes')->countDocuments());
        $this->assertSame(1, EventoSalida::count());
    }

    public function test_misma_clave_con_otro_cuerpo_responde_422(): void
    {
        $clave = $this->clave();
        $this->crear([], $clave)->assertCreated();
        $this->crear(['razon_social' => 'Otra SRL'], $clave)->assertStatus(422)->assertJsonPath('codigo', 'idempotencia_conflicto');
    }

    public function test_un_fallo_no_deja_nada_a_medias(): void
    {
        $clave = $this->clave();
        $this->crear([], $this->clave())->assertCreated();
        $this->crear([], $clave)->assertStatus(409)->assertJsonPath('codigo', 'nit_duplicado');

        $this->assertSame(1, $this->colecciones('clientes')->countDocuments());
        $this->assertSame(1, EventoSalida::count());
        $this->assertNull(ClaveIdempotencia::where('clave', $clave)->first(), 'la clave tambien se revierte');
    }

    public function test_exige_idempotency_key(): void
    {
        $this->postJson('/api/v1/clientes', ['razon_social' => 'X', 'nit' => '1'], $this->cabeceras())
            ->assertStatus(400)->assertJsonPath('codigo', 'clave_idempotencia_invalida');
    }

    public function test_rechaza_campos_desconocidos_y_montos_invalidos(): void
    {
        $this->crear(['extra' => 1])->assertStatus(400)->assertJsonPath('codigo', 'solicitud_invalida');
        $this->crear(['limite_credito' => '-5'])->assertStatus(400);
        $this->crear(['limite_credito' => '12.345'])->assertStatus(400);
        $this->crear(['moneda' => 'EUR'])->assertStatus(400);
        $this->crear(['razon_social' => str_repeat('a', 201)])->assertStatus(400);
    }

    public function test_actualiza_con_control_de_version(): void
    {
        $id = $this->crear()->json('id');
        $this->putJson("/api/v1/clientes/$id", ['razon_social' => 'Nueva SRL', 'nit' => '1020304050', 'version' => 1],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertOk()->assertJsonPath('razon_social', 'Nueva SRL')->assertJsonPath('version', 2);

        $this->putJson("/api/v1/clientes/$id", ['razon_social' => 'Vieja', 'nit' => '1020304050', 'version' => 1],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertStatus(409)->assertJsonPath('codigo', 'conflicto_version');
        $this->assertSame(1, EventoSalida::where('tipo_evento', 'ClienteActualizado')->count());
    }

    public function test_no_baja_el_limite_por_debajo_de_lo_usado(): void
    {
        $id = $this->crear()->json('id');
        $this->colecciones('clientes')->updateOne(['id' => $id], ['$set' => ['linea_credito.usado' => new Decimal128('1000.00')]]);
        $this->putJson("/api/v1/clientes/$id", ['razon_social' => 'X', 'nit' => '1020304050', 'version' => 1, 'limite_credito' => '500.00'],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertStatus(422)->assertJsonPath('codigo', 'limite_menor_al_usado');
    }

    public function test_baja_logica_y_bloqueo_con_contratos_vigentes(): void
    {
        $id = $this->crear()->json('id');
        $contrato = $this->postJson('/api/v1/contratos', [
            'cliente_id' => $id, 'fecha_inicio' => '2026-11-01', 'fecha_fin' => '2027-11-01', 'monto' => '10000.00', 'moneda' => 'BOB',
        ], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->assertCreated();

        $this->deleteJson("/api/v1/clientes/$id", [], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertStatus(409)->assertJsonPath('codigo', 'cliente_con_contratos_vigentes');

        $this->putJson('/api/v1/contratos/'.$contrato->json('id'), [
            'fecha_inicio' => '2026-11-01', 'fecha_fin' => '2027-11-01', 'monto' => '10000.00', 'moneda' => 'BOB',
            'version' => 1, 'estado' => 'rescindido',
        ], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->assertOk();

        $this->deleteJson("/api/v1/clientes/$id", [], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->assertNoContent();
        $this->getJson("/api/v1/clientes/$id", $this->cabeceras())->assertOk()->assertJsonPath('estado', 'inactivo');
    }

    public function test_no_se_puede_inactivar_por_put_con_contratos_vigentes(): void
    {
        $id = $this->crear()->json('id');
        $this->postJson('/api/v1/contratos', [
            'cliente_id' => $id, 'fecha_inicio' => '2026-11-01', 'fecha_fin' => '2027-11-01', 'monto' => '10000.00', 'moneda' => 'BOB',
        ], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->assertCreated();

        $this->putJson("/api/v1/clientes/$id", ['razon_social' => 'Agencia Sol SRL', 'nit' => '1020304050', 'version' => 1, 'estado' => 'inactivo'],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertStatus(409)->assertJsonPath('codigo', 'cliente_con_contratos_vigentes');
        $this->getJson("/api/v1/clientes/$id", $this->cabeceras())->assertJsonPath('estado', 'activo')->assertJsonPath('version', 1);
    }

    public function test_contactos_crud(): void
    {
        $id = $this->crear()->json('id');
        $h = fn () => $this->cabeceras() + ['Idempotency-Key' => $this->clave()];

        $contacto = $this->postJson("/api/v1/clientes/$id/contactos", ['nombre' => 'Ana', 'email' => 'ana@sol.bo', 'rol' => 'compras'], $h())
            ->assertCreated()->assertJsonPath('nombre', 'Ana');
        $cid = $contacto->json('id');

        $this->putJson("/api/v1/clientes/$id/contactos/$cid", ['nombre' => 'Ana Maria'], $h())->assertOk()->assertJsonPath('nombre', 'Ana Maria');
        $this->getJson("/api/v1/clientes/$id/contactos", $this->cabeceras())->assertOk()->assertJsonCount(1);
        $this->deleteJson("/api/v1/clientes/$id/contactos/$cid", [], $h())->assertNoContent();
        $this->getJson("/api/v1/clientes/$id/contactos", $this->cabeceras())->assertOk()->assertJsonCount(0);
        $this->deleteJson("/api/v1/clientes/$id/contactos/$cid", [], $h())->assertNotFound();
    }

    public function test_lista_con_filtros_y_paginacion_acotada(): void
    {
        foreach (['1', '2', '3'] as $n) {
            $this->crear(['razon_social' => "Cliente $n", 'nit' => "900$n"])->assertCreated();
        }
        $this->getJson('/api/v1/clientes?size=2&page=0', $this->cabeceras())->assertOk()
            ->assertJsonCount(2, 'contenido')->assertJsonPath('total_elementos', 3);
        $this->getJson('/api/v1/clientes?size=2&page=1', $this->cabeceras())->assertJsonCount(1, 'contenido');
        $this->getJson('/api/v1/clientes?q=cliente 2', $this->cabeceras())->assertJsonCount(1, 'contenido');
        $this->getJson('/api/v1/clientes?size=9999', $this->cabeceras())->assertJsonPath('size', 100);
    }

    public function test_un_cliente_solo_ve_lo_suyo(): void
    {
        $mio = $this->crear(['nit' => '111'])->json('id');
        $otro = $this->crear(['nit' => '222'])->json('id');
        $h = $this->cabeceras(['cliente'], ['cliente_id' => $mio]);

        $this->getJson("/api/v1/clientes/$mio", $h)->assertOk();
        $this->getJson("/api/v1/clientes/$otro", $h)->assertNotFound();
        $this->getJson("/api/v1/clientes/$otro/credito", $h)->assertNotFound();
        $this->getJson('/api/v1/clientes', $h)->assertJsonCount(1, 'contenido')->assertJsonPath('contenido.0.id', $mio);
        $this->postJson('/api/v1/clientes', ['razon_social' => 'X', 'nit' => '9'], $h + ['Idempotency-Key' => $this->clave()])->assertStatus(403);
    }

    public function test_un_cliente_sin_cliente_id_en_el_token_es_rechazado(): void
    {
        $this->getJson('/api/v1/clientes', $this->cabeceras(['cliente']))->assertStatus(403);
    }

    public function test_id_que_no_es_uuid_responde_404(): void
    {
        $this->getJson('/api/v1/clientes/'.Str::random(8), $this->cabeceras())->assertNotFound();
    }
}
