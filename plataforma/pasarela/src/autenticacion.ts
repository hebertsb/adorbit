import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

const JWKS_URI = process.env.ADORBIT_PASARELA_JWKS_URI || "http://localhost:8080/realms/adorbit/protocol/openid-connect/certs";
const EMISOR = process.env.ADORBIT_PASARELA_EMISOR || "http://localhost:8080/realms/adorbit";

const clienteJwks = jwksRsa({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function obtenerLlaveFirma(header: JwtHeader, callback: SigningKeyCallback): void {
  clienteJwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, undefined);
      return;
    }
    const llave = key?.getPublicKey();
    callback(null, llave);
  });
}

export interface PeticionAutenticada extends Request {
  usuario?: JwtPayload;
}

export function middlewareAutenticacion(req: PeticionAutenticada, res: Response, next: NextFunction): void {
  // Rutas exentas de autenticación
  const ruta = req.path;
  if (
    ruta === "/salud" ||
    ruta === "/listo" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }

  const cabeceraAuth = req.headers.authorization;
  if (!cabeceraAuth || !cabeceraAuth.startsWith("Bearer ")) {
    // Si es /graphql permitimos introspección o peticiones anónimas si el modo desarrollo está activo
    if (ruta.startsWith("/graphql") && process.env.NODE_ENV !== "production") {
      next();
      return;
    }
    res.status(401).json({
      codigo: "NO_AUTORIZADO",
      mensaje: "Falta cabecera de autorizacion Bearer con token JWT",
      detalle: "Se requiere un token de acceso valido emitido por Keycloak"
    });
    return;
  }

  const token = cabeceraAuth.substring(7);

  // Verificación del JWT
  jwt.verify(
    token,
    obtenerLlaveFirma,
    {
      issuer: EMISOR,
      algorithms: ["RS256"]
    },
    (err, decodificado) => {
      if (err) {
        // En desarrollo, si falla la firma de JWKS (por ejemplo servidor local sin levantar Keycloak)
        if (process.env.NODE_ENV !== "production" && process.env.IGNORAR_ERROR_JWT === "true") {
          req.usuario = { sub: "dev-usuario", realm_access: { roles: ["ejecutivo", "gerente"] } };
          next();
          return;
        }

        res.status(401).json({
          codigo: "TOKEN_INVALIDO",
          mensaje: "El token JWT no es valido o ha expirado",
          detalle: err.message
        });
        return;
      }

      req.usuario = decodificado as JwtPayload;
      next();
    }
  );
}

