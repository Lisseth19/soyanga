package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.seguridad.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServicio {

    private final AuthenticationManager authManager;
    private final UsuarioDetallesService userDetailsService;
    private final UsuarioRepositorio usuarioRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;

    public AuthTokensDTO login(AuthLoginDTO dto) {
        // Autenticar credenciales
        var authReq = UsernamePasswordAuthenticationToken.unauthenticated(dto.getUsuarioOEmail(), dto.getPassword());
        authManager.authenticate(authReq);

        // Cargar usuario y autoridades
        var userDetails = userDetailsService.loadUserByUsername(dto.getUsuarioOEmail());

        var access = jwt.generateAccessToken(userDetails.getUsername(),
                userDetails.getAuthorities().stream().map(a -> a.getAuthority()).toList());
        var refresh = jwt.generateRefreshToken(userDetails.getUsername());

        return AuthTokensDTO.builder()
                .tokenType("Bearer")
                .accessToken(access)
                .expiresIn(jwt.getAccessTtlSeconds())
                .refreshToken(refresh)
                .build();
    }

    public AuthTokensDTO refresh(String refreshToken) {
        var username = jwt.extractUsername(refreshToken);
        var valid = !jwt.isExpired(refreshToken);
        if (!valid) throw new IllegalArgumentException("Refresh token inválido");

        var userDetails = userDetailsService.loadUserByUsername(username);
        var access = jwt.generateAccessToken(userDetails.getUsername(),
                userDetails.getAuthorities().stream().map(a -> a.getAuthority()).toList());
        var newRefresh = jwt.generateRefreshToken(userDetails.getUsername());

        return AuthTokensDTO.builder()
                .tokenType("Bearer")
                .accessToken(access)
                .expiresIn(jwt.getAccessTtlSeconds())
                .refreshToken(newRefresh)
                .build();
    }

    public PerfilDTO perfil(String usernameOrEmail) {
        var u = usuarioRepo.findByNombreUsuarioIgnoreCase(usernameOrEmail)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(usernameOrEmail))
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var roles = new HashSet<>(usuarioRepo.rolesDeUsuario(u.getIdUsuario()));
        var permisos = new HashSet<>(usuarioRepo.permisosDeUsuario(u.getIdUsuario()));

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
}
