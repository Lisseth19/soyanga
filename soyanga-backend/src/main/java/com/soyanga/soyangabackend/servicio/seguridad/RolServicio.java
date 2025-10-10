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

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RolServicio {

    private final RolRepositorio repo;
    private final UsuarioRolRepositorio userRolRepo;
    private final RolPermisoRepositorio rolPermRepo;
    private final PermisoRepositorio permisoRepo;

    @Transactional(readOnly = true)
    public Page<RolRespuestaDTO> listar(String q, Pageable pageable) {
        var page = repo.listar((q == null || q.isBlank()) ? null : q.trim(), pageable);
        return page.map(r -> RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                // si tu projection no trae estadoActivo, no lo seteamos aquí
                .permisos(List.of()) // tipo correcto: List<PermisoRespuestaDTO>
                .estadoActivo(r.getEstadoActivo())
                .build());
    }

    @Transactional(readOnly = true)
    public RolRespuestaDTO obtener(Long id) {
        var r = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));
        var permisos = listarPermisosDelRol(id); // List<PermisoRespuestaDTO>
        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .estadoActivo(r.getEstadoActivo())
                .permisos(permisos)
                .build();
    }

    @Transactional
    public RolRespuestaDTO crear(RolCrearDTO dto) {
        var nombre = Optional.ofNullable(dto.getNombreRol()).orElse("").trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre del rol es obligatorio");

        repo.findByNombreRolIgnoreCase(nombre)
                .ifPresent(x -> { throw new IllegalArgumentException("Nombre de rol ya existe"); });

        var estado = dto.getEstadoActivo() != null ? dto.getEstadoActivo() : Boolean.TRUE;

        var r = repo.save(Rol.builder()
                .nombreRol(nombre)
                .descripcion(blankToNull(dto.getDescripcion()))
                .estadoActivo(estado)
                .build());

        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .estadoActivo(r.getEstadoActivo())
                .permisos(List.of())
                .build();
    }

    @Transactional
    public RolRespuestaDTO editar(Long id, RolEditarDTO dto) {
        var r = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));

        var nombre = Optional.ofNullable(dto.getNombreRol()).orElse("").trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre del rol es obligatorio");

        if (!r.getNombreRol().equalsIgnoreCase(nombre)) {
            repo.findByNombreRolIgnoreCase(nombre)
                    .ifPresent(x -> { throw new IllegalArgumentException("Nombre de rol ya existe"); });
        }

        r.setNombreRol(nombre);
        r.setDescripcion(blankToNull(dto.getDescripcion()));
        if (dto.getEstadoActivo() != null) r.setEstadoActivo(dto.getEstadoActivo());

        r = repo.save(r);

        var permisos = listarPermisosDelRol(id);
        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .estadoActivo(r.getEstadoActivo())
                .permisos(permisos)
                .build();
    }

    @Transactional
    public RolRespuestaDTO cambiarEstado(Long id, RolEstadoDTO dto) {
        var r = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + id));
        r.setEstadoActivo(dto.getEstadoActivo());
        r = repo.save(r);
        var permisos = listarPermisosDelRol(id);
        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .estadoActivo(r.getEstadoActivo())
                .permisos(permisos)
                .build();
    }

    @Transactional
    public void eliminar(Long id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("Rol no encontrado: " + id);
        long asignaciones = userRolRepo.countByIdRol(id);
        if (asignaciones > 0) {
            throw new IllegalStateException("No se puede eliminar, el rol está asignado a " + asignaciones + " usuario(s).");
        }
        rolPermRepo.deleteByIdRol(id);
        repo.deleteById(id);
    }

    @Transactional
    public RolRespuestaDTO asignarPermisos(Long idRol, RolAsignarPermisosDTO dto) {
        var r = repo.findById(idRol).orElseThrow(() -> new IllegalArgumentException("Rol no encontrado: " + idRol));

        rolPermRepo.deleteByIdRol(idRol);
        if (dto.getPermisos() != null && !dto.getPermisos().isEmpty()) {
            for (Long idPerm : dto.getPermisos()) {
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

        var permisos = listarPermisosDelRol(idRol); // detalle
        return RolRespuestaDTO.builder()
                .idRol(r.getIdRol())
                .nombreRol(r.getNombreRol())
                .descripcion(r.getDescripcion())
                .estadoActivo(r.getEstadoActivo())
                .permisos(permisos)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PermisoRespuestaDTO> listarPermisosDelRol(Long idRol) {
        var ids = rolPermRepo.findByIdRol(idRol).stream()
                .map(rp -> rp.getIdPermiso())
                .toList();

        if (ids.isEmpty()) return List.of();

        var permisos = permisoRepo.findAllById(ids);

        // 🔒 SIN reflection: usa los getters reales de tu entidad Permiso
        return permisos.stream()
                .map(p -> PermisoRespuestaDTO.builder()
                        .idPermiso(p.getIdPermiso())          // <-- ajusta si tu getter se llama distinto
                        .nombrePermiso(p.getNombrePermiso())  // <-- ajusta si es getCodigo()/getNombre()
                        .descripcion(p.getDescripcion())
                        .estadoActivo(p.getEstadoActivo())
                        .build())
                .toList();
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
