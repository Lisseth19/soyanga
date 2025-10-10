// src/main/java/com/soyanga/soyangabackend/dto/seguridad/UsuarioCambiarPasswordDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioCambiarPasswordDTO {

    @NotBlank(message = "Debe enviar la contraseña actual")
    @JsonAlias({"passwordActual", "actualPassword"})
    private String contrasenaActual;

    @NotBlank(message = "Debe enviar la nueva contraseña")
    @JsonAlias({"passwordNueva", "newPassword"})
    private String nuevaContrasena;

    // opcional (si quieres doble confirmación del lado backend)
    // @JsonAlias({"confirmPassword","passwordConfirm","confirmarContrasena"})
    // private String confirmarContrasena;
}
