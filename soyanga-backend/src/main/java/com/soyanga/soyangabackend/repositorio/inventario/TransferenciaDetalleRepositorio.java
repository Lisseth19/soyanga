package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.TransferenciaDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.List;

public interface TransferenciaDetalleRepositorio extends BaseRepository<TransferenciaDetalle, Long> {
    List<TransferenciaDetalle> findByIdTransferencia(Long idTransferencia);

    @org.springframework.data.jpa.repository.Query(
            value = """
        SELECT
          d.id_lote           AS idLote,
          l.numero_lote       AS numeroLote,
          l.id_presentacion   AS idPresentacion,
          pp.codigo_sku       AS sku,
          prod.nombre_producto AS producto,
          d.cantidad          AS cantidad
        FROM transferencias_detalle d
        JOIN lotes l ON l.id_lote = d.id_lote
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
        JOIN productos prod ON prod.id_producto = pp.id_producto
        WHERE d.id_transferencia = :id
        ORDER BY d.id_transferencia_detalle ASC
        """,
            nativeQuery = true
    )
    java.util.List<com.soyanga.soyangabackend.dto.inventario.TransferenciaItemProjection> itemsPorTransferencia(
            @org.springframework.data.repository.query.Param("id") Long id
    );

}
