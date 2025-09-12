package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Usuario;
import com.soyanga.soyangabackend.dominio.UsuarioRol;
import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.RolRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRolRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class UsuarioServicio {

    private final UsuarioRepositorio repo;
    private final UsuarioRolRepositorio userRolRepo;
    private final RolRepositorio rolRepo;
    private final PasswordEncoder passwordEncoder;

    public Page<UsuarioRespuestaDTO> listar(String q, boolean soloActivos, Pageable pageable) {
        var page = repo.listar((q == null || q.isBlank()) ? null : q.trim(), soloActivos, pageable);
        return page.map(p -> UsuarioRespuestaDTO.builder()
                .idUsuario(p.getIdUsuario())
                .nombreCompleto(p.getNombreCompleto())
                .correoElectronico(p.getCorreoElectronico())
                .telefono(p.getTelefono())
                .nombreUsuario(p.getNombreUsuario())
                .estadoActivo(p.getEstadoActivo())
                .roles(List.of()) // se puede enriquecer con otra consulta si quieres
                .build());
    }

    public UsuarioRespuestaDTO obtener(Long id) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        return toDTOConRoles(u);
    }

    @Transactional
    public UsuarioRespuestaDTO crear(UsuarioCrearDTO dto) {
        // unicidad
        repo.findByCorreoElectronicoIgnoreCase(dto.getCorreoElectronico())
                .ifPresent(x -> { throw new IllegalArgumentException("Correo ya registrado"); });
        repo.findByNombreUsuarioIgnoreCase(dto.getNombreUsuario())
                .ifPresent(x -> { throw new IllegalArgumentException("Nombre de usuario ya registrado"); });

        var u = Usuario.builder()
                .nombreCompleto(dto.getNombreCompleto())
                .correoElectronico(dto.getCorreoElectronico())
                .telefono(dto.getTelefono())
                .nombreUsuario(dto.getNombreUsuario())
                .contrasenaHash(passwordEncoder.encode(dto.getContrasena()))
                .estadoActivo(dto.getEstadoActivo() == null ? Boolean.TRUE : dto.getEstadoActivo())
                .build();

        u = repo.save(u);
        return toDTOConRoles(u);
    }

    @Transactional
    public UsuarioRespuestaDTO editar(Long id, UsuarioEditarDTO dto) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));

        // si cambian email / username, valida unicidad
        if (!u.getCorreoElectronico().equalsIgnoreCase(dto.getCorreoElectronico())) {
            repo.findByCorreoElectronicoIgnoreCase(dto.getCorreoElectronico())
                    .ifPresent(x -> { throw new IllegalArgumentException("Correo ya registrado"); });
        }
        if (!u.getNombreUsuario().equalsIgnoreCase(dto.getNombreUsuario())) {
            repo.findByNombreUsuarioIgnoreCase(dto.getNombreUsuario())
                    .ifPresent(x -> { throw new IllegalArgumentException("Nombre de usuario ya registrado"); });
        }

        u.setNombreCompleto(dto.getNombreCompleto());
        u.setCorreoElectronico(dto.getCorreoElectronico());
        u.setTelefono(dto.getTelefono());
        u.setNombreUsuario(dto.getNombreUsuario());
        if (dto.getEstadoActivo() != null) u.setEstadoActivo(dto.getEstadoActivo());

        u = repo.save(u);
        return toDTOConRoles(u);
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Usuario no encontrado: " + id);
        // limpia asignaciones
        userRolRepo.deleteByIdUsuario(id);
        repo.deleteById(id);
    }

    @Transactional
    public void cambiarPassword(Long id, UsuarioCambiarPasswordDTO dto) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setContrasenaHash(passwordEncoder.encode(dto.getNuevaContrasena()));
        repo.save(u);
    }

    @Transactional
    public UsuarioRespuestaDTO asignarRoles(Long idUsuario, UsuarioAsignarRolesDTO dto) {
        var u = repo.findById(idUsuario).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + idUsuario));

        // reemplaza asignaciones
        userRolRepo.deleteByIdUsuario(idUsuario);
        for (Long idRol : dto.getRolesIds()) {
            var rol = rolRepo.findById(idRol).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + idRol));
            userRolRepo.save(UsuarioRol.builder()
                    .idUsuario(idUsuario)
                    .idRol(rol.getIdRol())
                    .build());
        }
        return toDTOConRoles(u);
    }

    // helpers
    private UsuarioRespuestaDTO toDTOConRoles(Usuario u) {
        var asignaciones = userRolRepo.findByIdUsuario(u.getIdUsuario());
        var rolesMini = new ArrayList<UsuarioRespuestaDTO.RolMiniDTO>();
        for (var ur : asignaciones) {
            rolRepo.findById(ur.getIdRol()).ifPresent(r ->
                    rolesMini.add(UsuarioRespuestaDTO.RolMiniDTO.builder()
                            .idRol(r.getIdRol())
                            .nombreRol(r.getNombreRol())
                            .build()));
        }
        return UsuarioRespuestaDTO.builder()
                .idUsuario(u.getIdUsuario())
                .nombreCompleto(u.getNombreCompleto())
                .correoElectronico(u.getCorreoElectronico())
                .telefono(u.getTelefono())
                .nombreUsuario(u.getNombreUsuario())
                .estadoActivo(u.getEstadoActivo())
                .roles(rolesMini)
                .build();
    }
    @Transactional
    public void cambiarEstado(Long id, boolean activo) {
        var u = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + id));
        u.setEstadoActivo(activo);
        repo.save(u);
    }
}
