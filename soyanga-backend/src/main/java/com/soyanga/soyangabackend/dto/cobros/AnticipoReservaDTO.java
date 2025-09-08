package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnticipoReservaDTO {

    @NotNull(message = "idAlmacen es requerido")
    private Long idAlmacen;

    @NotNull(message = "items es requerido")
    private List<Item> items;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        @NotNull(message = "idPresentacion es requerido")
        private Long idPresentacion;

        @NotNull(message = "cantidad es requerida")
        @DecimalMin(value = "0.000001", message = "cantidad debe ser > 0")
        private BigDecimal cantidad;
    }
}
