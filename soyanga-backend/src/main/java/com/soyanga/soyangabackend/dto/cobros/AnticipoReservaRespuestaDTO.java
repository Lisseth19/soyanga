package com.soyanga.soyangabackend.dto.cobros;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnticipoReservaRespuestaDTO {
    private Long idAnticipo;
    private Long idAlmacen;
    private List<ReservaItem> reservas;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReservaItem {
        private Long idPresentacion;
        private BigDecimal cantidadSolicitada;
        private BigDecimal cantidadReservada; // igual a solicitada si hay stock suficiente
        private List<LotePick> distribucion;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class LotePick {
        private Long idLote;
        private String numeroLote;
        private BigDecimal cantidad;
    }
}
