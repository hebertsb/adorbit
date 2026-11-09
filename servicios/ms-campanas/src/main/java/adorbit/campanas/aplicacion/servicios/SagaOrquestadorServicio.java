package adorbit.campanas.aplicacion.servicios;

import adorbit.campanas.aplicacion.dto.SagaRespuestaDto;
import adorbit.campanas.dominio.excepcion.RecursoNoEncontradoExcepcion;
import adorbit.campanas.dominio.excepcion.ReglaNegocioExcepcion;
import adorbit.campanas.dominio.modelo.*;
import adorbit.campanas.dominio.repositorio.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class SagaOrquestadorServicio {

    private final SagaTransaccionRepositorio sagaRepositorio;
    private final SagaPasoRepositorio sagaPasoRepositorio;
    private final CampanaRepositorio campanaRepositorio;
    private final PresupuestoRepositorio presupuestoRepositorio;
    private final BandejaSalidaRepositorio outboxRepositorio;
    private final ObjectMapper objectMapper;
    private final BigDecimal tasaImpuesto;
    private final long tiempoLimiteSegundos;

    @Autowired
    public SagaOrquestadorServicio(SagaTransaccionRepositorio sagaRepositorio,
                                   SagaPasoRepositorio sagaPasoRepositorio,
                                   CampanaRepositorio campanaRepositorio,
                                   PresupuestoRepositorio presupuestoRepositorio,
                                   BandejaSalidaRepositorio outboxRepositorio,
                                   ObjectMapper objectMapper,
                                   @Value("${adorbit.campanas.negocio.tasa-impuesto:0.13}") BigDecimal tasaImpuesto,
                                   @Value("${adorbit.campanas.saga.tiempo-limite-segundos:600}") long tiempoLimiteSegundos) {
        this.sagaRepositorio = sagaRepositorio;
        this.sagaPasoRepositorio = sagaPasoRepositorio;
        this.campanaRepositorio = campanaRepositorio;
        this.presupuestoRepositorio = presupuestoRepositorio;
        this.outboxRepositorio = outboxRepositorio;
        this.objectMapper = objectMapper;
        this.tasaImpuesto = tasaImpuesto;
        if (tiempoLimiteSegundos < 1) {
            throw new IllegalArgumentException("El tiempo limite de la SAGA debe ser positivo");
        }
        this.tiempoLimiteSegundos = tiempoLimiteSegundos;
    }

    /** Constructor conservado para pruebas unitarias; produccion usa la configuracion inyectada. */
    public SagaOrquestadorServicio(SagaTransaccionRepositorio sagaRepositorio,
                                   SagaPasoRepositorio sagaPasoRepositorio,
                                   CampanaRepositorio campanaRepositorio,
                                   PresupuestoRepositorio presupuestoRepositorio,
                                   BandejaSalidaRepositorio outboxRepositorio,
                                   ObjectMapper objectMapper,
                                   BigDecimal tasaImpuesto) {
        this(sagaRepositorio, sagaPasoRepositorio, campanaRepositorio, presupuestoRepositorio,
                outboxRepositorio, objectMapper, tasaImpuesto, 600);
    }

    @Transactional
    public SagaRespuestaDto iniciarContratacion(UUID campanaId, String claveIdempotencia) {
        // Verificar si ya se procesó esta petición con la clave de idempotencia
        Optional<SagaTransaccion> sagaExistente = sagaRepositorio.findByClaveIdempotencia(claveIdempotencia);
        if (sagaExistente.isPresent()) {
            SagaTransaccion saga = sagaExistente.get();
            List<SagaPaso> pasos = sagaPasoRepositorio.findBySagaIdOrderByOrdenAsc(saga.getId());
            return SagaRespuestaDto.desdeEntidad(saga, pasos);
        }

        Campana campana = campanaRepositorio.findById(campanaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + campanaId));

        if (!campana.puedeContratarse()) {
            throw new ReglaNegocioExcepcion("La campaña en estado '" + campana.getEstado() +
                    "' no puede ser contratada. Debe estar en 'borrador' o 'pendiente_aprobacion'");
        }

        // Verificar que no haya otra SAGA activa para esta campaña
        List<EstadoSaga> estadosActivos = Arrays.asList(
                EstadoSaga.iniciada, EstadoSaga.reservando_presupuesto,
                EstadoSaga.reservando_credito, EstadoSaga.bloqueando_piezas,
                EstadoSaga.facturando, EstadoSaga.compensando
        );
        if (sagaRepositorio.findByCampanaIdAndEstadoIn(campanaId, estadosActivos).isPresent()) {
            throw new ReglaNegocioExcepcion("Ya existe una SAGA de contratación activa para esta campaña");
        }

        // Verificar presupuesto asignado
        Presupuesto presupuesto = presupuestoRepositorio.findFirstByCampanaIdAndEstadoInOrderByCreadoEnDesc(
                campanaId, Collections.singletonList(EstadoPresupuesto.borrador)
        ).orElseThrow(() -> new ReglaNegocioExcepcion("La campaña no tiene un presupuesto en borrador para reservar"));

        // 1. Crear transacción SAGA
        SagaTransaccion saga = new SagaTransaccion(campanaId, claveIdempotencia, serializarPresupuesto(presupuesto));
        saga.setLimiteEn(OffsetDateTime.now().plusSeconds(tiempoLimiteSegundos));
        saga = sagaRepositorio.save(saga);

        // 2. Paso 1: Reservar presupuesto localmente (ms-campanas)
        presupuesto.setEstado(EstadoPresupuesto.reservado);
        presupuestoRepositorio.save(presupuesto);

        campana.setEstado(EstadoCampana.pendiente);
        campanaRepositorio.save(campana);

        SagaPaso paso1 = new SagaPaso(saga.getId(), 1, TipoPasoSaga.accion, "ms-campanas", "reservar_presupuesto",
                saga.getId() + ":1:accion");
        paso1.setEstado(EstadoPasoSaga.exitoso);
        sagaPasoRepositorio.save(paso1);

        // 3. Paso 2: Crear comando ReservarCredito para ms-clientes-crm
        String claveComandoPaso2 = saga.getId() + ":2:accion";
        SagaPaso paso2 = new SagaPaso(saga.getId(), 2, TipoPasoSaga.accion, "ms-clientes-crm", "reservar_credito", claveComandoPaso2);
        paso2.setEstado(EstadoPasoSaga.enviado);
        sagaPasoRepositorio.save(paso2);

        // Actualizar estado SAGA
        saga.setPasoActual(2);
        saga.setEstado(EstadoSaga.reservando_credito);
        sagaRepositorio.save(saga);

        // Encolar comando SAGA en outbox para RabbitMQ
        Map<String, Object> cargaComando = new HashMap<>();
        cargaComando.put("saga_id", saga.getId().toString());
        cargaComando.put("clave_comando", claveComandoPaso2);
        cargaComando.put("campana_id", campana.getId().toString());
        cargaComando.put("cliente_id", campana.getClienteId().toString());
        cargaComando.put("monto", presupuesto.getMontoTotal().toPlainString());
        cargaComando.put("moneda", presupuesto.getMoneda());
        encolarComandoSaga("ReservarCredito", saga.getId(), cargaComando);

        List<SagaPaso> pasos = sagaPasoRepositorio.findBySagaIdOrderByOrdenAsc(saga.getId());
        return SagaRespuestaDto.desdeEntidad(saga, pasos);
    }

    @Transactional(readOnly = true)
    public SagaRespuestaDto obtenerEstado(UUID sagaId) {
        SagaTransaccion saga = sagaRepositorio.findById(sagaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("SAGA no encontrada: " + sagaId));
        List<SagaPaso> pasos = sagaPasoRepositorio.findBySagaIdOrderByOrdenAsc(sagaId);
        return SagaRespuestaDto.desdeEntidad(saga, pasos);
    }

    @Transactional
    public void procesarRespuestaCredito(UUID sagaId, boolean exito, String motivo, Map<String, Object> detalle) {
        SagaTransaccion saga = sagaRepositorio.buscarParaTransicion(sagaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("SAGA no encontrada: " + sagaId));

        if (saga.getEstado() != EstadoSaga.reservando_credito) {
            procesarRespuestaTardia(saga, 2, exito, motivo, detalle);
            return;
        }
        if (saga.getLimiteEn().isBefore(OffsetDateTime.now())) {
            ejecutarCompensacion(saga, "Tiempo límite excedido");
            procesarRespuestaTardia(saga, 2, exito, motivo, detalle);
            return;
        }

        SagaPaso paso2 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(sagaId, 2, TipoPasoSaga.accion)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Paso 2 no encontrado para la SAGA: " + sagaId));

        if (exito) {
            paso2.setEstado(EstadoPasoSaga.exitoso);
            try {
                if (detalle != null) paso2.setDetalle(objectMapper.writeValueAsString(detalle));
            } catch (JsonProcessingException ignored) {}
            sagaPasoRepositorio.save(paso2);

            // Avanzar a Paso 3: BloquearPiezas en ms-creatividades
            String claveComandoPaso3 = saga.getId() + ":3:accion";
            SagaPaso paso3 = new SagaPaso(saga.getId(), 3, TipoPasoSaga.accion, "ms-creatividades", "bloquear_piezas", claveComandoPaso3);
            paso3.setEstado(EstadoPasoSaga.enviado);
            sagaPasoRepositorio.save(paso3);

            saga.setPasoActual(3);
            saga.setEstado(EstadoSaga.bloqueando_piezas);
            sagaRepositorio.save(saga);

            Map<String, Object> carga = new HashMap<>();
            carga.put("saga_id", saga.getId().toString());
            carga.put("clave_comando", claveComandoPaso3);
            carga.put("campana_id", saga.getCampanaId().toString());
            carga.put("expira_at", saga.getLimiteEn().toString());
            encolarComandoSaga("BloquearPiezas", saga.getId(), carga);
        } else {
            paso2.setEstado(EstadoPasoPasoSeguro(EstadoPasoSaga.fallido));
            paso2.setDetalle(serializarMotivo(motivo));
            sagaPasoRepositorio.save(paso2);

            ejecutarCompensacion(saga, "Rechazo de crédito en ms-clientes-crm: " + motivo);
        }
    }

    @Transactional
    public void procesarRespuestaPiezas(UUID sagaId, boolean exito, String motivo, Map<String, Object> detalle) {
        SagaTransaccion saga = sagaRepositorio.buscarParaTransicion(sagaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("SAGA no encontrada: " + sagaId));

        if (saga.getEstado() != EstadoSaga.bloqueando_piezas) {
            procesarRespuestaTardia(saga, 3, exito, motivo, detalle);
            return;
        }
        if (saga.getLimiteEn().isBefore(OffsetDateTime.now())) {
            ejecutarCompensacion(saga, "Tiempo límite excedido");
            procesarRespuestaTardia(saga, 3, exito, motivo, detalle);
            return;
        }

        SagaPaso paso3 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(sagaId, 3, TipoPasoSaga.accion)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Paso 3 no encontrado para la SAGA: " + sagaId));

        if (exito) {
            paso3.setEstado(EstadoPasoSaga.exitoso);
            try {
                if (detalle != null) paso3.setDetalle(objectMapper.writeValueAsString(detalle));
            } catch (JsonProcessingException ignored) {}
            sagaPasoRepositorio.save(paso3);

            // Avanzar a Paso 4: EmitirFactura en ms-facturacion
            Campana campana = campanaRepositorio.findById(saga.getCampanaId())
                    .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + saga.getCampanaId()));

            DatosPresupuesto presupuesto = leerPresupuesto(saga);

            String claveComandoPaso4 = saga.getId() + ":4:accion";
            SagaPaso paso4 = new SagaPaso(saga.getId(), 4, TipoPasoSaga.accion, "ms-facturacion", "emitir_factura", claveComandoPaso4);
            paso4.setEstado(EstadoPasoSaga.enviado);
            sagaPasoRepositorio.save(paso4);

            saga.setPasoActual(4);
            saga.setEstado(EstadoSaga.facturando);
            sagaRepositorio.save(saga);

            // ms-facturacion recalcula subtotal+impuestos desde "items" y exige que coincida EXACTO
            // con "total" (total_no_coincide); hay que reproducir aqui su misma formula y redondeo
            // (HALF_UP, 2 decimales - ver Dinero.java) en vez de mandar el presupuesto crudo.
            BigDecimal subtotal = presupuesto.monto()
                .divide(BigDecimal.ONE.add(tasaImpuesto), 2, RoundingMode.HALF_UP);
            BigDecimal impuestos = subtotal.multiply(tasaImpuesto).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalFactura = subtotal.add(impuestos).setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> carga = new HashMap<>();
            carga.put("saga_id", saga.getId().toString());
            carga.put("clave_comando", claveComandoPaso4);
            carga.put("campana_id", campana.getId().toString());
            carga.put("cliente_id", campana.getClienteId().toString());
            carga.put("items", List.of(Map.of(
                "descripcion", "Servicios de campaña publicitaria",
                "cantidad", 1,
                "precio_unitario", subtotal.toPlainString()
            )));
            carga.put("total", totalFactura.toPlainString());
            carga.put("moneda", presupuesto.moneda());
            encolarComandoSaga("EmitirFactura", saga.getId(), carga);
        } else {
            paso3.setEstado(EstadoPasoSaga.fallido);
            paso3.setDetalle(serializarMotivo(motivo));
            sagaPasoRepositorio.save(paso3);

            ejecutarCompensacion(saga, "Bloqueo de piezas fallido en ms-creatividades: " + motivo);
        }
    }

    @Transactional
    public void procesarRespuestaFactura(UUID sagaId, boolean exito, String motivo, Map<String, Object> detalle) {
        SagaTransaccion saga = sagaRepositorio.buscarParaTransicion(sagaId)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("SAGA no encontrada: " + sagaId));

        if (saga.getEstado() != EstadoSaga.facturando) {
            procesarRespuestaTardia(saga, 4, exito, motivo, detalle);
            return;
        }
        if (saga.getLimiteEn().isBefore(OffsetDateTime.now())) {
            ejecutarCompensacion(saga, "Tiempo límite excedido");
            procesarRespuestaTardia(saga, 4, exito, motivo, detalle);
            return;
        }

        SagaPaso paso4 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(sagaId, 4, TipoPasoSaga.accion)
                .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Paso 4 no encontrado para la SAGA: " + sagaId));

        if (exito) {
            validarFacturaId(detalle == null ? null : detalle.get("factura_id"));
            paso4.setEstado(EstadoPasoSaga.exitoso);
            try {
                paso4.setDetalle(objectMapper.writeValueAsString(detalle));
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("No se pudo guardar el detalle de la factura", e);
            }
            sagaPasoRepositorio.save(paso4);

            // Paso 5: Completar SAGA y activar campaña localmente
            Campana campana = campanaRepositorio.findById(saga.getCampanaId())
                    .orElseThrow(() -> new RecursoNoEncontradoExcepcion("Campaña no encontrada: " + saga.getCampanaId()));
            campana.setEstado(EstadoCampana.activa);
            campanaRepositorio.save(campana);

            Presupuesto presupuesto = obtenerPresupuestoOriginal(saga);
            presupuesto.setEstado(EstadoPresupuesto.consumido);
            presupuestoRepositorio.save(presupuesto);

            saga.setPasoActual(5);
            saga.setEstado(EstadoSaga.completada);
            sagaRepositorio.save(saga);

            // Publicar evento de dominio CampanaContratada
            Map<String, Object> carga = new HashMap<>();
            carga.put("campana_id", campana.getId().toString());
            carga.put("saga_id", saga.getId().toString());
            encolarEventoDominio("Campana", campana.getId(), "CampanaContratada", carga);
        } else {
            paso4.setEstado(EstadoPasoSaga.fallido);
            paso4.setDetalle(serializarMotivo(motivo));
            sagaPasoRepositorio.save(paso4);

            ejecutarCompensacion(saga, "Facturación fallida en ms-facturacion: " + motivo);
        }
    }

    @Transactional
    public void procesarConfirmacionCompensacion(UUID sagaId, int orden) {
        SagaTransaccion saga = sagaRepositorio.buscarParaTransicion(sagaId).orElse(null);
        if (saga == null) return;

        Optional<SagaPaso> compPaso = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(sagaId, orden, TipoPasoSaga.compensacion);
        if (compPaso.isPresent()) {
            SagaPaso p = compPaso.get();
            p.setEstado(EstadoPasoSaga.exitoso);
            sagaPasoRepositorio.save(p);
        }

        finalizarCompensacionSiCorresponde(saga);
    }

    private void procesarRespuestaTardia(SagaTransaccion saga, int orden, boolean exito, String motivo, Map<String, Object> detalle) {
        boolean historica = saga.getEstado() == EstadoSaga.rechazada || saga.getEstado() == EstadoSaga.compensada;
        if (saga.getEstado() != EstadoSaga.compensando && !historica) return;
        SagaPaso paso = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), orden, TipoPasoSaga.accion).orElse(null);
        if (paso == null || paso.getEstado() != EstadoPasoSaga.enviado) return;
        if (exito && orden == 4) validarFacturaId(detalle == null ? null : detalle.get("factura_id"));
        try {
            paso.setDetalle(exito ? objectMapper.writeValueAsString(detalle) : serializarMotivo(motivo));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo guardar la respuesta tardía", e);
        }
        paso.setEstado(exito ? EstadoPasoSaga.exitoso : EstadoPasoSaga.fallido);
        sagaPasoRepositorio.save(paso);
        encolarCompensaciones(saga);
        finalizarCompensacionSiCorresponde(saga);
    }

    @Transactional
    public void ejecutarCompensacion(SagaTransaccion saga, String motivo) {
        saga.setEstado(EstadoSaga.compensando);
        saga.setMotivoFallo(motivo);
        sagaRepositorio.save(saga);

        // Deshacer paso 1 localmente
        Campana campana = campanaRepositorio.findById(saga.getCampanaId()).orElse(null);
        if (campana != null) {
            campana.setEstado(EstadoCampana.rechazada);
            campanaRepositorio.save(campana);
        }

        Presupuesto presupuesto = obtenerPresupuestoOriginal(saga);
        if (presupuesto.getEstado() == EstadoPresupuesto.reservado) {
            presupuesto.setEstado(EstadoPresupuesto.borrador);
            presupuestoRepositorio.save(presupuesto);
        }

        encolarCompensaciones(saga);
        finalizarCompensacionSiCorresponde(saga);

        Map<String, Object> carga = new HashMap<>();
        carga.put("campana_id", saga.getCampanaId().toString());
        carga.put("saga_id", saga.getId().toString());
        carga.put("motivo", motivo);
        encolarEventoDominio("Campana", saga.getCampanaId(), "CampanaRechazada", carga);
    }

    private void encolarCompensaciones(SagaTransaccion saga) {
        Campana campana = campanaRepositorio.findById(saga.getCampanaId()).orElse(null);

        // Compensar paso 4 (Facturación) si fue exitoso
        Optional<SagaPaso> p4 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 4, TipoPasoSaga.accion);
        if (p4.isPresent() && p4.get().getEstado() == EstadoPasoSaga.exitoso && sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 4, TipoPasoSaga.compensacion).isEmpty()) {
            String facturaId;
            try {
                facturaId = validarFacturaId(objectMapper.readTree(p4.get().getDetalle()).path("factura_id").asText());
            } catch (Exception e) {
                throw new IllegalStateException("No se puede compensar la factura: falta factura_id valido en el paso 4", e);
            }
            String claveComp = saga.getId() + ":4:compensacion";
            SagaPaso comp = new SagaPaso(saga.getId(), 4, TipoPasoSaga.compensacion, "ms-facturacion", "emitir_nota_credito", claveComp);
            comp.setEstado(EstadoPasoSaga.enviado);
            sagaPasoRepositorio.save(comp);

            Map<String, Object> carga = new HashMap<>();
            carga.put("saga_id", saga.getId().toString());
            carga.put("clave_comando", claveComp);
            carga.put("campana_id", saga.getCampanaId().toString());
            carga.put("factura_id", facturaId);
            encolarComandoSaga("EmitirNotaCredito", saga.getId(), carga);
        }

        // Compensar paso 3 (Creatividades) si fue exitoso
        Optional<SagaPaso> p3 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 3, TipoPasoSaga.accion);
        if (p3.isPresent() && p3.get().getEstado() == EstadoPasoSaga.exitoso && sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 3, TipoPasoSaga.compensacion).isEmpty()) {
            String claveComp = saga.getId() + ":3:compensacion";
            SagaPaso comp = new SagaPaso(saga.getId(), 3, TipoPasoSaga.compensacion, "ms-creatividades", "desbloquear_piezas", claveComp);
            comp.setEstado(EstadoPasoSaga.enviado);
            sagaPasoRepositorio.save(comp);

            Map<String, Object> carga = new HashMap<>();
            carga.put("saga_id", saga.getId().toString());
            carga.put("clave_comando", claveComp);
            carga.put("campana_id", saga.getCampanaId().toString());
            encolarComandoSaga("DesbloquearPiezas", saga.getId(), carga);
        }

        // Compensar paso 2 (Crédito) si fue exitoso
        Optional<SagaPaso> p2 = sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 2, TipoPasoSaga.accion);
        if (p2.isPresent() && p2.get().getEstado() == EstadoPasoSaga.exitoso && sagaPasoRepositorio.findBySagaIdAndOrdenAndTipo(saga.getId(), 2, TipoPasoSaga.compensacion).isEmpty()) {
            DatosPresupuesto presupuesto = leerPresupuesto(saga);
            if (campana == null) throw new IllegalStateException("No se puede liberar credito: campaña no encontrada para SAGA " + saga.getId());
            String claveComp = saga.getId() + ":2:compensacion";
            SagaPaso comp = new SagaPaso(saga.getId(), 2, TipoPasoSaga.compensacion, "ms-clientes-crm", "liberar_credito", claveComp);
            comp.setEstado(EstadoPasoSaga.enviado);
            sagaPasoRepositorio.save(comp);

            Map<String, Object> carga = new HashMap<>();
            carga.put("saga_id", saga.getId().toString());
            carga.put("clave_comando", claveComp);
            carga.put("campana_id", saga.getCampanaId().toString());
            if (campana != null) {
                carga.put("cliente_id", campana.getClienteId().toString());
            }
            carga.put("monto", presupuesto.monto().toPlainString());
            carga.put("moneda", presupuesto.moneda());
            encolarComandoSaga("LiberarCredito", saga.getId(), carga);
        }

    }

    private void finalizarCompensacionSiCorresponde(SagaTransaccion saga) {
        List<SagaPaso> pasos = sagaPasoRepositorio.findBySagaIdOrderByOrdenAsc(saga.getId());
        boolean pendientes = pasos.stream().anyMatch(p ->
                (p.getTipo() == TipoPasoSaga.accion && p.getOrden() > 1 && p.getEstado() == EstadoPasoSaga.enviado)
                || (p.getTipo() == TipoPasoSaga.compensacion && p.getEstado() != EstadoPasoSaga.exitoso));
        if (!pendientes && saga.getEstado() == EstadoSaga.compensando) {
            boolean huboCompensacion = pasos.stream().anyMatch(p -> p.getTipo() == TipoPasoSaga.compensacion);
            saga.setEstado(huboCompensacion ? EstadoSaga.compensada : EstadoSaga.rechazada);
            sagaRepositorio.save(saga);
        }
    }

    @Transactional
    public void procesarTimeouts() {
        List<SagaTransaccion> vencidas = sagaRepositorio.findSagasVencidas(OffsetDateTime.now());
        for (SagaTransaccion saga : vencidas) {
            ejecutarCompensacion(saga, "Tiempo límite excedido (Timeout 10 minutos)");
        }
    }

    private record DatosPresupuesto(UUID id, BigDecimal monto, String moneda) {}

    private String serializarPresupuesto(Presupuesto presupuesto) {
        try {
            return objectMapper.writeValueAsString(Map.of("presupuesto_id", presupuesto.getId().toString(),
                    "monto", presupuesto.getMontoTotal().toPlainString(), "moneda", presupuesto.getMoneda()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo guardar el presupuesto original de la SAGA", e);
        }
    }

    private DatosPresupuesto leerPresupuesto(SagaTransaccion saga) {
        try {
            var carga = objectMapper.readTree(saga.getCarga());
            if (carga == null || !carga.path("presupuesto_id").isTextual()
                    || !carga.path("monto").isTextual() || !carga.path("moneda").isTextual()) {
                throw new IllegalArgumentException("Datos incompletos");
            }
            UUID id = UUID.fromString(carga.path("presupuesto_id").asText());
            BigDecimal monto = new BigDecimal(carga.path("monto").asText());
            String moneda = carga.path("moneda").asText();
            if (monto.signum() < 0 || !(moneda.equals("BOB") || moneda.equals("USD"))) {
                throw new IllegalArgumentException("Datos invalidos");
            }
            return new DatosPresupuesto(id, monto, moneda);
        } catch (Exception e) {
            throw new IllegalStateException("SAGA " + saga.getId() + " sin presupuesto original valido; requiere revision manual", e);
        }
    }

    private Presupuesto obtenerPresupuestoOriginal(SagaTransaccion saga) {
        DatosPresupuesto datos = leerPresupuesto(saga);
        Presupuesto presupuesto = presupuestoRepositorio.findById(datos.id())
                .orElseThrow(() -> new IllegalStateException("Presupuesto original no encontrado para SAGA " + saga.getId()));
        if (!saga.getCampanaId().equals(presupuesto.getCampanaId())) {
            throw new IllegalStateException("Presupuesto original no pertenece a la campaña de SAGA " + saga.getId());
        }
        return presupuesto;
    }

    private String serializarMotivo(String motivo) {
        try {
            return objectMapper.writeValueAsString(Collections.singletonMap("motivo", motivo));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo guardar el motivo del fallo", e);
        }
    }

    private String validarFacturaId(Object valor) {
        if (!(valor instanceof String texto)) {
            throw new IllegalArgumentException("FacturaEmitida requiere factura_id UUID");
        }
        UUID id = UUID.fromString(texto);
        if (!id.toString().equalsIgnoreCase(texto)) {
            throw new IllegalArgumentException("FacturaEmitida requiere factura_id UUID");
        }
        return id.toString();
    }

    private EstadoPasoSaga EstadoPasoPasoSeguro(EstadoPasoSaga e) {
        return e;
    }

    private void encolarEventoDominio(String tipoAgregado, UUID agregadoId, String tipoEvento, Map<String, Object> datos) {
        try {
            Map<String, Object> sobre = new HashMap<>();
            sobre.put("id_evento", UUID.randomUUID().toString());
            sobre.put("tipo_evento", tipoEvento);
            sobre.put("version_esquema", 1);
            sobre.put("ocurrido_en", OffsetDateTime.now().toString());
            sobre.put("agregado_id", agregadoId.toString());
            sobre.put("correlacion_id", agregadoId.toString());
            sobre.put("carga", datos);

            String json = objectMapper.writeValueAsString(sobre);
            BandejaSalidaEvento outbox = new BandejaSalidaEvento(tipoAgregado, agregadoId, tipoEvento, json);
            outboxRepositorio.save(outbox);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error al serializar evento de dominio", e);
        }
    }

    private void encolarComandoSaga(String comando, UUID sagaId, Map<String, Object> datos) {
        try {
            Map<String, Object> sobre = new HashMap<>();
            sobre.put("id_evento", UUID.randomUUID().toString());
            sobre.put("tipo_evento", comando);
            sobre.put("version_esquema", 1);
            sobre.put("ocurrido_en", OffsetDateTime.now().toString());
            sobre.put("agregado_id", sagaId.toString());
            sobre.put("correlacion_id", sagaId.toString());
            sobre.put("carga", datos);

            String json = objectMapper.writeValueAsString(sobre);
            BandejaSalidaEvento outbox = new BandejaSalidaEvento("SagaComando", sagaId, comando, json);
            outboxRepositorio.save(outbox);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error al serializar comando SAGA", e);
        }
    }
}

