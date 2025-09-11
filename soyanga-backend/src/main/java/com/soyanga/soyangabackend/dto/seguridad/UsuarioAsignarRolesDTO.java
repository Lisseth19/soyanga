package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioAsignarRolesDTO {
    @NotEmpty(message = "Debe enviar al menos un rol")
    private List<Long> rolesIds;
}
