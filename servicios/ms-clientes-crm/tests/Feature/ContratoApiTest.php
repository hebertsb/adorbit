<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use MongoDB\BSON\Decimal128;
use MongoDB\BSON\UTCDateTime;
use Tests\PruebaCrm;

class ContratoApiTest extends PruebaCrm
{
    private function cliente(): string
    {
        return $this->postJson('/api/v1/clientes', ['razon_social' => 'Sol SRL', 'nit' => (string) random_int(1000, 9999), 'limite_credito' => '1000.00'],
            $this->cabeceras() + ['Idempotency-Key' => $this->clave()])->json('id');
    }

    private function contrato(string $cliente, array $extra = []): TestResponse
    {
        return $this->postJson('/api/v1/contratos', $extra + [
            'cliente_id' => $cliente, 'fecha_inicio' => '2026-11-01', 'fecha_fin' => '2027-11-01', 'monto' => '25000.50', 'moneda' => 'BOB',
        ], $this->cabeceras() + ['Idempotency-Key' => $this->clave()]);
    }

    public function test_crea_un_contrato_vigente(): void
    {
        $this->contrato($this->cliente())->assertCreated()
            ->assertJsonPath('estado', 'vigente')->assertJsonPath('monto', '25000.50')->assertJsonPath('fecha_fin', '2027-11-01');
        $doc = $this->colecciones('contratos')->findOne([]);
        $this->assertInstanceOf(UTCDateTime::class, $doc['fecha_inicio']);
        $this->assertInstanceOf(Decimal128::class, $doc['monto']);
    }

    public function test_rechaza_cliente_inexistente_o_fechas_invertidas(): void
    {
        $this->contrato((string) Str::uuid())->assertStatus(422)->assertJsonPath('codigo', 'cliente_no_encontrado');
        $this->contrato($this->cliente(), ['fecha_fin' => '2026-10-01'])->assertStatus(422)->assertJsonPath('codigo', 'fecha_invalida');
        $this->contrato($this->cliente(), ['fecha_inicio' => '01/11/2026'])->assertStatus(400);
    }

    public function test_un_contrato_cerrado_no_se_modifica(): void
    {
        $id = $this->contrato($this->cliente())->json('id');
        $cuerpo = ['fecha_inicio' => '2026-11-01', 'fecha_fin' => '2027-11-01', 'monto' => '1.00', 'moneda' => 'BOB', 'version' => 1];
        $this->putJson("/api/v1/contratos/$id", $cuerpo + ['estado' => 'vencido'], $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertOk()->assertJsonPath('estado', 'vencido');
        $this->putJson("/api/v1/contratos/$id", ['version' => 2] + $cuerpo, $this->cabeceras() + ['Idempotency-Key' => $this->clave()])
            ->assertStatus(409)->assertJsonPath('codigo', 'contrato_cerrado');
    }

    public function test_el_cliente_solo_ve_sus_contratos(): void
    {
        $mio = $this->cliente();
        $otro = $this->cliente();
        $this->contrato($mio)->assertCreated();
        $ajeno = $this->contrato($otro)->json('id');
        $h = $this->cabeceras(['cliente'], ['cliente_id' => $mio]);

        $this->getJson('/api/v1/contratos', $h)->assertJsonCount(1, 'contenido');
        $this->getJson("/api/v1/contratos/$ajeno", $h)->assertNotFound();
    }
}
