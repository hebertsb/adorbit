package adorbit.campanas.infraestructura.api;

import adorbit.campanas.aplicacion.dto.MetadatosBandejaDto;
import adorbit.campanas.dominio.repositorio.BandejaSalidaRepositorio;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/interno/bandeja-salida")
public class BandejaInternaControlador {
    private final BandejaSalidaRepositorio repositorio;

    public BandejaInternaControlador(BandejaSalidaRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    /** Consulta una pagina acotada de metadatos pendientes. */
    @GetMapping("/pendientes")
    public Respuesta consultar(@RequestParam Map<String, String> parametros) {
        if (!Set.of("despues_de_secuencia", "despues_de_id", "size").containsAll(parametros.keySet())) {
            throw new IllegalArgumentException("Parametro desconocido");
        }
        if (parametros.containsKey("despues_de_secuencia") != parametros.containsKey("despues_de_id")) {
            throw new IllegalArgumentException("Cursor incompleto");
        }
        Long cursor;
        UUID id;
        int size;
        try {
            cursor = parametros.containsKey("despues_de_secuencia")
                    ? Long.valueOf(parametros.get("despues_de_secuencia")) : null;
            String idTexto = parametros.get("despues_de_id");
            id = idTexto == null ? new UUID(0, 0) : UUID.fromString(idTexto);
            if (idTexto != null && !id.toString().equalsIgnoreCase(idTexto)) {
                throw new IllegalArgumentException("UUID invalido");
            }
            size = Integer.parseInt(parametros.getOrDefault("size", "20"));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Paginacion invalida");
        }
        if ((cursor != null && cursor < 1) || size < 1 || size > 100) {
            throw new IllegalArgumentException("Paginacion fuera de rango");
        }
        Slice<MetadatosBandejaDto> resultado = repositorio.consultarMetadatosPendientes(cursor == null ? Long.MIN_VALUE : cursor, id, PageRequest.of(0, size));
        List<MetadatosBandejaDto> contenido = resultado.getContent();
        MetadatosBandejaDto ultimo = resultado.hasNext() ? contenido.get(contenido.size() - 1) : null;
        Cursor siguiente = ultimo == null ? null : new Cursor(ultimo.secuencia(), ultimo.id());
        return new Respuesta(contenido, size, resultado.hasNext(), siguiente);
    }

    public record Cursor(Long secuencia, UUID id) { }
    public record Respuesta(List<MetadatosBandejaDto> contenido, int size, boolean hayMas, @JsonInclude(JsonInclude.Include.ALWAYS) Cursor siguienteCursor) { }
}
