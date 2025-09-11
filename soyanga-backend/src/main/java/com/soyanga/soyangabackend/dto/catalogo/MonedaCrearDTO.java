package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MonedaCrearDTO(
        @NotBlank String codigo,
        @NotBlank String nombre,
        boolean esLocal,
        // si no es local puedes mandar la tasa contra la local
        @DecimalMin(value = "0.000001", inclusive = true, message = "La tasa debe ser > 0")
        BigDecimal tasaCambioRespectoLocal,
        LocalDate fechaVigencia
) {}
