package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolEstadoDTO {
    @NotNull(message = "Debe indicar el estado")
    private Boolean estadoActivo;
}
