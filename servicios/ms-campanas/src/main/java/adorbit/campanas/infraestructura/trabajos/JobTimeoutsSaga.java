package adorbit.campanas.infraestructura.trabajos;

import adorbit.campanas.aplicacion.servicios.SagaOrquestadorServicio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@Profile("!test")
public class JobTimeoutsSaga {

    private static final Logger log = LoggerFactory.getLogger(JobTimeoutsSaga.class);

    private final SagaOrquestadorServicio sagaServicio;

    public JobTimeoutsSaga(SagaOrquestadorServicio sagaServicio) {
        this.sagaServicio = sagaServicio;
    }

    @Scheduled(fixedDelay = 60000) // cada minuto
    public void verificarTimeouts() {
        try {
            sagaServicio.procesarTimeouts();
        } catch (Exception e) {
            log.error("Error al procesar timeouts de SAGA: {}", e.getMessage(), e);
        }
    }
}

