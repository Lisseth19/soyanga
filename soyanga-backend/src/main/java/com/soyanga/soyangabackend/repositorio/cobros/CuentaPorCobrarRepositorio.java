package com.soyanga.soyangabackend.repositorio.cobros;

import com.soyanga.soyangabackend.dominio.CuentaPorCobrar;
import com.soyanga.soyangabackend.repositorio.BaseRepository;

import java.util.Optional;

public interface CuentaPorCobrarRepositorio extends BaseRepository<CuentaPorCobrar, Long> {
    Optional<CuentaPorCobrar> findByIdVenta(Long idVenta);
}
