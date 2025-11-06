// src/main/java/com/soyanga/soyangabackend/dto/seguridad/PasswordResetConfirmDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetConfirmDTO {
    @NotBlank(message = "Falta token")
    private String token;

    @NotBlank(message = "Debe enviar la nueva contraseña")
    @JsonAlias({"password", "newPassword", "nueva"})
    private String nuevaContrasena;
}
