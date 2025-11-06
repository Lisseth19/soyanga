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

public interface SucursalRepositorio extends BaseRepository<Sucursal, Long> {

  /** UPDATE performante para cambiar estado. */
  @Modifying
  @Transactional
  @Query("update Sucursal s set s.estadoActivo = :activo where s.idSucursal = :id")
  int updateEstado(@Param("id") Long id, @Param("activo") boolean activo);

  /** Listado (usa incluirInactivos como en Almacenes). */
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
  Page<SucursalListadoProjection> listar(
          @Param("q") String q,
          @Param("ciudad") String ciudad,
          @Param("incluirInactivos") boolean incluirInactivos,
          Pageable pageable
  );

  /** Opciones para combos. */
  @Query(value = """
      SELECT s.id_sucursal AS id, s.nombre_sucursal AS nombre
      FROM sucursales s
      WHERE (:incluirInactivos = TRUE OR s.estado_activo = TRUE)
      ORDER BY s.nombre_sucursal ASC
      """, nativeQuery = true)
  List<OpcionIdNombre> opciones(@Param("incluirInactivos") boolean incluirInactivos);
}
