package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MonedaActualizarDTO(
        @NotBlank String codigo,
        @NotBlank String nombre,
        boolean esLocal,
        boolean estadoActivo,

        // NUEVO: permite editar el tipo de cambio si es NO local (upsert)
        @DecimalMin(value = "0.000001", inclusive = true, message = "La tasa debe ser > 0")
        BigDecimal tasaCambioRespectoLocal,

        // opcional; si no envías, se usa hoy
        LocalDate fechaVigencia
) {}
