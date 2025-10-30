package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;

public interface AplicacionPagoRepositorio extends BaseRepository<AplicacionPago, Long> {
    @Query(value = "SELECT COALESCE(SUM(ap.monto_aplicado_bob), 0) " +
            "FROM aplicaciones_de_pago ap " +
            "WHERE ap.id_cuenta_cobrar = :idCxc",
            nativeQuery = true)
    BigDecimal totalAplicadoPorCxc(@Param("idCxc") Long idCxc);

    long countByIdCuentaCobrar(Long idCuentaCobrar);
}
