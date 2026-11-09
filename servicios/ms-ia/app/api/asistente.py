"""API del Asistente Creativo de AdOrbit (Copilot de Briefs con IA).
Permite a creativos, ejecutivos, gerentes y clientes formular propuestas completas
de briefs publicitarios a partir de requerimientos o conceptos iniciales.
Soporta integración con Groq LLM (Llama-3 / GPT-OSS) cuando se cuenta con clave API,
con degradación suave a un motor generativo heurístico de alta fidelidad si la API
está ausente o fuera de línea.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Annotated, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..adapters.seguridad.verificar_jwt import IdentidadAutenticada, exigir_rol, verificar_jwt

logger = logging.getLogger("ms_ia.asistente")

router = APIRouter(prefix="/api/v1/asistente", tags=["asistente"])

_ROLES_ASISTENTE = {"creativo", "ejecutivo", "gerente", "cliente"}


class SolicitudGenerarBrief(BaseModel):
    concepto: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Idea central, producto o necesidad de la campaña publicitaria",
    )
    tono: str = Field(
        default="Inspirador",
        description="Inspirador | Disruptivo | Corporativo | Juvenil | Promocional",
    )
    publico_objetivo: str | None = Field(
        default=None,
        description="Público meta o segmento demográfico previsto",
    )
    canales: list[str] = Field(
        default_factory=list,
        description="Canales o formatos previstos (ej. Vallas, Digital, TV, Redes)",
    )
    objetivo: str | None = Field(
        default=None,
        description="Objetivo de marketing (ej. Brand Awareness, Conversión, Lanzamiento)",
    )
    cliente_o_marca: str | None = Field(
        default=None,
        description="Nombre de la marca o cliente anunciante",
    )


class PiezaSugerida(BaseModel):
    nombre: str
    formato: str  # imagen | video | copy | audio
    dimensiones: str | None = None


class PropuestaBriefRespuesta(BaseModel):
    titulo: str
    descripcion: str
    tono_aplicado: str
    canales_sugeridos: list[str]
    piezas_sugeridas: list[PiezaSugerida]
    llamada_a_la_accion: str
    origen: str  # groq_llm | heuristico_local


def _generar_heuristico(solicitud: SolicitudGenerarBrief) -> PropuestaBriefRespuesta:
    """Generador sintético inteligente de alta fidelidad para operar sin dependencias externas."""
    concepto = solicitud.concepto.strip()
    tono = solicitud.tono.strip().capitalize() if solicitud.tono else "Inspirador"
    marca = solicitud.cliente_o_marca.strip() if solicitud.cliente_o_marca else "AdOrbit"
    publico = (
        solicitud.publico_objetivo.strip()
        if solicitud.publico_objetivo
        else "Audiencia moderna, conectada y sensible a mensajes de valor"
    )
    objetivo = (
        solicitud.objetivo.strip()
        if solicitud.objetivo
        else "Generar alto impacto visual y recordación de marca superior al 70%"
    )

    # Variaciones según el tono
    if tono == "Disruptivo":
        titulo = f"Campaña Disruptiva: {concepto[:45].rstrip('.')} // Nueva Era"
        estilo = "Estética audaz de alto contraste, cortes visuales rápidos, paleta neón con fondos oscuros y tipografía monumental."
        cta = f"Rompe el estándar. Descubre {marca}."
        enfoque = "Cuestionar el status quo del mercado mediante mensajes provocadores y piezas dinámicas que generen conversación social."
    elif tono == "Corporativo":
        titulo = f"Alianza Estratégica: {concepto[:50].rstrip('.')}"
        estilo = "Líneas depuradas, fotografía documental de alta precisión, balance cromático en azules profundos, grafito y blanco puro."
        cta = f"Confianza, solidez y liderazgo junto a {marca}."
        enfoque = "Proyectar solidez institucional, excelencia operativa y retorno de inversión comprobable a tomadores de decisión."
    elif tono == "Juvenil":
        titulo = f"Vibra & Conecta: {concepto[:45].rstrip('.')}"
        estilo = "Lenguaje visual dinámico, formato vertical nativo (9:16), micro-interacciones, colores vibrantes y transiciones fluidas."
        cta = f"Únete a la movida. Súmate a {marca}."
        enfoque = "Conectar emocionalmente con audiencias nativas digitales a través de autenticidad, tendencias y dinamismo."
    elif tono == "Promocional":
        titulo = f"Gran Lanzamiento Exclusivo: {concepto[:45].rstrip('.')}"
        estilo = "Jerarquía de impacto con lectura instantánea, acentos en rojo/ámbar para sentido de oportunidad y legibilidad OOH."
        cta = f"Aprovecha esta oportunidad hoy mismo en {marca}."
        enfoque = "Maximizar la tasa de respuesta inmediata y la conversión mediante incentivos claros y presencia omnicanal."
    else:  # Inspirador por defecto
        titulo = f"Impulso Creativo: {concepto[:48].rstrip('.')}"
        estilo = "Iluminación cinematográfica natural, atmósfera humana y aspiracional, composición armónica y tipografía elegante."
        cta = f"Despierta tu potencial con {marca}."
        enfoque = "Inspirar a la audiencia a superar límites y asociar la marca con superación, calidad de vida y trascendencia."

    canales_base = (
        solicitud.canales
        if solicitud.canales
        else ["Vallas Digitales LED (OOH)", "Redes Sociales (Stories / Reels)", "Publicidad en Tránsito", "Display Programático"]
    )

    descripcion_detallada = (
        f"🎯 OBJETIVO ESTRATÉGICO:\n"
        f"{objetivo}.\n\n"
        f"👥 PÚBLICO OBJETIVO Y DEMOGRAFÍA:\n"
        f"{publico}.\n\n"
        f"💡 CONCEPTO CREATIVO & BIG IDEA:\n"
        f"{concepto}.\n"
        f"{enfoque}\n\n"
        f"🎨 DIRECCIÓN DE ARTE Y TONO:\n"
        f"Tono {tono}. {estilo}\n\n"
        f"📢 ECOSISTEMA DE MEDIOS RECOMENDADO:\n"
        + "\n".join(f"- {canal}" for canal in canales_base)
        + f"\n\n🚀 LLAMADA A LA ACCIÓN (CTA):\n"
        f"«{cta}»"
    )

    piezas = [
        PiezaSugerida(
            nombre=f"Valla Panorámica LED - {concepto[:30]}",
            formato="imagen",
            dimensiones="1920x720",
        ),
        PiezaSugerida(
            nombre=f"Spot Audiovisual Dinámico 15s",
            formato="video",
            dimensiones="1080x1920",
        ),
        PiezaSugerida(
            nombre=f"Banner Display Interactivo MPU",
            formato="imagen",
            dimensiones="300x250",
        ),
        PiezaSugerida(
            nombre=f"Copywriting Maestro para Pauta Digital",
            formato="copy",
            dimensiones=None,
        ),
    ]

    return PropuestaBriefRespuesta(
        titulo=titulo,
        descripcion=descripcion_detallada,
        tono_aplicado=tono,
        canales_sugeridos=canales_base,
        piezas_sugeridas=piezas,
        llamada_a_la_accion=cta,
        origen="heuristico_local",
    )


async def _generar_con_groq(solicitud: SolicitudGenerarBrief) -> PropuestaBriefRespuesta | None:
    """Intenta generar la propuesta usando el LLM de Groq si hay credencial configurada."""
    api_key = os.environ.get("ADORBIT_IA_GROQ_API_KEY")
    if not api_key:
        return None

    try:
        from groq import AsyncGroq

        modelo = os.environ.get("ADORBIT_IA_GROQ_MODELO", "llama-3.3-70b-versatile")
        cliente = AsyncGroq(api_key=api_key)

        prompt_sistema = (
            "Eres el Director Creativo Ejecutivo y Estratega Principal de AdOrbit, agencia de publicidad líder. "
            "Tu misión es elaborar un brief creativo publicitario de nivel profesional a partir de los datos que provea el usuario. "
            "Debes responder EXCLUSIVAMENTE con un objeto JSON válido con los siguientes campos:\n"
            "- 'titulo': string (título atractivo, máximo 120 caracteres)\n"
            "- 'descripcion': string (brief estructurado completo con Objetivo, Público, Big Idea, Dirección de Arte y Medios)\n"
            "- 'tono_aplicado': string\n"
            "- 'canales_sugeridos': array de strings\n"
            "- 'piezas_sugeridas': array de objetos con {'nombre': str, 'formato': 'imagen'|'video'|'copy'|'audio', 'dimensiones': str o null}\n"
            "- 'llamada_a_la_accion': string (slogan o CTA central)"
        )

        mensaje_usuario = (
            f"Concepto base: {solicitud.concepto}\n"
            f"Tono deseado: {solicitud.tono}\n"
            f"Público objetivo: {solicitud.publico_objetivo or 'A definir según la categoría'}\n"
            f"Canales contemplados: {', '.join(solicitud.canales) if solicitud.canales else 'Omnicanal'}\n"
            f"Objetivo de negocio: {solicitud.objetivo or 'Posicionamiento y ventas'}\n"
            f"Marca o cliente: {solicitud.cliente_o_marca or 'Cliente AdOrbit'}"
        )

        respuesta = await cliente.chat.completions.create(
            model=modelo,
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": mensaje_usuario},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )

        contenido = respuesta.choices[0].message.content
        if not contenido:
            return None

        datos = json.loads(contenido)
        piezas = [
            PiezaSugerida(
                nombre=p.get("nombre", "Pieza publicitaria"),
                formato=p.get("formato", "imagen"),
                dimensiones=p.get("dimensiones"),
            )
            for p in datos.get("piezas_sugeridas", [])
        ]

        return PropuestaBriefRespuesta(
            titulo=str(datos.get("titulo", f"Brief: {solicitud.concepto[:40]}")),
            descripcion=str(datos.get("descripcion", solicitud.concepto)),
            tono_aplicado=str(datos.get("tono_aplicado", solicitud.tono)),
            canales_sugeridos=list(datos.get("canales_sugeridos", solicitud.canales or ["Digital", "OOH"])),
            piezas_sugeridas=piezas if piezas else _generar_heuristico(solicitud).piezas_sugeridas,
            llamada_a_la_accion=str(datos.get("llamada_a_la_accion", "Conecta con tu público")),
            origen="groq_llm",
        )
    except Exception as exc:
        logger.warning("Fallo en generación con Groq LLM, usando generador heurístico: %s", exc)
        return None


@router.post("/generar-brief", response_model=PropuestaBriefRespuesta)
async def generar_brief(
    solicitud: SolicitudGenerarBrief,
    identidad: Annotated[IdentidadAutenticada, Depends(verificar_jwt)],
) -> PropuestaBriefRespuesta:
    """Genera una propuesta estructurada de brief creativo con IA.
    Accesible para creativos, ejecutivos, gerentes y clientes.
    """
    exigir_rol(identidad, _ROLES_ASISTENTE)

    # 1. Intentar con LLM de Groq si está configurado
    resultado = await _generar_con_groq(solicitud)
    if resultado is not None:
        return resultado

    # 2. Fallback garantizado a generador heurístico de alta precisión
    return _generar_heuristico(solicitud)
