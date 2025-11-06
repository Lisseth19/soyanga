// src/main/java/com/soyanga/soyangabackend/dto/seguridad/UsuarioCambiarPasswordDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.AssertTrue;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioCambiarPasswordDTO {

    @JsonAlias({"passwordActual", "actualPassword"})
    private String contrasenaActual;

    @JsonAlias({"passwordNueva", "newPassword"})
    private String nuevaContrasena;

    // Si true, NO se exigen contraseñas: se dispara el flujo de reset por email
    private Boolean resetPorEmail;

    // Validación condicional:
    // - Si resetPorEmail == true -> válido sin contraseñas
    // - Si resetPorEmail != true -> exigir contrasenaActual y nuevaContrasena (mín. 8)
    @AssertTrue(message = "Si no usas resetPorEmail=true, debes enviar contrasenaActual y nuevaContrasena (mín. 8).")
    public boolean isValidCombo() {
        if (Boolean.TRUE.equals(resetPorEmail)) return true;
        if (contrasenaActual == null || contrasenaActual.isBlank()) return false;
        if (nuevaContrasena == null || nuevaContrasena.isBlank()) return false;
        return nuevaContrasena.length() >= 8;
    }
}
