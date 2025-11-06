package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
// import com.soyanga.soyangabackend.repositorio.BaseRepository; // si lo tienes, úsalo
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// Si NO tienes BaseRepository, usa JpaRepository
public interface AlmacenRepositorio extends org.springframework.data.jpa.repository.JpaRepository<Almacen, Long> {

  @Modifying
  @Transactional
  @Query("update Almacen a set a.estadoActivo = :activo where a.idAlmacen = :id")
  int updateEstado(@Param("id") Long id, @Param("activo") boolean activo);

  // === Opción A (JPQL + constructor DTO) ===
  @Query("""
         SELECT new com.soyanga.soyangabackend.dto.common.OpcionIdNombre(a.idAlmacen, a.nombreAlmacen)
         FROM Almacen a
         WHERE (:incluirInactivos = TRUE OR a.estadoActivo = TRUE)
         ORDER BY a.nombreAlmacen ASC
         """)
  List<OpcionIdNombre> opciones(@Param("incluirInactivos") boolean incluirInactivos);

  List<Almacen> findByIdSucursalAndEstadoActivoTrue(Long idSucursal);

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
        AND (:incluirInactivos = TRUE OR a.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC, a.nombre_almacen ASC, a.id_almacen ASC
      """, countQuery = """
      SELECT COUNT(*)
      FROM almacenes a
      JOIN sucursales s ON s.id_sucursal = a.id_sucursal
      WHERE (:q IS NULL
             OR a.nombre_almacen ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR COALESCE(a.descripcion,'') ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        AND (:idSucursal IS NULL OR a.id_sucursal = :idSucursal)
        AND (:incluirInactivos = TRUE OR a.estado_activo = TRUE)
      """, nativeQuery = true)
  Page<AlmacenListadoProjection> listar(
          @Param("q") String q,
          @Param("idSucursal") Long idSucursal,
          @Param("incluirInactivos") boolean incluirInactivos,
          Pageable pageable);

  // === Duplicados (sucursal + nombre) ===
  boolean existsByIdSucursalAndNombreAlmacenIgnoreCase(Long idSucursal, String nombreAlmacen);

  boolean existsByIdSucursalAndNombreAlmacenIgnoreCaseAndIdAlmacenNot(Long idSucursal, String nombreAlmacen, Long idAlmacen);

  // (Opcional: lo usas en otros lados)
  boolean existsByIdSucursal(Long idSucursal);
}
