package com.soyanga.soyangabackend.dto.inventario;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AjusteRespuestaDTO {
    private Long idMovimiento;
    private String tipo; // "ingreso" | "salida"
    private Long idAlmacen;
    private Long idLote;

    private BigDecimal cantidadAjustada; // +ingreso | -salida
    private BigDecimal cantidadAnterior; // (puede venir null en idempotencia)
    private BigDecimal cantidadNueva; // (puede venir null en idempotencia)

    private LocalDateTime fechaMovimiento;
    private String observaciones;
}
