package com.soyanga.soyangabackend.dto.inventario;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AjusteCrearDTO {

    @NotNull(message = "idAlmacen es requerido")
    private Long idAlmacen;

    @NotNull(message = "idLote es requerido")
    private Long idLote;

    @NotNull(message = "cantidad es requerida")
    @DecimalMin(value = "0.000001", message = "cantidad debe ser > 0")
    private BigDecimal cantidad;

    // AjusteCrearDTO.java
    @NotNull(message = "motivoCodigo es requerido")
    private String motivoCodigo; // PERDIDA, ROTURA, VENCIMIENTO, ERROR_REGISTRO...

    @NotNull(message = "requestId es requerido")
    private UUID requestId;
    private String observaciones; // opcional
}
