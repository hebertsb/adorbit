<?php

declare(strict_types=1);

namespace Tests;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use MongoDB\Collection;
use Opis\JsonSchema\Validator;

/**
 * Base de las pruebas: Mongo real (adorbit_crm_test, creada con base_de_datos/ms-clientes-crm.mongo.js),
 * JWT firmados con una clave RSA generada al vuelo y un JWKS simulado.
 */
abstract class PruebaCrm extends TestCase
{
    protected static ?string $clave_privada = null;

    protected static array $jwks = [];

    protected function setUp(): void
    {
        parent::setUp();
        self::preparar_claves();
        Cache::flush();
        Http::fake(['keycloak.test/jwks' => Http::response(self::$jwks)]);
        foreach (['clientes', 'contratos', 'reservas_credito', 'claves_idempotencia', 'bandeja_salida_eventos'] as $coleccion) {
            DB::connection('mongodb')->getCollection($coleccion)->deleteMany([]);
        }
    }

    private static function preparar_claves(): void
    {
        if (self::$clave_privada !== null) {
            return;
        }
        $clave = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($clave, $privada);
        $detalle = openssl_pkey_get_details($clave);
        $b64 = fn (string $b): string => rtrim(strtr(base64_encode($b), '+/', '-_'), '=');
        self::$clave_privada = $privada;
        self::$jwks = ['keys' => [[
            'kty' => 'RSA', 'use' => 'sig', 'alg' => 'RS256', 'kid' => 'k1',
            'n' => $b64($detalle['rsa']['n']), 'e' => $b64($detalle['rsa']['e']),
        ]]];
    }

    /** @param  list<string>  $roles */
    protected function token(array $roles, array $extra = [], string $audiencia = 'ms-clientes-crm', int $expira_en = 600): string
    {
        return JWT::encode($extra + [
            'iss' => 'http://keycloak.test/realms/adorbit',
            'aud' => [$audiencia],
            'iat' => time(),
            'exp' => time() + $expira_en,
            'realm_access' => ['roles' => $roles],
        ], (string) self::$clave_privada, 'RS256', 'k1');
    }

    /** @return array<string, string> */
    protected function cabeceras(array $roles = ['ejecutivo'], array $extra = []): array
    {
        return ['Authorization' => 'Bearer '.$this->token($roles, $extra)];
    }

    protected function clave(): string
    {
        return 'clave-'.Str::random(12);
    }

    protected function colecciones(string $nombre): Collection
    {
        return DB::connection('mongodb')->getCollection($nombre);
    }

    /** Valida un documento contra contratos/eventos/<tipo>.schema.json. */
    protected function assertCumpleContrato(string $tipo, array $documento): void
    {
        $esquema = json_decode((string) file_get_contents(base_path("../../contratos/eventos/$tipo.schema.json")));
        $resultado = (new Validator)->validate(json_decode((string) json_encode($documento)), $esquema);
        $this->assertTrue(
            $resultado->isValid(),
            "El evento $tipo no cumple su esquema: ".json_encode($resultado->error()?->message()),
        );
    }
}
