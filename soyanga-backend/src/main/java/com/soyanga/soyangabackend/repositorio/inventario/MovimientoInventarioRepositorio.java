// src/main/java/com/soyanga/soyangabackend/repositorio/inventario/MovimientoInventarioRepositorio.java
package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.MovimientoInventario;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoInventarioRepositorio extends BaseRepository<MovimientoInventario, Long> {

    @Query("""
        SELECT m FROM MovimientoInventario m
        WHERE m.idLote = :idLote
          AND (:idAlmacen IS NULL OR m.idAlmacenOrigen = :idAlmacen OR m.idAlmacenDestino = :idAlmacen)
        ORDER BY m.fechaMovimiento DESC
    """)
    Page<MovimientoInventario> listarPorLote(@Param("idLote") Long idLote,
                                             @Param("idAlmacen") Long idAlmacen,
                                             Pageable pageable);

    Page<MovimientoInventario> findByIdLoteOrderByFechaMovimientoDesc(Long idLote, Pageable pageable);

    @Query(
            value = """
                    SELECT
                      m.id_movimiento      AS idMovimiento,
                      m.fecha_movimiento   AS fechaMovimiento,
                      m.tipo_movimiento    AS tipoMovimiento,
                      m.id_lote            AS idLote,
                      m.cantidad           AS cantidad,
                      m.id_almacen_origen  AS idAlmacenOrigen,
                      m.id_almacen_destino AS idAlmacenDestino
                    FROM movimientos_de_inventario m
                    WHERE m.referencia_modulo = 'transferencia'
                      AND m.id_referencia = :id
                    ORDER BY m.fecha_movimiento ASC, m.id_movimiento ASC
                    """,
            nativeQuery = true
    )
    List<com.soyanga.soyangabackend.dto.inventario.MovimientoTransferenciaProjection> movimientosPorTransferencia(
            @Param("id") Long id
    );

    @Query(value = """
        SELECT m.*
        FROM movimientos_de_inventario m
        WHERE m.referencia_modulo = 'anticipo'
          AND m.id_referencia = :idAnticipo
          AND m.tipo_movimiento = 'reserva_anticipo'
        ORDER BY m.fecha_movimiento ASC, m.id_movimiento ASC
        """, nativeQuery = true)
    List<MovimientoInventario> reservasDeAnticipo(@Param("idAnticipo") Long idAnticipo);

    @Query(value = """
        SELECT *
        FROM movimientos_de_inventario
        WHERE referencia_modulo = 'venta'
          AND id_referencia = :idVenta
        ORDER BY fecha_movimiento, id_movimiento
        """, nativeQuery = true)
    List<MovimientoInventario> porVenta(@Param("idVenta") Long idVenta);

    // ===== Proyección simple (solo IDs) =====
    interface MovimientoRow {
        Long getIdMovimiento();
        LocalDateTime getFechaMovimiento();
        String getTipoMovimiento();
        Long getIdLote();
        BigDecimal getCantidad();
        Long getIdAlmacenOrigen();
        Long getIdAlmacenDestino();
        String getReferenciaModulo();
        Long getIdReferencia();
    }

    // ===== Proyección con nombres de almacén =====
    interface MovimientoRowFull {
        Long getIdMovimiento();
        LocalDateTime getFechaMovimiento();
        String getTipoMovimiento();
        Long getIdLote();
        BigDecimal getCantidad();
        Long getIdAlmacenOrigen();
        Long getIdAlmacenDestino();
        String getReferenciaModulo();
        Long getIdReferencia();
        String getAlmacenOrigen();   // nombre resuelto
        String getAlmacenDestino();  // nombre resuelto
    }

    @Query(value = """
        SELECT
          m.id_movimiento      AS idMovimiento,
          m.fecha_movimiento   AS fechaMovimiento,
          m.tipo_movimiento    AS tipoMovimiento,
          m.id_lote            AS idLote,
          m.cantidad           AS cantidad,
          m.id_almacen_origen  AS idAlmacenOrigen,
          m.id_almacen_destino AS idAlmacenDestino,
          m.referencia_modulo  AS referenciaModulo,
          m.id_referencia      AS idReferencia,
          ao.nombre_almacen    AS almacenOrigen,
          ad.nombre_almacen    AS almacenDestino
        FROM movimientos_de_inventario m
        LEFT JOIN almacenes ao ON ao.id_almacen = m.id_almacen_origen
        LEFT JOIN almacenes ad ON ad.id_almacen = m.id_almacen_destino
        WHERE (:loteId IS NULL OR m.id_lote = :loteId)
          AND (:almacenId IS NULL OR m.id_almacen_origen = :almacenId OR m.id_almacen_destino = :almacenId)
        ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<MovimientoRowFull> ultimosConNombres(@Param("loteId") Long loteId,
                                              @Param("almacenId") Long almacenId,
                                              @Param("limit") int limit);

    // ======== Proyección mínima para reservas vigentes por anticipo (acotada por existencias) ========
    interface ReservaVigenteRowMin {
        Long getIdAlmacen();
        Long getIdPresentacion();
        Long getIdLote();
        BigDecimal getCantidad();
    }

    @Query(value = """
        WITH mov AS (
            SELECT
                m.id_almacen_origen AS id_almacen,
                m.id_lote           AS id_lote,
                SUM(CASE WHEN m.tipo_movimiento = 'reserva_anticipo'   THEN m.cantidad ELSE 0 END) -
                SUM(CASE WHEN m.tipo_movimiento = 'liberacion_reserva' THEN m.cantidad ELSE 0 END) AS neto
            FROM movimientos_de_inventario m
            WHERE m.referencia_modulo = 'anticipo'
              AND m.id_referencia = :idAnticipo
            GROUP BY 1,2
        ),
        vig AS (
            SELECT
                mov.id_almacen,
                mov.id_lote,
                GREATEST(0, LEAST(mov.neto, COALESCE(el.cantidad_reservada, 0))) AS cantidad
            FROM mov
            LEFT JOIN existencias_por_lote el
                   ON el.id_almacen = mov.id_almacen AND el.id_lote = mov.id_lote
            WHERE mov.neto > 0
        )
        SELECT
            vig.id_almacen        AS idAlmacen,
            l.id_presentacion     AS idPresentacion,
            vig.id_lote           AS idLote,
            vig.cantidad          AS cantidad
        FROM vig
        JOIN lotes l ON l.id_lote = vig.id_lote
        WHERE vig.cantidad > 0
        ORDER BY l.fecha_vencimiento ASC, vig.id_lote ASC
        """, nativeQuery = true)
    List<ReservaVigenteRowMin> reservasVigentesMin(@Param("idAnticipo") Long idAnticipo);

    // ======== Proyección completa (con número/vencimiento de lote; acotada por existencias) ========
    interface ReservaVigenteRow {
        Long getIdAlmacen();
        Long getIdPresentacion();
        Long getIdLote();
        String getNumeroLote();
        java.time.LocalDate getFechaVencimiento(); // ISO yyyy-MM-dd
        BigDecimal getCantidad();
    }

    @Query(value = """
        WITH mov AS (
            SELECT
                m.id_almacen_origen AS id_almacen,
                m.id_lote           AS id_lote,
                SUM(CASE WHEN m.tipo_movimiento = 'reserva_anticipo'   THEN m.cantidad ELSE 0 END) -
                SUM(CASE WHEN m.tipo_movimiento = 'liberacion_reserva' THEN m.cantidad ELSE 0 END) AS neto
            FROM movimientos_de_inventario m
            WHERE m.referencia_modulo = 'anticipo'
              AND m.id_referencia = :idAnticipo
            GROUP BY 1,2
        ),
        vig AS (
            SELECT
                mov.id_almacen,
                mov.id_lote,
                GREATEST(0, LEAST(mov.neto, COALESCE(el.cantidad_reservada, 0))) AS cantidad
            FROM mov
            LEFT JOIN existencias_por_lote el
                   ON el.id_almacen = mov.id_almacen AND el.id_lote = mov.id_lote
            WHERE mov.neto > 0
        )
        SELECT
            vig.id_almacen        AS idAlmacen,
            l.id_presentacion     AS idPresentacion,
            vig.id_lote           AS idLote,
            l.numero_lote         AS numeroLote,
            l.fecha_vencimiento   AS fechaVencimiento,
            vig.cantidad          AS cantidad
        FROM vig
        JOIN lotes l ON l.id_lote = vig.id_lote
        WHERE vig.cantidad > 0
        ORDER BY l.fecha_vencimiento ASC, vig.id_lote ASC
        """, nativeQuery = true)
    List<ReservaVigenteRow> reservasVigentesPorAnticipo(@Param("idAnticipo") Long idAnticipo);
}
