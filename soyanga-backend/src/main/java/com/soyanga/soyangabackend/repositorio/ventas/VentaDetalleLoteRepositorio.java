package com.soyanga.soyangabackend.repositorio.ventas;

import com.soyanga.soyangabackend.dominio.VentaDetalleLote;
import com.soyanga.soyangabackend.dto.ventas.LoteCantidadProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface VentaDetalleLoteRepositorio extends BaseRepository<VentaDetalleLote, Long> {
    List<VentaDetalleLote> findByIdVentaDetalle(Long idVentaDetalle);

    @Query(value = """
        SELECT vdl.id_lote   AS idLote,
               vdl.cantidad  AS cantidad
        FROM ventas_detalle_lotes vdl
        JOIN ventas_detalle vd ON vd.id_venta_detalle = vdl.id_venta_detalle
        WHERE vd.id_venta = :ventaId
        """, nativeQuery = true)
    List<LoteCantidadProjection> lotesDeVenta(@Param("ventaId") Long ventaId);

    interface LoteConsumoView {
        Long getIdVentaDetalle();
        Long getIdLote();
        String getNumeroLote();
        BigDecimal getCantidad();
    }

    @Query(value = """
        SELECT 
          vdl.id_venta_detalle AS idVentaDetalle,
          vdl.id_lote          AS idLote,
          l.numero_lote        AS numeroLote,
          vdl.cantidad         AS cantidad
        FROM ventas_detalle_lotes vdl
        JOIN lotes l ON l.id_lote = vdl.id_lote
        WHERE vdl.id_venta_detalle IN (
          SELECT vd.id_venta_detalle FROM ventas_detalle vd WHERE vd.id_venta = :idVenta
        )
        ORDER BY vdl.id_venta_detalle, vdl.id_venta_detalle_lote
        """, nativeQuery = true)
    List<LoteConsumoView> consumosPorVenta(Long idVenta);

    interface VentaItemLoteProjection {
        Long getIdVentaDetalle();
        Long getIdLote();
        String getNumeroLote();
        java.math.BigDecimal getCantidad();
    }

    @Query(value = """
        SELECT
          vdl.id_venta_detalle AS idVentaDetalle,
          vdl.id_lote          AS idLote,
          l.numero_lote        AS numeroLote,
          vdl.cantidad         AS cantidad
        FROM ventas_detalle_lotes vdl
        JOIN lotes l ON l.id_lote = vdl.id_lote
        WHERE vdl.id_venta_detalle IN (:ids)
        ORDER BY vdl.id_venta_detalle
        """, nativeQuery = true)
    List<VentaItemLoteProjection> lotesDeItems(@Param("ids") List<Long> ids);

}
