package com.soyanga.soyangabackend.dto.compras;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@AllArgsConstructor
public class RecepcionItemDTO {
    private Long idRecepcionDetalle;
    private Long idCompraDetalle;
    private Long idPresentacion;
    private BigDecimal cantidadRecibida;
    private BigDecimal costoUnitarioMoneda;

    // datos de lote
    private String numeroLote;
    private LocalDate fechaFabricacion;
    private LocalDate fechaVencimiento;

    // observaciones (del detalle; si quieres puedes combinar con las del lote)
    private String observaciones;
}
