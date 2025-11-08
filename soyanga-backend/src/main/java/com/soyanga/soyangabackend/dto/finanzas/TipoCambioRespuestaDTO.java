package com.soyanga.soyangabackend.dto.finanzas;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TipoCambioRespuestaDTO {
    private Long idTipoCambio;
    private Long idMonedaOrigen;
    private Long idMonedaDestino;
    private LocalDate fechaVigencia;
    private BigDecimal tasaCambio;
    private boolean vigente; // si es el más reciente hasta "hoy" o hasta la fecha consultada
}
