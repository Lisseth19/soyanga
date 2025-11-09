package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface AplicacionAnticipoRepositorio extends JpaRepository<AplicacionAnticipo, Long> {
    /* =========================
       AGREGADOS (JPQL)
       ========================= */
    /** Suma en BOB de todo lo aplicado para un anticipo (JPQL). */
    @Query("""
            select coalesce(sum(a.montoAplicadoBob), 0)
            from AplicacionAnticipo a
            where a.idAnticipo = :idAnticipo
            """)
    BigDecimal totalAplicadoPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    /** Suma total aplicada a una venta específica (JPQL). */
    @Query("""
            select coalesce(sum(a.montoAplicadoBob), 0)
            from AplicacionAnticipo a
            where a.idVenta = :idVenta
            """)
    BigDecimal totalAplicadoPorVenta(@Param("idVenta") Long idVenta);

    /* =========================
       AGREGADOS (NATIVO) - mantiene compatibilidad con la rama main
       ========================= */
    /** Versión nativa para anticipo (misma lógica, distinto nombre para evitar colisión). */
    @Query(value = """
            SELECT COALESCE(SUM(a.monto_aplicado_bob), 0)
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            """, nativeQuery = true)
    BigDecimal totalAplicadoPorAnticipoNativo(@Param("idAnticipo") Long idAnticipo);

    /** Versión nativa para venta (misma lógica, distinto nombre). */
    @Query(value = """
            SELECT COALESCE(SUM(a.monto_aplicado_bob), 0)
            FROM aplicaciones_de_anticipo a
            WHERE a.id_venta = :idVenta
            """, nativeQuery = true)
    BigDecimal totalAplicadoPorVentaNativo(@Param("idVenta") Long idVenta);

    /* =========================
       LISTADOS/ORDEN
       ========================= */
    /**
     * Listado de aplicaciones por anticipo ordenado (fecha desc, id desc).
     * Útil si quieres la entidad completa con orden específico.
     */
    Page<AplicacionAnticipo> findByIdAnticipoOrderByFechaAplicacionDescIdAplicacionAnticipoDesc(
            Long idAnticipo,
            Pageable pageable
    );

    /** Historial ordenado por fecha (ascendente) para auditoría. */
    List<AplicacionAnticipo> findByIdAnticipoOrderByFechaAplicacionAsc(Long idAnticipo);

    /* =========================
       PROYECCIÓN LIGERA (para listados en front)
       ========================= */
    interface AplicacionRow {
        Long getIdAplicacionAnticipo();
        Long getIdAnticipo();
        Long getIdVenta();
        BigDecimal getMontoAplicadoBob();
        LocalDateTime getFechaAplicacion();
    }

    /** Listado paginado usando la proyección ligera (JPQL). */
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
    Page<AplicacionRow> listarPorAnticipoLigero(@Param("idAnticipo") Long idAnticipo, Pageable pageable);

    /** Versión nativa que devuelve la ENTIDAD completa y con countQuery (compatibilidad con la otra rama). */
    @Query(value = """
            SELECT *
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            ORDER BY a.fecha_aplicacion DESC, a.id_aplicacion_anticipo DESC

            """,
            countQuery = """
            SELECT COUNT(*)
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            """,
            nativeQuery = true)
    Page<AplicacionAnticipo> listarPorAnticipoEntidad(@Param("idAnticipo") Long idAnticipo, Pageable pageable);

}
