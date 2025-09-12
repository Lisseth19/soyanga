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
    Page<MovimientoInventario> listarPorLote(Long idLote, Long idAlmacen, Pageable pageable);

    Page<MovimientoInventario> findByIdLoteOrderByFechaMovimientoDesc(Long idLote, Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
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
    java.util.List<com.soyanga.soyangabackend.dto.inventario.MovimientoTransferenciaProjection> movimientosPorTransferencia(
            @org.springframework.data.repository.query.Param("id") Long id
    );

    @org.springframework.data.jpa.repository.Query(value = """
    SELECT m.*
    FROM movimientos_de_inventario m
    WHERE m.referencia_modulo = 'anticipo'
      AND m.id_referencia = :idAnticipo
      AND m.tipo_movimiento = 'reserva_anticipo'
    ORDER BY m.fecha_movimiento ASC, m.id_movimiento ASC
    """, nativeQuery = true)
    java.util.List<com.soyanga.soyangabackend.dominio.MovimientoInventario> reservasDeAnticipo(
            @org.springframework.data.repository.query.Param("idAnticipo") Long idAnticipo
    );

    @Query(value = """
        SELECT * 
        FROM movimientos_de_inventario 
        WHERE referencia_modulo = 'venta' 
          AND id_referencia = :idVenta
        ORDER BY fecha_movimiento, id_movimiento
        """, nativeQuery = true)
    List<MovimientoInventario> porVenta(Long idVenta);

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
          m.id_referencia      AS idReferencia
        FROM movimientos_de_inventario m
        WHERE (:loteId IS NULL OR m.id_lote = :loteId)
          AND (:almacenId IS NULL OR m.id_almacen_origen = :almacenId OR m.id_almacen_destino = :almacenId)
        ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<MovimientoRow> ultimos(
            @Param("loteId") Long loteId,
            @Param("almacenId") Long almacenId,
            @Param("limit") int limit
    );

}
