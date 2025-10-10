package com.soyanga.soyangabackend.seguridad.jwt;

import com.soyanga.soyangabackend.servicio.seguridad.UsuarioDetallesService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioDetallesService userDetailsService;

    private static final AntPathMatcher PATHS = new AntPathMatcher();
    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/v3/api-docs/**",
            "/swagger-ui.html",
            "/swagger-ui/**"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Evita filtrar preflight y endpoints públicos
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;
        String path = request.getRequestURI();
        for (String p : PUBLIC_PATHS) {
            if (PATHS.match(p, path)) return true;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        // Si ya hay Authentication, continúa
        Authentication already = SecurityContextHolder.getContext().getAuthentication();
        if (already != null) {
            chain.doFilter(req, res);
            return;
        }

        final String authHeader = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(req, res);
            return;
        }

        final String token = authHeader.substring(7).trim();
        String username;
        try {
            if (jwtService.isExpired(token)) { // si tienes isValid que chequea exp+subject, puedes usarlo
                chain.doFilter(req, res);
                return;
            }
            username = jwtService.extractUsername(token);
        } catch (Exception e) {
            chain.doFilter(req, res);
            return;
        }

        if (username == null || username.isBlank()) {
            chain.doFilter(req, res);
            return;
        }

        // 1) Intentar autoridades desde el claim "auth"
        List<String> authList = null;
        try {
            authList = jwtService.getClaim(token, "auth", List.class);
        } catch (Exception ignored) { /* no hay claim o formato distinto */ }

        List<SimpleGrantedAuthority> authorities = null;
        if (authList != null && !authList.isEmpty()) {
            authorities = authList.stream()
                    .filter(Objects::nonNull)
                    .map(String::valueOf)
                    .filter(s -> !s.isBlank())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
        }

        // 2) Si no hubo claim, fallback: cargar UserDetails desde BD (debe traer permisos)
        if (authorities == null || authorities.isEmpty()) {
            var userDetails = userDetailsService.loadUserByUsername(username);
            authorities = userDetails.getAuthorities().stream()
                    .map(a -> new SimpleGrantedAuthority(a.getAuthority()))
                    .collect(Collectors.toList());
        }

        // Autenticar contexto
        var authToken = new UsernamePasswordAuthenticationToken(username, null, authorities);
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
        SecurityContextHolder.getContext().setAuthentication(authToken);

        chain.doFilter(req, res);
    }
}
