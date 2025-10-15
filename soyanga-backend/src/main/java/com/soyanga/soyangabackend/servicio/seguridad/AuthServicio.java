package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.AuthLoginDTO;
import com.soyanga.soyangabackend.dto.seguridad.AuthTokensDTO;
import com.soyanga.soyangabackend.dto.seguridad.PerfilDTO;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.seguridad.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;

@Service
@RequiredArgsConstructor
public class AuthServicio {

    private final AuthenticationManager authManager;
    private final UsuarioDetallesService userDetailsService;
    private final UsuarioRepositorio usuarioRepo;
    private final JwtService jwt;

    /**
     * Autentica credenciales y devuelve tokens.
     * - Si falla, lanza BadCredentialsException → 401 (mapeado por tu ControllerAdvice).
     * - Access token SIN authorities (Opción B: authorities desde DB por request).
     */
    public AuthTokensDTO login(AuthLoginDTO dto) {
        final Authentication auth;
        try {
            var authReq = UsernamePasswordAuthenticationToken.unauthenticated(
                    dto.getUsuarioOEmail(), dto.getPassword()
            );
            auth = authManager.authenticate(authReq);
        } catch (AuthenticationException ex) {
            throw new BadCredentialsException("Usuario o contraseña inválidos", ex);
        }

        // Reutiliza el principal del Authentication para evitar doble consulta
        var principal = auth.getPrincipal();
        UserDetails userDetails = (principal instanceof UserDetails)
                ? (UserDetails) principal
                : userDetailsService.loadUserByUsername(dto.getUsuarioOEmail());

        // Access SIN authorities dentro del JWT
        String access  = jwt.generateAccessToken(userDetails.getUsername(), null);
        String refresh = jwt.generateRefreshToken(userDetails.getUsername());

        return AuthTokensDTO.builder()
                .tokenType("Bearer")
                .accessToken(access)
                .expiresIn(jwt.getAccessTtlSeconds())
                .refreshToken(refresh) // tu controlador lo pondrá en cookie httpOnly
                // .refreshExpiresIn(jwt.getRefreshTtlSeconds()) // <-- descomenta si tu DTO lo tiene
                .build();
    }

    /**
     * Refresca el access token usando el refresh token.
     * - Valida tipo de token (debe ser 'refresh') y expiración.
     * - Rota el refresh token (más seguro): devuelve uno nuevo.
     */
    public AuthTokensDTO refresh(String refreshTokenRaw) {
        String rt = refreshTokenRaw == null ? "" : refreshTokenRaw.replace("\"", "").trim();
        if (rt.isBlank()) throw new BadCredentialsException("Refresh token inválido");

        final String username;
        try {
            if (!jwt.isRefreshToken(rt)) {
                throw new BadCredentialsException("Tipo de token inválido para refresh");
            }
            if (jwt.isExpired(rt)) {
                throw new BadCredentialsException("Refresh token expirado");
            }
            username = jwt.extractUsername(rt);
        } catch (RuntimeException ex) {
            throw new BadCredentialsException("Refresh token inválido", ex);
        }

        // Revalida usuario vigente; authorities se cargarán desde DB por request
        UserDetails user = userDetailsService.loadUserByUsername(username);

        String newAccess  = jwt.generateAccessToken(user.getUsername(), null);
        String newRefresh = jwt.generateRefreshToken(user.getUsername()); // rotación recomendada

        return AuthTokensDTO.builder()
                .tokenType("Bearer")
                .accessToken(newAccess)
                .expiresIn(jwt.getAccessTtlSeconds())
                .refreshToken(newRefresh) // si NO quieres rotar, pon null aquí
                // .refreshExpiresIn(jwt.getRefreshTtlSeconds()) // <-- descomenta si tu DTO lo tiene
                .build();
    }

    /**
     * Perfil para /auth/me.
     */
    public PerfilDTO perfil(String usernameOrEmail) {
        var u = usuarioRepo.findByNombreUsuarioIgnoreCase(usernameOrEmail)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(usernameOrEmail))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var roles = new LinkedHashSet<>(usuarioRepo.rolesDeUsuario(u.getIdUsuario()));
        var permisos = new LinkedHashSet<>(usuarioRepo.permisosDeUsuario(u.getIdUsuario()));

        return PerfilDTO.builder()
                .idUsuario(u.getIdUsuario())
                .nombreCompleto(u.getNombreCompleto())
                .nombreUsuario(u.getNombreUsuario())
                .correoElectronico(u.getCorreoElectronico())
                .estadoActivo(u.getEstadoActivo())
                .roles(roles)
                .permisos(permisos)
                .build();
    }

    // Útil para setear Max-Age de la cookie httpOnly del refresh en tu controlador
    public long getRefreshTtlSeconds() {
        return jwt.getRefreshTtlSeconds();
    }
}
