package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioDetallesService implements UserDetailsService {

    private final UsuarioRepositorio usuarioRepo;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        var user = usuarioRepo.findByNombreUsuarioIgnoreCase(usernameOrEmail)
                .or(() -> usuarioRepo.findByCorreoElectronicoIgnoreCase(usernameOrEmail))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (user.getEstadoActivo() != null && !user.getEstadoActivo()) {
            throw new UsernameNotFoundException("Usuario inactivo");
        }

        var roles = usuarioRepo.rolesDeUsuario(user.getIdUsuario());
        var permisos = usuarioRepo.permisosDeUsuario(user.getIdUsuario());

        var authorities = new java.util.ArrayList<SimpleGrantedAuthority>();
        authorities.addAll(roles.stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .collect(Collectors.toList()));
        authorities.addAll(permisos.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList()));

        return User.withUsername(
                        user.getNombreUsuario() != null ? user.getNombreUsuario() : user.getCorreoElectronico()
                )
                .password(user.getContrasenaHash())
                .authorities(authorities)
                .accountLocked(false).accountExpired(false)
                .credentialsExpired(false).disabled(false)
                .build();
    }
}
