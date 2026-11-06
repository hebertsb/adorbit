"""Puerto a Python de conIdempotencia (ms-creatividades/src/use-cases/compartido/
idempotencia.ts), contra la tabla `claves_idempotencia` que ya existe en el esquema de
ms-ia (14 dias de vigencia por defecto). Primer caso de uso de escritura de este
servicio — por eso nace aqui en vez de en otro adaptador.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from ...domain.errores import ExcepcionDominio

T = TypeVar("T")


def calcular_huella(datos: Any) -> str:
    """Huella SHA-256 de los campos de negocio de la solicitud (nunca de la clave misma)."""
    return hashlib.sha256(json.dumps(datos, sort_keys=True, default=str).encode()).hexdigest()


async def con_idempotencia(
    *,
    conexion: Any,
    clave: str,
    datos_huella: Any,
    reconstruir_replay: Callable[[dict[str, Any]], Awaitable[T]],
    ejecutar: Callable[[], Awaitable[tuple[T, dict[str, Any]]]],
) -> T:
    """Misma clave + mismos datos => replay (reconstruye sin repetir el trabajo); misma
    clave + datos distintos => idempotencia_conflicto; clave nueva => ejecuta `ejecutar`
    y guarda el registro de idempotencia, todo dentro de la transaccion que ya trae
    abierta `conexion` (la abre el router, ver app/api/reportes.py)."""
    huella = calcular_huella(datos_huella)
    fila_existente = await conexion.fetchrow(
        "SELECT huella_solicitud, respuesta FROM claves_idempotencia WHERE clave = $1", clave
    )

    if fila_existente is not None:
        if fila_existente["huella_solicitud"] != huella:
            raise ExcepcionDominio(
                "idempotencia_conflicto", "La clave de idempotencia ya se uso con datos distintos"
            )
        datos_guardados = json.loads(fila_existente["respuesta"] or "{}")
        return await reconstruir_replay(datos_guardados)

    resultado, datos_guardados = await ejecutar()
    await conexion.execute(
        """INSERT INTO claves_idempotencia (clave, huella_solicitud, estado, respuesta)
           VALUES ($1, $2, 'COMPLETADO', $3)""",
        clave,
        huella,
        json.dumps(datos_guardados, default=str),
    )
    return resultado
