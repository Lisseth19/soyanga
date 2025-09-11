package com.soyanga.soyangabackend.dto.catalogo;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonedaCrearDTO {
    @NotBlank(message = "codigoMoneda es requerido")
    private String codigoMoneda; // BOB, USD, etc.

    @NotBlank(message = "nombreMoneda es requerido")
    private String nombreMoneda;

    private Boolean esMonedaLocal; // opcional

}
