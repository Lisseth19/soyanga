package com.soyanga.soyangabackend.repositorio.ventas;

import com.soyanga.soyangabackend.dominio.Venta;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface VentaRepositorio extends BaseRepository<Venta, Long> {

    interface VentaListadoProjection {
        Long getIdVenta();
        LocalDateTime getFechaVenta();
        Long getIdCliente();
        String getCliente();
        String getEstadoVenta();
        String getTipoDocumentoTributario();
        String getNumeroDocumento();
        String getMetodoDePago();
        String getCondicionDePago();
        java.math.BigDecimal getTotalNetoBob();
        java.math.BigDecimal getCxcPendienteBob();
    }

    @Query(value = """
    SELECT
      v.id_venta                  AS idVenta,
      v.fecha_venta               AS fechaVenta,
      v.id_cliente                AS idCliente,
      cl.razon_social_o_nombre    AS cliente,
      v.estado_venta              AS estadoVenta,
      v.tipo_documento_tributario AS tipoDocumentoTributario,
      v.numero_documento          AS numeroDocumento,
      v.metodo_de_pago            AS metodoDePago,
      v.condicion_de_pago         AS condicionDePago,
      v.total_neto_bob            AS totalNetoBob,
      COALESCE(cxc.monto_pendiente_bob,0) AS cxcPendienteBob
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.id_venta = v.id_venta
    WHERE (CAST(:estado    AS VARCHAR) IS NULL OR v.estado_venta  = CAST(:estado AS VARCHAR))
      AND (CAST(:clienteId AS BIGINT)  IS NULL OR v.id_cliente    = CAST(:clienteId AS BIGINT))
      AND (CAST(:desde     AS TIMESTAMP) IS NULL OR v.fecha_venta >= CAST(:desde AS TIMESTAMP))
      AND (CAST(:hasta     AS TIMESTAMP) IS NULL OR v.fecha_venta <= CAST(:hasta AS TIMESTAMP))
    ORDER BY v.fecha_venta DESC, v.id_venta DESC
    """,
            countQuery = """
    SELECT COUNT(*)
    FROM ventas v
    WHERE (CAST(:estado    AS VARCHAR) IS NULL OR v.estado_venta  = CAST(:estado AS VARCHAR))
      AND (CAST(:clienteId AS BIGINT)  IS NULL OR v.id_cliente    = CAST(:clienteId AS BIGINT))
      AND (CAST(:desde     AS TIMESTAMP) IS NULL OR v.fecha_venta >= CAST(:desde AS TIMESTAMP))
      AND (CAST(:hasta     AS TIMESTAMP) IS NULL OR v.fecha_venta <= CAST(:hasta AS TIMESTAMP))
    """,
            nativeQuery = true)
    Page<VentaListadoProjection> listar(
            @Param("estado") String estado,
            @Param("clienteId") Long clienteId,
            @Param("desde") java.time.LocalDateTime desde,
            @Param("hasta") java.time.LocalDateTime hasta,
            org.springframework.data.domain.Pageable pageable
    );

    interface VentaHeaderProjection {
        Long getIdVenta();
        LocalDateTime getFechaVenta();
        String getEstadoVenta();
        String getTipoDocumentoTributario();
        String getNumeroDocumento();
        Long getIdCliente();
        String getCliente();
        Long getIdMoneda();
        java.math.BigDecimal getTotalBrutoBob();
        java.math.BigDecimal getDescuentoTotalBob();
        java.math.BigDecimal getTotalNetoBob();
        String getMetodoDePago();
        String getCondicionDePago();
        java.time.LocalDate getFechaVencimientoCredito();
        Long getIdAlmacenDespacho();
        String getObservaciones();
    }

    @Query(value = """
        SELECT
          v.id_venta                 AS idVenta,
          v.fecha_venta              AS fechaVenta,
          v.estado_venta             AS estadoVenta,
          v.tipo_documento_tributario AS tipoDocumentoTributario,
          v.numero_documento         AS numeroDocumento,
          v.id_cliente               AS idCliente,
          cl.razon_social_o_nombre   AS cliente,
          v.id_moneda                AS idMoneda,
          v.total_bruto_bob          AS totalBrutoBob,
          v.descuento_total_bob      AS descuentoTotalBob,
          v.total_neto_bob           AS totalNetoBob,
          v.metodo_de_pago           AS metodoDePago,
          v.condicion_de_pago        AS condicionDePago,
          v.fecha_vencimiento_credito AS fechaVencimientoCredito,
          v.id_almacen_despacho      AS idAlmacenDespacho,
          v.observaciones            AS observaciones
        FROM ventas v
        LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
        WHERE v.id_venta = :id
        """, nativeQuery = true)
    VentaHeaderProjection header(@Param("id") Long id);
}
