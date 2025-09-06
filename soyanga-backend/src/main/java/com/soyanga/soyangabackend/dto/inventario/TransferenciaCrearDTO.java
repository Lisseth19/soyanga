package com.soyanga.soyangabackend.dto.inventario;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferenciaCrearDTO {

    @NotNull(message = "idAlmacenOrigen es requerido")
    private Long idAlmacenOrigen;

    @NotNull(message = "idAlmacenDestino es requerido")
    private Long idAlmacenDestino;

    // Si viene null, el servicio usará LocalDateTime.now()
    private LocalDateTime fechaTransferencia;

    private String observaciones;

    @NotNull(message = "items es requerido")
    private List<Item> items;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        @NotNull(message = "idLote es requerido")
        private Long idLote;

        @NotNull(message = "cantidad es requerida")
        @DecimalMin(value = "0.000001", message = "cantidad debe ser > 0")
        private BigDecimal cantidad;
    }
}
