package com.soyanga.soyangabackend.dto.precios;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrecioHistoricoDTO {
    private Long idPrecioHistorico;
    private Long idPresentacion;
    private BigDecimal precioVentaBob;
    private LocalDateTime fechaInicioVigencia;
    private LocalDateTime fechaFinVigencia;
    private String motivoCambio;
    private boolean vigente;
}
