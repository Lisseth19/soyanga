// src/main/java/com/soyanga/soyangabackend/repositorio/cobros/AnticipoRepositorio.java
package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.Anticipo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface AnticipoRepositorio extends JpaRepository<Anticipo, Long> {

    // === Proyección del listado (incluye saldos) ===
    interface AnticipoListadoProjection {
        Long getIdAnticipo();
        LocalDateTime getFechaAnticipo();
        Long getIdCliente();
        String getCliente();                  // nombre del cliente (LEFT JOIN)
        BigDecimal getMontoBob();
        String getEstadoAnticipo();          // como texto para nativa
        String getObservaciones();

        // NUEVOS
        BigDecimal getAplicadoAcumuladoBob();
        BigDecimal getSaldoDisponibleBob();
    }

    @Query(value = """
       SELECT
    a.id_anticipo                                AS idAnticipo,
    a.fecha_anticipo                             AS fechaAnticipo,
    a.id_cliente                                 AS idCliente,
    cl.razon_social_o_nombre                     AS cliente,
    a.monto_bob                                  AS montoBob,
    a.estado_anticipo                            AS estadoAnticipo,
    a.observaciones                              AS observaciones,
    COALESCE(SUM(ap.monto_aplicado_bob), 0)      AS aplicadoAcumuladoBob,   -- NUEVO
    (a.monto_bob - COALESCE(SUM(ap.monto_aplicado_bob), 0)) AS saldoDisponibleBob -- NUEVO
  FROM anticipos a
  LEFT JOIN clientes cl ON cl.id_cliente = a.id_cliente
  LEFT JOIN aplicaciones_de_anticipo ap ON ap.id_anticipo = a.id_anticipo
  WHERE (CAST(:idCliente AS BIGINT)    IS NULL OR a.id_cliente      = CAST(:idCliente AS BIGINT))
    AND (CAST(:desde     AS TIMESTAMP) IS NULL OR a.fecha_anticipo  >= CAST(:desde AS TIMESTAMP))
    AND (CAST(:hasta     AS TIMESTAMP) IS NULL OR a.fecha_anticipo  <= CAST(:hasta AS TIMESTAMP))
  GROUP BY a.id_anticipo, a.fecha_anticipo, a.id_cliente, cl.razon_social_o_nombre,
           a.monto_bob, a.estado_anticipo, a.observaciones
  ORDER BY a.fecha_anticipo DESC, a.id_anticipo DESC
""", nativeQuery = true)

    Page<AnticipoListadoProjection> listar(
            @Param("idCliente") Long idCliente,
            @Param("desde") LocalDateTime desde,
            @Param("hasta") LocalDateTime hasta,
            Pageable pageable
    );
}
