package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuthTokensDTO {
    private String tokenType;      // "Bearer"
    private String accessToken;    // JWT corto (ej. 15 min)
    private Long   expiresIn;      // segundos
    private String refreshToken;   // JWT largo (ej. 7 días)
}
