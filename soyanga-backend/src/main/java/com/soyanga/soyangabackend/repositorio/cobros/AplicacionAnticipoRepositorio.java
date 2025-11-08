package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionAnticipo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface AplicacionAnticipoRepositorio extends JpaRepository<AplicacionAnticipo, Long> {

    @Query(value = """
            SELECT COALESCE(SUM(a.monto_aplicado_bob), 0)
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            """, nativeQuery = true)
    BigDecimal totalAplicadoPorAnticipo(@Param("idAnticipo") Long idAnticipo);

    @Query(value = "SELECT COALESCE(SUM(a.monto_aplicado_bob),0) FROM aplicaciones_de_anticipo a WHERE a.id_venta = :idVenta", nativeQuery = true)
    java.math.BigDecimal totalAplicadoPorVenta(@Param("idVenta") Long idVenta);

    @Query(value = """
            SELECT *
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            ORDER BY a.fecha_aplicacion DESC, a.id_aplicacion_anticipo DESC
            """, countQuery = """
            SELECT COUNT(*)
            FROM aplicaciones_de_anticipo a
            WHERE a.id_anticipo = :idAnticipo
            """, nativeQuery = true)
    Page<AplicacionAnticipo> listarPorAnticipo(
            @Param("idAnticipo") Long idAnticipo,
            Pageable pageable);
}
