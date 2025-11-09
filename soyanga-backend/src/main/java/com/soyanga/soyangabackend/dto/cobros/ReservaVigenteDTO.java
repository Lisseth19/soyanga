package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservaVigenteDTO {
    private Long idAnticipo;
    private List<Item> items; // agrupado por (idAlmacen, idPresentacion)

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        private Long idAlmacen;
        private Long idPresentacion;
        private BigDecimal total;      // suma de lotes (>0)
        private List<Lote> lotes;      // detalle por lote
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Lote {
        private Long idLote;
        private String numeroLote;
        private LocalDate fechaVencimiento; // opcional si tu campo es DATE
        private BigDecimal cantidad;        // reservada vigente en ese lote
    }
}
