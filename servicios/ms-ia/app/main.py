"""Entrypoint: FastAPI (API + servidor MCP montado) + consumidor de RabbitMQ, todo en
un solo proceso — mismo patron de "un contenedor por servicio" que server.ts en
ms-creatividades. Si RabbitMQ no esta disponible (ej. dev local sin Docker), el HTTP
sigue funcionando igual; solo se pierde el consumo de eventos.
"""

from __future__ import annotations

import contextlib
import logging
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .adapters.mcp.servidor import crear_app_mcp, servidor_mcp
from .adapters.postgres.conexion import cerrar_pools
from .adapters.postgres.eventos_procesados_repo import EventosProcesadosRepositorioPg
from .adapters.postgres.reporte_repos import (
    ReporteCampanaRepositorioPg,
    ReporteClienteRepositorioPg,
    ReporteFacturacionRepositorioPg,
)
from .adapters.rabbitmq.consumidor import ConsumidorEventos
from .adapters.rabbitmq.relevo_bandeja_salida import RelevoBandejaSalida
from .api import agentes, listo, mcp_auditoria, ml, reportes, salud, vision
from .api.manejador_errores import registrar_manejadores_error
from .use_cases.procesar_evento import ProcesarEvento

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ms_ia")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with contextlib.AsyncExitStack() as pila:
        # El Starlette que devuelve streamable_http_app() trae su propio lifespan
        # (arranca el session_manager), pero al montarlo con app.mount() ese lifespan
        # NO se dispara solo — hay que entrarlo a mano aqui (patron documentado del SDK).
        await pila.enter_async_context(servidor_mcp.session_manager.run())

        procesar_evento = ProcesarEvento(
            EventosProcesadosRepositorioPg(),
            ReporteCampanaRepositorioPg(),
            ReporteClienteRepositorioPg(),
            ReporteFacturacionRepositorioPg(),
        )
        consumidor = ConsumidorEventos(procesar_evento)
        try:
            await consumidor.iniciar()
        except Exception:
            logger.exception("No se pudo iniciar el consumidor de RabbitMQ (RabbitMQ no disponible?)")

        relevo = RelevoBandejaSalida()
        try:
            await relevo.iniciar()
        except Exception:
            logger.exception("No se pudo iniciar el relevo de bandeja_salida_eventos (RabbitMQ no disponible?)")

        yield

        await relevo.detener()
        await consumidor.detener()
        await cerrar_pools()


app = FastAPI(title="ms-ia", lifespan=lifespan)
# panel-inteligencia (React, localhost:4174) llama /api/v1/reportes directo desde el
# navegador, sin pasar por la pasarela -- sin esto el navegador bloquea la respuesta
# por CORS (visto en vivo: "No 'Access-Control-Allow-Origin' header is present").
# allow_origin_regex cubre cualquier frontend local (puerto variable) sin listar cada
# uno a mano; no hay cookies de sesion (solo Bearer), asi que no hace falta credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)
registrar_manejadores_error(app)
app.include_router(salud.router)
app.include_router(listo.router)
app.include_router(mcp_auditoria.router)
app.include_router(reportes.router)
app.include_router(agentes.router)
app.include_router(ml.router)
app.include_router(vision.router)
# FastMCP ya expone su propia ruta en /mcp (streamable_http_path), por eso se monta en
# la raiz y no en /mcp — montarlo ahi duplicaria el prefijo (/mcp/mcp). Va al final para
# que las rutas especificas de arriba se resuelvan primero.
app.mount("/", crear_app_mcp())
