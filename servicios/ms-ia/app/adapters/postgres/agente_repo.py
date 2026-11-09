from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from ...domain.agente import Agente, EjecucionAgente
from .conexion import obtener_pool_principal


def _fila_a_agente(fila: Any) -> Agente:
    datos = dict(fila)
    datos["habilidades"] = json.loads(datos["habilidades"])
    return Agente(**datos)


class AgenteRepositorioPg:
    async def buscar(self, id_agente: UUID) -> Agente | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow(
            "SELECT id, nombre, mision, habilidades, disparador, activo, creado_en FROM agentes WHERE id = $1",
            id_agente,
        )
        return _fila_a_agente(fila) if fila else None

    async def listar(self) -> list[Agente]:
        pool = await obtener_pool_principal()
        filas = await pool.fetch(
            "SELECT id, nombre, mision, habilidades, disparador, activo, creado_en "
            "FROM agentes ORDER BY nombre"
        )
        return [_fila_a_agente(f) for f in filas]


class EjecucionAgenteRepositorioPg:
    async def crear(self, ejecucion: EjecucionAgente, conexion: Any) -> None:
        started_at = await conexion.fetchval(
            """
            INSERT INTO ejecuciones_agente (id, agente_id, disparador, estado, entrada)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING started_at
            """,
            ejecucion.id,
            ejecucion.agente_id,
            ejecucion.disparador,
            ejecucion.estado,
            json.dumps(ejecucion.entrada, default=str) if ejecucion.entrada is not None else None,
        )
        ejecucion.started_at = started_at

    async def finalizar(
        self, id_ejecucion: UUID, *, estado: str, salida: dict[str, Any] | None, error: str | None, conexion: Any
    ) -> None:
        await conexion.execute(
            """
            UPDATE ejecuciones_agente
            SET estado = $2, salida = $3, error = $4, finished_at = now()
            WHERE id = $1
            """,
            id_ejecucion,
            estado,
            json.dumps(salida, default=str) if salida is not None else None,
            error,
        )

    async def buscar(self, id_ejecucion: UUID) -> EjecucionAgente | None:
        pool = await obtener_pool_principal()
        fila = await pool.fetchrow("SELECT * FROM ejecuciones_agente WHERE id = $1", id_ejecucion)
        if fila is None:
            return None
        datos = dict(fila)
        datos["entrada"] = json.loads(datos["entrada"]) if datos["entrada"] is not None else None
        datos["salida"] = json.loads(datos["salida"]) if datos["salida"] is not None else None
        return EjecucionAgente(**datos)

    async def listar_recientes(self, limite: int = 20, id_agente: UUID | None = None) -> list[EjecucionAgente]:
        pool = await obtener_pool_principal()
        if id_agente:
            filas = await pool.fetch(
                "SELECT * FROM ejecuciones_agente WHERE agente_id = $1 ORDER BY started_at DESC LIMIT $2",
                id_agente,
                limite,
            )
        else:
            filas = await pool.fetch(
                "SELECT * FROM ejecuciones_agente ORDER BY started_at DESC LIMIT $1",
                limite,
            )
        salida = []
        for fila in filas:
            datos = dict(fila)
            datos["entrada"] = json.loads(datos["entrada"]) if datos["entrada"] is not None else None
            datos["salida"] = json.loads(datos["salida"]) if datos["salida"] is not None else None
            salida.append(EjecucionAgente(**datos))
        return salida
