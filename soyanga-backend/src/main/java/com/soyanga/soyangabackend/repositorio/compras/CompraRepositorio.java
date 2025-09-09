package com.soyanga.soyangabackend.repositorio.compras;

import com.soyanga.soyangabackend.dominio.Compra;
import com.soyanga.soyangabackend.dto.compras.CompraListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface CompraRepositorio extends BaseRepository<Compra, Long> {

    @Query(value = """
        SELECT
          c.id_compra                 AS idCompra,
          c.fecha_compra              AS fechaCompra,
          c.estado_compra             AS estadoCompra,
          c.id_proveedor              AS idProveedor,
          p.razon_social              AS proveedor,
          c.id_moneda                 AS idMoneda,
          c.tipo_cambio_usado         AS tipoCambioUsado,
          (SELECT COUNT(*) FROM compras_detalle cd WHERE cd.id_compra = c.id_compra) AS totalItems,
          COALESCE((SELECT SUM(cd.cantidad * cd.costo_unitario_moneda)
                    FROM compras_detalle cd WHERE cd.id_compra = c.id_compra), 0) AS totalMoneda
        FROM compras c
          JOIN proveedores p ON p.id_proveedor = c.id_proveedor
        WHERE c.estado_compra   = COALESCE(:estado,      c.estado_compra)
          AND c.id_proveedor    = COALESCE(:proveedorId, c.id_proveedor)
          AND c.fecha_compra   >= COALESCE(:desde,       c.fecha_compra)
          AND c.fecha_compra   <= COALESCE(:hasta,       c.fecha_compra)
        ORDER BY c.fecha_compra DESC, c.id_compra DESC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM compras c
        WHERE c.estado_compra   = COALESCE(:estado,      c.estado_compra)
          AND c.id_proveedor    = COALESCE(:proveedorId, c.id_proveedor)
          AND c.fecha_compra   >= COALESCE(:desde,       c.fecha_compra)
          AND c.fecha_compra   <= COALESCE(:hasta,       c.fecha_compra)
        """,
            nativeQuery = true)
    Page<CompraListadoProjection> listar(
            @Param("estado") String estado,
            @Param("proveedorId") Long proveedorId,
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            Pageable pageable
    );
}
