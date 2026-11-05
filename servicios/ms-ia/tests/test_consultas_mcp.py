"""Prueba de intento de inyeccion (README ms-ia tarea 3, pregunta abierta #3 del
proyecto) — ver la decision registrada en documentacion/05-decisiones-y-pendientes.md:
se interpreta como un test automatizado que demuestra que un parametro malicioso (a)
nunca llega a tocar la vista (y por lo tanto nunca llega a SQL real), y (b) queda
auditado como bloqueado igual."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from app.domain.errores import ExcepcionDominio
from app.use_cases.consultas_mcp import ConsultasMcp
from app.use_cases.mcp_herramientas import EjecutorHerramientaMcp


class VistaMcpFalsa:
    def __init__(self) -> None:
        self.llamadas: list[str] = []

    async def consultar_campanas(self, estado: Any, cliente_id: Any, desde: Any, hasta: Any) -> list[dict[str, Any]]:
        self.llamadas.append("consultar_campanas")
        return [{"campana_id": str(cliente_id)}]

    async def facturas_por_vencer(self, dias: int) -> list[dict[str, Any]]:
        self.llamadas.append("facturas_por_vencer")
        return []

    async def clientes_morosos(self) -> list[dict[str, Any]]:
        self.llamadas.append("clientes_morosos")
        return []

    async def resumen_gasto_campana(self, campana_id: Any) -> dict[str, Any]:
        self.llamadas.append("resumen_gasto_campana")
        return {"campana_id": str(campana_id)}


class AuditoriaMcpFalsa:
    def __init__(self) -> None:
        self.registros: list[dict[str, Any]] = []

    async def registrar(self, **kwargs: Any) -> None:
        self.registros.append(kwargs)

    async def listar(self, pagina: int, tamano: int) -> list[dict[str, Any]]:
        return self.registros


@pytest.fixture
def entorno() -> tuple[ConsultasMcp, VistaMcpFalsa, AuditoriaMcpFalsa]:
    vista = VistaMcpFalsa()
    auditoria = AuditoriaMcpFalsa()
    consultas = ConsultasMcp(vista, EjecutorHerramientaMcp(auditoria))
    return consultas, vista, auditoria


async def test_consultar_campanas_con_datos_validos_llega_a_la_vista_y_audita_exito(
    entorno: tuple[ConsultasMcp, VistaMcpFalsa, AuditoriaMcpFalsa],
) -> None:
    consultas, vista, auditoria = entorno

    await consultas.consultar_campanas(
        estado="activa", cliente_id=str(uuid4()), desde=None, hasta=None, usuario_id=None, agente_id=None
    )

    assert vista.llamadas == ["consultar_campanas"]
    assert len(auditoria.registros) == 1
    assert auditoria.registros[0]["exito"] is True
    assert auditoria.registros[0]["bloqueado"] is False


@pytest.mark.parametrize(
    "cliente_id_malicioso",
    [
        "'; DROP TABLE reporte_clientes; --",
        "1 OR 1=1",
        "<script>alert(1)</script>",
    ],
)
async def test_intento_de_inyeccion_en_cliente_id_queda_bloqueado_y_nunca_toca_la_vista(
    entorno: tuple[ConsultasMcp, VistaMcpFalsa, AuditoriaMcpFalsa], cliente_id_malicioso: str
) -> None:
    consultas, vista, auditoria = entorno

    with pytest.raises(ExcepcionDominio) as info:
        await consultas.consultar_campanas(
            estado="activa",
            cliente_id=cliente_id_malicioso,
            desde=None,
            hasta=None,
            usuario_id=None,
            agente_id=None,
        )

    assert info.value.codigo == "parametro_invalido"
    # Lo mas importante: la vista (y por lo tanto la BD real) nunca se llega a llamar.
    assert vista.llamadas == []
    # Y el intento SI queda auditado como bloqueado, con el motivo.
    assert len(auditoria.registros) == 1
    assert auditoria.registros[0]["bloqueado"] is True
    assert auditoria.registros[0]["motivo_bloqueo"] == "parametro_invalido"
    assert auditoria.registros[0]["exito"] is False


async def test_estado_fuera_del_enum_queda_bloqueado(
    entorno: tuple[ConsultasMcp, VistaMcpFalsa, AuditoriaMcpFalsa],
) -> None:
    consultas, vista, auditoria = entorno

    with pytest.raises(ExcepcionDominio):
        await consultas.consultar_campanas(
            estado="'; DROP TABLE reporte_campanas; --",
            cliente_id=None,
            desde=None,
            hasta=None,
            usuario_id=None,
            agente_id=None,
        )

    assert vista.llamadas == []
    assert auditoria.registros[0]["bloqueado"] is True


async def test_dias_fuera_de_rango_queda_bloqueado(
    entorno: tuple[ConsultasMcp, VistaMcpFalsa, AuditoriaMcpFalsa],
) -> None:
    consultas, vista, auditoria = entorno

    with pytest.raises(ExcepcionDominio):
        await consultas.facturas_por_vencer(dias=99999, usuario_id=None, agente_id=None)

    assert vista.llamadas == []
    assert auditoria.registros[0]["bloqueado"] is True
