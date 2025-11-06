// src/main/java/com/soyanga/soyangabackend/web/seguridad/PasswordResetControlador.java
package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.PasswordResetConfirmDTO;
import com.soyanga.soyangabackend.dto.seguridad.PasswordResetRequestDTO;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.servicio.seguridad.PasswordResetServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/password-reset")
@RequiredArgsConstructor
public class PasswordResetControlador {

    private final PasswordResetServicio passwordResetServicio;
    private final UsuarioRepositorio usuarioRepo;

    /** CONFIRMAR (público, sin JWT) */
    @PostMapping("/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmar(@Valid @RequestBody PasswordResetConfirmDTO dto) {
        passwordResetServicio.confirmarReset(dto.getToken(), dto.getNuevaContrasena());
    }

    /** (Opcional) SOLICITAR reset (público). Siempre responde 204 para no filtrar existencia. */
    @PostMapping("/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void solicitar(@Valid @RequestBody PasswordResetRequestDTO dto) {
        usuarioRepo.findByCorreoElectronicoIgnoreCase(dto.getEmail() == null ? "" : dto.getEmail())
                .or(() -> usuarioRepo.findByNombreUsuarioIgnoreCase(dto.getUsername() == null ? "" : dto.getUsername()))
                .ifPresent(u -> passwordResetServicio.iniciarReset(u, null));
    }
}
