package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
// Usa este import si ya tienes BaseRepository; si no, comenta esta línea
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Si NO tienes BaseRepository aún, cambia la siguiente línea por:
// public interface AlmacenRepositorio extends org.springframework.data.jpa.repository.JpaRepository<Almacen, Long> {
public interface AlmacenRepositorio extends BaseRepository<Almacen, Long> {

    // Para el combo "opciones" (id, nombre) — mantiene tu endpoint /almacenes/opciones
    @Query(value = """
        SELECT a.id_almacen AS id, a.nombre_almacen AS nombre
        FROM almacenes a
        WHERE (:soloActivos = false OR a.estado_activo = TRUE)
        ORDER BY a.nombre_almacen ASC
        """, nativeQuery = true)
    List<OpcionIdNombre> opciones(@Param("soloActivos") boolean soloActivos);

    // Extra útil si filtras por sucursal
    List<Almacen> findByIdSucursalAndEstadoActivoTrue(Long idSucursal);

    // Listado paginado con filtros
    @Query(value = """
        SELECT 
          a.id_almacen        AS idAlmacen,
          a.nombre_almacen    AS nombreAlmacen,
          a.descripcion       AS descripcion,
          a.estado_activo     AS estadoActivo,
          a.id_sucursal       AS idSucursal,
          s.nombre_sucursal   AS sucursal
        FROM almacenes a
        JOIN sucursales s ON s.id_sucursal = a.id_sucursal
        WHERE (:q IS NULL 
               OR a.nombre_almacen ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR COALESCE(a.descripcion,'') ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:idSucursal IS NULL OR a.id_sucursal = :idSucursal)
          AND (:soloActivos = FALSE OR a.estado_activo = TRUE)
        ORDER BY s.nombre_sucursal ASC, a.nombre_almacen ASC, a.id_almacen ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM almacenes a
        JOIN sucursales s ON s.id_sucursal = a.id_sucursal
        WHERE (:q IS NULL 
               OR a.nombre_almacen ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR COALESCE(a.descripcion,'') ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:idSucursal IS NULL OR a.id_sucursal = :idSucursal)
          AND (:soloActivos = FALSE OR a.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<AlmacenListadoProjection> listar(
            @Param("q") String q,
            @Param("idSucursal") Long idSucursal,
            @Param("soloActivos") boolean soloActivos,
            Pageable pageable
    );

    boolean existsByIdSucursal(Long idSucursal);
}
