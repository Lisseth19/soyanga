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

    private LocalDateTime fechaVenta; // si null -> now

    private Long idCliente; // puede ser null (cliente mostrador)

    @NotNull(message = "tipoDocumentoTributario es requerido (boleta/factura)")
    private String tipoDocumentoTributario; // 'boleta' | 'factura'

    @NotNull(message = "condicionDePago es requerida (contado/credito)")
    private String condicionDePago; // 'contado' | 'credito'

    private Long impuestoId;               // opcional: si es FACTURA y no viene, elegimos 1 activo
    private java.math.BigDecimal interesCredito; // opcional: solo cuando es crédito

  //  private BigDecimal interesCredito; // opcional, solo si es crédito
    private LocalDate fechaVencimientoCredito; // requerido si crédito

    @NotNull(message = "idAlmacenDespacho es requerido")
    private Long idAlmacenDespacho;

    private String metodoDePago; // 'efectivo' | 'transferencia' | 'mixto' (informativo)

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

        // Si es null, tomamos el precio de la presentación (precio_venta_bob)
        @DecimalMin(value = "0", message = "precioUnitarioBob no puede ser negativo")
        private BigDecimal precioUnitarioBob;

        private BigDecimal descuentoPorcentaje; // 0..100
        private BigDecimal descuentoMontoBob;   // monto fijo
    }
}
