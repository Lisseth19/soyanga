package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.TransferenciaEntreAlmacenes;
import com.soyanga.soyangabackend.dto.inventario.TransferenciaListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface TransferenciaRepositorio extends BaseRepository<TransferenciaEntreAlmacenes, Long> {

    @Query(
            value = """
        SELECT
          t.id_transferencia          AS idTransferencia,
          t.fecha_transferencia       AS fecha,
          t.estado_transferencia      AS estado,
          t.id_almacen_origen         AS idAlmacenOrigen,
          t.id_almacen_destino        AS idAlmacenDestino,
          ao.nombre_almacen           AS almacenOrigen,
          ad.nombre_almacen           AS almacenDestino,
          (SELECT COUNT(*) FROM transferencias_detalle d
             WHERE d.id_transferencia = t.id_transferencia) AS items,
          t.observaciones             AS observaciones
        FROM transferencias_entre_almacenes t
          LEFT JOIN almacenes ao ON ao.id_almacen = t.id_almacen_origen
          LEFT JOIN almacenes ad ON ad.id_almacen = t.id_almacen_destino
        WHERE (COALESCE(CAST(:estado AS VARCHAR), t.estado_transferencia) = t.estado_transferencia)
          AND (:origenId  IS NULL OR t.id_almacen_origen  = :origenId)
          AND (:destinoId IS NULL OR t.id_almacen_destino = :destinoId)
          AND (t.fecha_transferencia >= COALESCE(CAST(:desde AS TIMESTAMP), t.fecha_transferencia))
          AND (t.fecha_transferencia <= COALESCE(CAST(:hasta AS TIMESTAMP), t.fecha_transferencia))
        ORDER BY t.fecha_transferencia DESC, t.id_transferencia DESC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM transferencias_entre_almacenes t
        WHERE (COALESCE(CAST(:estado AS VARCHAR), t.estado_transferencia) = t.estado_transferencia)
          AND (:origenId  IS NULL OR t.id_almacen_origen  = :origenId)
          AND (:destinoId IS NULL OR t.id_almacen_destino = :destinoId)
          AND (t.fecha_transferencia >= COALESCE(CAST(:desde AS TIMESTAMP), t.fecha_transferencia))
          AND (t.fecha_transferencia <= COALESCE(CAST(:hasta AS TIMESTAMP), t.fecha_transferencia))
        """,
            nativeQuery = true
    )
    Page<TransferenciaListadoProjection> listar(
            @Param("estado") String estado,
            @Param("origenId") Long origenId,
            @Param("destinoId") Long destinoId,
            @Param("desde") java.time.LocalDateTime desde,
            @Param("hasta") java.time.LocalDateTime hasta,
            org.springframework.data.domain.Pageable pageable
    );

    @org.springframework.data.jpa.repository.Query(
            value = """
        SELECT
          t.id_transferencia     AS idTransferencia,
          t.fecha_transferencia  AS fecha,
          t.estado_transferencia AS estado,
          t.id_almacen_origen    AS idAlmacenOrigen,
          t.id_almacen_destino   AS idAlmacenDestino,
          ao.nombre_almacen      AS almacenOrigen,
          ad.nombre_almacen      AS almacenDestino,
          t.observaciones        AS observaciones
        FROM transferencias_entre_almacenes t
        LEFT JOIN almacenes ao ON ao.id_almacen = t.id_almacen_origen
        LEFT JOIN almacenes ad ON ad.id_almacen = t.id_almacen_destino
        WHERE t.id_transferencia = :id
        """,
            nativeQuery = true
    )
    java.util.Optional<com.soyanga.soyangabackend.dto.inventario.TransferenciaCabeceraProjection> cabecera(
            @org.springframework.data.repository.query.Param("id") Long id
    );

}
