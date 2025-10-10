package com.soyanga.soyangabackend.seguridad.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.security.Key;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;

@Component
public class JwtService {

    private final Key key;

    @Getter
    private final long accessTtlSeconds;

    @Getter
    private final long refreshTtlSeconds;

    public JwtService(
            @Value("${app.jwt.secret}") String secretBase64,
            @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds,      // 15 min
            @Value("${app.jwt.refresh-ttl-seconds:604800}") long refreshTtlSeconds  // 7 días
    ) {
        // El secret debe llegar en Base64. Si no, podrías usar:
        // this.key = Keys.hmacShaKeyFor(secretPlain.getBytes(StandardCharsets.UTF_8));
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secretBase64));
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    /* ===================== Emisión ===================== */

    /**
     * Genera access token.
     * Si pasas authorities != null y no vacío, las coloca en el claim "auth" (lista de strings).
     * Si usas la “Opción B” (authorities desde BD por request), pásalo como null.
     */
    public String generateAccessToken(String username, Collection<String> authorities) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("token_use", "access");
        if (authorities != null && !authorities.isEmpty()) {
            claims.put("auth", new ArrayList<>(authorities));
        }
        return buildToken(claims, username, accessTtlSeconds);
    }

    /** Genera refresh token. */
    public String generateRefreshToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("token_use", "refresh");
        return buildToken(claims, username, refreshTtlSeconds);
    }

    private String buildToken(Map<String, Object> claims, String subject, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(ttlSeconds)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /* ===================== Lectura / validación ===================== */

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isExpired(String token) {
        Date exp = extractClaim(token, Claims::getExpiration);
        return exp.before(new Date());
    }

    /** Valida subject y expiración. */
    public boolean isValid(String token, String usernameExpected) {
        String username = extractUsername(token);
        return username.equalsIgnoreCase(usernameExpected) && !isExpired(token);
    }

    public String getTokenUse(String token) {
        return extractClaim(token, c -> (String) c.get("token_use"));
    }

    public boolean isAccessToken(String token) {
        return "access".equalsIgnoreCase(getTokenUse(token));
    }

    public boolean isRefreshToken(String token) {
        return "refresh".equalsIgnoreCase(getTokenUse(token));
    }

    /**
     * Tolerancia de reloj (60s) para evitar falsos expirados.
     * Usa el parser de jjwt 0.12+ (verifyWith + clockSkewSeconds).
     */
    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser()
                .verifyWith((SecretKey) key)
                .clockSkewSeconds(60)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }

    /* ===================== Helpers de claims ===================== */

    /**
     * Devuelve un claim específico y lo intenta convertir al tipo indicado.
     * - Si el valor ya es del tipo pedido: se castea y retorna.
     * - Si pediste List y el valor es Collection: crea una ArrayList.
     * - Si pediste String: hace toString().
     * - Si el claim no existe: devuelve null.
     */
    @SuppressWarnings("unchecked")
    public <T> T getClaim(String token, String claimName, Class<T> type) {
        Object raw = extractClaim(token, c -> c.get(claimName));
        if (raw == null) return null;

        if (type.isInstance(raw)) {
            return type.cast(raw);
        }

        // Conversión suave para algunos casos comunes
        if (type == List.class && raw instanceof Collection<?> col) {
            return (T) new ArrayList<>(col);
        }
        if (type == String.class) {
            return (T) raw.toString();
        }

        // Último recurso: intentar cast directo (puede lanzar ClassCastException si no es compatible)
        return (T) raw;
    }

    /**
     * Conveniencia: lee el claim "auth" como lista de strings (si existe).
     */
    @SuppressWarnings("unchecked")
    public List<String> getAuthoritiesClaim(String token) {
        Object raw = extractClaim(token, c -> c.get("auth"));
        if (raw == null) return null;
        if (raw instanceof Collection<?> col) {
            return col.stream().map(Object::toString).toList();
        }
        return List.of(raw.toString().split("\\s*,\\s*"));
    }
}
