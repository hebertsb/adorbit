package adorbit.campanas.dominio.excepcion;

public class RecursoNoEncontradoExcepcion extends RuntimeException {
    public RecursoNoEncontradoExcepcion(String mensaje) {
        super(mensaje);
    }
}

