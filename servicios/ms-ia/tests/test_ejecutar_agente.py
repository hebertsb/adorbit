from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.domain.agente import Agente, EjecucionAgente
from app.domain.vision_resultado import VisionResultado
from app.use_cases.consultas_mcp import ConsultasMcp
from app.use_cases.ejecutar_agente import EjecutarAgente
from app.use_cases.mcp_herramientas import EjecutorHerramientaMcp


class AgenteRepoFalsa:
    def __init__(self, agentes: list[Agente]) -> None:
        self._agentes = {a.id: a for a in agentes}

    async def buscar(self, id_agente: UUID) -> Agente | None:
        return self._agentes.get(id_agente)

    async def listar(self) -> list[Agente]:
        return list(self._agentes.values())


class EjecucionRepoFalsa:
    def __init__(self) -> None:
        self.items: dict[UUID, EjecucionAgente] = {}

    async def crear(self, ejecucion: EjecucionAgente, conexion: Any) -> None:
        self.items[ejecucion.id] = ejecucion

    async def finalizar(
        self, id_ejecucion: UUID, *, estado: str, salida: dict[str, Any] | None, error: str | None, conexion: Any
    ) -> None:
        item = self.items[id_ejecucion]
        item.estado = estado
        item.salida = salida
        item.error = error

    async def buscar(self, id_ejecucion: UUID) -> EjecucionAgente | None:
        return self.items.get(id_ejecucion)


class OutboxFalsa:
    def __init__(self) -> None:
        self.eventos: list[dict[str, Any]] = []

    async def publicar(self, *, conexion: Any, tipo_agregado: str, agregado_id: UUID, tipo_evento: str, carga: dict[str, Any]) -> None:
        self.eventos.append({"tipo_evento": tipo_evento, "carga": carga})


class AuditoriaFalsa:
    async def registrar(self, **kwargs: Any) -> None:
        return None

    async def listar(self, pagina: int, tamano: int) -> list[dict[str, Any]]:
        return []


class VistaMcpFalsa:
    async def consultar_campanas(self, estado, cliente_id, desde, hasta):
        return [
            {
                "campana_id": UUID("00000000-0000-0000-0000-00000000c001"),
                "cliente_id": UUID("00000000-0000-0000-0000-000000000001"),
                "nombre": "Campaña Activa",
                "estado": "activa",
                "presupuesto_total": Decimal("1000.00"),
                "gasto_actual": Decimal("950.00"),
            }
        ]

    async def facturas_por_vencer(self, dias: int):
        return [
            {
                "factura_id": UUID("00000000-0000-0000-0000-00000000f001"),
                "cliente_id": UUID("00000000-0000-0000-0000-000000000001"),
                "estado": "EMITIDA",
                "total": Decimal("500.00"),
                "moneda": "BOB",
                "dias_vencida": 3,
            }
        ]

    async def clientes_morosos(self):
        return [{"cliente_id": UUID("00000000-0000-0000-0000-000000000010"), "nombre": "Moroso SA"}]

    async def resumen_gasto_campana(self, campana_id: UUID):
        return None

    async def buscar_cliente(self, cliente_id: UUID):
        return None


class VisionRepoFalsa:
    async def buscar_por_huella(self, pieza_id: UUID, huella_imagen: str, modelo_id: UUID):
        return None

    async def crear(self, resultado: VisionResultado) -> None:
        return None

    async def listar_recientes(self, limite: int = 20) -> list[VisionResultado]:
        return [
            VisionResultado(
                id=uuid4(),
                pieza_id=uuid4(),
                campana_id=uuid4(),
                modelo_id=uuid4(),
                huella_imagen="abc",
                origen="servidor",
                detecta_logo=True,
                detecta_texto=True,
                manual_marca_ok=True,
                confianza=0.95,
                objetos_detectados=["logo_adorbit"],
                salida_cruda={},
                duracion_ms=100,
                creado_en=datetime.now(timezone.utc),
            )
        ]


@pytest.mark.parametrize(
    "nombre_agente,campo_esperado",
    [
        ("monitor_campanas", "campanas_revisadas"),
        ("cobranza", "total_vencidas"),
        ("agente_vision", "piezas_auditadas"),
        ("consultor_ejecutivo_nl", "campanas_totales"),
    ],
)
async def test_ejecutar_los_cuatro_agentes(
    nombre_agente: str, campo_esperado: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    agente = Agente(id=uuid4(), nombre=nombre_agente, mision="test", habilidades=[], activo=True)
    consultas = ConsultasMcp(VistaMcpFalsa(), EjecutorHerramientaMcp(AuditoriaFalsa()))
    caso = EjecutarAgente(
        AgenteRepoFalsa([agente]),
        EjecucionRepoFalsa(),
        consultas,
        OutboxFalsa(),
        VisionRepoFalsa(),
    )

    async def _sin_idempotencia(*, conexion, clave, datos_huella, reconstruir_replay, ejecutar):
        res, _ = await ejecutar()
        return res

    monkeypatch.setattr("app.use_cases.ejecutar_agente.con_idempotencia", _sin_idempotencia)

    ejecucion = await caso.ejecutar(
        id_agente=agente.id,
        disparador="manual_portal",
        usuario_id=None,
        clave_idempotencia="k1",
        conexion=None,
    )
    assert ejecucion.estado == "exitosa"
    assert ejecucion.salida is not None
    assert campo_esperado in ejecucion.salida
    assert "resumen_texto" in ejecucion.salida
