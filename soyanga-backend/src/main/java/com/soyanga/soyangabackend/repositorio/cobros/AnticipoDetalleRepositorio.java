// src/main/java/com/soyanga/soyangabackend/repositorio/cobros/AnticipoDetalleRepositorio.java
package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AnticipoDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AnticipoDetalleRepositorio extends BaseRepository<AnticipoDetalle, Long> {

    /** Todas las filas de un anticipo (se usa para poner reservada=0 al consumir a venta) */
    List<AnticipoDetalle> findByIdAnticipo(Long idAnticipo);

    /** Para upsert/merge por la UNIQUE (id_anticipo, id_presentacion, id_almacen) */
    Optional<AnticipoDetalle> findByIdAnticipoAndIdPresentacionAndIdAlmacen(Long idAnticipo,
                                                                            Long idPresentacion,
                                                                            Long idAlmacen);

    /** Resumen por par (pedido vs reservado) — útil para respuestas del API */
    @Query(value = """
        SELECT
          id_presentacion             AS idPresentacion,
          id_almacen                  AS idAlmacen,
          SUM(cantidad_solicitada)    AS cantidadSolicitada,
          SUM(cantidad_reservada)     AS cantidadReservada
        FROM anticipos_detalle
        WHERE id_anticipo = :idAnticipo
        GROUP BY id_presentacion, id_almacen
        ORDER BY id_presentacion, id_almacen
        """, nativeQuery = true)
    List<PedidoResumenRow> resumenPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    interface PedidoResumenRow {
        Long getIdPresentacion();
        Long getIdAlmacen();
        BigDecimal getCantidadSolicitada();
        BigDecimal getCantidadReservada();
    }

    /** Totales (por si necesitas validar invariantes) */
    @Query("select coalesce(sum(d.cantidadSolicitada), 0) from AnticipoDetalle d where d.idAnticipo = :idAnticipo")
    BigDecimal totalSolicitado(@Param("idAnticipo") Long idAnticipo);

    @Query("select coalesce(sum(d.cantidadReservada), 0) from AnticipoDetalle d where d.idAnticipo = :idAnticipo")
    BigDecimal totalReservado(@Param("idAnticipo") Long idAnticipo);

    /** Helpers opcionales para ajustes masivos */
    @Modifying
    @Query("update AnticipoDetalle d set d.cantidadReservada = 0 where d.idAnticipo = :idAnticipo")
    int clearReservadoPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    @Modifying
    @Query("""
           update AnticipoDetalle d
              set d.cantidadReservada = d.cantidadReservada + :delta
            where d.idAnticipo = :idAnticipo
              and d.idPresentacion = :idPresentacion
              and d.idAlmacen = :idAlmacen
           """)
    int addReservado(@Param("idAnticipo") Long idAnticipo,
                     @Param("idPresentacion") Long idPresentacion,
                     @Param("idAlmacen") Long idAlmacen,
                     @Param("delta") BigDecimal delta);
}
