package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RolAsignarPermisosDTO {
    @NotNull(message = "Debe enviar la lista de permisos")
    private List<Long> permisos; // ids de permisos
}
