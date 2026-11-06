package adorbit.campanas.aplicacion;

import adorbit.campanas.aplicacion.dto.CampanaActualizarDto;
import adorbit.campanas.aplicacion.dto.CampanaCrearDto;
import adorbit.campanas.aplicacion.dto.CampanaRespuestaDto;
import adorbit.campanas.aplicacion.dto.PresupuestoDto;
import adorbit.campanas.aplicacion.dto.SagaRespuestaDto;
import adorbit.campanas.aplicacion.servicios.CampanaServicio;
import adorbit.campanas.aplicacion.servicios.PresupuestoServicio;
import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import adorbit.campanas.dominio.excepcion.ConflictoEdicionExcepcion;
import adorbit.campanas.dominio.modelo.EstadoCampana;
import adorbit.campanas.dominio.modelo.EstadoPresupuesto;
import adorbit.campanas.dominio.modelo.EstadoSaga;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CampanaServicioTest {

    @Autowired
    private CampanaServicio campanaServicio;

    @Autowired
    private PresupuestoServicio presupuestoServicio;

    @Autowired
    private SagaOrquestadorServicio sagaServicio;

    @Test
    @DisplayName("Debe crear una campaña correctamente con estado inicial borrador")
    void crearCampanaExitoso() {
        System.out.println("=== TEST INICIADO: crearCampanaExitoso ===");
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Black Friday 2026");
        dto.setDescripcion("Promoción masiva regional");
        dto.setFechaInicio(LocalDate.now());
        dto.setFechaFin(LocalDate.now().plusMonths(1));

        CampanaRespuestaDto creada = campanaServicio.crearCampana(dto);

        assertNotNull(creada.getId());
        assertEquals("Campaña Black Friday 2026", creada.getNombre());
        assertEquals(EstadoCampana.borrador, creada.getEstado());
        assertNotNull(creada.getVersion());
    }

    @Test
    @DisplayName("Debe lanzar conflicto (409) cuando la versión no coincide en la actualización")
    void actualizarCampanaConflictoVersion() {
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Primavera");
        CampanaRespuestaDto creada = campanaServicio.crearCampana(dto);

        CampanaActualizarDto updDto = new CampanaActualizarDto();
        updDto.setNombre("Campaña Primavera Modificada");
        updDto.setVersion(999); // Versión incorrecta

        assertThrows(ConflictoEdicionExcepcion.class, () -> {
            campanaServicio.actualizarCampana(creada.getId(), updDto);
        });
    }

    @Test
    @DisplayName("Debe orquestar la SAGA de contratación iniciando el paso 1 local y emitiendo comando 2")
    void orquestarSagaExitoso() {
        // 1. Crear Campaña
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Navidad 2026");
        CampanaRespuestaDto campana = campanaServicio.crearCampana(dto);

        // 2. Asignar presupuesto
        PresupuestoDto presDto = new PresupuestoDto();
        presDto.setMontoTotal(new BigDecimal("50000.00"));
        presDto.setMoneda("BOB");
        presupuestoServicio.asignarPresupuesto(campana.getId(), presDto);

        // 3. Iniciar SAGA de contratación
        String claveIdempotencia = "idem-saga-" + UUID.randomUUID();
        SagaRespuestaDto saga = sagaServicio.iniciarContratacion(campana.getId(), claveIdempotencia);

        assertNotNull(saga.getId());
        assertEquals(campana.getId(), saga.getCampanaId());
        assertEquals(EstadoSaga.reservando_credito, saga.getEstado());
        assertEquals(2, saga.getPasoActual());
        assertEquals(2, saga.getPasos().size());

        // Verificar idempotencia: repetir con la misma clave debe devolver la misma SAGA sin error
        SagaRespuestaDto repetida = sagaServicio.iniciarContratacion(campana.getId(), claveIdempotencia);
        assertEquals(saga.getId(), repetida.getId());
    }

    @Test
    @DisplayName("Debe completar la SAGA completa (pasos 1 a 5) y activar la campaña al recibir todas las respuestas exitosas")
    void sagaCaminoFelizCompleto() {
        // Crear campaña y presupuesto
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Verano 2027");
        CampanaRespuestaDto campana = campanaServicio.crearCampana(dto);

        PresupuestoDto presDto = new PresupuestoDto();
        presDto.setMontoTotal(new BigDecimal("80000.00"));
        presDto.setMoneda("USD");
        presupuestoServicio.asignarPresupuesto(campana.getId(), presDto);

        // 1. Iniciar SAGA
        SagaRespuestaDto saga = sagaServicio.iniciarContratacion(campana.getId(), "idem-" + UUID.randomUUID());
        assertEquals(EstadoSaga.reservando_credito, saga.getEstado());

        // 2. Simular respuesta exitosa de CRM (Paso 2 -> disparar Paso 3)
        sagaServicio.procesarRespuestaCredito(saga.getId(), true, null, null);
        SagaRespuestaDto estadoPaso3 = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.bloqueando_piezas, estadoPaso3.getEstado());
        assertEquals(3, estadoPaso3.getPasoActual());

        // 3. Simular respuesta exitosa de Creatividades (Paso 3 -> disparar Paso 4)
        sagaServicio.procesarRespuestaPiezas(saga.getId(), true, null, null);
        SagaRespuestaDto estadoPaso4 = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.facturando, estadoPaso4.getEstado());
        assertEquals(4, estadoPaso4.getPasoActual());

        // 4. Simular respuesta exitosa de Facturación (Paso 4 -> Paso 5 finalización local)
        sagaServicio.procesarRespuestaFactura(saga.getId(), true, null, null);
        SagaRespuestaDto finalSaga = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.completada, finalSaga.getEstado());
        assertEquals(5, finalSaga.getPasoActual());

        // Verificar que la campaña quedó ACTIVA y el presupuesto CONSUMIDO
        CampanaRespuestaDto campanaFinal = campanaServicio.obtenerPorId(campana.getId());
        assertEquals(EstadoCampana.activa, campanaFinal.getEstado());

        PresupuestoDto presFinal = presupuestoServicio.obtenerPresupuesto(campana.getId());
        assertEquals(EstadoPresupuesto.consumido, presFinal.getEstado());
    }

    @Test
    @DisplayName("Debe compensar y marcar rechazada cuando falla el crédito en el paso 2")
    void sagaCompensacionFalloCredito() {
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Fallida Credito");
        CampanaRespuestaDto campana = campanaServicio.crearCampana(dto);

        PresupuestoDto presDto = new PresupuestoDto();
        presDto.setMontoTotal(new BigDecimal("100000.00"));
        presupuestoServicio.asignarPresupuesto(campana.getId(), presDto);

        SagaRespuestaDto saga = sagaServicio.iniciarContratacion(campana.getId(), "idem-" + UUID.randomUUID());

        // Simular rechazo de crédito
        sagaServicio.procesarRespuestaCredito(saga.getId(), false, "Límite de crédito excedido", null);

        SagaRespuestaDto sagaRechazada = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.rechazada, sagaRechazada.getEstado());

        CampanaRespuestaDto campanaRechazada = campanaServicio.obtenerPorId(campana.getId());
        assertEquals(EstadoCampana.rechazada, campanaRechazada.getEstado());

        PresupuestoDto presLiberado = presupuestoServicio.obtenerPresupuesto(campana.getId());
        assertEquals(EstadoPresupuesto.borrador, presLiberado.getEstado());
    }

    @Test
    @DisplayName("Debe compensar pasos 3 y 2 cuando falla la facturación en el paso 4")
    void sagaCompensacionFalloFactura() {
        CampanaCrearDto dto = new CampanaCrearDto();
        dto.setClienteId(UUID.randomUUID());
        dto.setNombre("Campaña Fallida Factura");
        CampanaRespuestaDto campana = campanaServicio.crearCampana(dto);

        PresupuestoDto presDto = new PresupuestoDto();
        presDto.setMontoTotal(new BigDecimal("25000.00"));
        presupuestoServicio.asignarPresupuesto(campana.getId(), presDto);

        SagaRespuestaDto saga = sagaServicio.iniciarContratacion(campana.getId(), "idem-" + UUID.randomUUID());

        // Pasos 2 y 3 exitosos
        sagaServicio.procesarRespuestaCredito(saga.getId(), true, null, null);
        sagaServicio.procesarRespuestaPiezas(saga.getId(), true, null, null);

        // Paso 4 falla
        sagaServicio.procesarRespuestaFactura(saga.getId(), false, "Servicio tributario inaccesible", null);

        SagaRespuestaDto sagaCompensando = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.compensando, sagaCompensando.getEstado());

        // Debe haber registrado pasos de compensación para 3 (desbloquear) y 2 (liberar crédito)
        boolean tieneComp3 = sagaCompensando.getPasos().stream()
                .anyMatch(p -> p.getOrden() == 3 && "ms-creatividades".equals(p.getServicio()));
        boolean tieneComp2 = sagaCompensando.getPasos().stream()
                .anyMatch(p -> p.getOrden() == 2 && "ms-clientes-crm".equals(p.getServicio()));

        assertTrue(tieneComp3, "Debe existir comando de compensación para ms-creatividades");
        assertTrue(tieneComp2, "Debe existir comando de compensación para ms-clientes-crm");

        // Simular confirmación de compensaciones externas
        sagaServicio.procesarConfirmacionCompensacion(saga.getId(), 3);
        sagaServicio.procesarConfirmacionCompensacion(saga.getId(), 2);

        SagaRespuestaDto sagaFinal = sagaServicio.obtenerEstado(saga.getId());
        assertEquals(EstadoSaga.compensada, sagaFinal.getEstado());
    }
}
