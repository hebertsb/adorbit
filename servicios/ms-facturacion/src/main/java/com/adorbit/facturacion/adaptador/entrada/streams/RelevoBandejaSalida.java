package com.adorbit.facturacion.adaptador.entrada.streams;

import com.adorbit.facturacion.aplicacion.puerto.entrada.PublicarEventoCasoDeUso;
import com.adorbit.facturacion.aplicacion.puerto.salida.EventoPublicable;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.OperationType;
import software.amazon.awssdk.services.dynamodb.model.Record;
import software.amazon.awssdk.services.dynamodb.model.Shard;
import software.amazon.awssdk.services.dynamodb.model.ShardIteratorType;
import software.amazon.awssdk.services.dynamodb.streams.DynamoDbStreamsClient;

/**
 * Relevo de la bandeja de salida: lee DynamoDB Streams, filtra los INSERT de filas {@code SALIDA#} y los publica
 * en el bus. Entrega AL MENOS UNA VEZ: el avance por fragmento (shard) solo se guarda tras publicar con
 * confirmacion; al reiniciar relee desde el inicio de la retencion (24 h) y los consumidores deduplican por
 * {@code id_evento}.
 */
public class RelevoBandejaSalida implements SmartLifecycle {

    private static final Logger LOG = LoggerFactory.getLogger(RelevoBandejaSalida.class);
    private static final String PREFIJO_SALIDA = "SALIDA#";

    private final DynamoDbClient dynamo;
    private final DynamoDbStreamsClient streams;
    private final String tabla;
    private final PublicarEventoCasoDeUso publicar;
    private final Duration intervalo;
    private final Map<String, String> ultimaSecuenciaPorShard = new ConcurrentHashMap<>();

    private volatile boolean activo;
    private Thread hilo;

    public RelevoBandejaSalida(
            DynamoDbClient dynamo,
            DynamoDbStreamsClient streams,
            String tabla,
            PublicarEventoCasoDeUso publicar,
            Duration intervalo) {
        this.dynamo = dynamo;
        this.streams = streams;
        this.tabla = tabla;
        this.publicar = publicar;
        this.intervalo = intervalo;
    }

    @Override
    public void start() {
        activo = true;
        hilo = new Thread(this::ciclo, "relevo-bandeja-salida");
        hilo.setDaemon(true);
        hilo.start();
    }

    @Override
    public void stop() {
        activo = false;
        if (hilo != null) {
            hilo.interrupt();
        }
    }

    @Override
    public boolean isRunning() {
        return activo;
    }

    /** Paginas vacias consecutivas tras las cuales se da por agotado un fragmento en esta pasada. */
    private static final int PAGINAS_VACIAS_MAXIMAS = 150;

    /** Paginas vacias consecutivas al reanudar desde un iterador guardado (ya se esta cerca del final). */
    private static final int PAGINAS_VACIAS_REANUDADO = 3;

    /** Ultimo iterador devuelto por cada fragmento: evita recorrerlo desde el principio en cada pasada. */
    private final java.util.Map<String, String> iteradoresPorShard = new java.util.concurrent.ConcurrentHashMap<>();

    /** Fragmentos cerrados ya leidos hasta el final: no se vuelven a consultar. */
    private final java.util.Set<String> fragmentosAgotados = java.util.concurrent.ConcurrentHashMap.newKeySet();

    private void ciclo() {
        while (activo) {
            try {
                procesarUnaVuelta();
            } catch (RuntimeException e) {
                LOG.warn("Fallo en el relevo de la bandeja de salida; se reintenta: {}", e.toString());
            }
            try {
                Thread.sleep(intervalo.toMillis());
            } catch (InterruptedException interrumpido) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    /** Una pasada por todos los fragmentos del stream. Visible para pruebas. */
    void procesarUnaVuelta() {
        String arn = dynamo.describeTable(r -> r.tableName(tabla)).table().latestStreamArn();
        if (arn == null) {
            LOG.warn("La tabla {} no tiene Streams activado", tabla);
            return;
        }
        List<Shard> shards = streams.describeStream(r -> r.streamArn(arn))
                .streamDescription()
                .shards();
        for (Shard shard : shards) {
            if (!activo) {
                return;
            }
            if (fragmentosAgotados.contains(shard.shardId())) {
                continue;
            }
            procesarShard(arn, shard.shardId());
        }
    }

    private void procesarShard(String arn, String shardId) {
        String guardado = iteradoresPorShard.get(shardId);
        boolean reanudado = guardado != null;
        String iterador = guardado != null ? guardado : iteradorInicial(arn, shardId);
        // Reanudando desde un iterador guardado basta con pocas paginas; desde cero hay que recorrer el fragmento
        // (DynamoDB Streams devuelve muchas paginas vacias antes de llegar a los registros ya escritos).
        int maximoVacias = reanudado ? PAGINAS_VACIAS_REANUDADO : PAGINAS_VACIAS_MAXIMAS;
        int vaciasSeguidas = 0;
        try {
            while (iterador != null && activo) {
                String actual = iterador;
                var respuesta = streams.getRecords(r -> r.shardIterator(actual).limit(100));
                for (var registro : respuesta.records()) {
                    publicarSiEsSalida(registro);
                    ultimaSecuenciaPorShard.put(shardId, registro.dynamodb().sequenceNumber());
                }
                vaciasSeguidas = respuesta.records().isEmpty() ? vaciasSeguidas + 1 : 0;
                iterador = respuesta.nextShardIterator();
                if (iterador == null) {
                    fragmentosAgotados.add(shardId);
                    iteradoresPorShard.remove(shardId);
                    return;
                }
                iteradoresPorShard.put(shardId, iterador);
                if (vaciasSeguidas >= maximoVacias) {
                    return;
                }
            }
        } catch (RuntimeException e) {
            // iterador vencido (15 min) u otro fallo: se descarta y se reanuda desde la ultima secuencia publicada
            iteradoresPorShard.remove(shardId);
            throw e;
        }
    }

    private String iteradorInicial(String arn, String shardId) {
        String ultima = ultimaSecuenciaPorShard.get(shardId);
        return streams.getShardIterator(r -> {
                    r.streamArn(arn).shardId(shardId);
                    if (ultima == null) {
                        r.shardIteratorType(ShardIteratorType.TRIM_HORIZON);
                    } else {
                        r.shardIteratorType(ShardIteratorType.AFTER_SEQUENCE_NUMBER)
                                .sequenceNumber(ultima);
                    }
                })
                .shardIterator();
    }

    private void publicarSiEsSalida(Record registro) {
        if (registro.eventName() != OperationType.INSERT) {
            return;
        }
        var imagen = registro.dynamodb().newImage();
        if (imagen == null || !imagen.containsKey("PK") || !imagen.get("PK").s().startsWith(PREFIJO_SALIDA)) {
            return;
        }
        var tipo = imagen.get("tipo_evento").s();
        var id = imagen.get("PK").s().substring(PREFIJO_SALIDA.length());
        var cuerpo = imagen.get("carga").s();
        publicar.publicar(new EventoPublicable(id, tipo, cuerpo));
        LOG.info("Evento {} ({}) publicado", id, tipo);
    }
}
