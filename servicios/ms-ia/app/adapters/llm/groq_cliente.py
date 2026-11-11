"""Cliente Groq (SDK `groq`, compatible con el formato de OpenAI — verificado leyendo
groq/_client.py y groq/types/chat/* del paquete instalado: existe AsyncGroq,
chat.completions.create(tools=, tool_choice=) y message.tool_calls[i].function.
{name,arguments}). Expone las 4 herramientas del servidor MCP (ver
app/adapters/mcp/servidor.py) como tools de function-calling — son la misma frontera
auditada, nunca SQL libre.
"""

from __future__ import annotations

import os
from functools import lru_cache

from groq import AsyncGroq

from ...domain.puertos import LlamadaHerramientaLlm, RespuestaLlm

HERRAMIENTAS_MCP: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "consultar_campanas",
            "description": "Lista campanas, opcionalmente filtradas por estado, cliente o rango de fechas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "estado": {"type": "string", "description": "borrador|activa|pausada|finalizada|cancelada|..."},
                    "cliente_id": {"type": "string", "description": "UUID del cliente"},
                    "desde": {"type": "string", "description": "fecha ISO YYYY-MM-DD"},
                    "hasta": {"type": "string", "description": "fecha ISO YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "facturas_por_vencer",
            "description": "Facturas no pagadas que vencen dentro de los proximos N dias.",
            "parameters": {
                "type": "object",
                "properties": {"dias": {"type": "integer", "description": "entre 0 y 365"}},
                "required": ["dias"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "clientes_morosos",
            "description": "Clientes cuya linea de credito usada supera el limite.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resumen_gasto_campana",
            "description": "Presupuesto total y gasto actual de una campana especifica.",
            "parameters": {
                "type": "object",
                "properties": {"campana_id": {"type": "string", "description": "UUID de la campana"}},
                "required": ["campana_id"],
            },
        },
    },
]

# Herramienta de PRESENTACION (no toca datos ni pasa por MCP): el modelo elige que
# columnas del resultado mostrar y en que orden. ms-ia la valida contra las claves reales.
HERRAMIENTA_PRESENTACION: dict = {
    "type": "function",
    "function": {
        "name": "definir_presentacion",
        "description": (
            "Define que columnas del ultimo resultado se muestran en el reporte y en que orden. "
            "Usala SOLO despues de obtener datos y cuando el usuario pida ver u ocultar ciertos datos "
            "(ej. 'solo el total y la fecha', 'sin los IDs')."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "columnas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Claves exactas de columnas del resultado, en el orden deseado",
                }
            },
            "required": ["columnas"],
        },
    },
}

_PROMPT_SISTEMA = (
    "Eres el asistente de reportes de AdOrbit, una agencia de publicidad. Respondes "
    "preguntas sobre campanas, clientes y facturacion usando SOLO las herramientas "
    "disponibles -- nunca inventes datos ni cifras que no vengan de una llamada a una "
    "herramienta. Si una herramienta no trae lo necesario para responder, dilo. "
    "Si el usuario indica que datos quiere ver o no ver, despues de consultar llama a "
    "definir_presentacion con las claves exactas de las columnas a mostrar. "
    "Responde siempre en espanol, de forma breve y concreta: un resumen ejecutivo con las "
    "cifras clave y una recomendacion. NO incluyas tablas Markdown ni identificadores UUID "
    "(la tabla del reporte la arma el sistema)."
)


@lru_cache(maxsize=1)
def _cliente() -> AsyncGroq:
    api_key = os.environ.get("ADORBIT_IA_GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Falta la variable de entorno ADORBIT_IA_GROQ_API_KEY")
    return AsyncGroq(api_key=api_key)


class ClienteGroq:
    def __init__(self) -> None:
        self._modelo = os.environ.get("ADORBIT_IA_GROQ_MODELO", "openai/gpt-oss-120b")

    def mensaje_sistema(self) -> dict:
        return {"role": "system", "content": _PROMPT_SISTEMA}

    async def completar_con_herramientas(self, mensajes: list[dict]) -> RespuestaLlm:
        respuesta = await _cliente().chat.completions.create(
            model=self._modelo,
            messages=mensajes,
            tools=[*HERRAMIENTAS_MCP, HERRAMIENTA_PRESENTACION],
            tool_choice="auto",
            temperature=0.2,
        )
        mensaje = respuesta.choices[0].message
        llamadas = [
            LlamadaHerramientaLlm(id=tc.id, nombre=tc.function.name, argumentos_crudos=tc.function.arguments)
            for tc in (mensaje.tool_calls or [])
        ]
        return RespuestaLlm(contenido=mensaje.content, llamadas_herramienta=llamadas)
