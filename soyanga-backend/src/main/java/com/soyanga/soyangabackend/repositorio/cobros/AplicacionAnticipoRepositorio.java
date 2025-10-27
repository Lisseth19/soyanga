package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface AplicacionAnticipoRepositorio extends JpaRepository<AplicacionAnticipo, Long> {

    // Ya lo usas en el servicio de aplicar:
    @Query("select coalesce(sum(a.montoAplicadoBob), 0) from AplicacionAnticipo a where a.idAnticipo = :idAnticipo")
    BigDecimal totalAplicadoPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    // Proyección para el historial
    interface AplicacionListadoProjection {
        Long getIdAplicacionAnticipo();
        Long getIdAnticipo();
        Long getIdVenta();
        LocalDateTime getFechaAplicacion();
        BigDecimal getMontoAplicadoBob();
    }

    // Listado de aplicaciones por anticipo (nativo o JPQL; aquí nativo por nombres de tabla/cols)
    @Query(value = """
        SELECT
          aa.id_aplicacion_anticipo AS idAplicacionAnticipo,
          aa.id_anticipo            AS idAnticipo,
          aa.id_venta               AS idVenta,
          aa.fecha_aplicacion       AS fechaAplicacion,
          aa.monto_aplicado_bob     AS montoAplicadoBob
        FROM aplicaciones_anticipos aa
        WHERE aa.id_anticipo = :idAnticipo
        ORDER BY aa.fecha_aplicacion DESC, aa.id_aplicacion_anticipo DESC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM aplicaciones_anticipos
        WHERE id_anticipo = :idAnticipo
        """,
            nativeQuery = true)
    // ✅ Nuevo: Spring genera el SQL (sin errores de nombres de tabla/columnas)
    Page<AplicacionAnticipo> findByIdAnticipoOrderByFechaAplicacionDescIdAplicacionAnticipoDesc(
            Long idAnticipo,
            Pageable pageable
    );

    @Query("select sum(a.montoAplicadoBob) from AplicacionAnticipo a where a.idVenta = :idVenta")
    BigDecimal totalAplicadoPorVenta(@Param("idVenta") Long idVenta);




}
