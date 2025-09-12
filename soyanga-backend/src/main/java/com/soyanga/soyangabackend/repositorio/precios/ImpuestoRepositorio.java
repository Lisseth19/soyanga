package com.soyanga.soyangabackend.repositorio.precios;

import com.soyanga.soyangabackend.dominio.Impuesto;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ImpuestoRepositorio extends BaseRepository<Impuesto, Long> {

    boolean existsByNombreImpuestoIgnoreCase(String nombreImpuesto);

    interface ImpuestoListadoProjection {
        Long getIdImpuesto();
        String getNombreImpuesto();
        java.math.BigDecimal getPorcentaje();
        Boolean getEstadoActivo();
    }

    @Query(value = """
        SELECT 
          i.id_impuesto     AS idImpuesto,
          i.nombre_impuesto AS nombreImpuesto,
          i.porcentaje      AS porcentaje,
          i.estado_activo   AS estadoActivo
        FROM impuestos i
        WHERE (:q IS NULL OR i.nombre_impuesto ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR i.estado_activo = TRUE)
        ORDER BY i.nombre_impuesto ASC
        """,
            countQuery = """
        SELECT COUNT(*)
        FROM impuestos i
        WHERE (:q IS NULL OR i.nombre_impuesto ILIKE CONCAT('%', CAST(:q AS TEXT), '%'))
          AND (:soloActivos = FALSE OR i.estado_activo = TRUE)
        """,
            nativeQuery = true)
    Page<ImpuestoListadoProjection> listar(
            @Param("q") String q,
            @Param("soloActivos") boolean soloActivos,
            Pageable pageable
    );
}
