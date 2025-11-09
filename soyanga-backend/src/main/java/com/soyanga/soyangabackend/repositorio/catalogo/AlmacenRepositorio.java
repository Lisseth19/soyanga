package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.Almacen;
import com.soyanga.soyangabackend.dto.catalogo.AlmacenListadoProjection;
import com.soyanga.soyangabackend.dto.catalogo.PresentacionEnAlmacenProjection;
import com.soyanga.soyangabackend.dto.common.OpcionIdNombre;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Repositorio unificado de Almacén.
 *
 * Nota: Si no usas BaseRepository, cambia la extensión a JpaRepository:
 *   public interface AlmacenRepositorio extends org.springframework.data.jpa.repository.JpaRepository<Almacen, Long> { ... }
 */
public interface AlmacenRepositorio extends BaseRepository<Almacen, Long> {

  // ========================
  // Mutaciones / Estado
  // ========================
  @Modifying
  @Transactional
  @Query("update Almacen a set a.estadoActivo = :activo where a.idAlmacen = :id")
  int updateEstado(@Param("id") Long id, @Param("activo") boolean activo);

  // ========================
  // Opciones (dos variantes)
  // ========================

  /** Variante JPQL usando constructor DTO. */
  @Query("""
           SELECT new com.soyanga.soyangabackend.dto.common.OpcionIdNombre(a.idAlmacen, a.nombreAlmacen)
           FROM Almacen a
           WHERE (:incluirInactivos = TRUE OR a.estadoActivo = TRUE)
           ORDER BY a.nombreAlmacen ASC
           """)
  List<OpcionIdNombre> opcionesJPQL(@Param("incluirInactivos") boolean incluirInactivos);

  /** Variante nativa (id, nombre) — útil cuando se requiere SQL directo. */
  @Query(value = """
          SELECT a.id_almacen AS id, a.nombre_almacen AS nombre
          FROM almacenes a
          WHERE (:incluirInactivos = TRUE OR a.estado_activo = TRUE)
          ORDER BY a.nombre_almacen ASC
          """, nativeQuery = true)
  List<OpcionIdNombre> opcionesNative(@Param("incluirInactivos") boolean incluirInactivos);

  // ========================
  // Consultas simples
  // ========================
  List<Almacen> findByIdSucursalAndEstadoActivoTrue(Long idSucursal);

  boolean existsByIdSucursal(Long idSucursal);

  // Duplicados por sucursal + nombre
  boolean existsByIdSucursalAndNombreAlmacenIgnoreCase(Long idSucursal, String nombreAlmacen);
  boolean existsByIdSucursalAndNombreAlmacenIgnoreCaseAndIdAlmacenNot(Long idSucursal, String nombreAlmacen, Long idAlmacen);

  // ========================
  // Listado paginado (nativo)
  // ========================
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
        """,
          countQuery = """
        SELECT COUNT(*)
        FROM almacenes a
        JOIN sucursales s ON s.id_sucursal = a.id_sucursal
        WHERE (:q IS NULL
               OR a.nombre_almacen ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
               OR COALESCE(a.descripcion,'') ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:idSucursal IS NULL OR a.id_sucursal = :idSucursal)
          AND (:incluirInactivos = TRUE OR a.estado_activo = TRUE)
        """,
          nativeQuery = true)
  Page<AlmacenListadoProjection> listar(
          @Param("q") String q,
          @Param("idSucursal") Long idSucursal,
          @Param("incluirInactivos") boolean incluirInactivos,
          Pageable pageable
  );

  // ========================
  // Presentaciones por almacén (paginado)
  // ========================
  @Query(
          value = """
        SELECT
          p.id_presentacion                                    AS idPresentacion,
          p.codigo_sku                                         AS sku,
          pr.nombre_producto                                   AS producto,
          (p.contenido_por_unidad::TEXT || ' ' || COALESCE(u.nombre_unidad, u.simbolo_unidad, '')) AS presentacion,
          COALESCE(u.nombre_unidad, u.simbolo_unidad, '')      AS unidad,
          COALESCE(SUM(e.cantidad_disponible), 0)              AS stockDisponible,
          COALESCE(SUM(e.cantidad_reservada), 0)               AS reservado,
          p.precio_venta_bob                                   AS precioBob,
          MIN(l.numero_lote) FILTER (WHERE COALESCE(e.cantidad_disponible,0) > 0)          AS loteNumero,
          TO_CHAR(MIN(l.fecha_vencimiento) FILTER (WHERE COALESCE(e.cantidad_disponible,0) > 0), 'YYYY-MM-DD') AS loteVencimiento,
          MIN(e.cantidad_disponible) FILTER (WHERE COALESCE(e.cantidad_disponible,0) > 0)   AS loteDisponible,
          p.imagen_url                                         AS imagenUrl
        FROM presentaciones_de_productos p
        JOIN productos  pr ON pr.id_producto = p.id_producto
        LEFT JOIN unidades_de_medida u ON u.id_unidad = p.id_unidad
        LEFT JOIN lotes l ON l.id_presentacion = p.id_presentacion
        LEFT JOIN existencias_por_lote e
               ON e.id_lote = l.id_lote
              AND e.id_almacen = :idAlmacen
        WHERE p.estado_activo = TRUE
          AND pr.estado_activo = TRUE
          AND (:q IS NULL OR (
                 pr.nombre_producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
              OR p.codigo_sku       ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
          ))
          AND (:categoriaId IS NULL OR pr.id_categoria = :categoriaId)
        GROUP BY
          p.id_presentacion, p.codigo_sku, pr.nombre_producto,
          p.contenido_por_unidad, u.nombre_unidad, u.simbolo_unidad,
          p.precio_venta_bob, p.imagen_url
        HAVING (:soloConStock = FALSE OR COALESCE(SUM(e.cantidad_disponible),0) > 0)
        ORDER BY pr.nombre_producto ASC, p.codigo_sku ASC
        """,
          countQuery = """
        SELECT COUNT(*) FROM (
          SELECT p.id_presentacion
          FROM presentaciones_de_productos p
          JOIN productos pr ON pr.id_producto = p.id_producto
          LEFT JOIN lotes l ON l.id_presentacion = p.id_presentacion
          LEFT JOIN existencias_por_lote e
                 ON e.id_lote = l.id_lote
                AND e.id_almacen = :idAlmacen
          WHERE p.estado_activo = TRUE
            AND pr.estado_activo = TRUE
            AND (:q IS NULL OR (
                   pr.nombre_producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
                OR p.codigo_sku       ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
            ))
            AND (:categoriaId IS NULL OR pr.id_categoria = :categoriaId)
          GROUP BY p.id_presentacion
          HAVING (:soloConStock = FALSE OR COALESCE(SUM(e.cantidad_disponible),0) > 0)
        ) x
        """,
          nativeQuery = true
  )
  Page<PresentacionEnAlmacenProjection> listarPresentacionesEnAlmacen(
          @Param("idAlmacen") Long idAlmacen,
          @Param("q") String q,
          @Param("categoriaId") Long categoriaId,
          @Param("soloConStock") boolean soloConStock,
          Pageable pageable
  );
}
