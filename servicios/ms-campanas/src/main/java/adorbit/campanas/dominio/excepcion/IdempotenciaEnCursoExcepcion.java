package adorbit.campanas.dominio.excepcion;

public class IdempotenciaEnCursoExcepcion extends RuntimeException {
    public IdempotenciaEnCursoExcepcion(String mensaje) {
        super(mensaje);
    }
}

