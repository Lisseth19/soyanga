package com.soyanga.soyangabackend.seguridad.jwt;

import io.jsonwebtoken.*;
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
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-ttl-seconds:900}") long accessTtlSeconds,     // 15 min
            @Value("${app.jwt.refresh-ttl-seconds:604800}") long refreshTtlSeconds // 7 días
    ) {
        this.key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }

    public String generateAccessToken(String username, Collection<String> authorities) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("auth", authorities);
        return buildToken(claims, username, accessTtlSeconds);
    }

    public String generateRefreshToken(String username) {
        return buildToken(Collections.emptyMap(), username, refreshTtlSeconds);
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

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        // En 0.12.x:
        Claims claims = Jwts.parser()
                .verifyWith((SecretKey) key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return resolver.apply(claims);
    }

    public boolean isValid(String token, String usernameExpected) {
        String username = extractUsername(token);
        return username.equalsIgnoreCase(usernameExpected) && !isExpired(token);
    }

    public boolean isExpired(String token) {
        Date exp = extractClaim(token, Claims::getExpiration);
        return exp.before(new Date());
    }

}
