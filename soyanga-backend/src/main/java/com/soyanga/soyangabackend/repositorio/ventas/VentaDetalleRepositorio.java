package com.soyanga.soyangabackend.repositorio.ventas;

import com.soyanga.soyangabackend.dominio.VentaDetalle;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface VentaDetalleRepositorio extends BaseRepository<VentaDetalle, Long> {
    List<VentaDetalle> findByIdVenta(Long idVenta);
    List<VentaDetalle> findByIdVentaOrderByIdVentaDetalleAsc(Long idVenta);

    // Proyección para detalle con info de presentación
    interface DetalleView {
        Long getIdVentaDetalle();
        Long getIdPresentacion();
        BigDecimal getCantidad();
        BigDecimal getPrecioUnitarioBob();
        String getSku();
        String getProducto();
    }

    @Query(value = """
        SELECT 
          vd.id_venta_detalle   AS idVentaDetalle,
          vd.id_presentacion    AS idPresentacion,
          vd.cantidad           AS cantidad,
          vd.precio_unitario_bob AS precioUnitarioBob,
          pp.codigo_sku         AS sku,
          pr.nombre_producto    AS producto
        FROM ventas_detalle vd
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = vd.id_presentacion
        JOIN productos pr ON pr.id_producto = pp.id_producto
        WHERE vd.id_venta = :idVenta
        ORDER BY vd.id_venta_detalle
        """, nativeQuery = true)
    List<DetalleView> detalleConPresentacion(Long idVenta);


    interface VentaItemProjection {
        Long getIdVentaDetalle();
        Long getIdPresentacion();
        String getSku();
        String getProducto();
        java.math.BigDecimal getCantidad();
        java.math.BigDecimal getPrecioUnitarioBob();
        java.math.BigDecimal getDescuentoPorcentaje();
        java.math.BigDecimal getDescuentoMontoBob();
        java.math.BigDecimal getSubtotalBob();
    }

    @Query(value = """
        SELECT
          vd.id_venta_detalle            AS idVentaDetalle,
          vd.id_presentacion             AS idPresentacion,
          pp.codigo_sku                  AS sku,
          p.nombre_producto              AS producto,
          vd.cantidad                    AS cantidad,
          vd.precio_unitario_bob         AS precioUnitarioBob,
          vd.descuento_porcentaje        AS descuentoPorcentaje,
          vd.descuento_monto_bob         AS descuentoMontoBob,
          vd.subtotal_bob                AS subtotalBob
        FROM ventas_detalle vd
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = vd.id_presentacion
        JOIN productos p ON p.id_producto = pp.id_producto
        WHERE vd.id_venta = :idVenta
        ORDER BY vd.id_venta_detalle
        """, nativeQuery = true)
    List<VentaItemProjection> itemsDeVenta(@Param("idVenta") Long idVenta);

}
