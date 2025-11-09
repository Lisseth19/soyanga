// src/main/java/com/soyanga/soyangabackend/repositorio/cobros/AplicacionPagoRepositorio.java
package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.dto.cobros.CxcPagoLineaProjection;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface AplicacionPagoRepositorio extends BaseRepository<AplicacionPago, Long> {
    @Query(value = "SELECT COALESCE(SUM(ap.monto_aplicado_bob), 0) " +
            "FROM aplicaciones_de_pago ap " +
            "WHERE ap.id_cuenta_cobrar = :idCxc",
            nativeQuery = true)
    BigDecimal totalAplicadoPorCxc(@Param("idCxc") Long idCxc);

    long countByIdCuentaCobrar(Long idCuentaCobrar);

    // 🔹 Historial de aplicaciones con datos del pago
    @Query(value = """
        SELECT  pr.id_pago_recibido              AS idPagoRecibido,
                pr.fecha_pago                    AS fechaPago,
                CAST(pr.metodo_de_pago AS TEXT)  AS metodoDePago,
                pr.referencia_externa            AS referenciaExterna,
                pr.monto_bob_equivalente         AS montoPagoBob,
                ap.monto_aplicado_bob            AS montoAplicadoBob
        FROM aplicaciones_de_pago ap
        JOIN pagos_recibidos pr ON pr.id_pago_recibido = ap.id_pago_recibido
        WHERE ap.id_cuenta_cobrar = :idCxc
        ORDER BY pr.fecha_pago ASC, pr.id_pago_recibido ASC
        """, nativeQuery = true)
    List<CxcPagoLineaProjection> historialCxc(@Param("idCxc") Long idCxc);
}
