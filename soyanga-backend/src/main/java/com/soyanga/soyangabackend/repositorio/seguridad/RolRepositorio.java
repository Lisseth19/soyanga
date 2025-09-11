package com.soyanga.soyangabackend.repositorio.seguridad;

import com.soyanga.soyangabackend.dominio.Rol;
import com.soyanga.soyangabackend.dto.seguridad.RolListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RolRepositorio extends BaseRepository<Rol, Long> {

    Optional<Rol> findByNombreRolIgnoreCase(String nombreRol);

    @Query(value = """
        SELECT r.id_rol AS idRol, r.nombre_rol AS nombreRol, r.descripcion AS descripcion
        FROM roles r
        WHERE (:q IS NULL OR r.nombre_rol ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        ORDER BY r.nombre_rol ASC, r.id_rol ASC
        """,
            countQuery = """
        SELECT COUNT(*) FROM roles r
        WHERE (:q IS NULL OR r.nombre_rol ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        """,
            nativeQuery = true)
    Page<RolListadoProjection> listar(@Param("q") String q, Pageable pageable);
}
