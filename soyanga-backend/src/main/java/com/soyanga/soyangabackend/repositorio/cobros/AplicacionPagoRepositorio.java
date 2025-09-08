package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.AplicacionPago;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

public interface AplicacionPagoRepositorio extends BaseRepository<AplicacionPago, Long> {
    long countByIdCuentaCobrar(Long idCuentaCobrar);
}
