package com.soyanga.soyangabackend.dominio.seguridad;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "password_reset_token")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK lógico al usuario
    @Column(nullable = false)
    private Long userId;

    // SHA-256 hex (64 chars)
    @Column(nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant usedAt;                // null si no usado
    private Long solicitadoPorUserId;      // quién solicitó (si admin)
}
