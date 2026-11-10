import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

const EMISOR_DEFAULT = process.env.EMISOR_JWT || "http://100.99.124.109:8180/realms/adorbit";
const EMISOR = process.env.ADORBIT_PASARELA_EMISOR || process.env.EMISOR_JWT || EMISOR_DEFAULT;
const JWKS_URI =
  process.env.ADORBIT_PASARELA_JWKS_URI ||
  process.env.JWKS_URI ||
  `${EMISOR.replace(/\/+$/, "")}/protocol/openid-connect/certs`;

const clienteJwks = jwksRsa({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 600000,
  rateLimit: true,
  jwksRequestsPerMinute: 60
});

function obtenerLlaveFirma(header: JwtHeader, callback: SigningKeyCallback): void {
  clienteJwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.warn(`[Pasarela Auth] Error obteniendo clave JWKS para kid ${header.kid} desde ${JWKS_URI}:`, err.message);
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
    ruta === "/api/v1/simulador-whatsapp" ||
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

