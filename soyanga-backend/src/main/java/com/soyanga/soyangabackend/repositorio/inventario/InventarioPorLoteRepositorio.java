package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.vistas.InventarioPorLoteView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface InventarioPorLoteRepositorio extends JpaRepository<InventarioPorLoteView, Long> {

    @Query(
            value = """
        SELECT *
        FROM vw_inventario_por_lote
        WHERE (:almacenId IS NULL OR id_almacen = :almacenId)
          AND (
               :texto IS NULL
               OR sku ILIKE ('%' || :texto || '%')
               OR producto ILIKE ('%' || :texto || '%')
          )
          AND vencimiento <= COALESCE(:venceAntes, '9999-12-31'::date)
        """,
            countQuery = """
        SELECT COUNT(1)
        FROM vw_inventario_por_lote
        WHERE (:almacenId IS NULL OR id_almacen = :almacenId)
          AND (
               :texto IS NULL
               OR sku ILIKE ('%' || :texto || '%')
               OR producto ILIKE ('%' || :texto || '%')
          )
          AND vencimiento <= COALESCE(:venceAntes, '9999-12-31'::date)
        """,
            nativeQuery = true
    )
    Page<InventarioPorLoteView> buscar(
            @Param("almacenId") Long almacenId,
            @Param("texto") String texto,
            @Param("venceAntes") java.sql.Date venceAntes,  // mantenemos java.sql.Date
            Pageable pageable
    );


    interface InventarioPorLoteProjection {
        Long getIdAlmacen();
        String getAlmacen();
        Long getIdLote();
        String getNumeroLote();
        Long getIdPresentacion();
        String getSku();
        String getProducto();
        BigDecimal getDisponible();
        BigDecimal getReservado();
        LocalDate getVencimiento();
        BigDecimal getStockMinimo();
    }

    @Query(value = """
        SELECT 
          ex.id_almacen                 AS idAlmacen,
          a.nombre_almacen              AS almacen,
          l.id_lote                     AS idLote,
          l.numero_lote                 AS numeroLote,
          pp.id_presentacion            AS idPresentacion,
          pp.codigo_sku                 AS sku,
          p.nombre_producto             AS producto,
          ex.cantidad_disponible        AS disponible,
          ex.cantidad_reservada         AS reservado,
          l.fecha_vencimiento           AS vencimiento,
          ex.stock_minimo               AS stockMinimo
        FROM existencias_por_lote ex
        JOIN lotes l                      ON l.id_lote = ex.id_lote
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
        JOIN productos p                   ON p.id_producto = pp.id_producto
        JOIN almacenes a                   ON a.id_almacen = ex.id_almacen
        WHERE (:almacenId IS NULL OR ex.id_almacen = :almacenId)
          AND (:q IS NULL OR pp.codigo_sku ILIKE CONCAT('%', :q, '%')
                        OR p.nombre_producto ILIKE CONCAT('%', :q, '%'))
          AND (:venceAntes IS NULL OR l.fecha_vencimiento <= :venceAntes)
        ORDER BY l.fecha_vencimiento ASC NULLS LAST, p.nombre_producto ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM existencias_por_lote ex
        JOIN lotes l                      ON l.id_lote = ex.id_lote
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
        JOIN productos p                   ON p.id_producto = pp.id_producto
        WHERE (:almacenId IS NULL OR ex.id_almacen = :almacenId)
          AND (:q IS NULL OR pp.codigo_sku ILIKE CONCAT('%', :q, '%')
                        OR p.nombre_producto ILIKE CONCAT('%', :q, '%'))
          AND (:venceAntes IS NULL OR l.fecha_vencimiento <= :venceAntes)
        """,
            nativeQuery = true)
    Page<InventarioPorLoteProjection> buscar(
            @Param("almacenId") Long almacenId,
            @Param("q") String q,
            @Param("venceAntes") LocalDate venceAntes,
            Pageable pageable
    );
}
