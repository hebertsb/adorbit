package adorbit.campanas.dominio.excepcion;

public class ReglaNegocioExcepcion extends RuntimeException {
    public ReglaNegocioExcepcion(String mensaje) {
        super(mensaje);
    }
}

