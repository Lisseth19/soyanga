package com.soyanga.soyangabackend.dto.ventas;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaDetalleDTO {
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
 //   private BigDecimal interesCredito;
    private LocalDate fechaVencimientoCredito;

    private Long idAlmacenDespacho;
    private String observaciones;

    private BigDecimal cxcPendienteBob; // null si no es crédito / no existe CxC

    private List<Item> items;

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
        private Long idVentaDetalleLote;
        private Long idVentaDetalle;
        private Long idLote;
        private String numeroLote;
        private BigDecimal cantidad;
    }
}
