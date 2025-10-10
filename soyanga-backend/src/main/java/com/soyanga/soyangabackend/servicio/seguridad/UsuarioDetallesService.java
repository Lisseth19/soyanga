package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UsuarioDetallesService implements UserDetailsService {

    private final UsuarioRepositorio usuarioRepo;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        final var key = usernameOrEmail == null ? "" : usernameOrEmail.trim();

        var user = usuarioRepo.findByNombreUsuarioIgnoreCase(key)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(key))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (Boolean.FALSE.equals(user.getEstadoActivo())) {
            throw new UsernameNotFoundException("Usuario inactivo");
        }

        // IMPORTANTE: asegúrate que estos métodos ya filtran por roles/permisos activos en DB
        var roles = usuarioRepo.rolesDeUsuario(user.getIdUsuario());       // p.ej. ["ADMIN","VENTAS"]
        var permisos = usuarioRepo.permisosDeUsuario(user.getIdUsuario()); // p.ej. ["permisos:read","roles:write",...]

        // Evita duplicados y nulls
        Set<SimpleGrantedAuthority> authorities = new LinkedHashSet<>();

        // Si usas hasRole("...") en algún lugar, mantén roles:
        for (String r : roles) {
            if (r == null || r.isBlank()) continue;
            var roleName = r.trim();
            // añade prefijo ROLE_ solo si no está
            if (!roleName.startsWith("ROLE_")) {
                roleName = "ROLE_" + roleName.toUpperCase();
            }
            authorities.add(new SimpleGrantedAuthority(roleName));
        }

        // Permisos tal cual los definiste en la tabla (deben coincidir EXACTO con hasAuthority("..."))
        for (String p : permisos) {
            if (p == null || p.isBlank()) continue;
            authorities.add(new SimpleGrantedAuthority(p.trim()));
        }

        // Elige un identificador estable para el username del UserDetails (debe coincidir con el 'sub' del JWT)
        final String principalUsername = user.getNombreUsuario(); // recomendado: siempre nombre de usuario

        return User.withUsername(principalUsername)
                .password(user.getContrasenaHash())
                .authorities(authorities)
                .accountLocked(false).accountExpired(false)
                .credentialsExpired(false).disabled(false)
                .build();
    }
}
