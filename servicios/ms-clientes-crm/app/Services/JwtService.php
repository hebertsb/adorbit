<?php

declare(strict_types=1);

namespace App\Services;

use App\Excepciones\ErrorNegocio;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Valida el JWT de Keycloak: firma (JWKS), expiracion, emisor y audiencia. */
class JwtService
{
    /** @return array<string, mixed> */
    public function verificar(string $token): array
    {
        $config = config('crm.seguridad');
        JWT::$leeway = (int) $config['holgura_segundos'];

        try {
            $claims = (array) JWT::decode($token, JWK::parseKeySet($this->jwks(), 'RS256'));
        } catch (Throwable) {
            throw new ErrorNegocio('no_autenticado', 'Token invalido o vencido', 401);
        }

        if (($claims['iss'] ?? null) !== $config['emisor']) {
            throw new ErrorNegocio('no_autenticado', 'Emisor del token no permitido', 401);
        }
        $audiencia = (array) ($claims['aud'] ?? []);
        if (! in_array($config['audiencia'], $audiencia, true)) {
            throw new ErrorNegocio('no_autenticado', 'Audiencia del token no permitida', 401);
        }

        return $claims;
    }

    /** @param  array<string, mixed>  $claims
     * @return list<string> */
    public function roles(array $claims): array
    {
        $acceso = (array) ($claims['realm_access'] ?? []);

        return array_values(array_map('strval', (array) ($acceso['roles'] ?? [])));
    }

    /** @return array<string, mixed> */
    private function jwks(): array
    {
        $config = config('crm.seguridad');

        return Cache::remember(
            'crm.jwks',
            (int) $config['cache_jwks_segundos'],
            fn () => Http::timeout(5)->get((string) $config['jwks_uri'])->throw()->json(),
        );
    }
}
