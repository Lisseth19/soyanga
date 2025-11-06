package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AplicacionPagoRepositorio extends BaseRepository<AplicacionPago, Long> {
    long countByIdCuentaCobrar(Long idCuentaCobrar);
    @Query(value = "SELECT COALESCE(SUM(ap.monto_aplicado_bob),0) FROM aplicaciones_de_pago ap WHERE ap.id_cuenta_cobrar = :idCxc", nativeQuery = true)
    java.math.BigDecimal totalAplicadoPorCxc(@Param("idCxc") Long idCxc);
}
