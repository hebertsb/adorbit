package com.adorbit.facturacion.dominio;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Monto no negativo con 2 decimales y su moneda. Nunca usa float/double. */
public record Dinero(BigDecimal monto, Moneda moneda) implements Comparable<Dinero> {

    public Dinero {
        if (monto == null || moneda == null) {
            throw new ExcepcionDominio("dinero_invalido", "Monto y moneda son obligatorios");
        }
        monto = monto.setScale(2, RoundingMode.HALF_UP);
        if (monto.signum() < 0) {
            throw new ExcepcionDominio("dinero_invalido", "El monto no puede ser negativo");
        }
    }

    public static Dinero cero(Moneda moneda) {
        return new Dinero(BigDecimal.ZERO, moneda);
    }

    /**
     * Valida un monto que viene de AFUERA (REST o comando de la SAGA): maximo 2 decimales. El redondeo silencioso de
     * {@code Dinero} es solo para resultados calculados (p. ej. impuestos), nunca para datos de entrada.
     */
    public static BigDecimal exigirCentavos(BigDecimal monto) {
        if (monto == null || monto.stripTrailingZeros().scale() > 2) {
            throw new ExcepcionDominio("monto_invalido", "Los montos admiten como maximo 2 decimales");
        }
        return monto;
    }

    public static Dinero de(String monto, Moneda moneda) {
        return new Dinero(new BigDecimal(monto), moneda);
    }

    public Dinero sumar(Dinero otro) {
        validarMoneda(otro);
        return new Dinero(monto.add(otro.monto), moneda);
    }

    /** Resta; si el resultado seria negativo lanza {@link ExcepcionDominio}. */
    public Dinero restar(Dinero otro) {
        validarMoneda(otro);
        return new Dinero(monto.subtract(otro.monto), moneda);
    }

    public Dinero multiplicar(int cantidad) {
        return new Dinero(monto.multiply(BigDecimal.valueOf(cantidad)), moneda);
    }

    public Dinero porTasa(BigDecimal tasa) {
        return new Dinero(monto.multiply(tasa), moneda);
    }

    public boolean esCero() {
        return monto.signum() == 0;
    }

    @Override
    public int compareTo(Dinero otro) {
        validarMoneda(otro);
        return monto.compareTo(otro.monto);
    }

    private void validarMoneda(Dinero otro) {
        if (moneda != otro.moneda) {
            throw new ExcepcionDominio("moneda_no_coincide", "No se pueden combinar " + moneda + " y " + otro.moneda);
        }
    }
}
