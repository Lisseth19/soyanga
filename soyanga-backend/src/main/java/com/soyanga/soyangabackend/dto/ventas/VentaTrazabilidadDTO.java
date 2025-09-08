package com.soyanga.soyangabackend.dto.ventas;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaTrazabilidadDTO {

    // Cabecera
    private Long idVenta;
    private LocalDateTime fechaVenta;
    private Long idCliente;
    private String cliente;
    private Long idMoneda;
    private BigDecimal totalBrutoBob;
    private BigDecimal descuentoTotalBob;
    private BigDecimal totalNetoBob;
    private String condicionDePago; // contado/credito
    private LocalDate fechaVencimientoCredito;
    private Long idAlmacenDespacho;
    private String estadoVenta;     // enum .name()

    // CxC (si aplica)
    private Long idCuentaCobrar;
    private BigDecimal cxcPendienteBob;
    private LocalDate cxcVencimiento;
    private String estadoCxc;

    // Detalles (líneas)
    private List<DetalleDTO> detalles;

    // Movimientos
    private List<MovimientoDTO> movimientos;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DetalleDTO {
        private Long idVentaDetalle;
        private Long idPresentacion;
        private String sku;
        private String producto;
        private BigDecimal cantidad;
        private BigDecimal precioUnitarioBob;
        private List<LoteDTO> lotes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoteDTO {
        private Long idLote;
        private String numeroLote;
        private BigDecimal cantidad;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MovimientoDTO {
        private Long idMovimiento;
        private LocalDateTime fechaMovimiento;
        private String tipoMovimiento;  // enum .name()
        private Long idLote;
        private BigDecimal cantidad;
        private Long idAlmacenOrigen;
        private Long idAlmacenDestino;
    }
}
