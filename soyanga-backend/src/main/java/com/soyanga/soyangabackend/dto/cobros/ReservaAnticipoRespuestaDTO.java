package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservaAnticipoRespuestaDTO {
    private Long idAnticipo;
    private String operacion; // "reservar" | "liberar"
    private int itemsProcesados;

    private List<Resultado> resultados;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Resultado {
        private Long idPresentacion;
        private Long idAlmacen;
        private BigDecimal cantidadProcesada;
        private List<Lote> lotes;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Lote {
        private Long idLote;
        private BigDecimal cantidad;
    }
}
