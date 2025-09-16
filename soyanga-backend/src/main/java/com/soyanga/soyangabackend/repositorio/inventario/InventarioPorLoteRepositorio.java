package com.soyanga.soyangabackend.repositorio.inventario;

import com.soyanga.soyangabackend.dominio.vistas.InventarioPorLoteView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface InventarioPorLoteRepositorio extends JpaRepository<InventarioPorLoteView, Long> {

    // Proyección para mapear los alias del SELECT
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
        LocalDate getVencimiento();   // se mapeará desde DATE → LocalDate
        BigDecimal getStockMinimo();
    }

    @Query(value = """
        SELECT 
          ex.id_almacen                   AS idAlmacen,
          a.nombre_almacen                AS almacen,
          l.id_lote                       AS idLote,
          l.numero_lote                   AS numeroLote,
          pp.id_presentacion              AS idPresentacion,
          pp.codigo_sku                   AS sku,
          p.nombre_producto               AS producto,
          ex.cantidad_disponible          AS disponible,
          ex.cantidad_reservada           AS reservado,
          l.fecha_vencimiento::date       AS vencimiento,               -- fuerza DATE para mapear a LocalDate
          ex.stock_minimo                 AS stockMinimo
        FROM existencias_por_lote ex
        JOIN lotes l                        ON l.id_lote = ex.id_lote
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
        JOIN productos p                    ON p.id_producto = pp.id_producto
        JOIN almacenes a                    ON a.id_almacen = ex.id_almacen
        WHERE (:almacenId IS NULL OR ex.id_almacen = :almacenId)
          AND (:q IS NULL OR pp.codigo_sku ILIKE CONCAT('%', :q, '%')
                        OR p.nombre_producto ILIKE CONCAT('%', :q, '%'))
          AND (
            :venceAntes IS NULL
            OR (l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento::date <= to_date(:venceAntes, 'YYYY-MM-DD'))
          )
        ORDER BY l.fecha_vencimiento ASC NULLS LAST, p.nombre_producto ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM existencias_por_lote ex
        JOIN lotes l                        ON l.id_lote = ex.id_lote
        JOIN presentaciones_de_productos pp ON pp.id_presentacion = l.id_presentacion
        JOIN productos p                    ON p.id_producto = pp.id_producto
        WHERE (:almacenId IS NULL OR ex.id_almacen = :almacenId)
          AND (:q IS NULL OR pp.codigo_sku ILIKE CONCAT('%', :q, '%')
                        OR p.nombre_producto ILIKE CONCAT('%', :q, '%'))
          AND (
            :venceAntes IS NULL
            OR (l.fecha_vencimiento IS NOT NULL AND l.fecha_vencimiento::date <= to_date(:venceAntes, 'YYYY-MM-DD'))
          )
        """,
            nativeQuery = true)
    Page<InventarioPorLoteProjection> buscar(
            @Param("almacenId") Long almacenId,
            @Param("q") String q,
            @Param("venceAntes") String venceAntes,   // 👈 ahora String
            Pageable pageable
    );
}
