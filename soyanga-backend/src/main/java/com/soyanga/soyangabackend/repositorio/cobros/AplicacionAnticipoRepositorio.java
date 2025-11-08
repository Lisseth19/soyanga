package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface AplicacionAnticipoRepositorio extends JpaRepository<AplicacionAnticipo, Long> {

    /** Suma en BOB de todo lo aplicado para un anticipo. */
    @Query("""
            select coalesce(sum(a.montoAplicadoBob), 0)
            from AplicacionAnticipo a
            where a.idAnticipo = :idAnticipo
            """)
    BigDecimal totalAplicadoPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    /**
     * Listado de aplicaciones por anticipo ordenado (fecha desc, id desc).
     * Útil si quieres la entidad completa.
     */
    Page<AplicacionAnticipo> findByIdAnticipoOrderByFechaAplicacionDescIdAplicacionAnticipoDesc(
            Long idAnticipo,
            Pageable pageable
    );

    /** Suma total aplicada a una venta específica (trazabilidad/validación). */
    @Query("""
            select coalesce(sum(a.montoAplicadoBob), 0)
            from AplicacionAnticipo a
            where a.idVenta = :idVenta
            """)
    BigDecimal totalAplicadoPorVenta(@Param("idVenta") Long idVenta);

    /** Historial ordenado por fecha (ascendente) para auditoría. */
    List<AplicacionAnticipo> findByIdAnticipoOrderByFechaAplicacionAsc(Long idAnticipo);

    /** Proyección ligera para listados paginados (coincide con lo que usa el front). */
    interface AplicacionRow {
        Long getIdAplicacionAnticipo();
        Long getIdAnticipo();
        Long getIdVenta();
        BigDecimal getMontoAplicadoBob();
        LocalDateTime getFechaAplicacion();
    }

    /** Listado paginado usando la proyección ligera. */
    @Query("""
            select a.idAplicacionAnticipo as idAplicacionAnticipo,
                   a.idAnticipo           as idAnticipo,
                   a.idVenta              as idVenta,
                   a.montoAplicadoBob     as montoAplicadoBob,
                   a.fechaAplicacion      as fechaAplicacion
            from AplicacionAnticipo a
            where a.idAnticipo = :idAnticipo
            order by a.fechaAplicacion desc, a.idAplicacionAnticipo desc
            """)
    Page<AplicacionRow> listarPorAnticipo(@Param("idAnticipo") Long idAnticipo, Pageable pageable);
}
