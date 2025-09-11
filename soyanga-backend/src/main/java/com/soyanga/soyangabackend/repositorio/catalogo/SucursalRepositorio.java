package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Sucursal;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.SucursalListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SucursalRepositorio extends BaseRepository<Sucursal, Long> {

    @Query(value = """
        SELECT
          s.id_sucursal       AS idSucursal,
          s.nombre_sucursal   AS nombreSucursal,
          s.direccion         AS direccion,
          s.ciudad            AS ciudad,
          s.estado_activo     AS estadoActivo
        FROM sucursales s
        WHERE (:q IS NULL
               OR s.nombre_sucursal ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR s.ciudad          ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:ciudad IS NULL OR s.ciudad ILIKE CONCAT('%', CAST(:ciudad AS TEXT), '%'))
          AND (:soloActivos = FALSE OR s.estado_activo = TRUE)
        ORDER BY s.nombre_sucursal ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM sucursales s
        WHERE (:q IS NULL
               OR s.nombre_sucursal ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR s.ciudad          ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:ciudad IS NULL OR s.ciudad ILIKE CONCAT('%', CAST(:ciudad AS TEXT), '%'))
          AND (:soloActivos = FALSE OR s.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<SucursalListadoProjection> listar(
            @Param("q") String q,
            @Param("ciudad") String ciudad,
            @Param("soloActivos") boolean soloActivos,
            Pageable pageable
    );

    @Query(value = """
        SELECT s.id_sucursal AS id, s.nombre_sucursal AS nombre
        FROM sucursales s
        WHERE (:soloActivos = FALSE OR s.estado_activo = TRUE)
        ORDER BY s.nombre_sucursal ASC
        """, nativeQuery = true)
    List<OpcionIdNombre> opciones(@Param("soloActivos") boolean soloActivos);
}
