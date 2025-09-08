package com.soyanga.soyangabackend.dto.cobros;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PagoAplicarDTO {

    // opcional pero recomendado para validar que el pago aplique a CxC de ese cliente
    private Long idCliente;

    @NotNull @Size(min = 1)
    private List<Item> items;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        @NotNull private Long idCuentaCobrar;
        @NotNull @DecimalMin(value = "0.01")
        private BigDecimal montoAplicadoBob;
    }
}
