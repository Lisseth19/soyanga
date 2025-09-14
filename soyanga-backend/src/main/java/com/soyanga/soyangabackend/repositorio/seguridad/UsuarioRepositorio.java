package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.Usuario;
import com.soyanga.soyangabackend.dto.seguridad.UsuarioListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepositorio extends BaseRepository<Usuario, Long> {

    Optional<Usuario> findByCorreoElectronicoIgnoreCase(String correoElectronico);
    Optional<Usuario> findByNombreUsuarioIgnoreCase(String nombreUsuario);

    @Query(value = """
        SELECT 
          u.id_usuario           AS idUsuario,
          u.nombre_completo      AS nombreCompleto,
          u.correo_electronico   AS correoElectronico,
          u.telefono             AS telefono,
          u.nombre_usuario       AS nombreUsuario,
          u.estado_activo        AS estadoActivo
        FROM usuarios u
        WHERE (:q IS NULL
               OR u.nombre_completo    ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR u.correo_electronico ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR u.nombre_usuario     ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR u.estado_activo = TRUE)
        ORDER BY u.nombre_completo ASC, u.id_usuario ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM usuarios u
        WHERE (:q IS NULL
               OR u.nombre_completo    ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR u.correo_electronico ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR u.nombre_usuario     ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR u.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<UsuarioListadoProjection> listar(@Param("q") String q,
                                          @Param("soloActivos") boolean soloActivos,
                                          Pageable pageable);
}
