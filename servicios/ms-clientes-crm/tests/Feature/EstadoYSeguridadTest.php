<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\PruebaCrm;

class EstadoYSeguridadTest extends PruebaCrm
{
    public function test_salud_y_listo_son_publicos(): void
    {
        $this->getJson('/api/salud')->assertOk()->assertJson(['estado' => 'vivo']);
        $this->getJson('/api/listo')->assertOk()->assertJson(['estado' => 'listo'])
            ->assertHeader('X-Correlation-Id');
    }

    public function test_conserva_el_id_de_correlacion_recibido(): void
    {
        $this->getJson('/api/salud', ['X-Correlation-Id' => 'abc-123'])->assertHeader('X-Correlation-Id', 'abc-123');
    }

    public function test_sin_token_responde_401(): void
    {
        $this->getJson('/api/v1/clientes')->assertStatus(401)->assertJsonPath('codigo', 'no_autenticado');
    }

    public function test_token_con_audiencia_incorrecta_responde_401(): void
    {
        $token = $this->token(['ejecutivo'], [], 'otro-servicio');
        $this->getJson('/api/v1/clientes', ['Authorization' => "Bearer $token"])->assertStatus(401);
    }

    public function test_token_vencido_responde_401(): void
    {
        $token = $this->token(['ejecutivo'], [], 'ms-clientes-crm', -3600);
        $this->getJson('/api/v1/clientes', ['Authorization' => "Bearer $token"])->assertStatus(401);
    }

    public function test_token_con_firma_ajena_responde_401(): void
    {
        $token = $this->token(['ejecutivo']);
        $this->getJson('/api/v1/clientes', ['Authorization' => 'Bearer '.substr($token, 0, -4).'AAAA'])->assertStatus(401);
    }

    public function test_rol_sin_permiso_responde_403(): void
    {
        $this->getJson('/api/v1/clientes', $this->cabeceras(['creativo']))->assertStatus(403);
    }

    public function test_el_preflight_de_un_origen_permitido_se_responde(): void
    {
        $this->call('OPTIONS', '/api/v1/clientes', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,x-correlation-id',
        ])->assertNoContent()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_un_origen_no_permitido_nunca_es_autorizado(): void
    {
        $respuesta = $this->call('OPTIONS', '/api/v1/clientes', [], [], [], [
            'HTTP_ORIGIN' => 'http://sitio-malicioso.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
        // Con un unico origen configurado, la respuesta lo fija a ese; el navegador rechaza al que no coincide.
        $this->assertNotSame('http://sitio-malicioso.example', $respuesta->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $respuesta->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_si_rota_la_clave_el_servicio_vuelve_a_pedir_el_jwks(): void
    {
        Cache::put('crm.jwks', ['keys' => []], 300); // cache vieja: no tiene la clave del token
        $this->getJson('/api/v1/clientes', $this->cabeceras())->assertOk();
        Http::assertSentCount(1);
    }

    public function test_tokens_basura_no_provocan_una_lluvia_de_pedidos_al_jwks(): void
    {
        $basura = $this->token(['ejecutivo']);
        $basura = substr($basura, 0, -4).'AAAA';
        foreach (range(1, 5) as $_) {
            $this->getJson('/api/v1/clientes', ['Authorization' => "Bearer $basura"])->assertStatus(401);
        }
        $this->assertLessThanOrEqual(2, count(Http::recorded()), 'a lo sumo la carga inicial y una recarga');
    }
}
