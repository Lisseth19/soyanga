package com.soyanga.soyangabackend.repositorio.catalogo;

import com.soyanga.soyangabackend.dominio.TipoDeCambio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;


import java.time.LocalDate;
import java.util.Optional;

public interface TipoDeCambioRepositorio extends JpaRepository<TipoDeCambio, Long> {

    // Para listar (última tasa vigente <= fecha)
    Optional<TipoDeCambio>
    findTopByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigenciaLessThanEqualOrderByFechaVigenciaDesc(
            Long idMonedaOrigen, Long idMonedaDestino, LocalDate hasta
    );

    // Para upsert exacto al editar/crear
    Optional<TipoDeCambio>
    findByIdMonedaOrigenAndIdMonedaDestinoAndFechaVigencia(
            Long idMonedaOrigen, Long idMonedaDestino, LocalDate fechaVigencia
    );

    boolean existsByIdMonedaOrigenOrIdMonedaDestino(Long idMonedaOrigen, Long idMonedaDestino);

    @Modifying
    @Query("delete from TipoDeCambio tc where tc.idMonedaOrigen = :id or tc.idMonedaDestino = :id")
    void deleteAllByMoneda(Long id);
}
