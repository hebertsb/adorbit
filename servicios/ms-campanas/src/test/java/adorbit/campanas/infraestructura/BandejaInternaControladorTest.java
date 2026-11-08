package adorbit.campanas.infraestructura;

import adorbit.campanas.aplicacion.dto.MetadatosBandejaDto;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import adorbit.campanas.infraestructura.api.BandejaInternaControlador;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BandejaInternaControladorTest {
    @Test
    void continuaEnEmpateDeSecuenciaYValidaCursor() {
        BandejaSalidaRepositorio repositorio = mock(BandejaSalidaRepositorio.class);
        var pagina = PageRequest.of(0, 1);
        var id1 = UUID.fromString("00000000-0000-0000-0000-000000000001");
        var id2 = UUID.fromString("00000000-0000-0000-0000-000000000002");
        var primero = new MetadatosBandejaDto(id1, 42L, "campana", UUID.randomUUID(), "evento", OffsetDateTime.now());
        var segundo = new MetadatosBandejaDto(id2, 42L, "campana", UUID.randomUUID(), "evento", OffsetDateTime.now());
        when(repositorio.consultarMetadatosPendientes(Long.MIN_VALUE, new UUID(0, 0), pagina))
                .thenReturn(new SliceImpl<>(List.of(primero), pagina, true));
        when(repositorio.consultarMetadatosPendientes(42L, id1, pagina))
                .thenReturn(new SliceImpl<>(List.of(segundo), pagina, false));
        BandejaInternaControlador controlador = new BandejaInternaControlador(repositorio);
        var primera = controlador.consultar(Map.of("size", "1"));
        assertTrue(primera.hayMas());
        assertEquals(42L, primera.siguienteCursor().secuencia());
        assertEquals(id1, primera.siguienteCursor().id());
        var siguiente = controlador.consultar(Map.of("size", "1", "despues_de_secuencia", "42", "despues_de_id", id1.toString()));
        assertEquals(id2, siguiente.contenido().get(0).id());
        assertFalse(siguiente.hayMas());
        assertNull(siguiente.siguienteCursor());
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("size", "101")));
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("despues_de_secuencia", "42")));
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("despues_de_id", id1.toString())));
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("despues_de_secuencia", "42", "despues_de_id", "invalido")));
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("despues_de_secuencia", "0", "despues_de_id", id1.toString())));
        assertThrows(IllegalArgumentException.class, () -> controlador.consultar(Map.of("page", "1")));
        verify(repositorio).consultarMetadatosPendientes(42L, id1, pagina);
    }
}
