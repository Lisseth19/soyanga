// src/main/java/com/soyanga/soyangabackend/dto/seguridad/PasswordResetRequestDTO.java
package com.soyanga.soyangabackend.dto.seguridad;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetRequestDTO {
    private String email;
    private String username;
}
