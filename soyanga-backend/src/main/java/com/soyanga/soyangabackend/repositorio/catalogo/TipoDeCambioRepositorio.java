package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.TipoDeCambio;
import com.soyanga.soyangabackend.repositorio.BaseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Optional;

public interface TipoDeCambioRepositorio extends BaseRepository<TipoDeCambio, Long> {
    Optional<TipoDeCambio> findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
            Long idMonedaOrigen, Long idMonedaDestino, LocalDate hasta);
    Page<TipoDeCambio> findByIdMonedaOrigenAndIdMonedaDestinoOrderByFechaVigenciaDesc(
            Long idMonedaOrigen, Long idMonedaDestino, Pageable pageable);

    Page<TipoDeCambio> findAllByOrderByFechaVigenciaDesc(Pageable pageable);
}
