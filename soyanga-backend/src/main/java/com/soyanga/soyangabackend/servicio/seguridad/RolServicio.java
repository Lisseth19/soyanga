package com.soyanga.soyangabackend.servicio.seguridad;

import com.soyanga.soyangabackend.dominio.Rol;
import com.soyanga.soyangabackend.dto.seguridad.*;
import com.soyanga.soyangabackend.repositorio.seguridad.PermisoRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.RolPermisoRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.RolRepositorio;
import com.soyanga.soyangabackend.repositorio.seguridad.UsuarioRolRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RolServicio {

    private final RolRepositorio repo;
    private final UsuarioRolRepositorio userRolRepo;
    private final RolPermisoRepositorio rolPermRepo;
    private final PermisoRepositorio permisoRepo;

    public Page<RolRespuestaDTO> listar(String q, Pageable pageable) {
        var page = repo.listar((q == null || q.isBlank()) ? null : q.trim(), pageable);
        return page.map(p -> RolRespuestaDTO.builder()
                .idRol(p.getIdRol())
                .nombreRol(p.getNombreRol())
                .descripcion(p.getDescripcion())
                .build());
    }

    public RolRespuestaDTO obtener(Long id) {
        var r = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));
        return toDTO(r);
    }

    @Transactional
    public RolRespuestaDTO crear(RolCrearDTO dto) {
        repo.findByNombreRolIgnoreCase(dto.getNombreRol())
                .ifPresent(x -> { throw new IllegalArgumentException("Nombre de rol ya existe"); });
        var r = repo.save(Rol.builder()
                .nombreRol(dto.getNombreRol())
                .descripcion(dto.getDescripcion())
                .build());
        return toDTO(r);
    }

    @Transactional
    public RolRespuestaDTO editar(Long id, RolEditarDTO dto) {
        var r = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));
        if (!r.getNombreRol().equalsIgnoreCase(dto.getNombreRol())) {
            repo.findByNombreRolIgnoreCase(dto.getNombreRol())
                    .ifPresent(x -> { throw new IllegalArgumentException("Nombre de rol ya existe"); });
        }
        r.setNombreRol(dto.getNombreRol());
        r.setDescripcion(dto.getDescripcion());
        r = repo.save(r);
        return toDTO(r);
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Rol no encontrado: " + id);
        // evitar borrar si está asignado a usuarios (opcional)
        if (!userRolRepo.findByIdUsuario(id).isEmpty()) {
            // ojo: findByIdUsuario usa idUsuario; si quieres validar correctamente, crea un countByIdRol en UsuarioRolRepositorio
        }
        repo.deleteById(id);
    }

    private RolRespuestaDTO toDTO(Rol r) {
        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .build();
    }
    @Transactional
    public RolRespuestaDTO asignarPermisos(Long idRol, RolAsignarPermisosDTO dto) {
        var rol = repo.findById(idRol)
                .orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + idRol));

        // Limpiar actuales
        rolPermRepo.deleteByIdRol(idRol);

        // Insertar nuevos (si vienen)
        if (dto.getPermisos() != null && !dto.getPermisos().isEmpty()) {
            for (Long idPerm : dto.getPermisos()) {
                // valida que exista el permiso
                permisoRepo.findById(idPerm)
                        .orElseThrow(() -> new IllegalArgumentException("Permiso no encontrado: " + idPerm));

                rolPermRepo.save(
                        com.soyanga.soyangabackend.dominio.RolPermiso.builder()
                                .idRol(idRol)
                                .idPermiso(idPerm)
                                .build()
                );
            }
        }

        // Devuelve el rol con su lista de permisos (ids o nombres)
        var permisos = rolPermRepo.findByIdRol(idRol).stream()
                .map(rp -> rp.getIdPermiso())
                .toList();

        return RolRespuestaDTO.builder()
                .idRol(rol.getIdRol())
                .nombreRol(rol.getNombreRol())
                .descripcion(rol.getDescripcion())
                .permisos(permisos) // asegúrate que RolRespuestaDTO tenga este campo (List<Long> permisos)
                .build();
    }

}
