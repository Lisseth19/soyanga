package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Sucursal;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.dto.sucursales.SucursalListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Repositorio unificado de Sucursales.
 * Conserva variantes con incluirInactivos y con soloActivos para compatibilidad.
 */
public interface SucursalRepositorio extends BaseRepository<Sucursal, Long> {

  // ========================
  // Mutaciones / Estado
  // ========================
  /** UPDATE performante para cambiar estado. */
  @Modifying
  @Transactional
  @Query("update Sucursal s set s.estadoActivo = :activo where s.idSucursal = :id")
  int updateEstado(@Param("id") Long id, @Param("activo") boolean activo);

  // ========================
  // Listados paginados
  // ========================

  /** Variante A: control por incluirInactivos (TRUE = todos; FALSE = solo activos). */
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
        AND (:incluirInactivos = TRUE OR s.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC
      """,
          countQuery = """
      SELECT COUNT(*)
      FROM sucursales s
      WHERE (:q IS NULL
             OR s.nombre_sucursal ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
             OR s.ciudad          ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
        AND (:ciudad IS NULL OR s.ciudad ILIKE CONCAT('%', CAST(:ciudad AS TEXT), '%'))
        AND (:incluirInactivos = TRUE OR s.estado_activo = TRUE)
      """,
          nativeQuery = true)
  Page<SucursalListadoProjection> listarConIncluirInactivos(
          @Param("q") String q,
          @Param("ciudad") String ciudad,
          @Param("incluirInactivos") boolean incluirInactivos,
          Pageable pageable
  );

  /** Variante B: control por soloActivos (FALSE = todos; TRUE = solo activos). */
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
  Page<SucursalListadoProjection> listarConSoloActivos(
          @Param("q") String q,
          @Param("ciudad") String ciudad,
          @Param("soloActivos") boolean soloActivos,
          Pageable pageable
  );

  // ========================
  // Opciones para combos
  // ========================

  /** Variante A: opciones con incluirInactivos. */
  @Query(value = """
      SELECT s.id_sucursal AS id, s.nombre_sucursal AS nombre
      FROM sucursales s
      WHERE (:incluirInactivos = TRUE OR s.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opcionesConIncluirInactivos(@Param("incluirInactivos") boolean incluirInactivos);

  /** Variante B: opciones con soloActivos. */
  @Query(value = """
      SELECT s.id_sucursal AS id, s.nombre_sucursal AS nombre
      FROM sucursales s
      WHERE (:soloActivos = FALSE OR s.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opcionesConSoloActivos(@Param("soloActivos") boolean soloActivos);


  /** Opciones para combos. */
  @Query(value = """
      SELECT s.id_sucursal AS id, s.nombre_sucursal AS nombre
      FROM sucursales s
      WHERE (:incluirInactivos = TRUE OR s.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opciones(@Param("incluirInactivos") boolean incluirInactivos);
}
