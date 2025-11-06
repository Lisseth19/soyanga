package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsuarioDetallesService implements UserDetailsService {

    private final UsuarioRepositorio usuarioRepo;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        final var key = usernameOrEmail == null ? "" : usernameOrEmail.trim();

        var user = usuarioRepo.findByNombreUsuarioIgnoreCase(key)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(key))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        final boolean enabled = Boolean.TRUE.equals(user.getEstadoActivo());

        // IMPORTANTE: que rolesDeUsuario / permisosDeUsuario ya excluyan lo que esté deshabilitado a nivel BD
        var roles = usuarioRepo.rolesDeUsuario(user.getIdUsuario());        // p.ej. ["ADMIN","VENTAS"]
        var permisos = usuarioRepo.permisosDeUsuario(user.getIdUsuario());  // p.ej. ["usuarios:ver","usuarios:cambiar-password",...]

        Set<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();

        // Roles -> ROLE_*
        if (roles != null) {
            for (String r : roles) {
                if (r == null || r.isBlank()) continue;
                String roleName = r.trim();
                if (!roleName.startsWith("ROLE_")) {
                    roleName = "ROLE_" + roleName.toUpperCase();
                }
                authorities.add(new SimpleGrantedAuthority(roleName));
            }
        }

        // Permisos tal cual
        if (permisos != null) {
            for (String p : permisos) {
                if (p == null || p.isBlank()) continue;
                authorities.add(new SimpleGrantedAuthority(p.trim()));
            }
        }

        // El principal debe ser el nombre de usuario (coincide con lo que usa tu getCurrentUserId())
        final String principalUsername = Objects.requireNonNullElse(user.getNombreUsuario(), "").trim();

        return User.withUsername(principalUsername)
                .password(user.getContrasenaHash())
                .authorities(authorities)
                .accountLocked(false)
                .accountExpired(false)
                .credentialsExpired(false)
                .disabled(!enabled) // << clave: en vez de lanzar excepción, dejamos disabled si corresponde
                .build();
    }
}
