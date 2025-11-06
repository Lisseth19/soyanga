package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Usuario;
import com.soyanga.soyangabackend.dominio.seguridad.PasswordResetToken;
import com.soyanga.soyangabackend.repositorio.seguridad.PasswordResetTokenRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServicio {

    private final PasswordResetTokenRepositorio tokenRepo;
    private final UsuarioRepositorio usuarioRepo;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.security.reset-token-exp-min:60}")
    private long expMin;

    @Value("${app.mail.dev-log-only:false}")
    private boolean devLogOnly;

    /** Remitente configurable: por defecto usa spring.mail.username */
    @Value("${app.mail.from:${spring.mail.username}}")
    private String mailFrom;

    /** Reply-To opcional (si quieres que respondan a otro buzón) */
    @Value("${app.mail.reply-to:}")
    private String mailReplyTo;

    /**
     * Genera y envía un nuevo token:
     * - Purga tokens viejos/expirados
     * - Invalida tokens activos previos (política: 1 activo por usuario)
     * - Crea y envía el nuevo enlace
     */
    @Transactional
    public void iniciarReset(Usuario u, Long solicitadoPorId) {
        if (u == null) throw new IllegalArgumentException("Usuario destino requerido");
        if (u.getCorreoElectronico() == null || u.getCorreoElectronico().isBlank()) {
            throw new IllegalArgumentException("El usuario no tiene correo electrónico registrado");
        }

        Instant now = Instant.now();

        // 1) Limpia usados/expirados y además invalida tokens activos previos
        int purgados = tokenRepo.purgeForUser(u.getIdUsuario(), now);
        int invalidados = tokenRepo.invalidateAllActiveForUser(u.getIdUsuario(), now);
        log.debug("[PasswordReset] userId={} purgados={}, invalidadosActivos={}", u.getIdUsuario(), purgados, invalidados);

        // 2) Genera token aleatorio y guarda el HASH
        String tokenPlano = generarTokenSeguro();
        String tokenHash = sha256Hex(tokenPlano);

        PasswordResetToken t = PasswordResetToken.builder()
                .userId(u.getIdUsuario())
                .tokenHash(tokenHash)
                .createdAt(now)
                .expiresAt(now.plus(expMin, ChronoUnit.MINUTES))
                .solicitadoPorUserId(solicitadoPorId)
                .build();
        tokenRepo.save(t);

        // 3) Construye URL y envía
        String url = buildResetUrl(tokenPlano);

        if (devLogOnly) {
            log.warn("[DEV] Enlace de restablecimiento para {}: {}", u.getCorreoElectronico(), url);
            return; // en modo dev-log-only no enviamos correo real
        }

        enviarEmail(u.getCorreoElectronico(), url);
        log.info("[PasswordReset] Enviado enlace de reset a {}", ocultar(u.getCorreoElectronico()));
    }

    /**
     * Confirma el restablecimiento garantizando UN SOLO USO:
     * - Verifica token válido y no expirado
     * - CONSUME el token de forma atómica (antes de cambiar la contraseña)
     * - Cambia la contraseña del usuario
     */
    @Transactional
    public void confirmarReset(String tokenPlano, String nuevaContrasena) {
        if (tokenPlano == null || tokenPlano.isBlank()) {
            throw new IllegalArgumentException("Token requerido");
        }
        if (nuevaContrasena == null || nuevaContrasena.length() < 8) {
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 8 caracteres");
        }

        Instant now = Instant.now();
        String hash = sha256Hex(tokenPlano);

        var t = tokenRepo.findTopByTokenHashAndUsedAtIsNull(hash)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido o ya usado"));

        if (t.getExpiresAt().isBefore(now)) {
            throw new IllegalArgumentException("Token expirado");
        }

        // 1) Consumo atómico ANTES de tocar la contraseña (evita doble actualización por carreras)
        int updated = tokenRepo.consumeSingle(t.getId(), now);
        if (updated != 1) {
            // Otra petición lo consumió primero, o ya se usó/caducó entre tanto
            throw new IllegalArgumentException("Token inválido o ya usado");
        }

        // 2) Ahora sí, cambia la contraseña
        var user = usuarioRepo.findById(t.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        user.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioRepo.save(user);

        // 3) (opcional) purgar restos (usados/expirados) del usuario
        tokenRepo.purgeForUser(user.getIdUsuario(), now);

        log.info("[PasswordReset] userId={} contraseña actualizada (token consumido)", user.getIdUsuario());

        // TODO: invalidar sesiones/refresh tokens activos del usuario (recomendado)
    }

    /* ================= Helpers ================= */

    private void enviarEmail(String para, String url) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(para);
            // algunos SMTPs (Gmail) pueden forzar el 'From' al usuario autenticado
            if (mailFrom != null && !mailFrom.isBlank()) {
                msg.setFrom(mailFrom);
            }
            if (mailReplyTo != null && !mailReplyTo.isBlank()) {
                msg.setReplyTo(mailReplyTo);
            }
            msg.setSubject("Restablecer contraseña");
            msg.setText("""
                    Hola,
                    
                    Recibimos una solicitud para restablecer tu contraseña.
                    Haz clic en el siguiente enlace (expira en %d minutos):
                    
                    %s
                    
                    Si no fuiste tú, ignora este mensaje.
                    """.formatted(expMin, url));
            mailSender.send(msg);
        } catch (MailException ex) {
            log.error("[PasswordReset] Falló el envío de correo a {}: {}", para, ex.getMessage(), ex);
            throw new IllegalStateException("No se pudo enviar el correo de restablecimiento", ex);
        }
    }

    private String buildResetUrl(String tokenPlano) {
        String base = (frontendBaseUrl == null) ? "" : frontendBaseUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        String tokenEnc = URLEncoder.encode(tokenPlano, StandardCharsets.UTF_8);
        return base + "/reset-password?token=" + tokenEnc;
    }

    private static String generarTokenSeguro() {
        byte[] bytes = new byte[32]; // 256 bits
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256Hex(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] d = md.digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 no disponible", e);
        }
    }

    private static String ocultar(String email) {
        if (email == null) return "(null)";
        int i = email.indexOf('@');
        if (i <= 1) return "***" + email.substring(Math.max(i, 0));
        return email.charAt(0) + "***" + email.substring(i);
    }
}
