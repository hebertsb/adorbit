package com.adorbit.facturacion.dominio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Agregado Factura. Una factura emitida no se edita ni se borra: solo admite cobros, marcarse vencida
 * o anularse (con nota de credito). El total se recalcula siempre aqui.
 */
public final class Factura {

    private final UUID id;
    private final UUID clienteId;
    private final UUID campanaId;
    private final Moneda moneda;
    private final List<ItemFactura> items;
    private final Totales totales;
    private final LocalDate fechaEmision;
    private final LocalDate fechaVencimiento;
    private final List<Cobro> cobros;
    private EstadoFactura estado;
    private Dinero saldo;
    private long version;

    private Factura(
            UUID id,
            UUID clienteId,
            UUID campanaId,
            Moneda moneda,
            List<ItemFactura> items,
            Totales totales,
            LocalDate fechaEmision,
            LocalDate fechaVencimiento,
            List<Cobro> cobros,
            EstadoFactura estado,
            Dinero saldo,
            long version) {
        this.id = id;
        this.clienteId = clienteId;
        this.campanaId = campanaId;
        this.moneda = moneda;
        this.items = List.copyOf(items);
        this.totales = totales;
        this.fechaEmision = fechaEmision;
        this.fechaVencimiento = fechaVencimiento;
        this.cobros = new ArrayList<>(cobros);
        this.estado = estado;
        this.saldo = saldo;
        this.version = version;
    }

    /** Emite una factura nueva. {@code totalEsperado} es opcional: si viene y difiere del calculado, falla. */
    public static Factura emitir(
            UUID id,
            UUID clienteId,
            UUID campanaId,
            Moneda moneda,
            List<ItemFactura> items,
            BigDecimal tasaImpuesto,
            Dinero totalEsperado,
            LocalDate fechaEmision,
            LocalDate fechaVencimiento) {
        if (id == null || clienteId == null || campanaId == null || fechaEmision == null) {
            throw new ExcepcionDominio("factura_invalida", "Id, cliente, campana y fecha de emision son obligatorios");
        }
        if (fechaVencimiento == null || fechaVencimiento.isBefore(fechaEmision)) {
            throw new ExcepcionDominio("fecha_invalida", "La fecha de vencimiento no puede ser anterior a la emision");
        }
        Totales totales = Totales.calcular(items, moneda, tasaImpuesto);
        if (totalEsperado != null && totalEsperado.compareTo(totales.total()) != 0) {
            throw new ExcepcionDominio(
                    "total_no_coincide",
                    "El total enviado no coincide con el calculado: "
                            + totales.total().monto());
        }
        return new Factura(
                id,
                clienteId,
                campanaId,
                moneda,
                items,
                totales,
                fechaEmision,
                fechaVencimiento,
                List.of(),
                EstadoFactura.EMITIDA,
                totales.total(),
                1);
    }

    /** Reconstruye una factura ya persistida, sin recalcular ni revalidar historia. */
    public static Factura reconstituir(
            UUID id,
            UUID clienteId,
            UUID campanaId,
            Moneda moneda,
            List<ItemFactura> items,
            Totales totales,
            LocalDate fechaEmision,
            LocalDate fechaVencimiento,
            List<Cobro> cobros,
            EstadoFactura estado,
            Dinero saldo,
            long version) {
        return new Factura(
                id,
                clienteId,
                campanaId,
                moneda,
                items,
                totales,
                fechaEmision,
                fechaVencimiento,
                cobros,
                estado,
                saldo,
                version);
    }

    /** Aplica un cobro. No puede superar el saldo ni hacerse sobre una factura anulada. */
    public Cobro registrarCobro(UUID cobroId, Dinero monto, LocalDate fecha, String referencia) {
        if (estado == EstadoFactura.ANULADA) {
            throw new ExcepcionDominio("factura_anulada", "No se puede cobrar una factura anulada");
        }
        if (estado == EstadoFactura.PAGADA) {
            throw new ExcepcionDominio("factura_pagada", "La factura ya esta pagada");
        }
        if (monto.esCero()) {
            throw new ExcepcionDominio("cobro_invalido", "El cobro debe ser mayor que cero");
        }
        if (monto.compareTo(saldo) > 0) {
            throw new ExcepcionDominio("cobro_excede_saldo", "El cobro supera el saldo de " + saldo.monto());
        }
        Cobro cobro = new Cobro(cobroId, id, monto, fecha, referencia);
        cobros.add(cobro);
        saldo = saldo.restar(monto);
        estado = saldo.esCero() ? EstadoFactura.PAGADA : EstadoFactura.PAGADA_PARCIAL;
        version++;
        return cobro;
    }

    /** Marca como vencida si paso el vencimiento y aun tiene saldo. Devuelve si cambio. */
    public boolean marcarVencidaSiCorresponde(LocalDate hoy) {
        boolean abierta = estado == EstadoFactura.EMITIDA || estado == EstadoFactura.PAGADA_PARCIAL;
        if (abierta && hoy.isAfter(fechaVencimiento)) {
            estado = EstadoFactura.VENCIDA;
            version++;
            return true;
        }
        return false;
    }

    /** Anula la factura (la nota de credito es el documento que lo respalda). Idempotente fallando claro. */
    public void anular() {
        if (estado == EstadoFactura.ANULADA) {
            throw new ExcepcionDominio("factura_anulada", "La factura ya esta anulada");
        }
        estado = EstadoFactura.ANULADA;
        version++;
    }

    public UUID id() {
        return id;
    }

    public UUID clienteId() {
        return clienteId;
    }

    public UUID campanaId() {
        return campanaId;
    }

    public Moneda moneda() {
        return moneda;
    }

    public List<ItemFactura> items() {
        return items;
    }

    public Totales totales() {
        return totales;
    }

    public Dinero saldo() {
        return saldo;
    }

    /** Version tras los cambios en memoria; la version persistida previa es {@code version() - 1} si hubo un cambio. */
    public long version() {
        return version;
    }

    public EstadoFactura estado() {
        return estado;
    }

    public LocalDate fechaEmision() {
        return fechaEmision;
    }

    public LocalDate fechaVencimiento() {
        return fechaVencimiento;
    }

    public List<Cobro> cobros() {
        return Collections.unmodifiableList(cobros);
    }
}
