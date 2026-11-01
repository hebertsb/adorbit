<?php

declare(strict_types=1);

namespace Tests\Feature;

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
}
