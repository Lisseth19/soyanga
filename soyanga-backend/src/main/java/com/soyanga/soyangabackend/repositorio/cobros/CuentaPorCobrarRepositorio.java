package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.dto.cobros.CxcListadoProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface CuentaPorCobrarRepositorio extends BaseRepository<CuentaPorCobrar, Long> {
    Optional<CuentaPorCobrar> findByIdVenta(Long idVenta);

    @Query(value = """
        SELECT 
          cxc.id_cuenta_cobrar       AS idCuentaCobrar,
          cxc.id_venta               AS idVenta,
          v.id_cliente               AS idCliente,
          cl.razon_social_o_nombre   AS cliente,
          cxc.monto_pendiente_bob    AS montoPendienteBob,
          cxc.fecha_emision          AS fechaEmision,
          cxc.fecha_vencimiento      AS fechaVencimiento,
          cxc.estado_cuenta          AS estadoCuenta
        FROM cuentas_por_cobrar cxc
        LEFT JOIN ventas v    ON v.id_venta     = cxc.id_venta
        LEFT JOIN clientes cl ON cl.id_cliente  = v.id_cliente
        WHERE (:soloAbiertas = FALSE OR cxc.estado_cuenta IN ('pendiente','parcial'))
          AND (:clienteId IS NULL OR v.id_cliente = :clienteId)
          AND (CAST(:emisionDesde AS DATE) IS NULL OR cxc.fecha_emision      >= CAST(:emisionDesde AS DATE))
          AND (CAST(:emisionHasta AS DATE) IS NULL OR cxc.fecha_emision      <= CAST(:emisionHasta AS DATE))
          AND (CAST(:venceAntes   AS DATE) IS NULL OR cxc.fecha_vencimiento  <= CAST(:venceAntes   AS DATE))
        ORDER BY cxc.fecha_vencimiento ASC, cxc.id_cuenta_cobrar ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM cuentas_por_cobrar cxc
        LEFT JOIN ventas v ON v.id_venta = cxc.id_venta
        WHERE (:soloAbiertas = FALSE OR cxc.estado_cuenta IN ('pendiente','parcial'))
          AND (:clienteId IS NULL OR v.id_cliente = :clienteId)
          AND (CAST(:emisionDesde AS DATE) IS NULL OR cxc.fecha_emision     >= CAST(:emisionDesde AS DATE))
          AND (CAST(:emisionHasta AS DATE) IS NULL OR cxc.fecha_emision     <= CAST(:emisionHasta AS DATE))
          AND (CAST(:venceAntes   AS DATE) IS NULL OR cxc.fecha_vencimiento <= CAST(:venceAntes   AS DATE))
        """,
            nativeQuery = true)
    Page<CxcListadoProjection> buscarCxc(
            @Param("soloAbiertas") boolean soloAbiertas,
            @Param("clienteId") Long clienteId,
            @Param("emisionDesde") LocalDate emisionDesde,
            @Param("emisionHasta") LocalDate emisionHasta,
            @Param("venceAntes") LocalDate venceAntes,
            Pageable pageable
    );

    @Query(value = """
    SELECT v.id_cliente AS idCliente
    FROM cuentas_por_cobrar cxc
    JOIN ventas v ON v.id_venta = cxc.id_venta
    WHERE cxc.id_cuenta_cobrar = :idCxc
    """, nativeQuery = true)
    java.util.Optional<com.soyanga.soyangabackend.dto.cobros.VentaClienteInfo> findVentaInfoByIdCxc(
            @Param("idCxc") Long idCxc
    );

}
