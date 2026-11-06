package adorbit.campanas.dominio.excepcion;

public class ConflictoEdicionExcepcion extends RuntimeException {
    public ConflictoEdicionExcepcion(String mensaje) {
        super(mensaje);
    }
}

