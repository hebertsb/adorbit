"""SOLO DESARROLLO LOCAL. Emisor de JWT de prueba para probar los endpoints protegidos
de ms-ia (incluido /mcp) sin tener el Keycloak real de Roly corriendo todavia.

Genera un par de llaves RSA de un solo uso, sirve su JWKS por HTTP en
http://127.0.0.1:8099/certs, firma un token con los roles pedidos y lo imprime. El
mismo codigo de verificacion de app/adapters/seguridad/verificar_jwt.py se usa tal
cual -- esto no es un bypass, es un emisor JWKS de juguete en vez del real.

Uso:
  1. En servicios/ms-ia/.env (temporalmente, mientras pruebas local):
       ADORBIT_IA_JWKS_URI=http://127.0.0.1:8099/certs
       ADORBIT_IA_EMISOR=http://127.0.0.1:8099/prueba
       ADORBIT_IA_AUDIENCIA=ms-ia
  2. python herramientas/emisor_jwt_prueba.py [rol1,rol2,...]  (default: todos los roles)
     Deja la terminal abierta -- sirve el JWKS mientras este token siga vigente (2h).
  3. Copia el "Authorization: Bearer ..." que imprime y usalo en el panel de prueba
     o en curl/Postman contra http://localhost:8085.
"""

from __future__ import annotations

import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

PUERTO = 8099
EMISOR = f"http://127.0.0.1:{PUERTO}/prueba"
AUDIENCIA = "ms-ia"
ROLES_VALIDOS = {"ejecutivo", "creativo", "cliente", "gerente"}

_llave_privada = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_kid = "dev-" + uuid4().hex[:8]
_jwk = RSAAlgorithm.to_jwk(_llave_privada.public_key(), as_dict=True)
_jwk["kid"] = _kid
_jwk["use"] = "sig"
_jwk["alg"] = "RS256"
_JWKS = {"keys": [_jwk]}


class _ManejadorJwks(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - nombre fijado por BaseHTTPRequestHandler
        import json

        cuerpo = json.dumps(_JWKS).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, formato: str, *args: object) -> None:  # silencioso
        pass


def _generar_token(roles: list[str]) -> str:
    ahora = int(time.time())
    payload = {
        "sub": str(uuid4()),
        "iss": EMISOR,
        "aud": AUDIENCIA,
        "iat": ahora,
        "exp": ahora + 2 * 60 * 60,
        "realm_access": {"roles": roles},
    }
    return jwt.encode(payload, _llave_privada, algorithm="RS256", headers={"kid": _kid})


def main() -> None:
    roles_pedidos = sys.argv[1].split(",") if len(sys.argv) > 1 else sorted(ROLES_VALIDOS)
    invalidos = set(roles_pedidos) - ROLES_VALIDOS
    if invalidos:
        print(f"Roles invalidos: {invalidos}. Validos: {ROLES_VALIDOS}")
        sys.exit(1)

    servidor = HTTPServer(("127.0.0.1", PUERTO), _ManejadorJwks)
    hilo = threading.Thread(target=servidor.serve_forever, daemon=True)
    hilo.start()

    token = _generar_token(roles_pedidos)
    print(f"JWKS sirviendo en http://127.0.0.1:{PUERTO}/certs (dejar esta terminal abierta)")
    print(f"iss esperado: {EMISOR}  |  aud: {AUDIENCIA}  |  roles: {roles_pedidos}")
    print()
    print(f"Authorization: Bearer {token}")
    print()
    print("Ctrl+C para detener.")
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        servidor.shutdown()


if __name__ == "__main__":
    main()
