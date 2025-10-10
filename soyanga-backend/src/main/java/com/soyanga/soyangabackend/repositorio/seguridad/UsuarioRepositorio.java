package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.Usuario;
import com.soyanga.soyangabackend.dto.seguridad.UsuarioListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepositorio extends BaseRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoElectronicoIgnoreCase(String correoElectronico);
    Optional<Usuario> findByNombreUsuarioIgnoreCase(String nombreUsuario);

    @Query(value = """
        SELECT 
          u.id_usuario         AS idUsuario,
          u.nombre_completo    AS nombreCompleto,
          u.correo_electronico AS correoElectronico,
          u.telefono           AS telefono,
          u.nombre_usuario     AS nombreUsuario,
          u.estado_activo      AS estadoActivo
        FROM usuarios u
        WHERE (COALESCE(:q,'') = ''
               OR u.nombre_completo    ILIKE CONCAT('%', :q, '%')
               OR u.correo_electronico ILIKE CONCAT('%', :q, '%')
               OR u.nombre_usuario     ILIKE CONCAT('%', :q, '%'))
          AND (:soloActivos = FALSE OR u.estado_activo = TRUE)
        ORDER BY u.nombre_completo ASC, u.id_usuario ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM usuarios u
        WHERE (COALESCE(:q,'') = ''
               OR u.nombre_completo    ILIKE CONCAT('%', :q, '%')
               OR u.correo_electronico ILIKE CONCAT('%', :q, '%')
               OR u.nombre_usuario     ILIKE CONCAT('%', :q, '%'))
          AND (:soloActivos = FALSE OR u.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<UsuarioListadoProjection> listar(@Param("q") String q,
                                          @Param("soloActivos") boolean soloActivos,
                                          Pageable pageable);

    @Query(value = """
        SELECT r.nombre_rol
        FROM roles r
        JOIN usuarios_roles ur ON ur.id_rol = r.id_rol
        WHERE ur.id_usuario = :idUsuario
          AND r.estado_activo = TRUE
        ORDER BY r.nombre_rol ASC
        """, nativeQuery = true)
    List<String> rolesDeUsuario(@Param("idUsuario") Long idUsuario);

    @Query(value = """
        SELECT DISTINCT p.nombre_permiso
        FROM usuarios u
        JOIN usuarios_roles ur ON ur.id_usuario = u.id_usuario
        JOIN roles r           ON r.id_rol = ur.id_rol AND r.estado_activo = TRUE
        JOIN roles_permisos rp ON rp.id_rol = r.id_rol
        JOIN permisos p        ON p.id_permiso = rp.id_permiso AND p.estado_activo = TRUE
        WHERE u.id_usuario = :idUsuario
        ORDER BY p.nombre_permiso ASC
        """, nativeQuery = true)
    List<String> permisosDeUsuario(@Param("idUsuario") Long idUsuario);
}
