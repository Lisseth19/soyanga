package com.soyanga.soyangabackend.dto.precios;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrecioNuevoDTO {

    @NotNull(message = "precioVentaBob es requerido")
    @DecimalMin(value = "0", message = "El precio no puede ser negativo")
    private BigDecimal precioVentaBob;

    // Opcional; si no viene, usamos 'now()'
    private LocalDateTime fechaInicioVigencia;

    private String motivoCambio;
}
