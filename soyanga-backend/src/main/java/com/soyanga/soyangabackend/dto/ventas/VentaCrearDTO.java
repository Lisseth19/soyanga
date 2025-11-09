package com.soyanga.soyangabackend.dto.ventas;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaCrearDTO {

    private LocalDateTime fechaVenta;            // si null -> now
    private Long idCliente;                      // puede ser null (cliente mostrador)

    @NotNull(message = "tipoDocumentoTributario es requerido (boleta/factura)")
    private String tipoDocumentoTributario;      // 'boleta' | 'factura'

    @NotNull(message = "condicionDePago es requerida (contado/credito)")
    private String condicionDePago;              // 'contado' | 'credito'

    private Long impuestoId;                     // opcional (si FACTURA)
    private BigDecimal interesCredito;           // opcional (solo crédito)
    private LocalDate fechaVencimientoCredito;   // requerido si crédito

    @NotNull(message = "idAlmacenDespacho es requerido")
    private Long idAlmacenDespacho;

    private String metodoDePago;                 // informativo
    private String observaciones;

    @Valid
    @NotNull(message = "items es requerido")
    private List<Item> items;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        @NotNull(message = "idPresentacion es requerido")
        private Long idPresentacion;

        @NotNull(message = "cantidad es requerida")
        @DecimalMin(value = "0.000001", message = "cantidad debe ser > 0")
        private BigDecimal cantidad;

        // Si es null, tomar precio de la presentación (precio_venta_bob)
        @DecimalMin(value = "0", message = "precioUnitarioBob no puede ser negativo")
        private BigDecimal precioUnitarioBob;

        private BigDecimal descuentoPorcentaje; // 0..100
        private BigDecimal descuentoMontoBob;   // monto fijo

        // ===== NUEVO: para consumir stock reservado por lotes =====
        private Long idAlmacenOrigen;           // almacén desde el que se consumen los lotes
        @Valid
        private List<LoteConsumo> lotes;        // si viene, consumir exactamente estos lotes
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LoteConsumo {
        @NotNull(message = "idLote es requerido")
        private Long idLote;

        @NotNull(message = "cantidad en lote es requerida")
        @DecimalMin(value = "0.000001", message = "cantidad en lote debe ser > 0")
        private BigDecimal cantidad;
    }
}
