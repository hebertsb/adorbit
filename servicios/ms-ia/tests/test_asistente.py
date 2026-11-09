from __future__ import annotations

import pytest
from app.api.asistente import (
    SolicitudGenerarBrief,
    _generar_heuristico,
)


def test_generador_heuristico_crea_brief_completo_tono_inspirador() -> None:
    solicitud = SolicitudGenerarBrief(
        concepto="Bebida isotónica natural para deportistas urbanos",
        tono="Inspirador",
        publico_objetivo="Deportistas de 20 a 35 años",
        canales=["Vallas LED", "Instagram Stories"],
        objetivo="Posicionamiento y recordación",
        cliente_o_marca="BioSport",
    )
    resultado = _generar_heuristico(solicitud)

    assert "BioSport" in resultado.llamada_a_la_accion or "BioSport" in resultado.descripcion
    assert resultado.tono_aplicado == "Inspirador"
    assert len(resultado.canales_sugeridos) == 2
    assert len(resultado.piezas_sugeridas) >= 3
    assert "🎯 OBJETIVO ESTRATÉGICO:" in resultado.descripcion
    assert "🚀 LLAMADA A LA ACCIÓN (CTA):" in resultado.descripcion
    assert resultado.origen == "heuristico_local"


def test_generador_heuristico_tonos_diversos() -> None:
    tonos = ["Disruptivo", "Corporativo", "Juvenil", "Promocional"]
    for tono in tonos:
        solicitud = SolicitudGenerarBrief(
            concepto=f"Lanzamiento de servicio fintech para pymes en tono {tono}",
            tono=tono,
        )
        res = _generar_heuristico(solicitud)
        assert res.tono_aplicado == tono
        assert len(res.titulo) > 5
        assert len(res.piezas_sugeridas) > 0
        assert res.llamada_a_la_accion
