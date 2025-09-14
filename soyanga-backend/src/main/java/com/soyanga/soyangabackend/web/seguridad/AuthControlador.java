package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.servicio.seguridad.AuthServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthControlador {

    private final AuthServicio servicio;

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public AuthTokensDTO login(@Valid @RequestBody AuthLoginDTO dto) {
        return servicio.login(dto);
    }

    @PostMapping("/refresh")
    public AuthTokensDTO refresh(@RequestBody String refreshToken) {
        // puedes enviar como { "refreshToken": "..." } si prefieres un DTO
        String token = refreshToken.replace("\"", "").trim();
        return servicio.refresh(token);
    }

    @GetMapping("/me")
    public PerfilDTO me(Authentication auth) {
        return servicio.perfil(auth.getName());
    }
}
