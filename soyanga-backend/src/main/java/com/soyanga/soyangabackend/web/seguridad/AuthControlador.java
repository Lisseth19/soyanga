package com.soyanga.soyangabackend.web.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.AuthLoginDTO;
import com.soyanga.soyangabackend.dto.seguridad.AuthTokensDTO;
import com.soyanga.soyangabackend.dto.seguridad.PerfilDTO;
import com.soyanga.soyangabackend.servicio.seguridad.AuthServicio;
import jakarta.validation.Valid;
import lombok.Data;
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
        // El servicio autentica y construye AuthTokensDTO (tokenType, accessToken,
        // expiresIn, refreshToken)
        return servicio.login(dto);
    }

    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public AuthTokensDTO refresh(@RequestBody RefreshTokenRequest body) {
        // Acepta JSON: { "refreshToken": "..." }
        return servicio.refresh(body.getRefreshToken());
    }

    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public PerfilDTO me(Authentication auth) {
        // Devuelve perfil del usuario autenticado
        return servicio.perfil(auth.getName());
    }

    // DTO simple para /refresh
    @Data
    public static class RefreshTokenRequest {
        private String refreshToken;
    }
}
