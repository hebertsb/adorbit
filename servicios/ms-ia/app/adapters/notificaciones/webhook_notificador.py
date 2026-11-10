"""Despachador asíncrono no bloqueante de alertas multicanal (WhatsApp y correo)
hacia el webhook de automatización de n8n (flujo 06-notificaciones-multicanal-whatsapp)."""

from __future__ import annotations

import logging
import os
from typing import Any
import httpx

logger = logging.getLogger("adorbit.ms_ia.notificaciones")

N8N_WEBHOOK_URL = os.getenv("ADORBIT_N8N_WEBHOOK_URL", "http://n8n:5678/webhook/notificacion-multicanal")
N8N_WEBHOOK_TOKEN = os.getenv("ADORBIT_N8N_WEBHOOK_TOKEN", "token-webhook-local")


async def notificar_evento_multicanal(
    tipo: str,
    titulo: str,
    datos: dict[str, Any] | None = None,
    destinatario_whatsapp: str | None = None,
    destinatario_email: str | None = None,
    enlace_accion: str | None = None,
) -> bool:
    """Envía la alerta a n8n con timeout corto (no bloquea el flujo principal)."""
    payload = {
        "tipo": tipo,
        "titulo": titulo,
        "destinatario_whatsapp": destinatario_whatsapp or os.getenv("ADORBIT_WHATSAPP_NUMERO_GERENCIA", "+59170000000"),
        "destinatario_email": destinatario_email or os.getenv("ADORBIT_CORREO_GERENCIA", "gerencia@adorbit.local"),
        "datos": datos or {},
        "enlace_accion": enlace_accion or os.getenv("ADORBIT_PUBLIC_URL", "http://4.151.177.116").rstrip("/"),
    }
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Token": N8N_WEBHOOK_TOKEN,
    }
    try:
        async with httpx.AsyncClient(timeout=3.0) as cliente:
            respuesta = await cliente.post(N8N_WEBHOOK_URL, json=payload, headers=headers)
            if respuesta.status_code == 200:
                logger.info("Notificación multicanal entregada con éxito a n8n: %s", titulo)
                return True
            logger.warning("n8n respondió con estado %d al despachar alerta: %s", respuesta.status_code, respuesta.text)
            return False
    except Exception as error:
        # Fallo silencioso con advertencia: la notificación nunca debe tumbar la operación de negocio
        logger.warning("No se pudo contactar al webhook de n8n para alerta multicanal: %s", error)
        return False
