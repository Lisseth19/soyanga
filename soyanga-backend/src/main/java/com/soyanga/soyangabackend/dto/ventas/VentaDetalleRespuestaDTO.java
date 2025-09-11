package com.soyanga.soyangabackend.dto.ventas;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaDetalleRespuestaDTO {

    private Long idVenta;
    private LocalDateTime fechaVenta;
    private String estadoVenta;
    private String tipoDocumentoTributario;
    private String numeroDocumento;

    private Long idCliente;
    private String cliente;

    private Long idMoneda;
    private BigDecimal totalBrutoBob;
    private BigDecimal descuentoTotalBob;
    private BigDecimal totalNetoBob;

    private String metodoDePago;
    private String condicionDePago;
    private LocalDate fechaVencimientoCredito;

    private Long idAlmacenDespacho;
    private String observaciones;

    // CxC (si aplica)
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CxcInfo {
        private Long idCuentaCobrar;
        private String estadoCuenta;
        private BigDecimal montoPendienteBob;
        private LocalDate fechaEmision;
        private LocalDate fechaVencimiento;
        private BigDecimal totalPagosAplicadosBob;
        private BigDecimal totalAnticiposAplicadosBob;
    }
    private CxcInfo cxc;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        private Long idVentaDetalle;
        private Long idPresentacion;
        private String sku;
        private String producto;
        private BigDecimal cantidad;
        private BigDecimal precioUnitarioBob;
        private BigDecimal descuentoPorcentaje;
        private BigDecimal descuentoMontoBob;
        private BigDecimal subtotalBob;
        private List<Lote> lotes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Lote {
        private Long idLote;
        private String numeroLote;
        private BigDecimal cantidad;
    }

    private List<Item> items;

}
