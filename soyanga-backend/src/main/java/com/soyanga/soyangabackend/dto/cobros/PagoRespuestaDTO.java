package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PagoRespuestaDTO {
    private Long idPagoRecibido;
    private BigDecimal montoBobEquivalente;
    private boolean aplicado;
    private List<Long> cxcAfectadas;
}
