package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuthLoginDTO {
    @NotBlank(message = "usuarioOEmail es requerido")
    private String usuarioOEmail;

    @NotBlank(message = "password es requerido")
    private String password;
}
