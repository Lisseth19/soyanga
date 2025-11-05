// src/main/java/.../repositorio/inventario/AlertasRepositorio.java
package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.ExistenciaPorLote; // 👈 entidad JPA REAL
import com.soyanga.soyangabackend.dto.inventario.AlertaListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlertasRepositorio extends BaseRepository<ExistenciaPorLote, Long> { // 👈 aquí el cambio

  @Query(value = """
      SELECT
        id_existencia_lote AS idAlerta,
        id_almacen        AS idAlmacen,
        id_lote           AS idLote,
        id_presentacion   AS idPresentacion,
        almacen,
        numero_lote       AS numeroLote,
        sku,
        producto,
        disponible        AS stockDisponible,
        reservado         AS stockReservado,
        stock_minimo      AS stockMinimo,
        vencimiento       AS venceEl,
        dias_restantes    AS diasRestantes,
        -- normalizamos campos de la vista a lo que espera el frontend
        tipo_alerta       AS tipo,
        CASE
          WHEN tipo_alerta IN ('stock_agotado','vencido') THEN 'urgente'
          WHEN tipo_alerta IN ('stock_bajo','vencimiento_inminente') THEN 'advertencia'
          WHEN tipo_alerta = 'vencimiento_proximo' THEN 'proximo'
          ELSE NULL
        END               AS severidad,
        motivo_alerta     AS motivo,
        prioridad,
        estado_hash       AS estadoHash    -- NUEVO
      FROM vw_alertas_inventario
      WHERE
        (:tipo IS NULL OR tipo_alerta = :tipo)
        AND (
          :severidad IS NULL OR
          (:severidad = 'urgente'     AND tipo_alerta IN ('stock_agotado','vencido')) OR
          (:severidad = 'advertencia' AND tipo_alerta IN ('stock_bajo','vencimiento_inminente')) OR
          (:severidad = 'proximo'     AND tipo_alerta = 'vencimiento_proximo')
        )
        AND (:almacenId IS NULL OR id_almacen = :almacenId)
        AND (
          :q IS NULL OR
          sku ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          numero_lote ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      ORDER BY prioridad DESC, producto
      """, countQuery = """
      SELECT COUNT(*) FROM vw_alertas_inventario
      WHERE
        (:tipo IS NULL OR tipo_alerta = :tipo)
        AND (
          :severidad IS NULL OR
          (:severidad = 'urgente'     AND tipo_alerta IN ('stock_agotado','vencido')) OR
          (:severidad = 'advertencia' AND tipo_alerta IN ('stock_bajo','vencimiento_inminente')) OR
          (:severidad = 'proximo'     AND tipo_alerta = 'vencimiento_proximo')
        )
        AND (:almacenId IS NULL OR id_almacen = :almacenId)
        AND (
          :q IS NULL OR
          sku ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          numero_lote ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      """, nativeQuery = true)
  Page<AlertaListadoProjection> listar(
      @Param("tipo") String tipo,
      @Param("severidad") String severidad,
      @Param("almacenId") Long almacenId,
      @Param("q") String q,
      Pageable pageable);

  // ======= NUEVO: proyección simple para conteos =======
  interface ConteoKV {
    String getClave();

    Long getCantidad();
  }

  // === Conteo por severidad (usamos la columna severidad ya calculada por la
  // vista) ===
  @Query(value = """
      SELECT COALESCE(severidad,'') AS clave, COUNT(*) AS cantidad
      FROM vw_alertas_inventario
      WHERE
        (:tipo IS NULL OR tipo_alerta = :tipo)
        AND (:severidad IS NULL OR severidad = :severidad)
        AND (:almacenId IS NULL OR id_almacen = :almacenId)
        AND (
          :q IS NULL OR
          sku ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          numero_lote ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      GROUP BY severidad
      """, nativeQuery = true)
  List<ConteoKV> conteoPorSeveridad(@Param("tipo") String tipo,
      @Param("severidad") String severidad,
      @Param("almacenId") Long almacenId,
      @Param("q") String q);

  // === Conteo por tipo de alerta (directo de la vista) ===
  @Query(value = """
      SELECT COALESCE(tipo_alerta,'') AS clave, COUNT(*) AS cantidad
      FROM vw_alertas_inventario
      WHERE
        (:tipo IS NULL OR tipo_alerta = :tipo)
        AND (:severidad IS NULL OR severidad = :severidad)
        AND (:almacenId IS NULL OR id_almacen = :almacenId)
        AND (
          :q IS NULL OR
          sku ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          producto ILIKE CONCAT('%', CAST(:q AS TEXT), '%') OR
          numero_lote ILIKE CONCAT('%', CAST(:q AS TEXT), '%')
        )
      GROUP BY tipo_alerta
      """, nativeQuery = true)
  List<ConteoKV> conteoPorTipo(@Param("tipo") String tipo,
      @Param("severidad") String severidad,
      @Param("almacenId") Long almacenId,
      @Param("q") String q);
}
