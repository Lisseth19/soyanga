package com.soyanga.soyangabackend.dto.seguridad;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UsuarioCrearDTO {
    @NotBlank(message = "El nombre completo es requerido")
    private String nombreCompleto;

    @Email(message = "Correo inválido")
    @NotBlank(message = "El correo es requerido")
    private String correoElectronico;

    private String telefono;

    @NotBlank(message = "El nombre de usuario es requerido")
    private String nombreUsuario;

    @NotBlank(message = "La contraseña es requerida")
    private String contrasena;       // texto plano para crear (se encripta)

    private Boolean estadoActivo;    // opcional (default TRUE)
}
