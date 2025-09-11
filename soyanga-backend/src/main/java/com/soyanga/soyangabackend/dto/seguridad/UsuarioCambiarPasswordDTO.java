package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioCambiarPasswordDTO {
    @NotBlank(message = "La nueva contraseña es requerida")
    private String nuevaContrasena;
}
