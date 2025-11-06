// src/main/java/com/soyanga/soyangabackend/repositorio/seguridad/PasswordResetTokenRepositorio.java
package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.seguridad.PasswordResetToken;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepositorio extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findTopByTokenHashAndUsedAtIsNull(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from PasswordResetToken t " +
            "where t.userId = :userId and (t.usedAt is not null or t.expiresAt < :now)")
    int purgeForUser(@Param("userId") Long userId, @Param("now") Instant now);

    /** Marca el token como usado SOLO si todavía no fue usado (un solo uso garantizado). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetToken t set t.usedAt = :now " +
            "where t.id = :id and t.usedAt is null")
    int consumeSingle(@Param("id") Long id, @Param("now") Instant now);

    /** Invalida (marca como usado) todos los tokens activos del usuario (política: 1 token activo máximo). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update PasswordResetToken t set t.usedAt = :now " +
            "where t.userId = :userId and t.usedAt is null")
    int invalidateAllActiveForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
